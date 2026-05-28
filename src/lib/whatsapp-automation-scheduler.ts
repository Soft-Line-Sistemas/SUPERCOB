declare global {
  // eslint-disable-next-line no-var
  var __whatsappAutomationSchedulerStarted__: boolean | undefined
  // eslint-disable-next-line no-var
  var __whatsappAutomationSchedulerRunning__: boolean | undefined
}

function parseIntervalMs() {
  const raw = Number(process.env.WHATSAPP_AUTOMATION_CRON_MS || 300000)
  if (!Number.isFinite(raw)) return 300000
  return Math.max(60000, raw)
}

function parseLimit() {
  const raw = Number(process.env.WHATSAPP_AUTOMATION_CRON_LIMIT || 25)
  if (!Number.isFinite(raw)) return 25
  return Math.max(1, Math.min(100, raw))
}

async function tick() {
  if (globalThis.__whatsappAutomationSchedulerRunning__) return
  globalThis.__whatsappAutomationSchedulerRunning__ = true
  try {
    const secret = process.env.WHATSAPP_AUTOMATION_SECRET
    if (!secret) {
      console.warn('[automation-scheduler] skipped tick: WHATSAPP_AUTOMATION_SECRET is missing')
      return
    }

    const port = Number(process.env.PORT || 3000)
    const baseUrl = process.env.WHATSAPP_AUTOMATION_BASE_URL || `http://127.0.0.1:${port}`
    const res = await fetch(`${baseUrl}/api/whatsapp/automation/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ limit: parseLimit() }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[automation-scheduler] tick HTTP ${res.status}: ${text}`)
    }
  } catch (error) {
    console.error('[automation-scheduler] tick failed', error)
  } finally {
    globalThis.__whatsappAutomationSchedulerRunning__ = false
  }
}

export function startWhatsappAutomationScheduler() {
  if (process.env.NODE_ENV === 'test') return
  if (globalThis.__whatsappAutomationSchedulerStarted__) return
  globalThis.__whatsappAutomationSchedulerStarted__ = true

  const intervalMs = parseIntervalMs()
  void tick()
  setInterval(() => {
    void tick()
  }, intervalMs)

  console.info(`[automation-scheduler] started with interval ${intervalMs}ms`)
}
