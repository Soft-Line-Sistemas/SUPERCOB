'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Search, Users, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { unarchiveClienteAction } from '@/app/(dashboard)/clientes/actions'
import { unarchiveEmprestimoAction } from '@/app/(dashboard)/emprestimos/actions'
import { formatPhoneBR } from './client-modal/form-schema'

type ClienteArquivadoRow = {
  id: string
  nome: string
  cpf: string | null
  whatsapp: string | null
  arquivadoEm: string
  motivoArquivamento: string | null
  arquivadoPor: { nome: string } | null
  totalContratosArquivados: number
}

type EmprestimoArquivadoRow = {
  id: string
  clienteId: string
  clienteNome: string
  valor: number
  status: string
  vencimento: string | null
  quitadoEm: string | null
  arquivadoEm: string
  motivoArquivamento: string | null
  clienteTambemArquivado: boolean
  arquivadoPor: { nome: string } | null
  usuario: { nome: string } | null
}

type Page<T> = { items: T[]; page: number; limit: number; total: number; hasMore: boolean }

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'

export function ArchivedList() {
  const [tab, setTab] = useState<'clientes' | 'contratos'>('clientes')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [clientesPage, setClientesPage] = useState<Page<ClienteArquivadoRow> | null>(null)
  const [emprestimosPage, setEmprestimosPage] = useState<Page<EmprestimoArquivadoRow> | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search.trim()) params.set('q', search.trim())

      if (tab === 'clientes') {
        const res = await fetch(`/api/arquivados/clientes?${params.toString()}`)
        if (res.ok) setClientesPage(await res.json())
      } else {
        const res = await fetch(`/api/arquivados/emprestimos?${params.toString()}`)
        if (res.ok) setEmprestimosPage(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [tab, page, search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [tab, search])

  const handleUnarchiveCliente = (id: string) => {
    toast.info('Desarquivar este cliente?', {
      description: 'O cliente e todos os contratos arquivados junto com ele voltam a aparecer normalmente no sistema.',
      action: {
        label: 'Desarquivar',
        onClick: async () => {
          const result = await unarchiveClienteAction(id)
          if (result.ok) {
            toast.success('Cliente desarquivado com sucesso!')
            load()
          } else {
            toast.error(result.error || 'Erro ao desarquivar cliente.')
          }
        },
      },
    })
  }

  const handleUnarchiveEmprestimo = (id: string) => {
    toast.info('Desarquivar este contrato?', {
      action: {
        label: 'Desarquivar',
        onClick: async () => {
          try {
            await unarchiveEmprestimoAction(id)
            toast.success('Contrato desarquivado com sucesso!')
            load()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao desarquivar contrato.')
          }
        },
      },
    })
  }

  const currentPage = tab === 'clientes' ? clientesPage : emprestimosPage

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Arquivados</h2>
        <p className="text-slate-500">
          Clientes e contratos arquivados ficam fora de listagens, dashboard, relatórios e fila de cobrança, mas podem ser restaurados a qualquer momento.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 w-fit shadow-sm">
        <button
          onClick={() => setTab('clientes')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            tab === 'clientes' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          Clientes
        </button>
        <button
          onClick={() => setTab('contratos')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            tab === 'contratos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Contratos
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'clientes' ? 'Buscar por nome, CPF ou whatsapp...' : 'Buscar por observação...'}
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {tab === 'clientes' ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Cliente</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">CPF</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Contratos arquivados</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Arquivado em</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Por</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientesPage?.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-sm font-bold text-amber-600">
                          {c.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.nome}</p>
                          <p className="text-xs text-slate-500">{c.whatsapp ? formatPhoneBR(c.whatsapp) : '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.cpf || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.totalContratosArquivados}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(c.arquivadoEm)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.arquivadoPor?.nome || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleUnarchiveCliente(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Desarquivar
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && clientesPage?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                      <Archive className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      Nenhum cliente arquivado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Cliente</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Valor</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Arquivado em</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Origem</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emprestimosPage?.items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{e.clienteNome}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(e.valor)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{e.status}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(e.arquivadoEm)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {e.clienteTambemArquivado ? 'Cliente arquivado junto' : 'Contrato individual'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleUnarchiveEmprestimo(e.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Desarquivar
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && emprestimosPage?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                      <Archive className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      Nenhum contrato arquivado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {currentPage && currentPage.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Página {currentPage.page} de {Math.max(1, Math.ceil(currentPage.total / currentPage.limit))} · {currentPage.total} registros
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => (currentPage.hasMore ? p + 1 : p))}
                disabled={!currentPage.hasMore}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
