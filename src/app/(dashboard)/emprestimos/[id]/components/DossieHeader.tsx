'use client'

import React from 'react'
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DossieHeaderProps {
  id: string
  status: string
  statusLabel: string
  statusPillClass: string
  createdAt: string
  isPending: boolean
  canCancel: boolean
  canFinish: boolean
  myRole?: string
  handleSetStatus: (status: any) => void
}

export function DossieHeader({
  id,
  status,
  statusLabel,
  statusPillClass,
  createdAt,
  isPending,
  canCancel,
  canFinish,
  myRole,
  handleSetStatus
}: DossieHeaderProps) {
  const router = useRouter()
  
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Dossiê de Cobrança</h1>
            <span className="text-slate-400 font-medium text-sm hidden md:inline">#{id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusPillClass}`}>
              {status === 'QUITADO' ? <CheckCircle2 className="h-3 w-3" /> : status === 'CANCELADO' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {statusLabel}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              Início: {createdAt}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {(status === 'QUITADO' || status === 'CANCELADO') && myRole === 'ADMIN' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSetStatus('ABERTO')}
            className="flex-1 md:flex-none px-5 py-3.5 bg-gold-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 active:scale-95"
          >
            Reabrir Contrato
          </button>
        )}
        <button
          type="button"
          disabled={!canCancel || isPending}
          onClick={() => handleSetStatus('CANCELADO')}
          className={`flex-1 md:flex-none px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
            !canCancel || isPending ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95'
          }`}
        >
          Cancelar Contrato
        </button>
        <button
          type="button"
          disabled={!canFinish || isPending}
          onClick={() => handleSetStatus('QUITADO')}
          className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
            !canFinish || isPending ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95'
          }`}
        >
          Concluir Cobrança
        </button>
      </div>
    </div>
  )
}
