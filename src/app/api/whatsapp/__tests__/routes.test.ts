import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuth, mockWhatsappService } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockWhatsappService: {
    resetSession: vi.fn(),
    getQrStatus: vi.fn(),
    isReady: vi.fn(),
    isAuthenticated: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/whatsapp-client', () => ({ whatsappService: mockWhatsappService }))

import * as qrRoute from '../qr/route'
import * as disconnectRoute from '../disconnect/route'
import * as sendRoute from '../route'

beforeEach(() => {
  vi.clearAllMocks()
})

function authed() {
  mockAuth.mockResolvedValue({ user: { id: 'u1' } })
}

describe('whatsapp qr route', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/whatsapp/qr')
    const res = await qrRoute.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns ready payload when client is ready', async () => {
    authed()
    mockWhatsappService.getQrStatus.mockResolvedValue({ ready: true, qr: null, generatedAt: null })
    mockWhatsappService.isReady.mockReturnValue(true)
    mockWhatsappService.isAuthenticated.mockReturnValue(true)

    const req = new Request('http://localhost/api/whatsapp/qr')
    const res = await qrRoute.GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ready).toBe(true)
    expect(body.qrAvailable).toBe(false)
  })

  it('returns qr payload when qr is available', async () => {
    authed()
    mockWhatsappService.getQrStatus.mockResolvedValue({ ready: false, qr: 'QR-TOKEN', generatedAt: 123 })
    mockWhatsappService.isReady.mockReturnValue(false)
    mockWhatsappService.isAuthenticated.mockReturnValue(false)

    const req = new Request('http://localhost/api/whatsapp/qr')
    const res = await qrRoute.GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ready).toBe(false)
    expect(body.qrAvailable).toBe(true)
    expect(body.qr).toBe('QR-TOKEN')
  })

  it('refresh=1 forces session reset', async () => {
    authed()
    mockWhatsappService.resetSession.mockResolvedValue(undefined)
    mockWhatsappService.getQrStatus.mockResolvedValue({ ready: false, qr: 'NEW-QR', generatedAt: 456 })
    mockWhatsappService.isReady.mockReturnValue(false)
    mockWhatsappService.isAuthenticated.mockReturnValue(false)

    const req = new Request('http://localhost/api/whatsapp/qr?refresh=1')
    const res = await qrRoute.GET(req)
    expect(res.status).toBe(200)
    expect(mockWhatsappService.resetSession).toHaveBeenCalledTimes(1)
  })

  it('returns 503 on service failure', async () => {
    authed()
    mockWhatsappService.getQrStatus.mockRejectedValue(new Error('boom'))

    const req = new Request('http://localhost/api/whatsapp/qr')
    const res = await qrRoute.GET(req)
    expect(res.status).toBe(503)
  })
})

describe('whatsapp disconnect route', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await disconnectRoute.POST()
    expect(res.status).toBe(401)
  })

  it('disconnects session successfully', async () => {
    authed()
    mockWhatsappService.resetSession.mockResolvedValue(undefined)

    const res = await disconnectRoute.POST()
    expect(res.status).toBe(200)
    expect(mockWhatsappService.resetSession).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when disconnect fails', async () => {
    authed()
    mockWhatsappService.resetSession.mockRejectedValue(new Error('reset failed'))

    const res = await disconnectRoute.POST()
    expect(res.status).toBe(500)
  })
})

describe('whatsapp send route', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ to: '71999999999', message: 'Oi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await sendRoute.POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    authed()
    const req = new Request('http://localhost/api/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ to: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await sendRoute.POST(req)
    expect(res.status).toBe(400)
  })

  it('sends message successfully', async () => {
    authed()
    mockWhatsappService.sendMessage.mockResolvedValue({ referenceId: 'wa-123', jid: 'x@y', normalized: '5571999999999' })

    const req = new Request('http://localhost/api/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ to: '71999999999', message: 'Oi Maria' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await sendRoute.POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith('71999999999', 'Oi Maria')
  })

  it('returns 500 with service error message', async () => {
    authed()
    mockWhatsappService.sendMessage.mockRejectedValue(new Error('client not ready'))

    const req = new Request('http://localhost/api/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ to: '71999999999', message: 'Oi Maria' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await sendRoute.POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('client not ready')
  })
})
