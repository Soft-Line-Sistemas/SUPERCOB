'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface FinancialSummaryProps {
  totalDevido: number
  restante: number
  jurosPendente: number
  nextMonthInterest: number
  valorPago: number
  valorOriginal: number
  priorityLevel: string
  daysLate: number
  monthsAccrued: number
  usesDailyLateInterest: boolean
  borderClass: string
  formatBRL: (val: number) => string
}

export function FinancialSummary({
  totalDevido,
  restante,
  jurosPendente,
  nextMonthInterest,
  valorPago,
  valorOriginal,
  priorityLevel,
  daysLate,
  monthsAccrued,
  usesDailyLateInterest,
  borderClass,
  formatBRL
}: FinancialSummaryProps) {
  return (
    <div className={`bg-white dark:bg-slate-950 rounded-[2.5rem] border-2 ${borderClass} shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative group`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-white/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110" />
      
      <div className="relative z-10 p-8 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Resumo de Ativos</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100">{formatBRL(totalDevido)}</h2>
            <span className="text-xs font-bold text-slate-400 uppercase">Saldo Total</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {priorityLevel !== 'BLOQUEADO' && (
            <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 ${
              priorityLevel === 'URGENTE' ? 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-600/20' : 
              priorityLevel === 'ALTA' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
              'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${priorityLevel === 'URGENTE' ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Prioridade {priorityLevel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-4 gap-px bg-slate-100 dark:bg-white/5">
        <div className="bg-white dark:bg-slate-950 p-8 group/item">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-gold-500 transition-colors">Principal Aberto</p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatBRL(restante)}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 flex-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold-500 transition-all duration-1000" 
                style={{ width: `${Math.min(100, (restante / (valorOriginal || 1)) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 p-8 group/item">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-red-500 transition-colors">Juros Pendente</p>
          <p className="text-2xl font-black text-red-600 dark:text-red-500">{formatBRL(jurosPendente)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            {usesDailyLateInterest ? `${daysLate} dias em atraso` : `${monthsAccrued} meses acumulados`}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-8 group/item">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-gold-500 transition-colors">Próximo Juros</p>
          <p className="text-2xl font-black text-gold-600 dark:text-gold-500">{formatBRL(nextMonthInterest)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Valor projetado p/ mês</p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-8 group/item">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-emerald-500 transition-colors">Total Amortizado</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{formatBRL(valorPago)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Ref. ao valor principal</p>
        </div>
      </div>
    </div>
  )
}
