'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Calendar, Search, User, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ChargeFormData = {
  clienteId: string
  usuarioId: string
  valor: number
  jurosMes: number
  vencimento: string
  observacao: string
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
  const queryLower = query.toLowerCase()
  const queryDigits = query.replace(/\D/g, '')
  const sortedResults = [...results].sort((a, b) => {
    const score = (c: { nome: string; cpf?: string | null; whatsapp?: string | null }) => {
      const cpf = (c.cpf ?? '').replace(/\D/g, '')
      const whats = (c.whatsapp ?? '').replace(/\D/g, '')
      if (queryDigits && (cpf === queryDigits || whats === queryDigits)) return 300
      if (queryDigits && (cpf.startsWith(queryDigits) || whats.startsWith(queryDigits))) return 200
      if (queryLower && c.nome.toLowerCase().includes(queryLower)) return 100
      return 0
    }
    const diff = score(b) - score(a)
    if (diff !== 0) return diff
    return a.nome.localeCompare(b.nome)
  })

  const disableSubmit = loading || formData.clienteId.trim() === '' || !Number.isFinite(formData.valor) || formData.valor <= 0
  const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
  const parseBRL = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const cents = digits ? Number(digits) : 0
    return cents / 100
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <div className="absolute inset-0 flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500">Associe a cobrança ao cliente e registre valores.</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar modal"
                  className="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Cliente</label>
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      placeholder="Buscar por nome, CPF ou WhatsApp (mín. 3)"
                    />
                  </div>

                  {formData.clienteId ? (
                    <div className="flex items-center justify-between px-4 py-2 rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 text-slate-400" />
                        <p className="text-sm font-black text-slate-900 truncate">
                          {(clientes.find((c) => c.id === formData.clienteId)?.nome as any) ||
                            (results.find((c) => c.id === formData.clienteId)?.nome as any) ||
                            'Cliente selecionado'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, clienteId: '' }))}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                        aria-label="Remover cliente selecionado"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {clientQuery.trim().length > 0 && clientQuery.trim().length < 3
                        ? 'Digite ao menos 3 caracteres'
                        : searchLoading
                          ? 'Pesquisando...'
                          : results.length
                            ? `${results.length} resultados`
                            : ''}
                    </div>
                    {hasMore && clientQuery.trim().length >= 3 && (
                      <button
                        type="button"
                        disabled={searchLoading}
                        onClick={() => fetchClients(lastQueryRef.current || clientQuery, (lastPageRef.current || page) + 1, true)}
                        className="text-xs font-black text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        Carregar mais
                      </button>
                    )}
                  </div>

                  {searchError ? <p className="text-xs font-black text-red-600">{searchError}</p> : null}

                  {clientQuery.trim().length >= 3 && (
                    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden max-h-60 overflow-y-auto">
                      {results.length === 0 && !searchLoading ? (
                        <div className="p-4 text-sm text-slate-600">Nenhum cliente encontrado.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {sortedResults.map((c) => {
                            const isSelected = formData.clienteId === c.id
                            const cpfDigits = (c.cpf ?? '').replace(/\D/g, '')
                            const whatsDigits = (c.whatsapp ?? '').replace(/\D/g, '')
                            const meta = [cpfDigits ? `CPF ${cpfDigits}` : null, whatsDigits ? `Whats ${whatsDigits}` : null].filter(Boolean).join(' • ')
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, clienteId: c.id }))}
                                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                              >
                                <p className="text-sm font-black text-slate-900 truncate">{c.nome}</p>
                                <p className="text-[10px] font-bold text-slate-500 truncate">{meta || '—'}</p>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {userRole === 'ADMIN' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Agente Responsável</label>
                    <select
                      value={formData.usuarioId}
                      onChange={(e) => setFormData((p) => ({ ...p, usuarioId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
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
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Vencimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="date"
                        value={formData.vencimento}
                        onChange={(e) => setFormData((p) => ({ ...p, vencimento: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Observação</label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData((p) => ({ ...p, observacao: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all min-h-[90px]"
                    placeholder="Se preencher, status vira NEGOCIAÇÃO."
                  />
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={disableSubmit}
                    className="py-3 px-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : editing ? 'Atualizar cobrança' : 'Salvar cobrança'}
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

