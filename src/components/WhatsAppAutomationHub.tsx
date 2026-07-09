'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, Send, Settings2, Users, LayoutDashboard, QrCode, History, CheckCircle2, Clock3 } from 'lucide-react'
import { WhatsAppConnectionPage } from '@/components/WhatsAppConnectionPage'

type Tab = 'overview' | 'clients' | 'config' | 'connection' | 'history' | 'queue'

type Situation = {
  id: string
  key: string
  title: string
  enabled: boolean
  triggerType: string
  offsetDays: number
  recurrenceDays: number | null
  sendTime: string
  nextRunAt: string
  nextRunAtLabel?: string
}

type OverviewData = {
  summary: {
    automationEnabled: boolean
    activeRules: number
    openLoans: number
    todayTotal: number
    todaySent: number
    todayFailed: number
    minIntervalMinutes: number
    pendingFollowUps: number
  }
  situations: Situation[]
  recent: Array<any>
}

type QueueData = {
  generatedAtLabel: string
  summary: {
    total: number
    timezone: string
    minIntervalMinutes: number
    queueGapMinutes: number
  }
  items: Array<{
    queuePosition: number
    clienteId: string
    clienteNome: string
    whatsapp: string | null
    emprestimoId: string
    contratoLabel: string
    ruleId: string
    ruleKey: string
    ruleTitle: string
    scheduledAtLabel: string
    expectedAtLabel: string
    delayedByQueueMinutes: number
    overdueByMinutes: number
  }>
}

export function WhatsAppAutomationHub() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Automação WhatsApp</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gestão de régua de cobrança automática e disparos manuais.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabBtn current={tab} value="overview" icon={LayoutDashboard} label="Visão Geral" onClick={setTab} />
        <TabBtn current={tab} value="clients" icon={Users} label="Clientes" onClick={setTab} />
        <TabBtn current={tab} value="config" icon={Settings2} label="Configuração" onClick={setTab} />
        <TabBtn current={tab} value="queue" icon={Clock3} label="Fila" onClick={setTab} />
        <TabBtn current={tab} value="history" icon={History} label="Histórico" onClick={setTab} />
        <TabBtn current={tab} value="connection" icon={QrCode} label="Conexão" onClick={setTab} />
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'config' && <ConfigTab />}
      {tab === 'queue' && <QueueTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'connection' && <WhatsAppConnectionPage />}
    </div>
  )
}

