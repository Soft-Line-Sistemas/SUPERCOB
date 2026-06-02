import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js'

type QrState = {
  qr: string | null
  generatedAt: number | null
}

type WaitQrResult = {
  qr: string | null
  generatedAt: number | null
  ready: boolean
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class WhatsAppClientService {
  private client: Client | null = null
  private initializing: Promise<void> | null = null
  private ready = false
  private authenticated = false
  private connectionState: string | null = null
  private qrState: QrState = { qr: null, generatedAt: null }

  private get sessionPath() {
    return process.env.WHATSAPP_SESSION_PATH || path.resolve(process.cwd(), '.wwebjs_auth')
  }

  private get clientId() {
    return process.env.WHATSAPP_CLIENT_ID || 'supercob-main'
  }

  private get protocolTimeoutMs() {
    const raw = Number(process.env.WHATSAPP_PROTOCOL_TIMEOUT_MS || 180000)
    if (!Number.isFinite(raw)) return 180000
    return Math.max(60000, raw)
  }

  private get readyTimeoutMs() {
    const raw = Number(process.env.WHATSAPP_READY_TIMEOUT_MS || 60000)
    if (!Number.isFinite(raw)) return 60000
    return Math.max(20000, raw)
  }

  private get sendRetries() {
    const raw = Number(process.env.WHATSAPP_SEND_RETRIES || 1)
    if (!Number.isFinite(raw)) return 1
    return Math.max(0, Math.min(3, raw))
  }

  private createClientIfNeeded() {
    if (this.client) return

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.sessionPath,
        clientId: this.clientId,
      }),
      puppeteer: {
        headless: true,
        protocolTimeout: this.protocolTimeoutMs,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
      },
    })

    this.client.on('qr', (qr: string) => {
      this.qrState = { qr, generatedAt: Date.now() }
      this.ready = false
      this.authenticated = false
    })

    this.client.on('authenticated', () => {
      this.authenticated = true
      this.qrState = { qr: null, generatedAt: null }
    })

    this.client.on('ready', () => {
      this.ready = true
      this.authenticated = true
      this.connectionState = 'CONNECTED'
      this.qrState = { qr: null, generatedAt: null }
    })

    this.client.on('change_state', (state: string) => {
      this.connectionState = state
      if (state === 'CONNECTED') {
        this.ready = true
        this.authenticated = true
        this.qrState = { qr: null, generatedAt: null }
      }
    })

    this.client.on('auth_failure', () => {
      this.ready = false
      this.authenticated = false
      this.connectionState = null
    })

    this.client.on('disconnected', () => {
      this.ready = false
      this.authenticated = false
      this.connectionState = null
    })

    this.initializing = this.client
      .initialize()
      .catch(async (error) => {
        await this.destroyClient()
        throw error
      })
      .finally(() => {
        this.initializing = null
      })
  }

  async start() {
    this.createClientIfNeeded()
    if (this.initializing) {
      await this.initializing
    }
  }

  isReady() {
    return this.ready || this.connectionState === 'CONNECTED'
  }

  isAuthenticated() {
    return this.authenticated || this.isReady()
  }

  async getQrStatus(waitMs = 2500): Promise<WaitQrResult> {
    await this.start()

    const start = Date.now()
    while (Date.now() - start < waitMs) {
      if (this.isReady()) {
        return { qr: null, generatedAt: null, ready: true }
      }
      if (this.qrState.qr) {
        return { qr: this.qrState.qr, generatedAt: this.qrState.generatedAt, ready: false }
      }
      await sleep(150)
    }

    return {
      qr: this.qrState.qr,
      generatedAt: this.qrState.generatedAt,
      ready: this.isReady(),
    }
  }

  private normalizeRecipient(recipient: string): string {
    let clean = recipient.replace(/\D/g, '')
    const defaultCountry = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '55').replace(/\D/g, '')

    if (!clean.startsWith(defaultCountry)) {
      clean = `${defaultCountry}${clean}`
    }

    clean = clean.replace(new RegExp(`^${defaultCountry}0+`), defaultCountry)
    return clean
  }

  private async ensureReady() {
    await this.start()
    if (this.isReady()) return

    const becameReady = await this.waitUntilReady(this.readyTimeoutMs, 300)
    if (!becameReady) {
      throw new Error('WhatsApp client ainda não está pronto')
    }
  }

  private async waitUntilReady(timeoutMs = 20000, intervalMs = 300): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (this.isReady()) return true
      await sleep(intervalMs)
    }
    return this.isReady()
  }

  private isRecoverableError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || '')
    return (
      message.includes('Runtime.callFunctionOn timed out') ||
      message.includes('Protocol error') ||
      message.includes('Execution context was destroyed') ||
      message.includes('Target closed') ||
      message.includes('Session closed')
    )
  }

  private async destroyClient() {
    this.ready = false
    this.authenticated = false
    this.connectionState = null

    if (this.client) {
      try {
        await this.client.destroy()
      } catch {
      }
    }

    this.client = null
    this.initializing = null
  }

  private async restartClient() {
    await this.destroyClient()
    this.qrState = { qr: null, generatedAt: null }
    await this.start()
  }

  private async sendMessageOnce(to: string, message: string, mediaPath?: string) {
    await this.ensureReady()

    const normalized = this.normalizeRecipient(to)
    const numberId = await this.client!.getNumberId(normalized)
    if (!numberId) {
      throw new Error(`Número não encontrado no WhatsApp: ${normalized}`)
    }

    const jid = numberId._serialized
    const sent = mediaPath
      ? await this.client!.sendMessage(
          jid,
          MessageMedia.fromFilePath(mediaPath),
          message ? { caption: message } : undefined,
        )
      : await this.client!.sendMessage(jid, message)

    return {
      referenceId: sent.id._serialized,
      jid,
      normalized,
    }
  }

  async sendMessage(to: string, message: string, mediaPath?: string) {
    const maxAttempts = this.sendRetries + 1
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.sendMessageOnce(to, message, mediaPath)
      } catch (error) {
        lastError = error
        if (!this.isRecoverableError(error) || attempt >= maxAttempts) {
          throw error
        }

        console.warn(
          `[whatsapp] recoverable send failure on attempt ${attempt}/${maxAttempts}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        await this.restartClient()
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Falha ao enviar mensagem pelo WhatsApp')
  }

  async resetSession() {
    this.qrState = { qr: null, generatedAt: null }
    if (this.client) {
      try {
        await this.client.logout()
      } catch {
      }
    }

    await this.destroyClient()

    const sessionDir = path.join(this.sessionPath, `session-${this.clientId}`)
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => undefined)

    await this.start()
  }
}

const globalForWhatsapp = globalThis as unknown as {
  whatsappService?: WhatsAppClientService
}

export const whatsappService =
  globalForWhatsapp.whatsappService ?? (globalForWhatsapp.whatsappService = new WhatsAppClientService())
