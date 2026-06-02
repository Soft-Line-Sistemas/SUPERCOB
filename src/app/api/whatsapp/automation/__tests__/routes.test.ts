import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuth, mockEnsureSeed, mockSendMessage, mockLoadQueue, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockEnsureSeed: vi.fn(),
  mockSendMessage: vi.fn(),
  mockLoadQueue: vi.fn(),
  mockPrisma: {
    $transaction: vi.fn(),
    whatsappAutomationConfig: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    whatsappAutomationRule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    whatsappAutomationDispatch: {
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emprestimo: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    emprestimoHistorico: {
      create: vi.fn(),
    },
    cliente: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    whatsappAutomationClientPreference: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/whatsapp-automation', async () => {
  const actual = await vi.importActual<any>('@/lib/whatsapp-automation')
  return {
    ...actual,
    ensureWhatsappAutomationSeed: mockEnsureSeed,
  }
})
vi.mock('@/lib/whatsapp-client', () => ({
  whatsappService: {
    sendMessage: mockSendMessage,
  },
}))
vi.mock('@/lib/whatsapp-automation-queue', () => ({
  loadWhatsappAutomationQueue: mockLoadQueue,
}))

import * as configRoute from '../config/route'
import * as clientsRoute from '../clients/route'
import * as overviewRoute from '../overview/route'
import * as actionsRoute from '../actions/route'
import * as runRoute from '../run/route'

function asAuthed() {
  mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADM' } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('automation routes auth guards', () => {
  it('returns 401 when unauthenticated on config GET', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await configRoute.GET()
    expect(res.status).toBe(401)
  })

  it('returns 401 when unauthenticated on clients GET', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/whatsapp/automation/clients')
    const res = await clientsRoute.GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when unauthenticated on overview GET', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await overviewRoute.GET()
    expect(res.status).toBe(401)
  })

  it('returns 401 when unauthenticated on actions POST', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'PLAY_RULE', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(401)
  })
})

describe('config route CRUD scenarios', () => {
  it('GET returns seeded config with rules', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ id: 'cfg', rules: [{ id: 'r1' }] })

    const res = await configRoute.GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'cfg' })
    expect(mockEnsureSeed).toHaveBeenCalledTimes(1)
  })

  it('PUT returns 404 when config does not exist', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue(null)

    const req = new Request('http://localhost/api/whatsapp/automation/config', {
      method: 'PUT',
      body: JSON.stringify({ enabled: true, rules: [] }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await configRoute.PUT(req)
    expect(res.status).toBe(404)
  })

  it('PUT updates config and clamps minIntervalMinutes to at least 1', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ id: 'cfg-1', rules: [] })

    const tx = {
      whatsappAutomationConfig: {
        update: vi.fn().mockResolvedValue(undefined),
        findUnique: vi.fn().mockResolvedValue({ id: 'cfg-1', minIntervalMinutes: 1, rules: [] }),
      },
      whatsappAutomationRule: { update: vi.fn().mockResolvedValue(undefined) },
    }

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx))

    const req = new Request('http://localhost/api/whatsapp/automation/config', {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        defaultCountryCode: '55',
        timezone: 'America/Bahia',
        sendOnWeekends: false,
        minIntervalMinutes: 0,
        rules: [{ id: 'rule-1', title: 'X', enabled: true, priority: 1, triggerType: 'LATE', offsetDays: 1, sendTime: '10:00', template: 'ok' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await configRoute.PUT(req)
    expect(res.status).toBe(200)
    expect(tx.whatsappAutomationConfig.update).toHaveBeenCalled()
    const callArg = tx.whatsappAutomationConfig.update.mock.calls[0][0]
    expect(callArg.data.minIntervalMinutes).toBe(1)
    expect(tx.whatsappAutomationRule.update).toHaveBeenCalledTimes(1)
  })
})

