'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, Send, Settings2, Users, LayoutDashboard, QrCode } from 'lucide-react'
import { WhatsAppConnectionPage } from '@/components/WhatsAppConnectionPage'

type Tab = 'overview' | 'clients' | 'config' | 'connection'

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
  }
  situations: Situation[]
  recent: Array<any>
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
        <TabBtn current={tab} value="connection" icon={QrCode} label="Conexão" onClick={setTab} />
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'config' && <ConfigTab />}
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
                  <p className="text-xs text-slate-500">Próximo disparo previsto: {new Date(s.nextRunAt).toLocaleString('pt-BR')}</p>
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

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/whatsapp/automation/clients?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Erro ao carregar clientes')
    } else {
      setItems(json.items || [])
    }
    setLoading(false)
  }, [q])

  useEffect(() => {
    const id = setTimeout(() => void load(), 250)
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
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou WhatsApp" className="w-full md:w-96 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950" />
      <div className="space-y-2">
        {loading ? <div className="text-sm text-slate-500">Carregando...</div> : null}
        {items.map((item) => (
          <div key={item.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{item.nome}</p>
              <p className="text-xs text-slate-500">{item.whatsapp || 'Sem WhatsApp'} • Contratos ativos: {item.activeLoans}</p>
            </div>
            <button onClick={() => void toggle(item.id, !item.enabled)} className={`px-3 py-2 rounded-lg text-xs font-black ${item.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'}`}>
              {item.enabled ? 'Enviando' : 'Pausado'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfigTab() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const tags = useMemo(
    () => ['{cliente_nome}', '{contrato_id}', '{valor}', '{valor_pago}', '{saldo}', '{juros_mes}', '{juros_atraso_dia}', '{dias_atraso}', '{data_vencimento}'],
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
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 grid md:grid-cols-3 gap-3">
        <label className="text-xs font-black text-slate-600">Automação ligada
          <select value={String(config.enabled)} onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent">
            <option value="true">Ativa</option>
            <option value="false">Pausada</option>
          </select>
        </label>
        <label className="text-xs font-black text-slate-600">Intervalo mínimo (min)
          <input type="number" value={config.minIntervalMinutes} onChange={(e) => setConfig({ ...config, minIntervalMinutes: Number(e.target.value || 240) })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent" />
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
            <input type="number" value={rule.offsetDays} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, offsetDays: Number(e.target.value || 0) } : r)) })} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm" />
            <select value={String(rule.enabled)} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, enabled: e.target.value === 'true' } : r)) })} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm">
              <option value="true">Ativa</option>
              <option value="false">Pausada</option>
            </select>
          </div>
          <textarea value={rule.template} onChange={(e) => setConfig({ ...config, rules: config.rules.map((r: any) => (r.id === rule.id ? { ...r, template: e.target.value } : r)) })} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm" />
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
