import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { computeLoanFacts, isRuleMatch, renderTemplate, validateAutomationWindow } from '@/lib/whatsapp-automation'
import { whatsappService } from '@/lib/whatsapp-client'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

type ActionType = 'PLAY_RULE' | 'PAUSE_RULE' | 'RESET_RULE_LOGS' | 'SEND_NOW'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const action = String(body.action || '') as ActionType
  const ruleId = String(body.ruleId || '')

  if (!action || !ruleId) {
    return NextResponse.json({ error: 'action e ruleId são obrigatórios' }, { status: 400 })
  }

  const rule = await prisma.whatsappAutomationRule.findUnique({ where: { id: ruleId } })
  if (!rule) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })

  if (action === 'PLAY_RULE') {
    const updated = await prisma.whatsappAutomationRule.update({ where: { id: ruleId }, data: { enabled: true } })
    return NextResponse.json(updated)
  }

  if (action === 'PAUSE_RULE') {
    const updated = await prisma.whatsappAutomationRule.update({ where: { id: ruleId }, data: { enabled: false } })
    return NextResponse.json(updated)
  }

  if (action === 'RESET_RULE_LOGS') {
    await prisma.whatsappAutomationDispatch.deleteMany({ where: { ruleId } })
    return NextResponse.json({ success: true })
  }

  if (action !== 'SEND_NOW') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const config = await prisma.whatsappAutomationConfig.findFirst()
  if (!config?.enabled) {
    return NextResponse.json({ error: 'Automação está desativada globalmente' }, { status: 400 })
  }
  if (!rule.enabled) {
    return NextResponse.json({ error: 'Regra está pausada' }, { status: 400 })
  }

  const windowCheck = validateAutomationWindow(config, rule)
  if (!windowCheck.ok) {
    return NextResponse.json({ error: windowCheck.reason || 'Fora da janela de envio' }, { status: 400 })
  }

  const emprestimoId = body.emprestimoId ? String(body.emprestimoId) : null

  let loan = emprestimoId
    ? await prisma.emprestimo.findUnique({
        where: { id: emprestimoId },
        include: {
          cliente: {
            include: {
              whatsappPrefs: true,
            },
          },
        },
      })
    : null

  if (!loan) {
    const candidates = await prisma.emprestimo.findMany({
      where: {
        status: { in: ['ABERTO', 'NEGOCIACAO'] },
        cobrancaAtiva: true,
      },
      include: {
        cliente: {
          include: {
            whatsappPrefs: true,
          },
        },
      },
      orderBy: [{ vencimento: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    })

    loan = candidates.find((item) => {
      const pref = item.cliente.whatsappPrefs[0]
      if (pref && !pref.enabled) return false
      if (rule.triggerType === 'RECURRING' && pref && !pref.allowRecurrence) return false
      const facts = computeLoanFacts(item as any)
      return isRuleMatch(rule, facts)
    }) as any
  }

  if (!loan) {
    return NextResponse.json({ error: 'Nenhum contrato elegível para envio imediato nessa situação' }, { status: 404 })
  }

  const pref = loan.cliente.whatsappPrefs[0]
  if (pref && !pref.enabled) {
    return NextResponse.json({ error: 'Cliente está pausado para cobrança automática' }, { status: 400 })
  }
  if (rule.triggerType === 'RECURRING' && pref && !pref.allowRecurrence) {
    return NextResponse.json({ error: 'Cliente não permite recorrência automática' }, { status: 400 })
  }

  const facts = computeLoanFacts(loan as any)
  if (loan.status !== 'ABERTO' && loan.status !== 'NEGOCIACAO') {
    return NextResponse.json({ error: 'Contrato não está aberto para cobrança automática' }, { status: 400 })
  }
  if (!loan.cobrancaAtiva) {
    return NextResponse.json({ error: 'Contrato está fora da cobrança ativa' }, { status: 400 })
  }
  if (!isRuleMatch(rule, facts)) {
    return NextResponse.json({ error: 'Contrato não corresponde à regra selecionada' }, { status: 400 })
  }

  const payload = renderTemplate(rule.template, {
    clienteNome: loan.cliente.nome,
    contratoId: loan.id.slice(-6).toUpperCase(),
    valor: Number(loan.valor || 0),
    valorPago: Number(loan.valorPago || 0),
    saldo: facts.saldo,
    jurosMes: Number(loan.jurosMes || 0),
    jurosAtrasoDia: Number(loan.jurosAtrasoDia || 0),
    diasAtraso: facts.daysLate,
    dataVencimento: loan.vencimento,
  })

  const minIntervalMinutes = Math.max(1, Number(config.minIntervalMinutes || 1))
  const intervalMs = minIntervalMinutes * 60 * 1000
  const latestSent = await prisma.whatsappAutomationDispatch.findFirst({
    where: {
      status: 'SENT',
      sentAt: { not: null },
      emprestimo: { clienteId: loan.clienteId },
    },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  })

  if (latestSent?.sentAt) {
    const elapsedMs = Date.now() - latestSent.sentAt.getTime()
    if (elapsedMs < intervalMs) {
      const remainingMs = intervalMs - elapsedMs
      const remainingSec = Math.ceil(remainingMs / 1000)
      return NextResponse.json(
        {
          error: `Anti-spam ativo. Aguarde ${remainingSec}s para novo disparo deste cliente.`,
          minIntervalMinutes,
          remainingSeconds: remainingSec,
        },
        { status: 429 },
      )
    }
  }

  const dispatch = await prisma.whatsappAutomationDispatch.create({
    data: {
      ruleId: rule.id,
      emprestimoId: loan.id,
      status: 'PENDING',
      attemptedAt: new Date(),
      payloadPreview: payload,
      triggerMode: 'MANUAL',
      requiresManualFollowUp: false,
      followUpStatus: 'NONE',
    },
  })

  try {
    const sent = await whatsappService.sendMessage(String(loan.cliente.whatsapp), payload)

    const updated = await prisma.whatsappAutomationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        providerRef: sent.referenceId,
        requiresManualFollowUp: false,
        followUpStatus: 'NONE',
        followUpResolvedAt: null,
      },
    })

    await prisma.emprestimoHistorico.create({
      data: {
        emprestimoId: loan.id,
        tipo: 'COBRANCA_WPP',
        createdById: (session.user as any).id || null,
        descricao: `Cobrança WhatsApp enviada (${updated.triggerMode}) • Regra: ${rule.title} • Ref: ${sent.referenceId}`,
      },
    })

    return NextResponse.json({
      success: true,
      dispatch: updated,
      to: loan.cliente.whatsapp,
      cliente: loan.cliente.nome,
      rule: rule.title,
    })
  } catch (error) {
    const updated = await prisma.whatsappAutomationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Falha no envio',
        requiresManualFollowUp: true,
        followUpStatus: 'PENDING',
      },
    })

    await prisma.emprestimoHistorico.create({
      data: {
        emprestimoId: loan.id,
        tipo: 'COBRANCA_WPP',
        createdById: (session.user as any).id || null,
        descricao: `Falha no envio WhatsApp (${updated.triggerMode}) • Regra: ${rule.title} • Motivo: ${updated.errorMessage || 'Falha desconhecida'}`,
      },
    })

    return NextResponse.json(
      {
        error: updated.errorMessage || 'Falha no envio',
      },
      { status: 500 },
    )
  }
}
