'use client'

import React from 'react'

interface ColaboradorAnalyticsProps {
  analytics: {
    id: string
    nome: string
    aberto: number
    negociacao: number
    quitado: number
    total: number
  }[]
  visible: boolean
}

export function ColaboradorAnalytics({ analytics, visible }: ColaboradorAnalyticsProps) {
  if (!visible || !analytics || analytics.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden mb-8">
      <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Visão por Colaborador</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Andamento da carteira distribuída por responsável</p>
      </div>
      
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {analytics.map((a) => (
          <div key={a.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-gold-500/30 transition-all group">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-gold-600 transition-colors">{a.nome}</p>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full uppercase tracking-wider">
                {a.total} contratos
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aberto</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{a.aberto}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Negoc.</p>
                <p className="text-sm font-black text-amber-600 dark:text-amber-500">{a.negociacao}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-center border-emerald-500/20">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pago</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-500">{a.quitado}</p>
              </div>
            </div>
            
            <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-slate-400/50" style={{ width: `${(a.aberto / a.total) * 100}%` }} title="Abertos" />
              <div className="h-full bg-amber-500" style={{ width: `${(a.negociacao / a.total) * 100}%` }} title="Negociação" />
              <div className="h-full bg-emerald-500" style={{ width: `${(a.quitado / a.total) * 100}%` }} title="Quitados" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
