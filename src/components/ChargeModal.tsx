'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Calendar, Search, User, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { includesSearchText } from '@/lib/search-text'

type ChargeFormData = {
  clienteId: string
  usuarioId: string
  valor: number
  quantidadeParcelas: number
  jurosMes: number
  jurosAtrasoDia: number
  vencimento: string
  observacao: string
  tipoContrato?: 'EMPRESTIMO' | 'ACORDO'
  valorEntrada?: number
  vencimentoEntrada?: string
  regraVencimentoParcelas?: 'PAGAMENTO_ENTRADA' | 'DATA_LANCAMENTO'
  valorParcela?: number
}

export function ChargeModal({
  open,
  title,
  clientes,
  colaboradores,
  userRole,
  editing,
  loading,
  formData,
  setFormData,
  parcelarValor,
  onParcelarValorChange,
  parcelingMode,
  onParcelingModeChange,
  parcelingModeOptions,
  remainingGrossAmountLabel,
  currentInstallment,
  currentInstallmentOptions,
  onCurrentInstallmentChange,
  discountPaidInstallments,
  onDiscountPaidInstallmentsChange,
  discountedPaidInstallmentsLabel,
  expectedInterestPercent,
  expectedInterestOptions,
  onExpectedInterestPercentChange,
  onQuantidadeParcelasChange,
  installmentHint,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  clientes: { id: string; nome: string; email?: string | null; whatsapp?: string | null }[]
  colaboradores: { id: string; nome: string }[]
  userRole: 'ADMIN' | 'OPERADOR'
  editing: boolean
  loading: boolean
  formData: ChargeFormData
  setFormData: React.Dispatch<React.SetStateAction<ChargeFormData>>
  parcelarValor: boolean
  onParcelarValorChange: (checked: boolean) => void
  parcelingMode: 'integral' | 'remaining'
  onParcelingModeChange: (value: 'integral' | 'remaining') => void
  parcelingModeOptions: Array<{ value: 'integral' | 'remaining'; label: string; disabled?: boolean }>
  remainingGrossAmountLabel: string | null
  currentInstallment: number
  currentInstallmentOptions: number[]
  onCurrentInstallmentChange: (value: number) => void
  discountPaidInstallments: boolean
  onDiscountPaidInstallmentsChange: (checked: boolean) => void
  discountedPaidInstallmentsLabel: string | null
  expectedInterestPercent: string
  expectedInterestOptions: number[]
  onExpectedInterestPercentChange: (value: string) => void
  onQuantidadeParcelasChange: (value: string) => void
  installmentHint: string | null
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const [clientQuery, setClientQuery] = useState('')
  const [results, setResults] = useState<{ id: string; nome: string; cpf?: string | null; whatsapp?: string | null }[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastQueryRef = useRef<string>('')
  const lastPageRef = useRef<number>(1)

  const isAcordoMode = formData.tipoContrato === 'ACORDO'

  const handleAddDaysToEntrada = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const formatted = `${yyyy}-${mm}-${dd}`
    setFormData((p) => ({ ...p, vencimentoEntrada: formatted, vencimento: p.vencimento || formatted }))
  }

  useEffect(() => {
    if (!open) return
    setClientQuery('')
    setResults([])
    setPage(1)
    setHasMore(false)
    setSearchLoading(false)
    lastQueryRef.current = ''
    lastPageRef.current = 1
  }, [open, clientes])

  const fetchClients = async (q: string, nextPage: number, append: boolean) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSearchLoading(true)
    setSearchError(null)
    try {
      const sp = new URLSearchParams()
      if (q.trim() !== '') sp.set('q', q.trim())
      sp.set('page', String(nextPage))
      sp.set('limit', '30')
      const res = await fetch(`/api/clientes?${sp.toString()}`, { signal: controller.signal })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const items = (data?.items ?? []) as any[]
      const mapped = items.map((c) => ({ id: c.id, nome: c.nome, cpf: c.cpf, whatsapp: c.whatsapp }))
      setResults((prev) => (append ? [...prev, ...mapped] : mapped))
      setHasMore(!!data?.hasMore)
      setPage(nextPage)
      lastQueryRef.current = q
      lastPageRef.current = nextPage
    } catch {
      if (!append) setResults([])
      setHasMore(false)
      setSearchError('Falha ao buscar clientes. Tente novamente.')
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const q = clientQuery
    const t = window.setTimeout(() => {
      const trimmed = q.trim()
      const digits = trimmed.replace(/\D/g, '')
      const shouldSearch = trimmed.length >= 3 || digits.length >= 3
      if (!shouldSearch) {
        setResults([])
        setHasMore(false)
        setPage(1)
        lastQueryRef.current = ''
        lastPageRef.current = 1
        return
      }
      fetchClients(trimmed, 1, false)
    }, 250)
    return () => window.clearTimeout(t)
  }, [clientQuery, clientes, open])

  const query = clientQuery.trim()
  const queryDigits = query.replace(/\D/g, '')
  const sortedResults = [...results].sort((a, b) => {
    const score = (c: { nome: string; cpf?: string | null; whatsapp?: string | null }) => {
      const cpf = (c.cpf ?? '').replace(/\D/g, '')
      const whats = (c.whatsapp ?? '').replace(/\D/g, '')
      if (queryDigits && (cpf === queryDigits || whats === queryDigits)) return 300
      if (queryDigits && (cpf.startsWith(queryDigits) || whats.startsWith(queryDigits))) return 200
      if (query && includesSearchText(c.nome, query)) return 100
      return 0
    }
    const diff = score(b) - score(a)
    if (diff !== 0) return diff
    return a.nome.localeCompare(b.nome)
  })

  const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
  const parseBRL = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const cents = digits ? Number(digits) : 0
    return cents / 100
  }

  const acordoTotal = (formData.valorEntrada || 0) + (Number(formData.quantidadeParcelas || 0) * Number(formData.valorParcela || 0))

  const disableSubmit = isAcordoMode
    ? loading ||
      formData.clienteId.trim() === '' ||
      acordoTotal <= 0 ||
      Number(formData.quantidadeParcelas || 0) <= 0 ||
      Number(formData.valorParcela || 0) <= 0 ||
      ((formData.valorEntrada || 0) > 0 && !(formData.vencimentoEntrada || formData.vencimento))
    : loading ||
      formData.clienteId.trim() === '' ||
      !Number.isFinite(formData.valor) ||
      formData.valor <= 0 ||
      formData.vencimento.trim() === ''

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        >
          <div className="w-full max-w-xl my-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pt-5">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl dark:bg-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({
                        ...p,
                        tipoContrato: 'EMPRESTIMO',
                        jurosMes: p.jurosMes || 0,
                      }))
                    }}
                    className={`py-2.5 px-4 text-xs font-black rounded-xl transition-all ${
                      !isAcordoMode
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Empréstimo Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => {
                        const qtd = p.quantidadeParcelas > 0 ? p.quantidadeParcelas : 10
                        const vParc = p.valorParcela || (p.valor > 0 ? Math.round(p.valor / qtd) : 0)
                        return {
                          ...p,
                          tipoContrato: 'ACORDO',
                          jurosMes: 0,
                          jurosAtrasoDia: 0,
                          quantidadeParcelas: qtd,
                          valorParcela: vParc,
                          valorEntrada: p.valorEntrada || 0,
                          regraVencimentoParcelas: p.regraVencimentoParcelas || 'PAGAMENTO_ENTRADA',
                          vencimentoEntrada: p.vencimentoEntrada || p.vencimento || '',
                        }
                      })
                      onParcelarValorChange(true)
                    }}
                    className={`py-2.5 px-4 text-xs font-black rounded-xl transition-all ${
                      isAcordoMode
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    🤝 Acordo / Renegociação
                  </button>
                </div>
              </div>

              <form onSubmit={onSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Cliente</label>
                  {formData.clienteId ? (
                    <div className="flex items-center justify-between p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl dark:border-blue-500/20 dark:bg-blue-500/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white">
                            {clientes.find((c) => c.id === formData.clienteId)?.nome ||
                              results.find((c) => c.id === formData.clienteId)?.nome ||
                              'Cliente Selecionado'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {clientes.find((c) => c.id === formData.clienteId)?.whatsapp ||
                              results.find((c) => c.id === formData.clienteId)?.whatsapp ||
                              ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, clienteId: '' }))}
                        className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={clientQuery}
                          onChange={(e) => setClientQuery(e.target.value)}
                          placeholder="Buscar por nome, CPF ou WhatsApp..."
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 rounded-2xl p-1 bg-slate-50/50 dark:border-white/10 dark:bg-slate-950/40">
                        {searchLoading && results.length === 0 ? (
                          <p className="p-3 text-xs text-slate-400 text-center">Buscando...</p>
                        ) : sortedResults.length > 0 ? (
                          sortedResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({ ...p, clienteId: c.id }))
                                setClientQuery('')
                              }}
                              className="w-full flex items-center justify-between p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-left text-xs font-bold text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200"
                            >
                              <span>{c.nome}</span>
                              <span className="text-[10px] text-slate-400">{c.whatsapp || c.cpf || ''}</span>
                            </button>
                          ))
                        ) : clientQuery.trim().length >= 3 ? (
                          <p className="p-3 text-xs text-slate-400 text-center">Nenhum cliente encontrado.</p>
                        ) : (
                          <p className="p-3 text-xs text-slate-400 text-center">Digite ao menos 3 letras para buscar.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {userRole === 'ADMIN' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Agente Responsável</label>
                    <select
                      value={formData.usuarioId}
                      onChange={(e) => setFormData((p) => ({ ...p, usuarioId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">Não atribuído</option>
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isAcordoMode ? (
                  <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider ml-1">Valor da Entrada (R$)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatBRL(formData.valorEntrada || 0)}
                          onChange={(e) => {
                            const next = parseBRL(e.target.value)
                            setFormData((p) => ({ ...p, valorEntrada: Number.isFinite(next) ? next : 0 }))
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 text-left outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="R$ 0,00"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider ml-1">Vencimento da Entrada</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="date"
                            value={formData.vencimentoEntrada || formData.vencimento || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setFormData((p) => ({ ...p, vencimentoEntrada: val, vencimento: val }))
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Atalhos de prazo:</span>
                      <button
                        type="button"
                        onClick={() => handleAddDaysToEntrada(0)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDaysToEntrada(15)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                      >
                        +15 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDaysToEntrada(20)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                      >
                        +20 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDaysToEntrada(30)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                      >
                        +30 dias
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider ml-1">
                        Início das Parcelas
                      </label>
                      <select
                        value={formData.regraVencimentoParcelas || 'PAGAMENTO_ENTRADA'}
                        onChange={(e) => setFormData((p) => ({ ...p, regraVencimentoParcelas: e.target.value as any }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="PAGAMENTO_ENTRADA">⚡ 30 dias a partir do pagamento da entrada (automático)</option>
                        <option value="DATA_LANCAMENTO">📅 A partir da data deste acordo (fixo 30 em 30 dias)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider ml-1">Quantidade de Parcelas</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={formData.quantidadeParcelas > 0 ? String(formData.quantidadeParcelas) : ''}
                          onChange={(e) => {
                            const raw = Number(e.target.value)
                            setFormData((p) => ({ ...p, quantidadeParcelas: Number.isInteger(raw) && raw > 0 ? raw : 0 }))
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="Ex: 20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider ml-1">Valor de Cada Parcela (R$)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatBRL(formData.valorParcela || 0)}
                          onChange={(e) => {
                            const next = parseBRL(e.target.value)
                            setFormData((p) => ({ ...p, valorParcela: Number.isFinite(next) ? next : 0 }))
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 text-left outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-100/60 p-3.5 text-xs text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-100 space-y-1">
                      <div className="flex items-center justify-between font-black text-sm">
                        <span>Total do Acordo:</span>
                        <span className="text-base text-blue-700 dark:text-blue-300">{formatBRL(acordoTotal)}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {formData.valorEntrada ? `Entrada de ${formatBRL(formData.valorEntrada)} + ` : ''}
                        {formData.quantidadeParcelas}x de {formatBRL(formData.valorParcela || 0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Valor (R$)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formatBRL(formData.valor)}
                        onChange={(e) => {
                          const next = parseBRL(e.target.value)
                          setFormData((p) => ({ ...p, valor: Number.isFinite(next) ? next : 0 }))
                        }}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 text-left outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Juros ao mês (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          Number.isFinite(formData.jurosMes) && formData.jurosMes !== 0
                            ? String(formData.jurosMes)
                            : ''
                        }
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            setFormData((p) => ({ ...p, jurosMes: 0 }))
                            return
                          }
                          const next = Number(raw)
                          setFormData((p) => ({ ...p, jurosMes: Number.isFinite(next) ? next : 0 }))
                        }}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="0"
                      />
                    </div>
                    <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={parcelarValor}
                        onChange={(e) => onParcelarValorChange(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Parcelar valor
                    </label>
                    {parcelarValor ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Modalidade</label>
                          <select
                            value={parcelingMode}
                            onChange={(e) => onParcelingModeChange(e.target.value as 'integral' | 'remaining')}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                          >
                            {parcelingModeOptions.map((option) => (
                              <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {parcelingMode === 'integral' ? (
                          <div className="space-y-1.5">
                            <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Receita esperada (%)</label>
                            <select
                              value={expectedInterestPercent}
                              onChange={(e) => onExpectedInterestPercentChange(e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                            >
                              {expectedInterestOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}%
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor bruto (R$)</label>
                            <input
                              type="text"
                              value={remainingGrossAmountLabel ?? '-'}
                              readOnly
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Parcelas</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              Number.isFinite(formData.quantidadeParcelas) && formData.quantidadeParcelas > 0
                                ? String(formData.quantidadeParcelas)
                                : ''
                            }
                            onChange={(e) => onQuantidadeParcelasChange(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                            placeholder="Ex: 20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Parcela atual</label>
                          <select
                            value={currentInstallment}
                            onChange={(e) => onCurrentInstallmentChange(Number(e.target.value))}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                            disabled={currentInstallmentOptions.length === 0}
                          >
                            {(currentInstallmentOptions.length > 0 ? currentInstallmentOptions : [0]).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={discountPaidInstallments}
                            onChange={(e) => onDiscountPaidInstallmentsChange(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            disabled={currentInstallment <= 0}
                          />
                          Descontar as parcelas ja pagas?
                        </label>
                      </>
                    ) : null}

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Atraso ao dia (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          Number.isFinite(formData.jurosAtrasoDia) && formData.jurosAtrasoDia !== 0
                            ? String(formData.jurosAtrasoDia)
                            : ''
                        }
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            setFormData((p) => ({ ...p, jurosAtrasoDia: 0 }))
                            return
                          }
                          const next = Number(raw)
                          setFormData((p) => ({ ...p, jurosAtrasoDia: Number.isFinite(next) ? next : 0 }))
                        }}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Vencimento</label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          required
                          value={formData.vencimento}
                          onChange={(e) => setFormData((p) => ({ ...p, vencimento: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {parcelarValor && !isAcordoMode && installmentHint ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                    {installmentHint}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Observação</label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData((p) => ({ ...p, observacao: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all min-h-[90px]"
                    placeholder="Observações do contrato ou da renegociação..."
                  />
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={disableSubmit}
                    className="py-3 px-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : editing ? 'Atualizar cobrança' : isAcordoMode ? 'Firmar acordo' : 'Salvar cobrança'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