describe('clients route CRUD scenarios', () => {
  it('GET maps clients with totals and preferences', async () => {
    asAuthed()
    mockPrisma.cliente.findMany.mockResolvedValue([
      {
        id: 'c1',
        nome: 'Maria',
        whatsapp: '71999999999',
        whatsappPrefs: [{ enabled: false, allowRecurrence: false, pausedAt: new Date('2026-05-10T12:00:00.000Z') }],
        loans: [
          { id: 'l1', status: 'ABERTO', valor: 1000, valorPago: 200, cobrancaAtiva: true },
          { id: 'l2', status: 'NEGOCIACAO', valor: 500, valorPago: 100, cobrancaAtiva: false },
        ],
      },
    ])
    mockPrisma.cliente.count.mockResolvedValue(1)

    const req = new Request('http://localhost/api/whatsapp/automation/clients?q=maria&page=1&limit=20')
    const res = await clientsRoute.GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0]).toMatchObject({
      id: 'c1',
      enabled: false,
      allowRecurrence: false,
      activeLoans: 2,
      activeChargeLoans: 1,
      totalOpen: 1200,
    })
  })

  it('PATCH requires clienteId', async () => {
    asAuthed()
    const req = new Request('http://localhost/api/whatsapp/automation/clients', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await clientsRoute.PATCH(req)
    expect(res.status).toBe(400)
  })

  it('PATCH updates preference and pauses timestamp when disabling', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationClientPreference.upsert.mockResolvedValue({ id: 'p1', clienteId: 'c1', enabled: false })

    const req = new Request('http://localhost/api/whatsapp/automation/clients', {
      method: 'PATCH',
      body: JSON.stringify({ clienteId: 'c1', enabled: false, allowRecurrence: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await clientsRoute.PATCH(req)
    expect(res.status).toBe(200)
    const arg = mockPrisma.whatsappAutomationClientPreference.upsert.mock.calls[0][0]
    expect(arg.create.pausedAt).toBeInstanceOf(Date)
    expect(arg.update.pausedAt).toBeInstanceOf(Date)
  })
})

describe('overview route scenarios', () => {
  it('GET returns summary and situations with anti-spam interval', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({
      enabled: true,
      minIntervalMinutes: 3,
      rules: [
        { id: 'r1', key: 'LATE_1D', title: 'Atraso 1 dia', enabled: true, triggerType: 'LATE', offsetDays: 1, recurrenceDays: null, sendTime: '10:00', priority: 1 },
      ],
    })
    mockPrisma.whatsappAutomationDispatch.findMany.mockResolvedValue([])
    mockPrisma.whatsappAutomationDispatch.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
    mockPrisma.emprestimo.count.mockResolvedValue(10)

    const res = await overviewRoute.GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toMatchObject({
      automationEnabled: true,
      activeRules: 1,
      openLoans: 10,
      todayTotal: 8,
      todaySent: 4,
      todayFailed: 1,
      minIntervalMinutes: 3,
    })
    expect(body.situations).toHaveLength(1)
  })

  it('GET returns 404 when config is missing', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue(null)
    mockPrisma.whatsappAutomationDispatch.findMany.mockResolvedValue([])
    mockPrisma.whatsappAutomationDispatch.count.mockResolvedValue(0)
    mockPrisma.emprestimo.count.mockResolvedValue(0)

    const res = await overviewRoute.GET()
    expect(res.status).toBe(404)
  })
})

