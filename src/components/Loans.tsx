'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, MessageCircle, Plus, X, Calendar, Info, Send, Download } from 'lucide-react';
import { createEmprestimo, updateEmprestimo, deleteEmprestimo, toggleCobrancaAtiva } from '@/app/(dashboard)/emprestimos/actions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChargeModal } from './ChargeModal';
import { parseDateInputToUTCNoon } from '@/lib/date-utils'
import { LoanCard } from './LoanCard';

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
  jurosPagos?: number | null;
  cobrancaAtiva?: boolean;
}

interface LoansProps {
  initialLoans: Loan[];
  clientes: { id: string; nome: string; email?: string | null; whatsapp?: string | null }[];
  colaboradores: { id: string; nome: string }[];
  userRole: 'ADMIN' | 'OPERADOR';
  analytics?: { id: string; nome: string; aberto: number; negociacao: number; quitado: number; total: number }[];
}

const statusConfig: Record<LoanStatus, { label: string; color: string; icon: any; bg: string }> = {
  ABERTO: { label: 'Aberto', color: 'text-slate-600', bg: 'bg-slate-100', icon: Info },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50', icon: Info },
  QUITADO: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Info },
  CANCELADO: { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-50', icon: Info },
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
    const cobrancaOnly = initialSearch?.get('cobrancaOnly') === '1'
    return { status, q, startDate, endDate, usuarioId, cobrancaOnly }
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

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  };

  const generateWhatsAppLink = (loan: Loan) => {
    const text = `Olá ${loan.cliente.nome}, sou da SUPERCOB. Gostaria de falar sobre a sua cobrança no valor de ${formatCurrency(loan.valor)}.`;
    const phone = loan.cliente.whatsapp.replace(/\D/g, '');
    return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
  };

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

    if (filters.cobrancaOnly) next.set('cobrancaOnly', '1')
    else next.delete('cobrancaOnly')

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
    setFilters({ status: '', q: '', startDate: '', endDate: '', usuarioId: '', cobrancaOnly: false })
    setContactOnly(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('status')
    next.delete('q')
    next.delete('startDate')
    next.delete('endDate')
    next.delete('usuarioId')
    next.delete('contactOnly')
    next.delete('cobrancaOnly')
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
    if (filters.cobrancaOnly && !loan.cobrancaAtiva) return false
    return true
  })

  const sortedLoans = [...filteredLoans].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

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
        cobrancaAtiva: false,
      }
    : null

  const handleToggleCobranca = async (id: string, active: boolean) => {
    if (id.startsWith('draft-')) return;
    try {
      await toggleCobrancaAtiva(id, active);
      router.refresh();
      toast.success(active ? 'Modo cobrança ativado!' : 'Modo cobrança desativado.');
    } catch (e) {
      toast.error('Erro ao atualizar modo cobrança.');
    }
  };

  const loansToRender = draftLoan ? [draftLoan, ...sortedLoans] : sortedLoans

  const handleExportDossie = async (loanId: string) => {
    try {
      toast.loading('Gerando dossiê de cobrança...', { id: 'dossie' })
      const res = await fetch(`/api/export/pdf-dossie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emprestimoId: loanId }),
      })

      if (!res.ok) throw new Error('Erro ao gerar dossiê')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      const loan = loansToRender.find(l => l.id === loanId)
      const filename = `dossie-cobranca-${loan?.cliente.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      
      toast.success('Dossiê gerado com sucesso!', { id: 'dossie' })
      
      toast.info('Deseja enviar por WhatsApp?', {
        action: {
          label: 'Enviar',
          onClick: () => {
            const text = `Seguem os dados para cobrança do cliente ${loan?.cliente.nome}.`
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }
        }
      })
    } catch (e) {
      toast.error('Erro ao gerar dossiê.', { id: 'dossie' })
    }
  }

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
            <div className="mt-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <div className={`grid grid-cols-1 ${userRole === 'ADMIN' ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-3 items-end`}>
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
                  onClick={() => setFilters(prev => ({ ...prev, cobrancaOnly: !prev.cobrancaOnly }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                    filters.cobrancaOnly ? 'bg-red-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  Filtrar Cobrança
                </button>

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

              <div className="hidden md:flex mt-4 flex-col sm:flex-row gap-3">
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
                        onClick={() => setIsFiltersOpen(false)}
                        className="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {/* Mobile Filters UI continues... */}
                      <button
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, cobrancaOnly: !prev.cobrancaOnly }))}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                          filters.cobrancaOnly ? 'bg-red-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                        }`}
                      >
                        <Download className="h-4 w-4" />
                        Filtrar Cobrança
                      </button>
                      
                      {/* ... rest of mobile fields ... */}
                      <button
                        type="button"
                        onClick={applyFiltersToUrl}
                        className="w-full py-3 px-4 bg-slate-900 text-white font-black rounded-2xl"
                      >
                        Aplicar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
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
          {loansToRender.map((loan, idx) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              idx={idx}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onDetail={handleOpenDetail}
              onToggleCobranca={handleToggleCobranca}
              onExportDossie={handleExportDossie}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              generateWhatsAppLink={generateWhatsAppLink}
              contactFilter={contactFilter}
            />
          ))}
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

      {/* Modal Detalhes */}
      {isDetailModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-[2.5rem] text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-slate-100">
               <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" /> Detalhes
                  </h3>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
                    <X className="h-6 w-6 text-slate-400" />
                  </button>
               </div>
               
               <div className="p-6 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                     <p className="text-sm font-bold text-slate-900">{selectedLoan.cliente.nome}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                     <span className={`px-2 py-0.5 inline-flex text-[10px] font-black uppercase rounded-lg border ${statusConfig[selectedLoan.status].bg} ${statusConfig[selectedLoan.status].color}`}>
                        {statusConfig[selectedLoan.status].label}
                     </span>
                   </div>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumo Financeiro</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-slate-900">{formatCurrency(selectedLoan.valor)}</span>
                       <span className="text-xs text-slate-500 font-bold">valor bruto</span>
                    </div>
                 </div>

                 <a
                    href={generateWhatsAppLink(selectedLoan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                 >
                    <Send className="h-5 w-5" />
                    Falar com Cliente
                 </a>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
