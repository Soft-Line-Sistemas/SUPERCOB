import fs from 'node:fs/promises'
import path from 'node:path'
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

  private createClientIfNeeded() {
    if (this.client) return

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.sessionPath,
        clientId: this.clientId,
      }),
      puppeteer: {
        headless: true,
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

    this.initializing = this.client.initialize().finally(() => {
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
      await new Promise((resolve) => setTimeout(resolve, 150))
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

    const becameReady = await this.waitUntilReady(20000, 300)
    if (!becameReady) {
      throw new Error('WhatsApp client ainda não está pronto')
    }
  }

  private async waitUntilReady(timeoutMs = 20000, intervalMs = 300): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (this.isReady()) return true
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    return this.isReady()
  }

  async sendMessage(to: string, message: string, mediaPath?: string) {
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

  async resetSession() {
    this.ready = false
    this.authenticated = false
    this.connectionState = null
    this.qrState = { qr: null, generatedAt: null }

    if (this.client) {
      try {
        await this.client.logout()
      } catch {
      }

      try {
        await this.client.destroy()
      } catch {
      }
    }

    this.client = null
    this.initializing = null

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
