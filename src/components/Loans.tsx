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
import { LoanHeader } from './loans/LoanHeader'
import { LoanFilters } from './loans/LoanFilters'
import { ColaboradorAnalytics } from './loans/ColaboradorAnalytics'

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
  jurosAtrasoDia?: number;
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
  ABERTO: { label: 'Aberto', color: 'text-slate-600', bg: 'bg-slate-100/50 dark:bg-white/5', icon: Info },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: Info },
  QUITADO: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: Info },
  CANCELADO: { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-100/50 dark:bg-white/5', icon: Info },
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
    const dateFilterMode = (initialSearch?.get('dateFilterMode') as 'created' | 'vencimento') || 'created'
    const vencimentoDay = initialSearch?.get('vencimentoDay') ?? ''
    return { status, q, startDate, endDate, usuarioId, cobrancaOnly, dateFilterMode, vencimentoDay }
  })
  const [contactOnly, setContactOnly] = useState(() => (initialSearch?.get('contactOnly') ?? '') === '1')

  const [formData, setFormData] = useState(() => ({
    clienteId: shouldAutoOpenNew ? initialClienteId : '',
    usuarioId: '',
    valor: shouldAutoOpenNew && initialValor ? Number(initialValor) || 0 : 0,
    jurosMes: shouldAutoOpenNew && initialJurosMes ? Number(initialJurosMes) || 0 : 0,
    jurosAtrasoDia: 0,
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
    const text = `Olá ${loan.cliente.nome}, sou da Mister Cobrança. Gostaria de falar sobre a sua cobrança no valor de ${formatCurrency(loan.valor)}.`;
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

    if (filters.dateFilterMode === 'vencimento') next.set('dateFilterMode', 'vencimento')
    else next.delete('dateFilterMode')

    if (filters.vencimentoDay) next.set('vencimentoDay', filters.vencimentoDay)
    else next.delete('vencimentoDay')

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
        jurosAtrasoDia: (loan.jurosAtrasoDia as any) ?? 0,
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
        jurosAtrasoDia: 0,
        vencimento: !prefillConsumed ? initialVencimento : '',
        observacao: !prefillConsumed ? initialObservacao : '',
      });
    }
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setFilters({ status: '', q: '', startDate: '', endDate: '', usuarioId: '', cobrancaOnly: false, dateFilterMode: 'created', vencimentoDay: '' })
    setContactOnly(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('status')
    next.delete('q')
    next.delete('startDate')
    next.delete('endDate')
    next.delete('usuarioId')
    next.delete('contactOnly')
    next.delete('cobrancaOnly')
    next.delete('vencimentoDay')
    router.replace(`${pathname}?${next.toString()}`)
    router.refresh()
  }

  const handleOpenDetail = (loan: Loan) => {
    if (loan.id.startsWith('draft-')) return;
    router.push(`/emprestimos/${loan.id}`);
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
      const targetDate = filters.dateFilterMode === 'vencimento' ? (loan.vencimento ? new Date(loan.vencimento) : null) : new Date(loan.createdAt)
      
      if (!targetDate) return false
      if (!(targetDate >= start && targetDate <= end)) return false
    }
    
    if (filters.vencimentoDay) {
      const day = Number(filters.vencimentoDay)
      const loanVenc = loan.vencimento ? new Date(loan.vencimento) : null
      if (!loanVenc || loanVenc.getUTCDate() !== day) return false
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
        jurosAtrasoDia: 0,
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
      if (formData.vencimento.trim() === '') {
        throw new Error('Informe o vencimento da cobrança.')
      }

      const data = {
        ...formData,
        usuarioId: formData.usuarioId || null,
        jurosMes: Number(formData.jurosMes) || 0,
        jurosAtrasoDia: Number(formData.jurosAtrasoDia) || 0,
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
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar cobrança.');
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
    <div className="space-y-4 md:space-y-8">
      <LoanHeader onNewLoan={() => handleOpenModal()} />

      <LoanFilters 
        filters={filters}
        setFilters={setFilters}
        isFiltersOpen={isFiltersOpen}
        setIsFiltersOpen={setIsFiltersOpen}
        applyFilters={applyFiltersToUrl}
        resetFilters={resetFilters}
        userRole={userRole}
        colaboradores={colaboradores}
        contactOnly={contactOnly}
        setContactOnly={setContactOnly}
      />

      <ColaboradorAnalytics 
        analytics={analytics || []} 
        visible={userRole === 'ADMIN' && !filters.usuarioId} 
      />

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
              isAdmin={userRole === 'ADMIN'}
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

    </div>
  );
}
