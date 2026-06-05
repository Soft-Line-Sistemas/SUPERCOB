'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Loader2, MessageCircle, Package, Phone, X } from 'lucide-react'

interface ChargeDeliveryLoan {
  id: string
  cliente: {
    nome: string
  }
}

interface ChargeDeliveryModalProps {
  open: boolean
  loan: ChargeDeliveryLoan | null
  downloading: boolean
  sendingWhatsapp: boolean
  onClose: () => void
  onDownload: (loanId: string) => void
  onSendWhatsapp: (loanId: string, phone: string) => void
}

function maskWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function ChargeDeliveryModal({
  open,
  loan,
  downloading,
  sendingWhatsapp,
  onClose,
  onDownload,
  onSendWhatsapp,
}: ChargeDeliveryModalProps) {
  const [mode, setMode] = useState<'download' | 'whatsapp'>('download')
  const [phone, setPhone] = useState('')

  const phoneDigits = useMemo(() => phone.replace(/\D/g, ''), [phone])
  const canSendWhatsapp = phoneDigits.length === 11 && !sendingWhatsapp

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
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <motion.button
            type="button"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
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
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.16),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.04),rgba(255,255,255,0))] px-6 py-6 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.6),rgba(2,6,23,0.92))]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-red-700 dark:border-red-400/20 dark:bg-white/5 dark:text-red-300">
                    <Package className="h-3.5 w-3.5" />
                    Enviar Para Cobrança
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">Contrato #{loan.id.slice(0, 8).toUpperCase()}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loan.cliente.nome}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-white/80 p-3 text-slate-500 transition-colors hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode('download')}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                    mode === 'download'
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-gold-600 dark:bg-gold-600'
                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Baixar ZIP</p>
                      <p className={`mt-1 text-xs ${mode === 'download' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        Faz o download local do pacote desse contrato.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('whatsapp')}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                    mode === 'whatsapp'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Enviar WhatsApp</p>
                      <p className={`mt-1 text-xs ${mode === 'whatsapp' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        Gera o ZIP e envia como anexo no WhatsApp.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {mode === 'whatsapp' ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    Número do WhatsApp
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phone}
                    onChange={(event) => setPhone(maskWhatsappPhone(event.target.value))}
                    placeholder="(99) 99999-9999"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    O número digitado será convertido automaticamente para o identificador usado pelo WhatsApp Web.
                  </p>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  O mesmo pacote do dossiê será gerado para este contrato, com PDF, anexos e documentos do cliente.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white/95 px-6 py-4 dark:border-white/10 dark:bg-slate-950/95">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[1.25rem] border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>

                {mode === 'download' ? (
                  <button
                    type="button"
                    onClick={() => onDownload(loan.id)}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 rounded-[1.25rem] bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-600 dark:hover:bg-gold-700"
                  >
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloading ? 'Preparando...' : 'Baixar Agora'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendWhatsapp(loan.id, phone)}
                    disabled={!canSendWhatsapp}
                    className="flex items-center justify-center gap-2 rounded-[1.25rem] bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {sendingWhatsapp ? 'Enviando...' : 'Enviar no WhatsApp'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
