'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  CheckSquare,
  Download,
  FileArchive,
  FolderDown,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react'

type BatchLoanStatus = 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' | 'CANCELADO'
type BatchFilter = 'ALL' | 'HAS_DUE_DATE' | 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' | 'CANCELADO'

interface BatchLoanItem {
  id: string
  clienteNome: string
  status: BatchLoanStatus
  vencimento?: string | null
  valor: number
}

interface BatchDossieModalProps {
  open: boolean
  loading: boolean
  loans: BatchLoanItem[]
  onClose: () => void
  onConfirm: (loanIds: string[], password?: string) => void
}

const FILTER_OPTIONS: Array<{ id: BatchFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'HAS_DUE_DATE', label: 'Com vencimento' },
  { id: 'NEGOCIACAO', label: 'Em negociação' },
  { id: 'ABERTO', label: 'Abertos' },
  { id: 'QUITADO', label: 'Quitados' },
  { id: 'CANCELADO', label: 'Cancelados' },
]

const STATUS_LABELS: Record<BatchLoanStatus, string> = {
  ABERTO: 'Aberto',
  NEGOCIACAO: 'Negociação',
  QUITADO: 'Quitado',
  CANCELADO: 'Cancelado',
}

const STATUS_BADGES: Record<BatchLoanStatus, string> = {
  ABERTO: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  NEGOCIACAO: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  QUITADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  CANCELADO: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
}

