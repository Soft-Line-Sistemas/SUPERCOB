'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { Search, Filter, MessageCircle, Plus, X, Calendar, Info, Send, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { createEmprestimo, updateEmprestimo, deleteEmprestimo, toggleCobrancaAtiva } from '@/app/(dashboard)/emprestimos/actions';
import { addPagamentoParcial } from '@/app/(dashboard)/emprestimos/[id]/actions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChargeModal } from './ChargeModal';
import { parseDateInputToUTCNoon } from '@/lib/date-utils'
import { calculateEstimatedInstallments, calculateEstimatedMonthlyPayment } from '@/lib/installments'
import { calculateLoanInterest } from '@/lib/loan-interest';
import { LoanCard } from './LoanCard';
import { LoanHeader } from './loans/LoanHeader'
import { LoanFilters } from './loans/LoanFilters'
import { ColaboradorAnalytics } from './loans/ColaboradorAnalytics'
import { BatchDossieModal } from './loans/BatchDossieModal'
import { ChargeDeliveryModal } from './loans/ChargeDeliveryModal'
import { PaymentTerminalModal } from './loans/PaymentTerminalModal'

type LoanStatus = 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' | 'CANCELADO';

const MONTHLY_PAYMENT_STATUSES: LoanStatus[] = ['ABERTO', 'NEGOCIACAO']

interface BatchLoanItem {
  id: string
  clienteNome: string
  status: LoanStatus
  vencimento?: string | null
  valor: number
}

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
  quantidadeParcelas?: number | null;
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
  historico?: { createdAt: Date | string; descricao?: string | null }[];
}

interface LoansProps {
  initialLoans: Loan[];
  total: number;
  page: number;
  pageSize: number;
  clientes: { id: string; nome: string; email?: string | null; whatsapp?: string | null }[];
  colaboradores: { id: string; nome: string }[];
  userRole: 'ADMIN' | 'OPERADOR';
  analytics?: { id: string; nome: string; aberto: number; negociacao: number; quitado: number; total: number }[];
}

