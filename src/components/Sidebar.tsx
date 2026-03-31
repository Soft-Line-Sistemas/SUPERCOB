'use client'

import React, { useEffect, useState } from 'react'
import { LayoutDashboard, Users, CreditCard, LogOut, ShieldCheck, UserCog, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import PremiumLine from './PremiumLine'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = window.localStorage.getItem('avatarUrl')
      return stored && stored.trim() !== '' ? stored : null
    } catch {
      return null
    }
  })
  const userDisplayName = (session?.user as any)?.nome || session?.user?.name || 'Usuário'
  const avatarUrl = localAvatarUrl || (session?.user as any)?.avatarUrl || (session?.user as any)?.image || null
  const avatarInitial = userDisplayName?.trim()?.[0]?.toUpperCase() || 'U'

  useEffect(() => {
    const onUpdated = () => {
      try {
        const stored = window.localStorage.getItem('avatarUrl')
        setLocalAvatarUrl(stored && stored.trim() !== '' ? stored : null)
      } catch {
      }
    }

    window.addEventListener('supercob:avatar-updated', onUpdated as any)
    window.addEventListener('storage', onUpdated)
    return () => {
      window.removeEventListener('supercob:avatar-updated', onUpdated as any)
      window.removeEventListener('storage', onUpdated)
    }
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'clients', label: 'Clientes', icon: Users, href: '/clientes' },
    { id: 'loans', label: 'Contratos', icon: CreditCard, href: '/emprestimos' },
  ]

  if (session?.user?.role === 'ADMIN') {
    navItems.push({ id: 'reports', label: 'Relatórios', icon: BarChart3, href: '/reports' })
    navItems.push({ id: 'users', label: 'Equipe', icon: UserCog, href: '/usuarios' })
  }

  const mobileItems = [
    ...navItems,
    { id: 'profile', label: 'Perfil', icon: Settings, href: '/perfil' },
  ]

  return (
    <>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-slate-950/95 backdrop-blur border-t border-white/10">
        <nav className={`mx-auto max-w-[1600px] px-3 py-2 grid gap-1 ${mobileItems.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {mobileItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                <span className="text-[10px] font-black leading-none">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Content */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-[55] w-72 bg-slate-950 text-white flex-col transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand Header */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 rotate-3">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-3xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-blue-500 via-cyan-400 to-green-600 bg-clip-text text-transparent">
              Supercob
            </span>
          </div>
          {/* <div className="h-1 w-16 bg-blue-600/30 rounded-full" /> */}
          {/* <div className="w-full h-1 bg-blue-600/10 rounded-full overflow-hidden"> */}
           <PremiumLine />
          {/* </div> */}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">
            Menu Principal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"}`}
                />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-6 mt-auto space-y-2">
          <Link
            href="/perfil"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          >
            <Settings className="w-5 h-5" />
            Configurações
          </Link>

          <div className="h-[1px] bg-white/5 my-4 mx-4" />

          <Link
            href="/perfil"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-black text-sm overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                avatarInitial
              )}
            </div>
            <span className="text-sm font-bold text-white truncate">
              {userDisplayName}
            </span>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
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
  );
}