export function BatchDossieModal({
  open,
  loading,
  loans,
  onClose,
  onConfirm,
}: BatchDossieModalProps) {
  const [protectZip, setProtectZip] = useState(false)
  const [password, setPassword] = useState('')
  const [activeFilter, setActiveFilter] = useState<BatchFilter>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>(loans.map((loan) => loan.id))

  const visibleLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (activeFilter === 'ALL') return true
      if (activeFilter === 'HAS_DUE_DATE') return Boolean(loan.vencimento)
      return loan.status === activeFilter
    })
  }, [activeFilter, loans])

  const visibleLoanIds = useMemo(() => visibleLoans.map((loan) => loan.id), [visibleLoans])
  const selectedVisibleCount = useMemo(
    () => visibleLoanIds.filter((loanId) => selectedIds.includes(loanId)).length,
    [selectedIds, visibleLoanIds]
  )
  const totalSelectedValue = useMemo(
    () => loans.reduce((sum, loan) => (selectedIds.includes(loan.id) ? sum + loan.valor : sum), 0),
    [loans, selectedIds]
  )

  const allVisibleSelected = visibleLoans.length > 0 && selectedVisibleCount === visibleLoans.length
  const totalSelected = selectedIds.length

  const canSubmit = useMemo(() => {
    if (totalSelected <= 0 || loading) return false
    if (!protectZip) return true
    return password.trim().length >= 4
  }, [loading, password, protectZip, totalSelected])

  const toggleLoan = (loanId: string) => {
    setSelectedIds((current) =>
      current.includes(loanId) ? current.filter((id) => id !== loanId) : [...current, loanId]
    )
  }

  const toggleVisibleLoans = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleLoanIds.includes(id))
      }

      const next = new Set(current)
      visibleLoanIds.forEach((id) => next.add(id))
      return Array.from(next)
    })
  }

  const selectAllLoans = () => setSelectedIds(loans.map((loan) => loan.id))
  const clearAllLoans = () => setSelectedIds([])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Sem vencimento'

  useEffect(() => {
    if (!open) return

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4">
          <motion.button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar modal de dossiês"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md disabled:cursor-wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-dossie-title"
            className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
          >
            <div className="shrink-0 border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.04),rgba(255,255,255,0))] px-5 py-5 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.6),rgba(2,6,23,0.92))] sm:px-8 sm:py-7">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-gold-700 dark:border-gold-400/20 dark:bg-white/5 dark:text-gold-300">
                    <FileArchive className="h-3.5 w-3.5" />
                    Exportação Completa
                  </div>
                  <div>
                    <h3 id="batch-dossie-title" className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                      Pacote de Dossiês
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  aria-label="Fechar"
                  className="shrink-0 rounded-2xl bg-white/80 p-3 text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="grid min-h-full gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="min-w-0 space-y-4 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total no lote</p>
                      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{loans.length}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Selecionados</p>
                      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{totalSelected}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Valor selecionado</p>
                      <p className="mt-3 text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(totalSelectedValue)}</p>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950 lg:flex-1 lg:overflow-hidden">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Filtrar o Lote</h4>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {visibleLoans.length} contrato(s) nesta visualização. A seleção permanece mesmo ao trocar o filtro.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 xl:justify-end">
                        {FILTER_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setActiveFilter(option.id)}
                            className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                              activeFilter === option.id
                                ? 'bg-slate-900 text-white dark:bg-gold-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-y border-slate-100 py-3 dark:border-white/10">
                      <button
                        type="button"
                        onClick={toggleVisibleLoans}
                        disabled={visibleLoans.length === 0}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        {allVisibleSelected ? 'Desmarcar visíveis' : 'Marcar visíveis'}
                      </button>
                      <button
                        type="button"
                        onClick={selectAllLoans}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        Marcar todos
                      </button>
                      <button
                        type="button"
                        onClick={clearAllLoans}
                        className="rounded-2xl border border-rose-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-600 transition-all hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      >
                        Limpar seleção
                      </button>
                    </div>

                    <div className="mt-4 min-h-[18rem] max-h-[45dvh] overflow-y-auto overscroll-contain pr-1 touch-pan-y lg:min-h-0 lg:max-h-[calc(100dvh-26rem)] lg:flex-1">
                      {visibleLoans.length > 0 ? (
                        visibleLoans.map((loan, index) => {
                          const checked = selectedIds.includes(loan.id)

                          return (
                            <button
                              key={loan.id}
                              type="button"
                              onClick={() => toggleLoan(loan.id)}
                              className={`flex w-full items-start gap-3 rounded-[1.15rem] border px-3 py-3 text-left transition-all ${
                                checked
                                  ? 'border-gold-300 bg-gold-50/60 dark:border-gold-500/30 dark:bg-gold-500/10'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/5'
                              }`}
                            >
                              <div className="pt-0.5">
                                {checked ? (
                                  <CheckSquare className="h-5 w-5 text-gold-600 dark:text-gold-300" aria-hidden="true" />
                                ) : (
                                  <Square className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold-600">
                                      Contrato {String(index + 1).padStart(2, '0')}
                                    </p>
                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${STATUS_BADGES[loan.status]}`}>
                                      {STATUS_LABELS[loan.status]}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(loan.valor)}</span>
                                </div>
                                <p className="mt-1 truncate text-[13px] font-black text-slate-900 dark:text-white">{loan.clienteNome}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-bold">#{loan.id.slice(0, 8).toUpperCase()}</span>
                                  <span className="inline-flex items-center gap-1 font-bold">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {formatDate(loan.vencimento)}
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })
                      ) : (
                        <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                          Nenhum contrato encontrado para esse filtro.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="min-h-[16rem] max-h-[calc(100dvh-14rem)] self-start overflow-hidden">
                  <div className="h-full space-y-4 overflow-y-auto overscroll-contain pr-1 touch-pan-y">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-slate-900 p-3 text-white dark:bg-gold-600">
                          <FolderDown className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Resumo</h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            O zip será separado por contrato, com dossiê PDF e anexos.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Vai baixar</p>
                          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{totalSelected} contrato(s)</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Filtro ativo</p>
                          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                            {FILTER_OPTIONS.find((option) => option.id === activeFilter)?.label}
                          </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Valor</p>
                          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatCurrency(totalSelectedValue)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Proteção Opcional</h4>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Ative uma senha para o zip quando o pacote for circular fora do time.
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Criptografar zip</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Proteção AES-256 opcional</p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={protectZip}
                          onClick={() => setProtectZip((value) => !value)}
                          disabled={loading}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                            protectZip ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                              protectZip ? 'translate-x-9' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                        <ShieldCheck className={`h-5 w-5 ${protectZip ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {protectZip ? 'Zip protegido com AES-256.' : 'Zip sem senha.'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {protectZip ? 'Use no mínimo 4 caracteres.' : 'Ative a proteção se precisar compartilhar externamente.'}
                          </p>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {protectZip ? (
                          <motion.div
                            className="mt-4 overflow-hidden"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                              <KeyRound className="h-3.5 w-3.5" />
                              Senha do Zip
                            </label>
                            <div className="relative">
                              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Ex.: contrato2026"
                                disabled={loading}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                            {password.trim().length > 0 && password.trim().length < 4 ? (
                              <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">Use pelo menos 4 caracteres.</p>
                            ) : null}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Pronto para exportar</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {totalSelected > 0
                      ? `${totalSelected} contrato(s) selecionado(s) em ${formatCurrency(totalSelectedValue)}`
                      : 'Selecione pelo menos um contrato para baixar.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => onConfirm(selectedIds, protectZip ? password.trim() : undefined)}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-slate-900 px-5 py-4 text-xs font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gold-600 dark:hover:bg-gold-700 sm:w-auto sm:min-w-[17rem]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {loading ? 'Montando Pacote...' : 'Baixar Selecionados'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
