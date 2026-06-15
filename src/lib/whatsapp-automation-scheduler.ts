import { loadWhatsappAutomationQueue } from '@/lib/whatsapp-automation-queue'

declare global {
  var __whatsappAutomationSchedulerStarted__: boolean | undefined
  var __whatsappAutomationSchedulerRunning__: boolean | undefined
  var __whatsappAutomationHeartbeatRunning__: boolean | undefined
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

function parseHeartbeatMs() {
  const raw = Number(process.env.WHATSAPP_AUTOMATION_HEARTBEAT_MS || 60000)
  if (!Number.isFinite(raw)) return 60000
  return Math.max(60000, raw)
}

async function heartbeat() {
  if (globalThis.__whatsappAutomationHeartbeatRunning__) return
  globalThis.__whatsappAutomationHeartbeatRunning__ = true
  try {
    const queue = await loadWhatsappAutomationQueue()
    if (!queue) {
      console.info('[automation-scheduler] heartbeat: configuracao da automacao ainda nao foi criada')
      return
    }

    const nextItem = queue.items[0]
    const overdueItems = queue.items.filter((item) => item.overdueByMinutes > 0).length
    const nextInfo = nextItem
      ? `proximo=${nextItem.expectedAtLabel} cliente="${nextItem.clienteNome}" regra="${nextItem.ruleTitle}"`
      : 'proximo=nenhum'

    console.info(
      `[automation-scheduler] heartbeat ${queue.generatedAtLabel} fila=${queue.summary.total} atrasados=${overdueItems} minIntervalo=${queue.summary.minIntervalMinutes}m gapFila=${queue.summary.queueGapMinutes}m ${nextInfo}`,
    )
  } catch (error) {
    console.error('[automation-scheduler] heartbeat failed', error)
  } finally {
    globalThis.__whatsappAutomationHeartbeatRunning__ = false
  }
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
  const heartbeatMs = parseHeartbeatMs()
  void heartbeat()
  void tick()
  setInterval(() => {
    void heartbeat()
  }, heartbeatMs)
  setInterval(() => {
    void tick()
  }, intervalMs)

  console.info(`[automation-scheduler] started with interval ${intervalMs}ms`)
  console.info(`[automation-scheduler] heartbeat enabled every ${heartbeatMs}ms`)
}