describe('actions route operational scenarios', () => {
  it('returns 400 when action/ruleId missing', async () => {
    asAuthed()
    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when rule does not exist', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue(null)

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'PLAY_RULE', ruleId: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(404)
  })

  it('PLAY_RULE toggles enabled true', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1' })
    mockPrisma.whatsappAutomationRule.update.mockResolvedValue({ id: 'r1', enabled: true })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'PLAY_RULE', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.whatsappAutomationRule.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { enabled: true } })
  })

  it('PAUSE_RULE toggles enabled false', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1' })
    mockPrisma.whatsappAutomationRule.update.mockResolvedValue({ id: 'r1', enabled: false })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'PAUSE_RULE', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(200)
  })

  it('RESET_RULE_LOGS deletes by ruleId', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1' })
    mockPrisma.whatsappAutomationDispatch.deleteMany.mockResolvedValue({ count: 3 })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'RESET_RULE_LOGS', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.whatsappAutomationDispatch.deleteMany).toHaveBeenCalledWith({ where: { ruleId: 'r1' } })
  })

  it('SEND_NOW returns 400 when automation is disabled', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, template: 'x', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: false, minIntervalMinutes: 1 })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(400)
  })

  it('SEND_NOW returns 400 when rule is disabled', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: false, template: 'x', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 1, sendOnWeekends: true })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Regra está pausada')
  })

  it('SEND_NOW returns 400 before configured send time', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, sendTime: '23:59', template: 'x', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 1, timezone: 'America/Bahia', sendOnWeekends: true })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('23:59')
  })

  it('SEND_NOW returns 404 when no eligible loan is found', async () => {
    asAuthed()
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, triggerType: 'LATE', offsetDays: 1, recurrenceDays: null, template: 'x', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 1 })
    mockLoadQueue.mockResolvedValue({ items: [] })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(404)
  })

  it('SEND_NOW selects overdue contract from queue for the chosen rule', async () => {
    asAuthed()
    const loan = {
      id: 'loan123456',
      clienteId: 'c1',
      valor: 1000,
      valorPago: 200,
      jurosMes: 5,
      jurosAtrasoDia: 1,
      vencimento: new Date('2026-05-25T12:00:00.000Z'),
      status: 'ABERTO',
      cobrancaAtiva: true,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      cliente: { nome: 'Maria', whatsapp: '71999999999', whatsappPrefs: [] },
    }

    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({
      id: 'r1',
      enabled: true,
      triggerType: 'RECURRING',
      offsetDays: 2,
      recurrenceDays: 2,
      sendTime: '16:40',
      template: 'Olá {cliente_nome}',
      title: 'Recorrência',
    })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({
      enabled: true,
      minIntervalMinutes: 1,
      queueGapMinutes: 1,
      timezone: 'America/Bahia',
      sendOnWeekends: true,
    })
    mockLoadQueue.mockResolvedValue({
      items: [
        {
          ruleId: 'r1',
          emprestimoId: loan.id,
          expectedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
      ],
    })
    mockPrisma.emprestimo.findUnique.mockResolvedValue(loan)
    mockPrisma.whatsappAutomationDispatch.findFirst.mockResolvedValue(null)
    mockPrisma.whatsappAutomationDispatch.create.mockResolvedValue({ id: 'd1' })
    mockSendMessage.mockResolvedValue({ referenceId: 'wa-1' })
    mockPrisma.whatsappAutomationDispatch.update.mockResolvedValue({ id: 'd1', status: 'SENT' })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.emprestimo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: loan.id } }),
    )
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
  })

  it('SEND_NOW returns 429 when anti-spam interval is active', async () => {
    asAuthed()
    const loan = {
      id: 'loan123456',
      clienteId: 'c1',
      valor: 1000,
      valorPago: 200,
      jurosMes: 5,
      jurosAtrasoDia: 1,
      vencimento: new Date(),
      status: 'ABERTO',
      cobrancaAtiva: true,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      cliente: { nome: 'Maria', whatsapp: '71999999999', whatsappPrefs: [] },
    }
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, triggerType: 'LATE', offsetDays: 0, recurrenceDays: null, template: 'Olá {cliente_nome}', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 2 })
    mockPrisma.emprestimo.findUnique.mockResolvedValue(loan)
    mockPrisma.whatsappAutomationDispatch.findFirst.mockResolvedValue({ sentAt: new Date(Date.now() - 30_000) })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1', emprestimoId: loan.id }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(429)
  })

  it('SEND_NOW sends successfully and stores SENT dispatch', async () => {
    asAuthed()
    const loan = {
      id: 'loan123456',
      clienteId: 'c1',
      valor: 1000,
      valorPago: 200,
      jurosMes: 5,
      jurosAtrasoDia: 1,
      vencimento: new Date(),
      status: 'ABERTO',
      cobrancaAtiva: true,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      cliente: { nome: 'Maria', whatsapp: '71999999999', whatsappPrefs: [] },
    }
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, triggerType: 'LATE', offsetDays: 0, recurrenceDays: null, template: 'Olá {cliente_nome}', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 1 })
    mockPrisma.emprestimo.findUnique.mockResolvedValue(loan)
    mockPrisma.whatsappAutomationDispatch.findFirst.mockResolvedValue(null)
    mockPrisma.whatsappAutomationDispatch.create.mockResolvedValue({ id: 'd1' })
    mockSendMessage.mockResolvedValue({ referenceId: 'wa-1' })
    mockPrisma.whatsappAutomationDispatch.update.mockResolvedValue({ id: 'd1', status: 'SENT' })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1', emprestimoId: loan.id }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(200)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(mockPrisma.whatsappAutomationDispatch.update).toHaveBeenCalled()
  })

  it('SEND_NOW rejects forced loan outside selected rule', async () => {
    asAuthed()
    const loan = {
      id: 'loan123456',
      clienteId: 'c1',
      valor: 1000,
      valorPago: 200,
      jurosMes: 5,
      jurosAtrasoDia: 1,
      vencimento: new Date('2099-05-15T12:00:00.000Z'),
      status: 'ABERTO',
      cobrancaAtiva: true,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      cliente: { nome: 'Maria', whatsapp: '71999999999', whatsappPrefs: [] },
    }
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, triggerType: 'LATE', offsetDays: 1, recurrenceDays: null, template: 'Olá {cliente_nome}', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 1, sendOnWeekends: true })
    mockPrisma.emprestimo.findUnique.mockResolvedValue(loan)

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1', emprestimoId: loan.id }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('não corresponde')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('SEND_NOW marks FAILED when provider send throws', async () => {
    asAuthed()
    const loan = {
      id: 'loan123456',
      clienteId: 'c1',
      valor: 1000,
      valorPago: 200,
      jurosMes: 5,
      jurosAtrasoDia: 1,
      vencimento: new Date(),
      status: 'ABERTO',
      cobrancaAtiva: true,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      cliente: { nome: 'Maria', whatsapp: '71999999999', whatsappPrefs: [] },
    }
    mockPrisma.whatsappAutomationRule.findUnique.mockResolvedValue({ id: 'r1', enabled: true, triggerType: 'LATE', offsetDays: 0, recurrenceDays: null, template: 'Olá {cliente_nome}', title: 'R1' })
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: true, minIntervalMinutes: 1 })
    mockPrisma.emprestimo.findUnique.mockResolvedValue(loan)
    mockPrisma.whatsappAutomationDispatch.findFirst.mockResolvedValue(null)
    mockPrisma.whatsappAutomationDispatch.create.mockResolvedValue({ id: 'd1' })
    mockSendMessage.mockRejectedValue(new Error('network down'))
    mockPrisma.whatsappAutomationDispatch.update.mockResolvedValue({ id: 'd1', status: 'FAILED', errorMessage: 'network down' })

    const req = new Request('http://localhost/api/whatsapp/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_NOW', ruleId: 'r1', emprestimoId: loan.id }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await actionsRoute.POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('network down')
  })
})

