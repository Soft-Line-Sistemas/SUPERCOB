import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { computeLoanFacts, isRuleMatch, renderTemplate, validateAutomationWindow } from '@/lib/whatsapp-automation'
import { ensureWhatsappAutomationSeed } from '@/lib/whatsapp-automation'
import { whatsappService } from '@/lib/whatsapp-client'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

async function canRunAutomation(req: Request) {
  const session = await auth()
  if (session?.user && isAdminRole(session.user.role)) return true

  const secret = process.env.WHATSAPP_AUTOMATION_SECRET
  if (!secret) return false

  const authorization = req.headers.get('authorization') || ''
  return authorization === `Bearer ${secret}`
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export async function POST(req: Request) {
  if (!(await canRunAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const limit = Math.min(100, Math.max(1, Number(body.limit || 25)))
  await ensureWhatsappAutomationSeed()

  const config = await prisma.whatsappAutomationConfig.findFirst({
    include: { rules: { where: { enabled: true }, orderBy: { priority: 'asc' } } },
  })

  if (!config) {
    return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
  }

  if (!config.enabled) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, skipped: [{ reason: 'Automação pausada' }] })
  }

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
    take: 500,
  })

  const today = startOfToday()
  const results: Array<{ ruleId: string; emprestimoId: string; status: string; error?: string }> = []
  const skipped: Array<{ ruleId?: string; emprestimoId?: string; reason: string }> = []

  for (const rule of config.rules) {
    if (results.filter((result) => result.status === 'SENT').length >= limit) break

    const windowCheck = validateAutomationWindow(config, rule)
    if (!windowCheck.ok) {
      skipped.push({ ruleId: rule.id, reason: windowCheck.reason || 'Fora da janela de envio' })
      continue
    }

    for (const loan of candidates) {
      if (results.filter((result) => result.status === 'SENT').length >= limit) break

      const pref = loan.cliente.whatsappPrefs[0]
      if (pref && !pref.enabled) continue
      if (rule.triggerType === 'RECURRING' && pref && !pref.allowRecurrence) continue

      const facts = computeLoanFacts(loan as any)
      if (!isRuleMatch(rule, facts)) continue

      const alreadyHandledToday = await prisma.whatsappAutomationDispatch.findFirst({
        where: {
          ruleId: rule.id,
          emprestimoId: loan.id,
          status: { in: ['PENDING', 'SENT'] },
          createdAt: { gte: today },
        },
        select: { id: true },
      })
      if (alreadyHandledToday) continue

      const latestSent = await prisma.whatsappAutomationDispatch.findFirst({
        where: {
          status: 'SENT',
          sentAt: { not: null },
          emprestimo: { clienteId: loan.clienteId },
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      })

      const minIntervalMinutes = Math.max(1, Number(config.minIntervalMinutes || 1))
      if (latestSent?.sentAt && Date.now() - latestSent.sentAt.getTime() < minIntervalMinutes * 60 * 1000) {
        skipped.push({ ruleId: rule.id, emprestimoId: loan.id, reason: 'Anti-spam ativo' })
        continue
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

      const dispatch = await prisma.whatsappAutomationDispatch.create({
        data: {
          ruleId: rule.id,
          emprestimoId: loan.id,
          status: 'PENDING',
          scheduledFor: new Date(),
          attemptedAt: new Date(),
          payloadPreview: payload,
        },
      })

      try {
        const sent = await whatsappService.sendMessage(String(loan.cliente.whatsapp), payload)
        await prisma.whatsappAutomationDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            providerRef: sent.referenceId,
          },
        })
        results.push({ ruleId: rule.id, emprestimoId: loan.id, status: 'SENT' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha no envio'
        await prisma.whatsappAutomationDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: 'FAILED',
            errorMessage: message,
          },
        })
        results.push({ ruleId: rule.id, emprestimoId: loan.id, status: 'FAILED', error: message })
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent: results.filter((result) => result.status === 'SENT').length,
    failed: results.filter((result) => result.status === 'FAILED').length,
    results,
    skipped,
  })
}
