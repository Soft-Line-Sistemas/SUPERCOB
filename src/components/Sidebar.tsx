'use client'

import React, { useState } from 'react'
import { LayoutDashboard, Users, CreditCard, LogOut, ShieldCheck, UserCog, Menu, X, BarChart3, Settings, Bell } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'clients', label: 'Clientes', icon: Users, href: '/clientes' },
    { id: 'loans', label: 'Contratos', icon: CreditCard, href: '/emprestimos' },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, href: '/reports' },
  ]

  if (session?.user?.role === 'ADMIN') {
    navItems.push({ id: 'users', label: 'Equipe', icon: UserCog, href: '/usuarios' })
  }

  return (
    <>
      {/* Mobile Menu Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-[60]">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 border border-white/10 backdrop-blur-xl"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[50] md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 z-[55] w-72 bg-slate-950 text-white flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Header */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 rotate-3">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">Supercob</span>
          </div>
          <div className="h-1 w-12 bg-blue-600/30 rounded-full" />
        </div>

        {/* User Quick Info */}
        <div className="px-6 mb-8">
          <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold shadow-inner">
              {session?.user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{session?.user?.name || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{session?.user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Menu Principal</p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-6 mt-auto space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Settings className="w-5 h-5" />
            Configurações
          </button>
          
          <div className="h-[1px] bg-white/5 my-4 mx-4" />
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-4 text-sm font-black text-red-400 hover:text-white hover:bg-red-500 transition-all rounded-2xl group"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
            Desconectar
          </button>
        </div>
      </aside>
    </>
  )
}
