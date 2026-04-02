'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Search, Command, HelpCircle, X, ExternalLink, Sun, Moon, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { markAsRead } from '@/app/(dashboard)/chat/actions'

type HeaderNotification = {
  id: string
  conteudo: string
  createdAt: Date
  isMassiva: boolean
  remetenteNome: string
  remetenteRole: string
}

export function Header({ user, notifications, unreadCount }: { user: any; notifications: HeaderNotification[]; unreadCount: number }) {
  const pathname = usePathname()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'system'
    try {
      const stored = window.localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
      return 'system'
    } catch {
      return 'system'
    }
  })
  const notificationsRef = useRef<HTMLDivElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const apply = () => {
      const root = document.documentElement
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      root.dataset.theme = theme
      root.classList.toggle('dark', isDark)
    }

    apply()

    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (isNotificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false)
      }
      if (isHelpOpen && helpRef.current && !helpRef.current.contains(target)) {
        setIsHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isNotificationsOpen, isHelpOpen])

  const displayedNotifications = useMemo(() => notifications.filter((n) => !readIds.includes(n.id)), [notifications, readIds])
  const readDirectCount = useMemo(
    () => readIds.filter((id) => notifications.some((n) => n.id === id && !n.isMassiva)).length,
    [readIds, notifications]
  )
  const displayedUnreadCount = Math.max(0, unreadCount - readDirectCount)
  const hasUnread = displayedUnreadCount > 0
  const notificationIdsToMarkRead = useMemo(
    () => displayedNotifications.filter((n) => !n.isMassiva).map((n) => n.id),
    [displayedNotifications]
  )
  
  const getTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Overview'
    if (pathname.startsWith('/clientes')) return 'Clientes'
    if (pathname.startsWith('/emprestimos')) return 'Contratos'
    if (pathname.startsWith('/usuarios')) return 'Equipe'
    if (pathname.startsWith('/reports')) return 'Relatórios'
    return 'Supercob'
  }

  return (
    <header className="h-20 bg-white/80 dark:bg-black-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/10 flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Page Title with Animation */}
      <motion.div 
        key={pathname}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        <div className="h-8 w-1 bg-blue-600 rounded-full hidden md:block" />
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
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
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((v) => !v)
              setIsHelpOpen(false)
            }}
            aria-label="Notificações"
            className="relative p-2.5 text-slate-500 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/5 rounded-xl transition-all group"
          >
            <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
            {hasUnread && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-[360px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">Notificações</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {displayedUnreadCount} não lidas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-label="Fechar notificações"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {displayedNotifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Sem notificações</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tudo em dia por aqui.</p>
                  </div>
                ) : (
                  displayedNotifications.map((n) => (
                    <div key={n.id} className="px-5 py-4 border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                            {n.isMassiva ? 'Comunicado' : 'Mensagem'} • {n.remetenteNome}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.conteudo}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">
                            {new Date(n.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        {n.isMassiva && (
                          <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                            GERAL
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex gap-2">
                <button
                  type="button"
                  disabled={notificationIdsToMarkRead.length === 0}
                  onClick={async () => {
                    try {
                      await markAsRead(notificationIdsToMarkRead)
                      setReadIds((prev) => Array.from(new Set([...prev, ...notificationIdsToMarkRead])))
                    } catch {
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-black rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Marcar como lidas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event('supercob:open-chat'))
                    setIsNotificationsOpen(false)
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  Abrir chat <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Alternar tema"
          onClick={() =>
            setTheme((prev) => {
              const next = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
              try {
                window.localStorage.setItem('theme', next)
              } catch {
              }
              return next
            })
          }
          className="p-2.5 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
        >
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Help */}
        <div className="relative hidden sm:block" ref={helpRef}>
          <button
            type="button"
            onClick={() => {
              setIsHelpOpen((v) => !v)
              setIsNotificationsOpen(false)
            }}
            aria-label="Ajuda"
            className="p-2.5 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {isHelpOpen && (
            <div className="absolute right-0 mt-2 w-[360px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">Ajuda rápida</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Supercob</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  aria-label="Fechar ajuda"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100">Fluxo recomendado</p>
                  <ul className="mt-2 text-xs text-slate-600 space-y-1">
                    <li>1) Cadastre o cliente</li>
                    <li>2) Crie a cobrança com valor/juros/vencimento</li>
                    <li>3) Acompanhe status: Aberto → Negociação → Quitado</li>
                  </ul>
                </div>
                <Link
                  href="/perfil"
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Perfil (foto e senha) <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Ajuda via WhatsApp <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden sm:block" />

        {/* User Profile - Compact */}
        <Link href="/perfil" className="flex items-center gap-3 pl-2">
          <div className="hidden md:block text-right">
            <p className="text-xs font-black text-slate-900 dark:text-slate-100">{user?.nome?.split(' ')[0]}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center font-black text-slate-600 text-sm overflow-hidden">
            {user?.nome?.[0] || 'U'}
          </div>
        </Link>
      </div>
    </header>
  )
}