function TabBtn({ current, value, icon: Icon, label, onClick }: any) {
  const active = current === value
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-4 py-2 rounded-xl text-sm font-black border flex items-center gap-2 ${active ? 'bg-gold-600 text-white border-gold-600' : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
    }
    try {
      const res = await fetch('/api/whatsapp/automation/overview', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao carregar visão geral')
      setData(json)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar visão geral')
    } finally {
      if (!opts?.silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => {
      if (document.hidden) return
      void load({ silent: true })
    }, 30000)
    return () => clearInterval(id)
  }, [load])

  const runAction = async (ruleId: string, action: string) => {
    setBusyRuleId(ruleId + action)
    try {
      const res = await fetch('/api/whatsapp/automation/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Falha ao executar ação')
      toast.success(action === 'SEND_NOW' ? 'Envio executado' : 'Ação aplicada')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao executar ação')
    } finally {
      setBusyRuleId(null)
    }
  }

  if (loading) return <div className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">Carregando...</div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Metric label="Automação" value={data.summary.automationEnabled ? 'Ativa' : 'Pausada'} />
        <Metric label="Regras Ativas" value={String(data.summary.activeRules)} />
        <Metric label="Contratos na Régua" value={String(data.summary.openLoans)} />
        <Metric label="Envios Hoje" value={String(data.summary.todayTotal)} />
        <Metric label="Sucesso Hoje" value={String(data.summary.todaySent)} />
        <Metric label="Falhas Hoje" value={String(data.summary.todayFailed)} />
        <Metric label="Intervalo Anti-Spam" value={`${data.summary.minIntervalMinutes} min`} />
      </div>
      <div className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold">
        Fallback manual pendente: <span className="font-black">{data.summary.pendingFollowUps}</span> cobrança(s) com falha aguardando ação manual.
      </div>
      <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
        Proteção anti-spam ativa: o sistema respeita intervalo mínimo entre disparos para o mesmo cliente.
      </div>

      <div className="space-y-3">
        {data.situations.map((s) => {
          const loadingAction = (action: string) => busyRuleId === s.id + action
          const toggleAction = s.enabled ? 'PAUSE_RULE' : 'PLAY_RULE'
          const toggleLabel = s.enabled ? 'Pause' : 'Play'
          const toggleIcon = s.enabled ? Pause : Play
          const ToggleIcon = toggleIcon
          return (
            <div key={s.id} className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{s.title}</p>
                  <p className="text-xs text-slate-500">Próximo disparo previsto: {s.nextRunAtLabel || new Date(s.nextRunAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={loadingAction(toggleAction)}
                    onClick={() => void runAction(s.id, toggleAction)}
                    className={`px-3 py-2 rounded-lg text-white text-xs font-black flex items-center gap-1 ${s.enabled ? 'bg-amber-600' : 'bg-emerald-600'}`}
                  >
                    <ToggleIcon className="w-3 h-3" /> {toggleLabel}
                  </button>
                  <button disabled={loadingAction('RESET_RULE_LOGS')} onClick={() => void runAction(s.id, 'RESET_RULE_LOGS')} className="px-3 py-2 rounded-lg bg-slate-600 text-white text-xs font-black flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset</button>
                  <button disabled={loadingAction('SEND_NOW')} onClick={() => void runAction(s.id, 'SEND_NOW')} className="px-3 py-2 rounded-lg bg-gold-600 text-white text-xs font-black flex items-center gap-1"><Send className="w-3 h-3" /> Enviar agora</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HistoryTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sendingBatch, setSendingBatch] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/whatsapp/automation/history', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao carregar histórico')
    } else {
      setItems(json.items || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sendableItems = useMemo(
    () => items.filter((item) => item.status === 'FAILED' && item.requiresManualFollowUp && item.followUpStatus === 'PENDING'),
    [items],
  )

  const isAllSelected = sendableItems.length > 0 && sendableItems.every((item) => selectedIds.includes(item.id))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) return []
      return sendableItems.map((item) => item.id)
    })
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]))
      return prev.filter((itemId) => itemId !== id)
    })
  }

  const sendBatch = async () => {
    if (selectedIds.length === 0) return
    const selectedItems = sendableItems.filter((item) => selectedIds.includes(item.id))
    if (selectedItems.length === 0) {
      toast.error('Nenhum envio pendente válido selecionado.')
      return
    }

    setSendingBatch(true)
    let success = 0
    let failed = 0

    for (const item of selectedItems) {
      try {
        const sendRes = await fetch('/api/whatsapp/automation/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SEND_NOW',
            ruleId: item.ruleId,
            emprestimoId: item.emprestimoId,
          }),
        })
        const sendJson = await sendRes.json()
        if (!sendRes.ok) throw new Error(sendJson?.error || 'Falha ao reenviar cobrança')

        const resolveRes = await fetch('/api/whatsapp/automation/failures', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, action: 'RESOLVE', notes: 'Reenviado em lote pelo histórico.' }),
        })
        const resolveJson = await resolveRes.json()
        if (!resolveRes.ok) throw new Error(resolveJson?.error || 'Falha ao resolver pendência')

        success += 1
      } catch (error) {
        failed += 1
        toast.error(error instanceof Error ? error.message : 'Erro no envio em lote')
      }
    }

    if (success > 0) {
      toast.success(`Envio em lote concluído: ${success} sucesso(s).`)
      await load()
      setSelectedIds([])
    }
    if (failed > 0) toast.error(`Envio em lote: ${failed} falha(s).`)
    setSendingBatch(false)
  }

  const resolve = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch('/api/whatsapp/automation/failures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'RESOLVE', notes: 'Tratado manualmente pelo histórico.' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao atualizar pendência')
      toast.success('Pendência marcada como resolvida')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar pendência')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      {loading ? <div className="text-sm text-slate-500">Carregando...</div> : null}
      {!loading && items.length === 0 ? (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Nenhum disparo registrado até o momento.
        </div>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} disabled={sendableItems.length === 0 || sendingBatch} />
              Selecionar todos pendentes
            </label>
            <button
              onClick={() => void sendBatch()}
              disabled={selectedIds.length === 0 || sendingBatch}
              className="px-3 py-2 rounded-lg bg-gold-600 text-white text-xs font-black disabled:opacity-60"
            >
              {sendingBatch ? 'Enviando em lote...' : `Enviar em lote (${selectedIds.length})`}
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-black w-10">Sel</th>
                  <th className="px-3 py-2 text-left font-black">Cliente</th>
                  <th className="px-3 py-2 text-left font-black">Contrato</th>
                  <th className="px-3 py-2 text-left font-black">Status</th>
                  <th className="px-3 py-2 text-left font-black">Origem</th>
                  <th className="px-3 py-2 text-left font-black">Regra</th>
                  <th className="px-3 py-2 text-left font-black">Tentativa</th>
                  <th className="px-3 py-2 text-left font-black">Pendência</th>
                  <th className="px-3 py-2 text-left font-black">Erro</th>
                  <th className="px-3 py-2 text-left font-black">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSendable = item.status === 'FAILED' && item.requiresManualFollowUp && item.followUpStatus === 'PENDING'
                  return (
                    <tr key={item.id} className="border-t border-slate-200 dark:border-white/10">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          disabled={!isSendable || sendingBatch}
                          onChange={(e) => toggleSelectOne(item.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{item.emprestimo?.cliente?.nome || 'Cliente'}</td>
                      <td className="px-3 py-2">CTR-{String(item.emprestimoId || '').slice(-6).toUpperCase()}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-2 py-1 rounded-md font-black ${item.status === 'SENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : item.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{item.status}</span>
                      </td>
                      <td className="px-3 py-2">{item.triggerMode}</td>
                      <td className="px-3 py-2">{item.rule?.title || '-'}</td>
                      <td className="px-3 py-2">{item.attemptedAt ? new Date(item.attemptedAt).toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-3 py-2">
                        {item.requiresManualFollowUp ? (
                          <span className={`text-[10px] px-2 py-1 rounded-md font-black ${item.followUpStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                            {item.followUpStatus}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-red-600">{item.errorMessage || '-'}</td>
                      <td className="px-3 py-2">
                        {isSendable ? (
                          <button
                            disabled={busyId === item.id}
                            onClick={() => void resolve(item.id)}
                            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black disabled:opacity-60"
                          >
                            {busyId === item.id ? 'Resolvendo...' : 'Marcar resolvida'}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function QueueTab() {
  const [data, setData] = useState<QueueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [advanceCount, setAdvanceCount] = useState(100)
  const [sendingBatch, setSendingBatch] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/whatsapp/automation/queue', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao carregar fila')
    } else {
      setData(json)
      setSelectedIds((prev) => prev.filter((id) => json.items.some((item: QueueData['items'][number]) => `${item.ruleId}:${item.emprestimoId}` === id)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleItems = data?.items || []
  const isAllSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(`${item.ruleId}:${item.emprestimoId}`))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) return []
      return visibleItems.map((item) => `${item.ruleId}:${item.emprestimoId}`)
    })
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]))
      return prev.filter((itemId) => itemId !== id)
    })
  }

  const selectNextCount = () => {
    const safeCount = Math.max(1, Math.min(visibleItems.length, Number(advanceCount || 0)))
    setSelectedIds(visibleItems.slice(0, safeCount).map((item) => `${item.ruleId}:${item.emprestimoId}`))
  }

  const forceBatch = async () => {
    if (!data || selectedIds.length === 0) return
    const selectedItems = data.items.filter((item) => selectedIds.includes(`${item.ruleId}:${item.emprestimoId}`))
    if (selectedItems.length === 0) {
      toast.error('Nenhum contrato válido selecionado para antecipação.')
      return
    }

    setSendingBatch(true)
    let success = 0
    let failed = 0

    for (const item of selectedItems) {
      try {
        const res = await fetch('/api/whatsapp/automation/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'FORCE_SEND',
            ruleId: item.ruleId,
            emprestimoId: item.emprestimoId,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Falha ao antecipar envio')
        success += 1
      } catch (error) {
        failed += 1
        toast.error(error instanceof Error ? error.message : 'Falha ao antecipar envio')
      }
    }

    if (success > 0) {
      toast.success(`Antecipação concluída: ${success} envio(s).`)
      setSelectedIds([])
      await load()
    }
    if (failed > 0) {
      toast.error(`Antecipação em lote: ${failed} falha(s).`)
    }
    setSendingBatch(false)
  }

  return (
    <div className="space-y-3">
      {loading ? <div className="text-sm text-slate-500">Carregando...</div> : null}
      {data ? (
        <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-300">
          {data.summary.total} disparo(s) previstos • intervalo por cliente de {data.summary.minIntervalMinutes} min • intervalo geral de {data.summary.queueGapMinutes} min • atualizado em {data.generatedAtLabel}
        </div>
      ) : null}
      {!loading && data && data.items.length === 0 ? (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Nenhum cliente com disparo previsto no momento.
        </div>
      ) : null}
      {data && data.items.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <label className="inline-flex items-center gap-2 font-black">
              <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} disabled={sendingBatch} />
              Selecionar todos da fila
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={data.items.length}
                value={advanceCount}
                onChange={(e) => setAdvanceCount(Number(e.target.value || 1))}
                className="w-24 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-black text-slate-900"
              />
              <button
                onClick={selectNextCount}
                disabled={sendingBatch}
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
              >
                Marcar próximos {Math.max(1, Number(advanceCount || 0))}
              </button>
              <button
                onClick={() => void forceBatch()}
                disabled={selectedIds.length === 0 || sendingBatch}
                className="rounded-lg bg-gold-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
              >
                {sendingBatch ? 'Antecipando...' : `Antecipar envio (${selectedIds.length})`}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-black w-10">Sel</th>
                  <th className="px-3 py-2 text-left font-black">#</th>
                  <th className="px-3 py-2 text-left font-black">Cliente</th>
                  <th className="px-3 py-2 text-left font-black">Contrato</th>
                  <th className="px-3 py-2 text-left font-black">Disparo esperado</th>
                  <th className="px-3 py-2 text-left font-black">Janela base</th>
                  <th className="px-3 py-2 text-left font-black">Previsão na fila</th>
                  <th className="px-3 py-2 text-left font-black">Atraso fila</th>
                  <th className="px-3 py-2 text-left font-black">Janela vencida</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.ruleId}:${item.emprestimoId}`} className="border-t border-slate-200 dark:border-white/10">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(`${item.ruleId}:${item.emprestimoId}`)}
                          disabled={sendingBatch}
                          onChange={(e) => toggleSelectOne(`${item.ruleId}:${item.emprestimoId}`, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2 font-black text-slate-700 dark:text-slate-200">{item.queuePosition}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{item.clienteNome}</div>
                        <div className="text-xs text-slate-500">{item.whatsapp || 'Sem WhatsApp'}</div>
                      </td>
                      <td className="px-3 py-2">{item.contratoLabel}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{item.ruleTitle}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.scheduledAtLabel}</td>
                      <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold">{item.expectedAtLabel}</td>
                      <td className="px-3 py-2">{item.delayedByQueueMinutes > 0 ? `${item.delayedByQueueMinutes} min` : 'Sem atraso'}</td>
                      <td className="px-3 py-2">{item.overdueByMinutes > 0 ? `${item.overdueByMinutes} min` : '-'}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

function ClientsTab() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const load = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    const res = await fetch(`/api/whatsapp/automation/clients?q=${encodeURIComponent(q)}&page=${pageNum}&limit=20`, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao carregar clientes')
    } else {
      setItems((prev) => append ? [...prev, ...(json.items || [])] : (json.items || []))
      setHasMore(json.hasMore || false)
      setTotal(json.total || 0)
      setPage(pageNum)
    }
    if (pageNum === 1) setLoading(false)
    else setLoadingMore(false)
  }, [q])

  useEffect(() => {
    const id = setTimeout(() => void load(1, false), 250)
    return () => clearTimeout(id)
  }, [load])

  const toggle = async (clienteId: string, enabled: boolean) => {
    const res = await fetch('/api/whatsapp/automation/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId, enabled }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao atualizar cliente')
      return
    }
    setItems((prev) => prev.map((it) => (it.id === clienteId ? { ...it, enabled } : it)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou WhatsApp" className="w-full md:w-96 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950" />
        {!loading && <span className="text-xs text-slate-500">{total} cliente{total !== 1 ? 's' : ''}</span>}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => (
              <div key={item.id} className={`relative flex flex-col justify-between p-3 rounded-2xl border bg-white dark:bg-slate-950 transition-colors ${item.enabled ? 'border-emerald-400/50 dark:border-emerald-500/30' : 'border-slate-200 dark:border-white/10'}`}>
                <div className="mb-2">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight line-clamp-2">{item.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.whatsapp || 'Sem WhatsApp'}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{item.activeLoans} contrato{item.activeLoans !== 1 ? 's' : ''}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {item.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <button
                    onClick={() => void toggle(item.id, !item.enabled)}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${item.enabled ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                  >
                    {item.enabled ? 'Desativar Messageria' : 'Ativar Messageria'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => void load(page + 1, true)}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum cliente encontrado.</p>
          )}
        </>
      )}
    </div>
  )
}

function ConfigTab() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const tags = useMemo(
    () => ['{cliente_nome}', '{contrato_id}', '{valor}', '{valor_pago}', '{saldo}', '{juros_mes}', '{juros_atraso_dia}', '{dias_atraso}', '{data_vencimento}', '{parcela}'],
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/whatsapp/automation/config', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao carregar configuração')
    } else {
      setConfig(json)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/whatsapp/automation/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao salvar')
    } else {
      setConfig(json)
      toast.success('Configuração salva')
    }
    setSaving(false)
  }

  const insertTag = (ruleId: string, tag: string) => {
    setConfig((prev: any) => ({
      ...prev,
      rules: prev.rules.map((r: any) => (r.id === ruleId ? { ...r, template: `${r.template}${tag}` } : r)),
    }))
  }

  if (loading || !config) return <div className="text-sm text-slate-500">Carregando...</div>

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 grid md:grid-cols-4 gap-3">
        <label className="text-xs font-black text-slate-600">Automação ligada
          <select value={String(config.enabled)} onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent">
            <option value="true">Ativa</option>
            <option value="false">Pausada</option>
          </select>
        </label>
        <label className="text-xs font-black text-slate-600">Intervalo por cliente (min)
          <input type="number" value={config.minIntervalMinutes} onChange={(e) => setConfig({ ...config, minIntervalMinutes: Number(e.target.value || 240) })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent" />
          <span className="mt-1 block text-[11px] font-medium text-slate-500">Tempo minimo antes de mandar outra mensagem para o mesmo cliente.</span>
        </label>
        <label className="text-xs font-black text-slate-600">Intervalo geral entre disparos (min)
          <input type="number" value={config.queueGapMinutes ?? 0} onChange={(e) => setConfig({ ...config, queueGapMinutes: Number(e.target.value || 0) })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent" />
          <span className="mt-1 block text-[11px] font-medium text-slate-500">Espaco entre uma mensagem e outra na fila geral. Use 0 para nao espaciar.</span>
        </label>
        <label className="text-xs font-black text-slate-600">Enviar finais de semana
          <select value={String(config.sendOnWeekends)} onChange={(e) => setConfig({ ...config, sendOnWeekends: e.target.value === 'true' })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent">
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </select>
        </label>
      </div>

      {config.rules.map((rule: any) => (
        <div key={rule.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 space-y-3">
          <div className="grid md:grid-cols-5 gap-2">
            <input value={rule.title} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, title: e.target.value } : r)) })} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm font-black md:col-span-2" />
            <input value={rule.sendTime} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, sendTime: e.target.value } : r)) })} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm" />
            <input
              type="number"
              value={rule.offsetDays}
              readOnly
              disabled
              title="Valor apenas para visualizacao"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 text-sm text-slate-500 cursor-not-allowed"
            />
            <select value={String(rule.enabled)} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, enabled: e.target.value === 'true' } : r)) })} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm">
              <option value="true">Ativa</option>
              <option value="false">Pausada</option>
            </select>
          </div>
          <textarea value={rule.template} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, template: e.target.value } : r)) })} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm" />
          <p className="text-[11px] text-slate-500">Use <span className="font-black">{'{parcela}'}</span> para renderizar no formato 2 de 20.</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button key={tag} onClick={() => insertTag(rule.id, tag)} className="px-2 py-1 rounded-lg text-[11px] font-black border border-slate-200 dark:border-white/10">{tag}</button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-xl bg-gold-600 text-white text-sm font-black">{saving ? 'Salvando...' : 'Salvar configuração'}</button>
    </div>
  )
}