describe('automation run route scenarios', () => {
  it('returns 401 when run route has no session or secret', async () => {
    mockAuth.mockResolvedValue(null)

    const req = new Request('http://localhost/api/whatsapp/automation/run', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await runRoute.POST(req)
    expect(res.status).toBe(401)
  })

  it('returns no sends when global automation is paused', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({ enabled: false, rules: [] })

    const req = new Request('http://localhost/api/whatsapp/automation/run', {
      method: 'POST',
      body: JSON.stringify({ limit: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await runRoute.POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, sent: 0, failed: 0 })
    expect(mockPrisma.emprestimo.findMany).not.toHaveBeenCalled()
  })

  it('marks automatic failures as manual follow-up pending', async () => {
    asAuthed()
    mockEnsureSeed.mockResolvedValue(undefined)
    mockPrisma.whatsappAutomationConfig.findFirst.mockResolvedValue({
      enabled: true,
      minIntervalMinutes: 1,
      rules: [
        { id: 'r1', enabled: true, triggerType: 'LATE', offsetDays: 0, recurrenceDays: null, sendTime: '00:00', template: 'Oi {cliente_nome}', title: 'R1', priority: 1 },
      ],
    })
    mockPrisma.emprestimo.findMany.mockResolvedValue([
      {
        id: 'loan123456',
        clienteId: 'c1',
        valor: 1000,
        valorPago: 200,
        jurosMes: 5,
        jurosAtrasoDia: 1,
        vencimento: new Date(),
        status: 'ABERTO',
        cobrancaAtiva: true,
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
        cliente: { nome: 'Maria', whatsapp: '71999999999', whatsappPrefs: [] },
      },
    ])
    mockPrisma.whatsappAutomationDispatch.findFirst.mockResolvedValue(null)
    mockPrisma.whatsappAutomationDispatch.create.mockResolvedValue({ id: 'd1' })
    mockSendMessage.mockRejectedValue(new Error('network down'))
    mockPrisma.whatsappAutomationDispatch.update.mockResolvedValue({ id: 'd1', status: 'FAILED', errorMessage: 'network down' })

    const req = new Request('http://localhost/api/whatsapp/automation/run', {
      method: 'POST',
      body: JSON.stringify({ limit: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await runRoute.POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.whatsappAutomationDispatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          triggerMode: 'AUTOMATIC',
          requiresManualFollowUp: false,
          followUpStatus: 'NONE',
        }),
      }),
    )
    expect(mockPrisma.whatsappAutomationDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          requiresManualFollowUp: true,
          followUpStatus: 'PENDING',
        }),
      }),
    )
  })
})
