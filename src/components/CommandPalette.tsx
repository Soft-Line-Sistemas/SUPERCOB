'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, Receipt, LayoutDashboard, Users, FileText, ChevronRight, X, Command, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { globalSearch } from '@/app/(dashboard)/global-search-actions'

type CommandItem = {
  id: string
  title: string
  subtitle: string
  icon: any
  action: () => void
  category: string
}

export function CommandPalette({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (o: boolean) => void }) {
  const [search, setSearch] = useState('')
  const [dbResults, setDbResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const items: CommandItem[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Visão geral e KPIs do sistema',
      icon: LayoutDashboard,
      category: 'Navegação',
      action: () => router.push('/dashboard')
    },
    {
      id: 'nav-clientes',
      title: 'Clientes',
      subtitle: 'Gerenciar base de clientes e contatos',
      icon: Users,
      category: 'Navegação',
      action: () => router.push('/clientes')
    },
    {
      id: 'nav-contratos',
      title: 'Contratos',
      subtitle: 'Listagem de emprestimos e cobranças',
      icon: Receipt,
      category: 'Navegação',
      action: () => router.push('/emprestimos')
    },
    {
      id: 'nav-relatorios',
      title: 'Relatórios',
      subtitle: 'Análises avançadas e exportação',
      icon: FileText,
      category: 'Navegação',
      action: () => router.push('/reports')
    },
    {
      id: 'action-novo-cliente',
      title: 'Novo Cliente',
      subtitle: 'Cadastrar um novo cliente no sistema',
      icon: UserPlus,
      category: 'Ações',
      action: () => {
        router.push('/clientes')
        // We could dispatch an event here to open the modal
      }
    },
    {
      id: 'action-novo-contrato',
      title: 'Nova Cobrança',
      subtitle: 'Criar um novo emprestimo',
      icon: Receipt,
      category: 'Ações',
      action: () => router.push('/emprestimos')
    }
  ], [router])

  const filteredItems = useMemo(() => {
    let base = items
    if (search) {
      const s = search.toLowerCase()
      base = items.filter(i => 
        i.title.toLowerCase().includes(s) || 
        i.subtitle.toLowerCase().includes(s) || 
        i.category.toLowerCase().includes(s)
      )
    }

    // Icons mapping for DB results
    const mappedResults = dbResults.map(r => ({
      ...r,
      icon: r.icon === 'user' ? User : Receipt,
      action: () => router.push(r.url)
    }))

    return [...mappedResults, ...base]
  }, [search, items, dbResults, router])

  useEffect(() => {
    if (!search || search.length < 2) {
      setDbResults([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await globalSearch(search)
        setDbResults(res)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search, dbResults])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filteredItems.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length)
    }
    if (e.key === 'Enter') {
      const selected = filteredItems[selectedIndex]
      if (selected) {
        selected.action()
        setIsOpen(false)
      }
    }
  }, [filteredItems, selectedIndex, setIsOpen])

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    } else {
      window.removeEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5">
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                autoFocus
                placeholder="O que você está procurando? (Busque nomes, ações ou páginas)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">ESC</span>
              </div>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2 pb-4 scrollbar-hide">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="inline-flex p-3 bg-slate-950 dark:bg-white/5 rounded-2xl mb-3">
                    <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Nenhum resultado encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Tente buscar por termos mais genéricos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Categories Grouping logic could be here, but for simplicity let's list them */}
                  {Array.from(new Set(filteredItems.map(i => i.category))).map(cat => (
                    <div key={cat} className="space-y-1">
                      <div className="px-4 py-2 mt-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{cat}</span>
                      </div>
                      {filteredItems.filter(i => i.category === cat).map((item, idx) => {
                        const globalIdx = filteredItems.indexOf(item)
                        const isSelected = globalIdx === selectedIndex
                        return (
                          <button
                            key={item.id}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            onClick={() => {
                              item.action()
                              setIsOpen(false)
                            }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 text-left ${
                              isSelected 
                                ? 'bg-blue-600 shadow-lg shadow-blue-600/20' 
                                : 'hover:bg-slate-950 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className={`p-2.5 rounded-xl ${
                              isSelected 
                                ? 'bg-white shadow-sm' 
                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                            }`}>
                              <item.icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : ''}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                {item.title}
                              </p>
                              <p className={`text-[10px] font-medium truncate ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                {item.subtitle}
                              </p>
                            </div>
                            {isSelected && (
                              <ChevronRight className="w-4 h-4 text-white opacity-60" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex items-center gap-6 justify-center">
              <div className="flex items-center gap-1.5 opacity-60">
                <div className="p-1 px-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black">↑↓</div>
                <span className="text-[9px] font-bold uppercase tracking-tighter">Navegar</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <div className="p-1 px-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black">ENTER</div>
                <span className="text-[9px] font-bold uppercase tracking-tighter">Abrir</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <div className="p-1 px-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black underline decoration-slate-400">⌘K</div>
                <span className="text-[9px] font-bold uppercase tracking-tighter">Fechar</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
