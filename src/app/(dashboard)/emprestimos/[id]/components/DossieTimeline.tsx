'use client'

import React, { useMemo, useState } from 'react'
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { DocumentsTab } from '@/components/loans/DocumentsTab'

interface HistoricoEvento {
  id: string
  descricao: string
  createdAt: Date | string
  tipo?: string | null
  createdBy?: { nome: string } | null
}

interface DossieTimelineProps {
  eventos: HistoricoEvento[]
  abaAtiva: 'historico' | 'documentos'
  setAbaAtiva: (val: 'historico' | 'documentos') => void
  clienteId: string
  emprestimoId: string
  loanFiles: (string | null | undefined)[]
}

export function DossieTimeline({
  eventos,
  abaAtiva,
  setAbaAtiva,
  clienteId,
  emprestimoId,
  loanFiles
}: DossieTimelineProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [filterType, setFilterType] = useState<'ALL' | 'JUROS' | 'NOTA' | 'PAGAMENTO'>('ALL')

  const filteredEventos = useMemo(() => {
    if (filterType === 'ALL') return eventos
    return eventos.filter(ev => {
      if (filterType === 'JUROS') return ev.tipo === 'JUROS'
      if (filterType === 'PAGAMENTO') return ev.tipo === 'PAGAMENTO'
      return ev.tipo !== 'JUROS' && ev.tipo !== 'PAGAMENTO'
    })
  }, [eventos, filterType])

  const totalPages = Math.ceil(filteredEventos.length / itemsPerPage)
  const currentItems = filteredEventos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const monthName = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  
  const groupedEvents = useMemo(() => {
    const groups: Record<string, HistoricoEvento[]> = {}
    currentItems.forEach(ev => {
      const month = monthName(new Date(ev.createdAt))
      if (!groups[month]) groups[month] = []
      groups[month].push(ev)
    })
    return groups
  }, [currentItems])

  return (
    <div className="bg-white dark:bg-slate-950 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Extrato de Negociação</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Histórico completo de ações e cobranças.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'NOTA', 'JUROS', 'PAGAMENTO'].map((t) => (
            <button
              key={t}
              onClick={() => { setFilterType(t as any); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                filterType === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-950 hover:text-white'
              }`}
            >
              {t === 'ALL' ? 'Tudo' : t === 'NOTA' ? 'Notas' : t === 'JUROS' ? 'Juros' : 'Pagos'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-8 pt-6">
        <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-white/5 rounded-[2rem] w-fit">
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              abaAtiva === 'historico' ? 'bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none text-gold-600' : 'text-slate-500'
            }`}
          >
            Linha do Tempo
          </button>
          <button
            onClick={() => setAbaAtiva('documentos')}
            className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              abaAtiva === 'documentos' ? 'bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none text-gold-600' : 'text-slate-500'
            }`}
          >
            Acervo Digital
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 space-y-10">
        {abaAtiva === 'documentos' ? (
          <DocumentsTab 
            clienteId={clienteId} 
            emprestimoId={emprestimoId} 
            loanFiles={loanFiles} 
          />
        ) : filteredEventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Filter className="w-12 h-12 mb-4" />
            <p className="font-black text-sm uppercase">Nenhum registro encontrado</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([month, items]) => (
            <div key={month} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{month}</p>
                <div className="h-px w-full bg-slate-100 dark:bg-white/5" />
              </div>
              
              <div className="space-y-3 relative">
                <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-100 dark:bg-white/5 hidden md:block" />
                {items.map((ev: any) => {
                  const isJuros = ev.tipo === 'JUROS'
                  const isPagamento = ev.tipo === 'PAGAMENTO'
                  
                  return (
                    <div key={ev.id} className="relative md:pl-12 group">
                      <div className={`absolute left-[21px] top-6 h-1.5 w-1.5 rounded-full ring-4 ring-white dark:ring-slate-950 z-10 hidden md:block ${
                        isJuros ? 'bg-orange-500 ring-orange-50 dark:ring-orange-500/20' : 
                        isPagamento ? 'bg-emerald-500 ring-emerald-50 dark:ring-emerald-500/20' : 
                        'bg-slate-400 ring-slate-50 dark:ring-slate-400/20'
                      }`} />
                      
                      <div className={`p-5 rounded-[2rem] border transition-all ${
                        isJuros ? 'bg-orange-50/30 dark:bg-orange-500/5 border-orange-100/50 dark:border-orange-500/20' : 
                        isPagamento ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100/50 dark:border-emerald-500/20' : 
                        'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:shadow-sm'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${
                              isJuros ? 'bg-orange-100 text-orange-700' : 
                              isPagamento ? 'bg-emerald-100 text-emerald-700' : 
                              'bg-slate-950 text-slate-500'
                            }`}>
                              {isJuros ? 'Correção Mensal' : isPagamento ? 'Recibo' : 'Anotação'}
                            </span>
                            <p className="text-[10px] font-bold text-slate-400 italic">
                               {new Date(ev.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {ev.createdBy?.nome || 'Sistema'}
                            </p>
                          </div>
                          <p className="text-[10px] font-black text-slate-300 dark:text-slate-600">#{ev.id.slice(-4).toUpperCase()}</p>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {ev.descricao}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {abaAtiva === 'historico' && totalPages > 1 && (
        <div className="p-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <p className="text-xs font-bold text-slate-400">
            Mostrando página <span className="text-slate-900 dark:text-slate-100">{currentPage}</span> de <span className="text-slate-900 dark:text-slate-100">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
