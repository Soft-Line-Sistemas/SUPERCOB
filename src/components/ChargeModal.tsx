'use client'

import React, { useMemo, useState } from 'react'
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
  const filteredClientes = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (q === '') return clientes
    const qDigits = q.replace(/\D/g, '')
    return clientes.filter((c) => {
      const nameOk = c.nome.toLowerCase().includes(q)
      const emailOk = (c.email ?? '').toLowerCase().includes(q)
      const whatsOk = qDigits ? (c.whatsapp ?? '').replace(/\D/g, '').includes(qDigits) : false
      return nameOk || emailOk || whatsOk
    })
  }, [clientes, clientQuery])

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
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
                    <div className="relative group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        value={clientQuery}
                        onChange={(e) => setClientQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                        placeholder="Buscar cliente..."
                      />
                    </div>

                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                        required
                        value={formData.clienteId}
                        onChange={(e) => setFormData((p) => ({ ...p, clienteId: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      >
                        <option value="">Selecione</option>
                        {filteredClientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {clientes.length === 0 && (
                    <div className="text-xs text-slate-500 font-bold">
                      Nenhum cliente disponível para seleção.
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
                      value={Number.isFinite(formData.jurosMes) ? formData.jurosMes : 0}
                      onChange={(e) => {
                        const next = e.target.value === '' ? 0 : Number(e.target.value)
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

