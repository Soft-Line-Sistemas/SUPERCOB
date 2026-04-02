'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, MessageCircle, Plus, X, Edit2, Trash2, Calendar, Info, MoreHorizontal, User, Clock, CheckCircle2, AlertCircle as AlertIcon, Send, Download } from 'lucide-react';
import { createEmprestimo, updateEmprestimo, deleteEmprestimo } from '@/app/(dashboard)/emprestimos/actions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChargeModal } from './ChargeModal';

type LoanStatus = 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' | 'CANCELADO';

interface Loan {
  id: string;
  clienteId: string;
  usuarioId?: string | null;
  cliente: {
    nome: string;
    email: string;
    whatsapp: string;
  };
  usuario?: {
    nome: string;
  } | null;
  valor: number;
  valorPago?: number | null;
  jurosMes?: number;
  vencimento?: Date | null;
  status: LoanStatus;
  observacao?: string | null;
  quitadoEm?: Date | null;
  createdAt: Date;
}

interface LoansProps {
  initialLoans: Loan[];
  clientes: { id: string; nome: string; email?: string | null; whatsapp?: string | null }[];
  colaboradores: { id: string; nome: string }[];
  userRole: 'ADMIN' | 'OPERADOR';
  analytics?: { id: string; nome: string; aberto: number; negociacao: number; quitado: number; total: number }[];
}

const statusConfig: Record<LoanStatus, { label: string; color: string; icon: any; bg: string }> = {
  ABERTO: { label: 'Aberto', color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertIcon },
  QUITADO: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  CANCELADO: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', icon: X },
};