const statusConfig: Record<LoanStatus, { label: string; color: string; icon: any; bg: string }> = {
  ABERTO: { label: 'Aberto', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100/50 dark:bg-slate-800', icon: Info },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: Info },
  QUITADO: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: Info },
  CANCELADO: { label: 'Cancelado', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100/50 dark:bg-slate-800', icon: Info },
};

export function Loans({ initialLoans, total, page, pageSize, clientes, colaboradores, userRole, analytics }: LoansProps) {
  const expectedInterestOptions = Array.from({ length: 20 }, (_, index) => (index + 1) * 5)
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
  const [isBatchDossieOpen, setIsBatchDossieOpen] = useState(false)
  const [isBatchExporting, setIsBatchExporting] = useState(false)
  const [chargeDeliveryLoanId, setChargeDeliveryLoanId] = useState<string | null>(null)
  const [isSingleChargeDownloading, setIsSingleChargeDownloading] = useState(false)
  const [isSendingChargeWhatsapp, setIsSendingChargeWhatsapp] = useState(false)
  const [paymentTerminalLoan, setPaymentTerminalLoan] = useState<Loan | null>(null)
  const [pagamentoRapido, setPagamentoRapido] = useState('')
  const [isPaymentPending, startPaymentTransition] = useTransition()
  const [directMonthlyPaymentLoanId, setDirectMonthlyPaymentLoanId] = useState<string | null>(null)
  const [installmentsManuallyEdited, setInstallmentsManuallyEdited] = useState(false)
  const [expectedInterestPercent, setExpectedInterestPercent] = useState('100')
  
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
    quantidadeParcelas: 0,
    jurosMes: shouldAutoOpenNew && initialJurosMes ? Number(initialJurosMes) || 0 : 0,
    jurosAtrasoDia: 0,
    vencimento: shouldAutoOpenNew ? initialVencimento : '',
    observacao: shouldAutoOpenNew ? initialObservacao : '',
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCurrencyInput = (value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0
    return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseBRL = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const cents = digits ? Number(digits) : 0
    return cents / 100
  }

  const parsePaymentAmountFromDescription = (value?: string | null) => {
    if (!value) return 0
    const match = value.match(/R\$\s*([\d.]+,\d{2})/)
    if (!match) return 0
    return Number(match[1].replace(/\./g, '').replace(',', '.')) || 0
  }

  const getPaidAmountInCurrentMonth = (loan: Loan) => {
    const now = new Date()
    return (loan.historico || []).reduce((sum, entry) => {
      const createdAt = new Date(entry.createdAt)
      const isSameMonth =
        createdAt.getUTCFullYear() === now.getUTCFullYear() &&
        createdAt.getUTCMonth() === now.getUTCMonth()

      if (!isSameMonth) return sum
      return sum + parsePaymentAmountFromDescription(entry.descricao)
    }, 0)
  }

  const getMonthlyChargeAmount = (loan: Loan) => {
    return (
      calculateEstimatedMonthlyPayment({
        valor: loan.valor,
        jurosMes: loan.jurosMes,
        quantidadeParcelas: loan.quantidadeParcelas,
      }) ?? calculateLoanInterest(loan).jurosBase
    )
  }

  const getSettledMonthCount = (loan: Loan) => {
    const monthlyAmount = getMonthlyChargeAmount(loan)
    if (monthlyAmount <= 0) return 0

    const paidByMonth = new Map<string, number>()
    for (const entry of loan.historico || []) {
      const createdAt = new Date(entry.createdAt)
      const key = `${createdAt.getUTCFullYear()}-${createdAt.getUTCMonth()}`
      paidByMonth.set(key, (paidByMonth.get(key) || 0) + parsePaymentAmountFromDescription(entry.descricao))
    }

    let settledMonths = 0
    for (const paid of paidByMonth.values()) {
      if (paid + 0.01 >= monthlyAmount) settledMonths += 1
    }

    return settledMonths
  }

  const getCurrentInstallment = (loan: Loan) => {
    const total = Number(loan.quantidadeParcelas || 0)
    if (!Number.isInteger(total) || total <= 0) return null

    if (loan.status === 'QUITADO') {
      return { current: total, total }
    }

    return {
      current: Math.min(total, getSettledMonthCount(loan) + 1),
      total,
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
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

    next.delete('page')
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
        quantidadeParcelas: loan.quantidadeParcelas ?? 0,
        jurosMes: (loan.jurosMes as any) ?? 0,
        jurosAtrasoDia: (loan.jurosAtrasoDia as any) ?? 0,
        vencimento: loan.vencimento ? format(new Date(loan.vencimento), 'yyyy-MM-dd') : '',
        observacao: loan.observacao || '',
      });
      setInstallmentsManuallyEdited(Boolean(loan.quantidadeParcelas))
      setExpectedInterestPercent('100')
    } else {
      setEditingLoan(null);
      setFormData({
        clienteId: initialClienteId || '',
        usuarioId: '',
        valor: !prefillConsumed && initialValor ? Number(initialValor) || 0 : 0,
        quantidadeParcelas: 0,
        jurosMes: !prefillConsumed && initialJurosMes ? Number(initialJurosMes) || 0 : 0,
        jurosAtrasoDia: 0,
        vencimento: !prefillConsumed ? initialVencimento : '',
        observacao: !prefillConsumed ? initialObservacao : '',
      });
      setInstallmentsManuallyEdited(false)
      setExpectedInterestPercent('100')
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen || installmentsManuallyEdited) return

    const estimated = calculateEstimatedInstallments({
      valor: formData.valor,
      jurosMes: formData.jurosMes,
      jurosTotalPercentualEsperado: Number(expectedInterestPercent),
    })

    const nextValue = estimated ?? 0
    if (formData.quantidadeParcelas === nextValue) return

    setFormData((prev) => ({ ...prev, quantidadeParcelas: nextValue }))
  }, [expectedInterestPercent, formData.jurosMes, formData.quantidadeParcelas, formData.valor, installmentsManuallyEdited, isModalOpen])

  const handleQuantidadeParcelasChange = (value: string) => {
    setInstallmentsManuallyEdited(true)
    const raw = value.trim()
    if (raw === '') {
      setFormData((prev) => ({ ...prev, quantidadeParcelas: 0 }))
      return
    }

    const next = Number(raw)
    setFormData((prev) => ({
      ...prev,
      quantidadeParcelas: Number.isInteger(next) && next > 0 ? next : 0,
    }))
  }

  const handleExpectedInterestPercentChange = (value: string) => {
    setInstallmentsManuallyEdited(false)
    setExpectedInterestPercent(value)
  }

  const installmentHint = (() => {
    const installments = Number(formData.quantidadeParcelas)
    const monthlyPayment = calculateEstimatedMonthlyPayment({
      valor: formData.valor,
      jurosMes: formData.jurosMes,
      quantidadeParcelas: installments,
    })

    if (!Number.isInteger(installments) || installments <= 0 || !monthlyPayment) return null

    return `${installments} parcelas de ${formatCurrency(monthlyPayment)}`
  })()

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
    next.delete('page')
    router.replace(`${pathname}?${next.toString()}`)
    router.refresh()
  }

  const handleOpenDetail = (loan: Loan) => {
    if (loan.id.startsWith('draft-')) return;
    router.push(`/emprestimos/${loan.id}`);
  };

  const canOpenPaymentTerminal = (loan: Loan) => {
    if (loan.id.startsWith('draft-')) return false
    if (!MONTHLY_PAYMENT_STATUSES.includes(loan.status)) return false

    const monthlyCharge = getMonthlyChargeAmount(loan)
    if (monthlyCharge <= 0) return false

    return getPaidAmountInCurrentMonth(loan) + 0.01 < monthlyCharge
  }

  const canConfirmMonthlyPayment = (loan: Loan) => {
    if (loan.id.startsWith('draft-')) return false
    if (!MONTHLY_PAYMENT_STATUSES.includes(loan.status)) return false

    const monthlyCharge = getMonthlyChargeAmount(loan)
    if (monthlyCharge <= 0) return false

    return getPaidAmountInCurrentMonth(loan) + 0.01 < monthlyCharge
  }

  const isMonthlyPaymentSettled = (loan: Loan) => {
    if (loan.id.startsWith('draft-')) return false
    if (!MONTHLY_PAYMENT_STATUSES.includes(loan.status)) return false

    const monthlyCharge = getMonthlyChargeAmount(loan)
    if (monthlyCharge <= 0) return false

    return getPaidAmountInCurrentMonth(loan) + 0.01 >= monthlyCharge
  }

  const handleOpenPaymentTerminal = (loan: Loan) => {
    if (!canOpenPaymentTerminal(loan)) return
    setPaymentTerminalLoan(loan)
    setPagamentoRapido('')
  }

  const normalizeDigits = (value: string) => value.replace(/\D/g, '')
  const contactFilter = (loan: Loan) => {
    const hasWhatsapp = normalizeDigits(loan.cliente.whatsapp || '').length >= 10
    const notPaid = loan.status !== 'QUITADO' && loan.status !== 'CANCELADO'
    return hasWhatsapp && notPaid
  }

  const totalPages = Math.ceil(total / pageSize)

  const goToPage = (p: number) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('page', String(p))
    router.push(`${pathname}?${next.toString()}`)
  }

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
        quantidadeParcelas: 0,
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

  const loansToRender = draftLoan ? [draftLoan, ...initialLoans] : initialLoans
  const exportableLoans = loansToRender.filter((loan) => !loan.id.startsWith('draft-') && loan.cobrancaAtiva)
  const batchLoanItems: BatchLoanItem[] = exportableLoans.map((loan) => ({
    id: loan.id,
    clienteNome: loan.cliente.nome,
    status: loan.status,
    vencimento: loan.vencimento ? new Date(loan.vencimento).toISOString() : null,
    valor: loan.valor,
  }))
  const chargeDeliveryLoan = loansToRender.find((loan) => loan.id === chargeDeliveryLoanId) ?? null
  const currentTerminalFinancials = useMemo(() => {
    if (!paymentTerminalLoan) return null
    return calculateLoanInterest(paymentTerminalLoan)
  }, [paymentTerminalLoan])
  const currentTerminalMonthlyPaymentAmount = useMemo(() => {
    if (!paymentTerminalLoan) return 0
    return getMonthlyChargeAmount(paymentTerminalLoan)
  }, [paymentTerminalLoan])

  const handleOpenChargeDelivery = (loanId: string) => {
    setChargeDeliveryLoanId(loanId)
  }

  const handleFillMonthlyPayment = () => {
    if (!currentTerminalMonthlyPaymentAmount) return
    setPagamentoRapido(formatCurrencyInput(currentTerminalMonthlyPaymentAmount))
  }

  const handleQuickPayment = () => {
    if (!paymentTerminalLoan) return

    const valor = parseBRL(pagamentoRapido)
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error('Informe um valor válido.')
      return
    }

    startPaymentTransition(async () => {
      try {
        await addPagamentoParcial({ emprestimoId: paymentTerminalLoan.id, valor })
        toast.success('Pagamento registrado.')
        setPaymentTerminalLoan(null)
        setPagamentoRapido('')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao registrar pagamento.')
      }
    })
  }

  const handleDirectMonthlyPayment = (loan: Loan) => {
    const valor = getMonthlyChargeAmount(loan)

    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error('Pagamento mensal indisponível para este contrato.')
      return
    }

    setDirectMonthlyPaymentLoanId(loan.id)
    startPaymentTransition(async () => {
      try {
        await addPagamentoParcial({ emprestimoId: loan.id, valor })
        toast.success('Pagamento integral do mês confirmado.')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao confirmar pagamento do mês.')
      } finally {
        setDirectMonthlyPaymentLoanId(null)
      }
    })
  }

  const handleExportDossie = async (loanId: string) => {
    try {
      setIsSingleChargeDownloading(true)
      toast.loading('Preparando pacote do contrato...', { id: 'dossie' })
      const res = await fetch('/api/export/zip-dossies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIds: [loanId] }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Erro ao gerar pacote do contrato')
      }

      const blob = await res.blob()
      const fileUrl = URL.createObjectURL(blob)
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/)
      const filename = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || 'dossie-contrato.zip')

      const anchor = document.createElement('a')
      anchor.href = fileUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)

      setChargeDeliveryLoanId(null)
      toast.success('Pacote do contrato gerado com sucesso!', { id: 'dossie' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar pacote do contrato.', { id: 'dossie' })
    } finally {
      setIsSingleChargeDownloading(false)
    }
  }

  const handleSendChargeWhatsapp = async (loanId: string, phone: string) => {
    try {
      setIsSendingChargeWhatsapp(true)
      toast.loading('Gerando pacote e enviando no WhatsApp...', { id: 'charge-whatsapp' })

      const response = await fetch('/api/export/zip-dossies/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, phone }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Erro ao enviar pacote por WhatsApp')
      }

      setChargeDeliveryLoanId(null)
      toast.success('Pacote enviado por WhatsApp com sucesso!', { id: 'charge-whatsapp' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar pacote por WhatsApp.', { id: 'charge-whatsapp' })
    } finally {
      setIsSendingChargeWhatsapp(false)
    }
  }

  const handleBatchExportDossie = async (loanIds: string[], password?: string) => {
    if (loanIds.length === 0) {
      toast.error('Nenhum contrato elegível para exportação em lote.')
      return
    }

    try {
      setIsBatchExporting(true)
      toast.loading('Preparando pacote completo de dossiês...', { id: 'batch-dossie' })

      const response = await fetch('/api/export/zip-dossies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanIds,
          password,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Erro ao gerar pacote em lote')
      }

      const blob = await response.blob()
      const fileUrl = URL.createObjectURL(blob)
      const disposition = response.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/)
      const filename = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || 'dossies-lote.zip')

      const anchor = document.createElement('a')
      anchor.href = fileUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)

      setIsBatchDossieOpen(false)
      toast.success(`Pacote com ${loanIds.length} contrato(s) gerado com sucesso.`, { id: 'batch-dossie' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar pacote em lote.', { id: 'batch-dossie' })
    } finally {
      setIsBatchExporting(false)
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
        quantidadeParcelas: Number.isInteger(formData.quantidadeParcelas) && formData.quantidadeParcelas > 0 ? formData.quantidadeParcelas : null,
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
      setInstallmentsManuallyEdited(false)
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
        exportableCount={exportableLoans.length}
        onOpenBatchDossie={() => setIsBatchDossieOpen(true)}
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
              onExportDossie={handleOpenChargeDelivery}
              onOpenPaymentTerminal={handleOpenPaymentTerminal}
              onConfirmMonthlyPayment={handleDirectMonthlyPayment}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              generateWhatsAppLink={generateWhatsAppLink}
              contactFilter={contactFilter}
              isAdmin={userRole === 'ADMIN'}
              installmentProgress={getCurrentInstallment(loan)}
              canOpenPaymentTerminal={canOpenPaymentTerminal(loan)}
              canConfirmMonthlyPayment={canConfirmMonthlyPayment(loan)}
              isMonthlyPaymentSettled={isMonthlyPaymentSettled(loan)}
              isConfirmMonthlyPaymentPending={isPaymentPending && directMonthlyPaymentLoanId === loan.id}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? '0' : ((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total} contratos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    className={`min-w-[36px] h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-background hover:bg-accent'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
        expectedInterestPercent={expectedInterestPercent}
        expectedInterestOptions={expectedInterestOptions}
        onExpectedInterestPercentChange={handleExpectedInterestPercentChange}
        onQuantidadeParcelasChange={handleQuantidadeParcelasChange}
        installmentHint={installmentHint}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Modal Detalhes */}
      <BatchDossieModal
        key={isBatchDossieOpen ? `batch-dossie-open-${batchLoanItems.map((loan) => loan.id).join('-')}` : 'batch-dossie-closed'}
        open={isBatchDossieOpen}
        loading={isBatchExporting}
        loans={batchLoanItems}
        onClose={() => {
          if (!isBatchExporting) setIsBatchDossieOpen(false)
        }}
        onConfirm={handleBatchExportDossie}
      />

      <ChargeDeliveryModal
        key={chargeDeliveryLoan ? chargeDeliveryLoan.id : 'charge-delivery-closed'}
        open={Boolean(chargeDeliveryLoan)}
        loan={chargeDeliveryLoan}
        downloading={isSingleChargeDownloading}
        sendingWhatsapp={isSendingChargeWhatsapp}
        onClose={() => {
          if (!isSingleChargeDownloading && !isSendingChargeWhatsapp) setChargeDeliveryLoanId(null)
        }}
        onDownload={handleExportDossie}
        onSendWhatsapp={handleSendChargeWhatsapp}
      />

      <PaymentTerminalModal
        open={Boolean(paymentTerminalLoan)}
        loan={paymentTerminalLoan}
        totalDevido={currentTerminalFinancials?.totalDevido ?? 0}
        monthlyPaymentAmount={currentTerminalMonthlyPaymentAmount}
        pagamento={pagamentoRapido}
        onPagamentoChange={setPagamentoRapido}
        pending={isPaymentPending}
        onClose={() => {
          if (isPaymentPending) return
          setPaymentTerminalLoan(null)
          setPagamentoRapido('')
        }}
        onFillMonthlyPayment={handleFillMonthlyPayment}
        onSubmit={handleQuickPayment}
        formatBRL={formatCurrency}
        formatDate={formatDate}
      />

    </div>
  );
}
