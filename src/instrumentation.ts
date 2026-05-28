import { startWhatsappAutomationScheduler } from '@/lib/whatsapp-automation-scheduler'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  startWhatsappAutomationScheduler()
}
