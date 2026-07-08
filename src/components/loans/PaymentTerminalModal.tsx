'use client'

import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Wallet, X } from 'lucide-react'
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates'

interface PaymentTerminalLoan {
  id: string
  cliente: {
    nome: string
    whatsapp: string
  }
  vencimento?: Date | string | null
  jurosMes?: number
  jurosAtrasoDia?: number
}

interface PaymentTerminalModalProps {
  open: boolean
  loan: PaymentTerminalLoan | null
  totalDevido: number
  monthlyPaymentAmount: number
  pagamento: string
  onPagamentoChange: (value: string) => void
  pending: boolean
  onClose: () => void
  onFillMonthlyPayment: () => void
  onSubmit: () => void
  formatBRL: (value: number) => string
  formatDate: (value: Date | string | null | undefined) => string
}

export function PaymentTerminalModal({
  open,
  loan,
  totalDevido,
  monthlyPaymentAmount,
  pagamento,
  onPagamentoChange,
  pending,
  onClose,
  onFillMonthlyPayment,
  onSubmit,
  formatBRL,
  formatDate,
}: PaymentTerminalModalProps) {
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
      {open && loan ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <motion.button
            type="button"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
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
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl"
          >
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-600/20 blur-[120px]" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-indigo-600/20 blur-[120px]" />

            <div className="relative z-10 border-b border-white/10 px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Terminal de Cobrança Ativo
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">Contrato #{loan.id.slice(0, 8).toUpperCase()}</h3>
                    <p className="mt-1 text-sm text-white/65">{loan.cliente.nome}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-white/5 p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative z-10 space-y-6 px-6 py-6">
              <WhatsAppTemplates
                clienteNome={loan.cliente.nome}
                contratoId={`#${loan.id.slice(0, 8).toUpperCase()}`}
                vencimento={formatDate(loan.vencimento)}
                valorPendente={formatBRL(totalDevido)}
                whatsapp={loan.cliente.whatsapp || ''}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Taxa Mensal</p>
                  <p className="mt-2 text-lg font-black">{(loan.jurosMes ?? 0).toString().replace('.', ',')}%</p>
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Atraso/Dia</p>
                  <p className="mt-2 text-lg font-black">{(loan.jurosAtrasoDia ?? 0).toString().replace('.', ',')}%</p>
                </div>
                <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Pagamento do Mês</p>
                  <p className="mt-2 text-lg font-black text-emerald-300">{formatBRL(monthlyPaymentAmount)}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Registrar Recebimento</p>
                <div className="mt-4 space-y-3">
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-white/20 group-focus-within:text-white/50 transition-colors">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pagamento}
                      onChange={(event) => onPagamentoChange(event.target.value)}
                      placeholder="0,00"
                      disabled={pending}
                      className="w-full rounded-[1.75rem] border border-white/10 bg-slate-900/80 py-4 pl-14 pr-4 text-xl font-black text-white outline-none transition-all placeholder:text-white/10 focus:ring-4 focus:ring-emerald-500/20"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onFillMonthlyPayment}
                    disabled={pending}
                    className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-300 transition-all hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Wallet className="h-4 w-4" />
                    Pagamento Integral do Mês
                  </button>

                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={pending || !pagamento}
                    className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-emerald-600 px-4 py-4 text-xs font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {pending ? 'Confirmando...' : 'Confirmar Pagamento'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
