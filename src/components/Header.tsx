'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Search, Command, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export function Header({ user }: { user: any }) {
  const pathname = usePathname()
  
  const getTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Overview'
    if (pathname.startsWith('/clientes')) return 'Clientes'
    if (pathname.startsWith('/emprestimos')) return 'Contratos'
    if (pathname.startsWith('/usuarios')) return 'Equipe'
    if (pathname.startsWith('/reports')) return 'Relatórios'
    return 'Supercob'
  }

  return (
    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Page Title with Animation */}
      <motion.div 
        key={pathname}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        <div className="h-8 w-1 bg-blue-600 rounded-full hidden md:block" />
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {getTitle()}
        </h1>
      </motion.div>

      {/* Action Icons */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search Bar - Desktop Only */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl w-64 group focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Comando rápido..." 
            className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-full placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg shadow-sm">
            <Command className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[9px] font-black text-slate-400">K</span>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all group">
          <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
        </button>

        {/* Help */}
        <button className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all hidden sm:block">
          <HelpCircle className="w-5 h-5" />
        </button>

        <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden sm:block" />

        {/* User Profile - Compact */}
        <div className="flex items-center gap-3 pl-2">
          <div className="hidden md:block text-right">
            <p className="text-xs font-black text-slate-900">{user?.nome?.split(' ')[0]}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center font-black text-slate-600 text-sm overflow-hidden">
            {user?.nome?.[0] || 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
