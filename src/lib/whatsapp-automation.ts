import { prisma } from '@/lib/prisma'
import { DEFAULT_RULES } from './whatsapp-automation-core'
export { DEFAULT_RULES, computeLoanFacts, isRuleMatch, renderTemplate, validateAutomationWindow } from './whatsapp-automation-core'

export async function ensureWhatsappAutomationSeed() {
  const existing = await prisma.whatsappAutomationConfig.findFirst({
    include: { rules: true },
  })

  if (existing) {
    if (existing.rules.length === 0) {
      await prisma.whatsappAutomationRule.createMany({
        data: DEFAULT_RULES.map((rule) => ({ ...rule, configId: existing.id, enabled: true })),
      })
    }
    return existing.id
  }

  const config = await prisma.whatsappAutomationConfig.create({
    data: {
      enabled: true,
      defaultCountryCode: '55',
      timezone: 'America/Bahia',
      sendOnWeekends: false,
      minIntervalMinutes: 240,
      rules: {
        create: DEFAULT_RULES.map((rule) => ({ ...rule, enabled: true })),
      },
    },
  })

  return config.id
}