export function Loans({ initialLoans, clientes, colaboradores, userRole, analytics }: LoansProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams();

  const initialSearch =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialClienteId = initialSearch?.get('clienteId') ?? ''
  const initialNovo = initialSearch?.get('novo') ?? ''
  const shouldAutoOpenNew = initialNovo === '1' && initialClienteId !== ''

  const initialValor = initialSearch?.get('valor') ?? ''
  const initialJurosMes = initialSearch?.get('jurosMes') ?? ''
  const initialVencimento = initialSearch?.get('vencimento') ?? ''
  const initialObservacao = initialSearch?.get('observacao') ?? ''

  const [isModalOpen, setIsModalOpen] = useState(shouldAutoOpenNew);
  const [prefillConsumed, setPrefillConsumed] = useState(!shouldAutoOpenNew)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  const [filters, setFilters] = useState(() => {
    const status = initialSearch?.get('status') ?? ''
    const q = initialSearch?.get('q') ?? ''
    const startDate = initialSearch?.get('startDate') ?? ''
    const endDate = initialSearch?.get('endDate') ?? ''
    const usuarioId = initialSearch?.get('usuarioId') ?? ''
    return { status, q, startDate, endDate, usuarioId }
  })
  const [contactOnly, setContactOnly] = useState(() => (initialSearch?.get('contactOnly') ?? '') === '1')

  const [formData, setFormData] = useState(() => ({
    clienteId: shouldAutoOpenNew ? initialClienteId : '',
    usuarioId: '',
    valor: shouldAutoOpenNew && initialValor ? Number(initialValor) || 0 : 0,
    jurosMes: shouldAutoOpenNew && initialJurosMes ? Number(initialJurosMes) || 0 : 0,
    vencimento: shouldAutoOpenNew ? initialVencimento : '',
    observacao: shouldAutoOpenNew ? initialObservacao : '',
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getSaldo = (loan: Loan) => {
    if (loan.status === 'CANCELADO') return 0
    const pago = Number(loan.valorPago ?? 0) || 0
    return Math.max((Number(loan.valor) || 0) - pago, 0)
  }

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  };

  const generateWhatsAppLink = (loan: Loan) => {
    const text = `Olá ${loan.cliente.nome}, sou da SUPERCOB. Gostaria de falar sobre a sua cobrança no valor de ${formatCurrency(loan.valor)}.`;
    const phone = loan.cliente.whatsapp.replace(/\D/g, '');
    return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
  };

  const parseDateInputToUTCNoon = (value: string) => {
    if (!value) return null
    const [y, m, d] = value.split('-').map((x) => Number(x))
    if (!y || !m || !d) return null
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  }

  useEffect(() => {
    if (!shouldAutoOpenNew) return
    const next = new URLSearchParams(searchParams.toString())
    next.delete('novo')
    next.delete('valor')
    next.delete('jurosMes')
    next.delete('vencimento')
    next.delete('observacao')
    router.replace(`${pathname}?${next.toString()}`)
    setPrefillConsumed(true)
  }, [pathname, router, searchParams, shouldAutoOpenNew])

  const applyFiltersToUrl = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('novo')
    next.delete('valor')
    next.delete('jurosMes')
    next.delete('vencimento')
    next.delete('observacao')

    if (filters.status) next.set('status', filters.status)
    else next.delete('status')

    if (filters.q) next.set('q', filters.q)
    else next.delete('q')

    if (filters.startDate && filters.endDate) {
      next.set('startDate', filters.startDate)
      next.set('endDate', filters.endDate)
    } else {
      next.delete('startDate')
      next.delete('endDate')
    }

    if (userRole === 'ADMIN' && filters.usuarioId) next.set('usuarioId', filters.usuarioId)
    else next.delete('usuarioId')

    if (contactOnly) next.set('contactOnly', '1')
    else next.delete('contactOnly')

    router.replace(`${pathname}?${next.toString()}`)
    router.refresh()
    setIsFiltersOpen(false)
  }

  const handleOpenModal = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        clienteId: loan.clienteId,
        usuarioId: loan.usuarioId || '',
        valor: loan.valor,
        jurosMes: (loan.jurosMes as any) ?? 0,
        vencimento: loan.vencimento ? format(new Date(loan.vencimento), 'yyyy-MM-dd') : '',
        observacao: loan.observacao || '',
      });
    } else {
      setEditingLoan(null);
      setFormData({
        clienteId: initialClienteId || '',
        usuarioId: '',
        valor: !prefillConsumed && initialValor ? Number(initialValor) || 0 : 0,
        jurosMes: !prefillConsumed && initialJurosMes ? Number(initialJurosMes) || 0 : 0,
        vencimento: !prefillConsumed ? initialVencimento : '',
        observacao: !prefillConsumed ? initialObservacao : '',
      });
    }
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setFilters({ status: '', q: '', startDate: '', endDate: '', usuarioId: '' })
    setContactOnly(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('status')
    next.delete('q')
    next.delete('startDate')
    next.delete('endDate')
    next.delete('usuarioId')
    next.delete('contactOnly')
    router.replace(`${pathname}?${next.toString()}`)
    router.refresh()
  }

  const handleOpenDetail = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDetailModalOpen(true);
  };

  const normalizeDigits = (value: string) => value.replace(/\D/g, '')
  const contactFilter = (loan: Loan) => {
    const hasWhatsapp = normalizeDigits(loan.cliente.whatsapp || '').length >= 10
    const notPaid = loan.status !== 'QUITADO' && loan.status !== 'CANCELADO'
    return hasWhatsapp && notPaid
  }

  const filteredLoans = initialLoans.filter((loan) => {
    if (filters.status && loan.status !== filters.status) return false
    if (filters.q) {
      const qText = filters.q.toLowerCase()
      const qDigits = normalizeDigits(filters.q)
      const nameOk = (loan.cliente.nome || '').toLowerCase().includes(qText)
      const emailOk = (loan.cliente.email || '').toLowerCase().includes(qText)
      const whatsOk = qDigits ? normalizeDigits(loan.cliente.whatsapp || '').includes(qDigits) : false
      if (!nameOk && !emailOk && !whatsOk) return false
    }
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate)
      const end = new Date(filters.endDate)
      const created = new Date(loan.createdAt)
      if (!(created >= start && created <= end)) return false
    }
    if (contactOnly && !contactFilter(loan)) return false
    return true
  })

  const draftClient = shouldAutoOpenNew ? clientes.find((c) => c.id === initialClienteId) : undefined
  const draftLoan: Loan | null = draftClient
    ? {
        id: `draft-${draftClient.id}`,
        clienteId: draftClient.id,
        usuarioId: null,
        cliente: {
          nome: draftClient.nome,
          email: (draftClient.email as any) || '',
          whatsapp: (draftClient.whatsapp as any) || '',
        },
        usuario: null,
        valor: !prefillConsumed && initialValor ? Number(initialValor) || 0 : 0,
        valorPago: 0,
        jurosMes: !prefillConsumed && initialJurosMes ? Number(initialJurosMes) || 0 : 0,
        vencimento: !prefillConsumed && initialVencimento ? (new Date(initialVencimento) as any) : null,
        status: 'ABERTO',
        observacao: !prefillConsumed ? initialObservacao : '',
        quitadoEm: null,
        createdAt: new Date(),
      }
    : null

  const loansToRender = draftLoan ? [draftLoan, ...filteredLoans] : filteredLoans

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        usuarioId: formData.usuarioId || null,
        jurosMes: Number(formData.jurosMes) || 0,
        vencimento: parseDateInputToUTCNoon(formData.vencimento),
      };

      if (editingLoan) {
        await updateEmprestimo(editingLoan.id, data as any);
        toast.success('Cobrança atualizada com sucesso!');
      } else {
        await createEmprestimo(data as any);
        toast.success('Cobrança registrada com sucesso!');
      }
      setIsModalOpen(false);
      router.refresh()
    } catch (error) {
      toast.error('Erro ao salvar cobrança.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    toast.warning('Excluir cobrança?', {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteEmprestimo(id);
            toast.success('Excluído com sucesso!');
            router.refresh()
          } catch (err) {
            toast.error('Erro ao excluir.');
          }
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Carteira</h1>
          <p className="text-slate-500">Monitore e gerencie todos os ativos financeiros.</p>
        </div>
        
        <div className="w-full lg:w-[780px]">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFiltersToUrl()
                }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
                placeholder="Buscar por nome, e-mail ou WhatsApp..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsFiltersOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                Filtros
              </button>

              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Nova Cobrança
              </button>
            </div>
          </div>

          {isFiltersOpen && (
            <>
              <div className="hidden md:block mt-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
                <div className={`grid grid-cols-1 ${userRole === 'ADMIN' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 items-end`}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
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
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Consultor</label>
                      <select
                        value={filters.usuarioId}
                        onChange={(e) => setFilters({ ...filters, usuarioId: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                      >
                        <option value="">Todos</option>
                        <option value="__UNASSIGNED__">Sem atribuição</option>
                        {colaboradores.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">De</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Até</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setContactOnly((v) => !v)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                      contactOnly ? 'bg-emerald-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Contatar WhatsApp
                  </button>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetFilters()
                      setIsFiltersOpen(false)
                    }}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={applyFiltersToUrl}
                    className="flex-[2] py-3 px-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>

              <AnimatePresence>
                <motion.div
                  className="md:hidden fixed inset-0 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    aria-label="Fechar filtros"
                    onClick={() => setIsFiltersOpen(false)}
                    className="absolute inset-0 bg-slate-950/60"
                  />
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2.25rem] border-t border-slate-200 shadow-2xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black text-slate-900">Filtros</p>
                        <p className="text-xs text-slate-500">Ajuste a busca e aplique.</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Fechar"
                        onClick={() => setIsFiltersOpen(false)}
                        className="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
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
                          <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Consultor</label>
                          <select
                            value={filters.usuarioId}
                            onChange={(e) => setFilters({ ...filters, usuarioId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                          >
                            <option value="">Todos</option>
                            <option value="__UNASSIGNED__">Sem atribuição</option>
                            {colaboradores.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">De</label>
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Até</label>
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setContactOnly((v) => !v)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                          contactOnly ? 'bg-emerald-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                        Contatar WhatsApp
                      </button>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          resetFilters()
                        }}
                        className="py-3 px-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors"
                      >
                        Limpar
                      </button>
                      <button
                        type="button"
                        onClick={applyFiltersToUrl}
                        className="py-3 px-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {userRole === 'ADMIN' && !filters.usuarioId && analytics && analytics.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Visão por Colaborador</h3>
              <p className="text-sm text-slate-500">Andamento da carteira por responsável</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {analytics.map((a) => (
              <div key={a.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-slate-900">{a.nome}</p>
                  <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                    {a.total} casos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Aberto</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{a.aberto}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Negociação</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{a.negociacao}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Quitado</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{a.quitado}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout for Loans */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode='popLayout'>
          {loansToRender.map((loan, idx) => {
            const config = statusConfig[loan.status];
            const StatusIcon = config.icon;
            const borderColor =
              loan.status === 'CANCELADO' ? 'border-red-500' : loan.status === 'QUITADO' ? 'border-emerald-500' : 'border-amber-400'
            const isDraft = loan.id.startsWith('draft-')
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                key={loan.id}
                className={`bg-white rounded-3xl border-2 ${borderColor} shadow-sm hover:shadow-md transition-all group overflow-hidden`}
              >
                {/* Card Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color} text-[10px] font-bold uppercase tracking-wider`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {isDraft ? 'Cobrança inicial' : config.label}
                  </div>
                  {!isDraft && (
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenModal(loan)
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(loan.id)
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => {
                    if (isDraft) handleOpenModal()
                    else handleOpenDetail(loan)
                  }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold border border-slate-100">
                      {loan.cliente.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{loan.cliente.nome}</h3>
                      <p className="text-xs font-black text-slate-700 truncate">Saldo: {formatCurrency(getSaldo(loan))}</p>
                      <p className="text-xs text-slate-500 truncate">{loan.cliente.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Total</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(loan.valor)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data Início</p>
                      <p className="text-sm font-bold text-slate-700">{formatDate(loan.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {loan.usuario?.nome?.[0] || '?'}
                    </div>
                    <span className="text-xs font-medium text-slate-500 truncate max-w-[100px]">
                      {loan.usuario?.nome || 'Não atribuído'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDraft ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenModal()
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        Continuar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/emprestimos/${loan.id}`)
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    )}

                    {contactFilter(loan) ? (
                      <a
                        href={generateWhatsAppLink(loan)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Cobrar
                      </a>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Sem WhatsApp
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal Novo/Editar Cobrança */}
      <ChargeModal
        open={isModalOpen}
        title={editingLoan ? 'Editar Cobrança' : 'Nova Cobrança'}
        clientes={clientes}
        colaboradores={colaboradores}
        userRole={userRole}
        editing={!!editingLoan}
        loading={loading}
        formData={formData}
        setFormData={setFormData}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Modal Detalhes da Cobrança */}
      {isDetailModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsDetailModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 flex items-center">
                    <Info className="h-5 w-5 mr-2 text-blue-600" /> Detalhes da Cobrança
                  </h3>
                  <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Cliente</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLoan.cliente.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                      <span className={`mt-1 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[selectedLoan.status].bg} ${statusConfig[selectedLoan.status].color}`}>
                        {statusConfig[selectedLoan.status].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Agente Responsável</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLoan.usuario?.nome || 'Não atribuído'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Valor</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedLoan.valor)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Data de Criação</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedLoan.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedLoan.observacao && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Observações</p>
                      <p className="text-sm text-gray-700">{selectedLoan.observacao}</p>
                    </div>
                  )}

                  {selectedLoan.quitadoEm && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Quitado Em</p>
                      <p className="text-sm text-green-600 font-bold">{formatDate(selectedLoan.quitadoEm)}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <a
                      href={generateWhatsAppLink(selectedLoan)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Iniciar Cobrança via WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
