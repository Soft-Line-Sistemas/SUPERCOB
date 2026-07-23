'use client'

import React from 'react'
import { Plus } from 'lucide-react'

interface LoanHeaderProps {
  onNewLoan: () => void
  canCreate?: boolean
}

export function LoanHeader({ onNewLoan, canCreate = true }: LoanHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">Gestão de Carteira</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Monitore e gerencie todos os ativos financeiros.</p>
      </div>
      
      <div className="flex items-center gap-3 w-full lg:w-auto">
        {canCreate && (
          <button
            type="button"
            onClick={onNewLoan}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gold-600 text-white text-sm font-black rounded-2xl hover:bg-gold-700 shadow-lg shadow-gold-600/20 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Nova Cobrança
          </button>
        )}
      </div>
    </div>
  )
}
