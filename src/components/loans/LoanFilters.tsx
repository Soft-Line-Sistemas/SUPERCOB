'use client'

import React from 'react'
import { Search, Filter, Download, Send, X, LayoutGrid, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoanFiltersData {
  q: string
  status: string
  usuarioId: string
  startDate: string
  endDate: string
  cobrancaOnly: boolean
  dateFilterMode: 'created' | 'vencimento'
  vencimentoDay: string
}

interface LoanFiltersProps {
  filters: LoanFiltersData
  setFilters: React.Dispatch<React.SetStateAction<LoanFiltersData>>
  isFiltersOpen: boolean
  setIsFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>
  applyFilters: () => void
  resetFilters: () => void
  userRole: string
  colaboradores: { id: string; nome: string }[]
  contactOnly: boolean
  setContactOnly: React.Dispatch<React.SetStateAction<boolean>>
  exportableCount: number
  onOpenBatchDossie: () => void
  sortOrder: 'newest' | 'az'
  setSortOrder: React.Dispatch<React.SetStateAction<'newest' | 'az'>>
  viewMode: 'grid' | 'list'
  setViewMode: React.Dispatch<React.SetStateAction<'grid' | 'list'>>
}

export function LoanFilters({
  filters,
  setFilters,
  isFiltersOpen,
  setIsFiltersOpen,
  applyFilters,
  resetFilters,
  userRole,
  colaboradores,
  contactOnly,
  setContactOnly,
  exportableCount,
  onOpenBatchDossie,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
}: LoanFiltersProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters()
            }}
            className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 outline-none transition-all shadow-sm dark:text-slate-100"
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
          />
        </div>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value === 'az' ? 'az' : 'newest')}
          className="px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm font-black text-slate-700 dark:text-slate-200 shadow-sm outline-none"
        >
          <option value="newest">Novos primeiro</option>
          <option value="az">A-Z</option>
        </select>

        <div className="flex items-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-xl p-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-900 text-white dark:bg-gold-600' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            aria-label="Visualização em grade"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-xl p-2 transition-colors ${viewMode === 'list' ? 'bg-slate-900 text-white dark:bg-gold-600' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            aria-label="Visualização em lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsFiltersOpen((v: boolean) => !v)}
          className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-black transition-all shadow-sm border ${
            isFiltersOpen 
              ? 'bg-slate-900 dark:bg-gold-600 text-white border-slate-900 dark:border-gold-600' 
              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <Filter className={`h-4 w-4 ${isFiltersOpen ? 'text-white' : 'text-gold-500'}`} />
          Filtros
        </button>

        <button
          type="button"
          onClick={onOpenBatchDossie}
          disabled={exportableCount === 0}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-black transition-all shadow-sm border bg-slate-900 text-white border-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gold-600 dark:border-gold-600 dark:hover:bg-gold-700"
        >
          <Download className="h-4 w-4" />
          Dossiê
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] tracking-widest">
            {exportableCount}
          </span>
        </button>
      </div>

      {isFiltersOpen && (
        <>
          <div className="mt-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-xl relative z-20">
            <div className="mb-6 flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
              <button
                onClick={() => setFilters({ ...filters, dateFilterMode: 'created' })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filters.dateFilterMode === 'created' ? 'bg-white dark:bg-slate-900 shadow-sm text-gold-600' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Data Cadastro
              </button>
              <button
                onClick={() => setFilters({ ...filters, dateFilterMode: 'vencimento' })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filters.dateFilterMode === 'vencimento' ? 'bg-white dark:bg-slate-900 shadow-sm text-gold-600' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Vencimento
              </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end`}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-gold-500/5"
                >
                  <option value="">Todos</option>
                  <option value="ABERTO">Abertos</option>
                  <option value="NEGOCIACAO">Negociação</option>
                  <option value="QUITADO">Quitados</option>
                  <option value="CANCELADO">Cancelados</option>
                </select>
              </div>

              {userRole === 'ADMIN' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Consultor</label>
                  <select
                    value={filters.usuarioId}
                    onChange={(e) => setFilters({ ...filters, usuarioId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-gold-500/5"
                  >
                    <option value="">Todos</option>
                    <option value="__UNASSIGNED__">Sem atribuição</option>
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">De</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Até</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Dia Venc.</label>
                <select
                  value={filters.vencimentoDay}
                  onChange={(e) => setFilters({ ...filters, vencimentoDay: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="">Todos</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilters((prev: LoanFiltersData) => ({ ...prev, cobrancaOnly: !prev.cobrancaOnly }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filters.cobrancaOnly ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Cobrança
                </button>

                <button
                  type="button"
                  onClick={() => setContactOnly((v) => !v)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    contactOnly ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Whats
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={resetFilters}
                className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-8 py-3 bg-slate-900 dark:bg-gold-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-gold-700 transition-all shadow-lg shadow-slate-900/10 dark:shadow-gold-600/20"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>

          <AnimatePresence>
            <motion.div
              className="md:hidden fixed inset-0 z-[100]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 bg-white dark:bg-slate-950 rounded-t-[2.5rem] p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Filtros Avançados</h3>
                  <button onClick={() => setIsFiltersOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Mobile version of inputs would go here if needed to be different, 
                      but for brevity we use the same or just close it on mobile. */}
                  <button
                    onClick={applyFilters}
                    className="w-full py-4 bg-slate-900 dark:bg-gold-600 text-white font-black rounded-2xl"
                  >
                    Ver Resultados
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
