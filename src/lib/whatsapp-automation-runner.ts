import { prisma } from '@/lib/prisma'
import { ensureWhatsappAutomationSeed } from '@/lib/whatsapp-automation'
import { computeLoanFacts, isRuleMatch, renderTemplate, validateAutomationWindow } from '@/lib/whatsapp-automation'
import { whatsappService } from '@/lib/whatsapp-client'

export type AutomationRunResult = {
  success: true
  sent: number
  failed: number
  results: Array<{ ruleId: string; emprestimoId: string; status: string; error?: string }>
  skipped: Array<{ ruleId?: string; emprestimoId?: string; reason: string }>
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

async function isAutomationStillEnabled(ruleId: string) {
  const [config, rule] = await Promise.all([
    prisma.whatsappAutomationConfig.findFirst({
      select: { enabled: true },
    }),
    prisma.whatsappAutomationRule.findUnique({
      where: { id: ruleId },
      select: { enabled: true },
    }),
  ])

  return Boolean(config?.enabled && rule?.enabled)
}

export async function runWhatsappAutomation(limit = 25): Promise<AutomationRunResult> {
  const safeLimit = Math.min(100, Math.max(1, Number(limit || 25)))
  await ensureWhatsappAutomationSeed()

  const config = await prisma.whatsappAutomationConfig.findFirst({
    include: { rules: { where: { enabled: true }, orderBy: { priority: 'asc' } } },
  })

  if (!config || !config.enabled) {
    return { success: true, sent: 0, failed: 0, results: [], skipped: [{ reason: 'Automação pausada' }] }
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
  const queueGapMs = Math.max(0, Number(config.queueGapMinutes || 0)) * 60 * 1000
  const results: Array<{ ruleId: string; emprestimoId: string; status: string; error?: string }> = []
  const skipped: Array<{ ruleId?: string; emprestimoId?: string; reason: string }> = []
  let nextGlobalSendAt = 0

  if (queueGapMs > 0) {
    const latestGlobalSent = await prisma.whatsappAutomationDispatch.findFirst({
      where: {
        status: 'SENT',
        sentAt: { not: null },
      },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })

    if (latestGlobalSent?.sentAt) {
      nextGlobalSendAt = latestGlobalSent.sentAt.getTime() + queueGapMs
    }
  }

  for (const rule of config.rules) {
    if (results.filter((result) => result.status === 'SENT').length >= safeLimit) break

    const windowCheck = validateAutomationWindow(config, rule)
    if (!windowCheck.ok) {
      skipped.push({ ruleId: rule.id, reason: windowCheck.reason || 'Fora da janela de envio' })
      continue
    }

    for (const loan of candidates) {
      if (results.filter((result) => result.status === 'SENT').length >= safeLimit) break

      const pref = loan.cliente.whatsappPrefs[0]
      if (pref && !pref.enabled) continue
      if (rule.triggerType === 'RECURRING' && pref && !pref.allowRecurrence) continue

      const facts = computeLoanFacts(loan as any)
      if (!isRuleMatch(rule, facts)) continue

      const alreadyHandledToday = await prisma.whatsappAutomationDispatch.findFirst({
        where: {
          ruleId: rule.id,
          emprestimoId: loan.id,
          status: { in: ['PENDING', 'SENT', 'FAILED'] },
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

      if (queueGapMs > 0 && nextGlobalSendAt > Date.now()) {
        skipped.push({ ruleId: rule.id, emprestimoId: loan.id, reason: 'Intervalo geral entre disparos ativo' })
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

      if (!(await isAutomationStillEnabled(rule.id))) {
        skipped.push({ ruleId: rule.id, emprestimoId: loan.id, reason: 'Automação pausada durante a execução' })
        continue
      }

      const dispatch = await prisma.whatsappAutomationDispatch.create({
        data: {
          ruleId: rule.id,
          emprestimoId: loan.id,
          status: 'PENDING',
          scheduledFor: new Date(),
          attemptedAt: new Date(),
          payloadPreview: payload,
          triggerMode: 'AUTOMATIC',
          requiresManualFollowUp: false,
          followUpStatus: 'NONE',
        },
      })

      try {
        const sent = await whatsappService.sendMessage(String(loan.cliente.whatsapp), payload)
        const sentAt = new Date()
        await prisma.whatsappAutomationDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: 'SENT',
            sentAt,
            providerRef: sent.referenceId,
            requiresManualFollowUp: false,
            followUpStatus: 'NONE',
            followUpResolvedAt: null,
          },
        })
        nextGlobalSendAt = queueGapMs > 0 ? sentAt.getTime() + queueGapMs : 0
        results.push({ ruleId: rule.id, emprestimoId: loan.id, status: 'SENT' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha no envio'
        await prisma.whatsappAutomationDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: 'FAILED',
            errorMessage: message,
            requiresManualFollowUp: true,
            followUpStatus: 'PENDING',
          },
        })
        results.push({ ruleId: rule.id, emprestimoId: loan.id, status: 'FAILED', error: message })
      }
    }
  }

  return {
    success: true,
    sent: results.filter((result) => result.status === 'SENT').length,
    failed: results.filter((result) => result.status === 'FAILED').length,
    results,
    skipped,
  }
}
