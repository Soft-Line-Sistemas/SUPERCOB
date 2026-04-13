'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from 'lucide-react'
import { addEmprestimoHistorico, addPagamentoParcial, setEmprestimoStatus, updateLoanUser } from './actions'
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates'

type EmprestimoStatus = string

type HistoricoEvento = {
  id: string
  descricao: string
  createdAt: Date | string
  tipo?: string | null
  createdBy?: { nome: string } | null
}

type EmprestimoDetalhes = {
  id: string
  valor: number
  valorPago?: number | null
  jurosMes?: number | null
  vencimento?: Date | string | null
  quitadoEm?: Date | string | null
  status: EmprestimoStatus
  observacao?: string | null
  createdAt: Date | string
  cliente: {
    nome: string
    email?: string | null
    whatsapp?: string | null
  }
  usuario?: { nome: string } | null
  historico: HistoricoEvento[]
  jurosPagos?: number | null
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

const formatDateTime = (date: Date | string | null | undefined) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getBorderClass(status: EmprestimoStatus) {
  if (status === 'CANCELADO') return 'border-red-500'
  if (status === 'QUITADO') return 'border-emerald-500'
  return 'border-amber-400'
}

function getStatusLabel(status: EmprestimoStatus) {
  if (status === 'CANCELADO') return 'Cancelado'
  if (status === 'QUITADO') return 'Concluído'
  return 'Pendente'
}

function getStatusPillClass(status: EmprestimoStatus) {
  if (status === 'CANCELADO') return 'bg-red-50 text-red-700 border-red-200'
  if (status === 'QUITADO') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export function ContractDetails({ 
  emprestimo, 
  myRole, 
  availableUsers = [] 
}: { 
  emprestimo: EmprestimoDetalhes, 
  myRole?: string,
  availableUsers?: { id: string, nome: string }[] 
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState<EmprestimoStatus>(emprestimo.status)
  const [quitadoEm, setQuitadoEm] = useState<Date | string | null | undefined>(emprestimo.quitadoEm)
  const [eventos, setEventos] = useState<HistoricoEvento[]>(emprestimo.historico ?? [])
  const [valorPago, setValorPago] = useState<number>(Number(emprestimo.valorPago ?? 0) || 0)
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pagamento, setPagamento] = useState('')

  const statusLabel = useMemo(() => getStatusLabel(status), [status])
  const borderClass = useMemo(() => getBorderClass(status), [status])

  const canCancel = status !== 'CANCELADO' && status !== 'QUITADO'

  const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
  const parseBRL = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const cents = digits ? Number(digits) : 0
    return cents / 100
  }
  const restante = Math.max(emprestimo.valor - valorPago, 0)
  const jurosPercent = Number(emprestimo.jurosMes ?? 0) || 0
  const jurosMensalValor = Math.max(restante, 0) * (jurosPercent / 100)
  const monthId = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth()
  const now = new Date()
  const baseDate = new Date((emprestimo.vencimento ?? emprestimo.createdAt) as any)
  const monthsLate = baseDate.getTime() <= now.getTime() ? Math.max(1, monthId(now) - monthId(baseDate) + 1) : 0
  
  const jurosAcumuladoTotal = jurosMensalValor * monthsLate
  const jurosPendente = Math.max(jurosAcumuladoTotal - (emprestimo.jurosPagos || 0), 0)
  
  const totalDevido = restante + jurosPendente
  const canFinish = status !== 'QUITADO' && status !== 'CANCELADO' && restante <= 0 && jurosPendente <= 0

  const priorityLevel = useMemo(() => {
    if (status === 'QUITADO' || status === 'CANCELADO') return 'BLOQUEADO'
    if (totalDevido > 5000 && monthsLate > 2) return 'URGENTE'
    if (totalDevido > 1000 || monthsLate > 1) return 'ALTA'
    return 'NORMAL'
  }, [totalDevido, monthsLate, status])

  const handleAddEvento = () => {
    const value = descricao.trim()
    if (!value) {
      setErro('Descrição é obrigatória.')
      toast.error('Preencha a descrição.')
      return
    }

    setErro(null)
    startTransition(async () => {
      try {
        const evento = await addEmprestimoHistorico({ emprestimoId: emprestimo.id, descricao: value })
        setEventos((prev) => [...prev, evento as any].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
        setDescricao('')
        toast.success('Detalhe adicionado ao histórico.')
        router.refresh()
      } catch (e) {
        toast.error('Erro ao adicionar detalhe.')
      }
    })
  }

  const handleSetStatus = (nextStatus: 'CANCELADO' | 'QUITADO') => {
    startTransition(async () => {
      try {
        const { emprestimo: updated, evento } = await setEmprestimoStatus({ emprestimoId: emprestimo.id, status: nextStatus })
        setStatus(updated.status)
        setQuitadoEm(updated.quitadoEm)
        setEventos((prev) => [...prev, evento as any].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
        toast.success(nextStatus === 'QUITADO' ? 'Contrato concluído.' : 'Contrato cancelado.')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status.')
      }
    })
  }

  const handlePagamentoParcial = () => {
    const v = parseBRL(pagamento)
    if (!Number.isFinite(v) || v <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    startTransition(async () => {
      try {
        const { emprestimo: updated, eventos: novosEventos } = await addPagamentoParcial({ emprestimoId: emprestimo.id, valor: v })
        setValorPago(Number((updated as any).valorPago ?? 0) || 0)
        setStatus((updated as any).status)
        setQuitadoEm((updated as any).quitadoEm)
        setEventos((prev) => [...prev, ...(novosEventos as any)].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)))
        setPagamento('')
        toast.success('Pagamento registrado.')
        router.refresh()
      } catch {
        toast.error('Erro ao registrar pagamento.')
      }
    })
  }

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 truncate">Contrato #{emprestimo.id.slice(0, 8).toUpperCase()}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black ${getStatusPillClass(status)}`}>
                {status === 'QUITADO' ? <CheckCircle2 className="h-4 w-4" /> : status === 'CANCELADO' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {statusLabel}
              </span>
              {priorityLevel !== 'BLOQUEADO' && (
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                  priorityLevel === 'URGENTE' ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-600/20' : 
                  priorityLevel === 'ALTA' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Prioridade: {priorityLevel}
                </span>
              )}
              <span className="text-xs font-bold text-slate-400">Criado em {formatDate(emprestimo.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={!canCancel || isPending}
            onClick={() => handleSetStatus('CANCELADO')}
            className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              !canCancel || isPending ? 'bg-slate-950 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/15 active:scale-95'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canFinish || isPending}
            onClick={() => handleSetStatus('QUITADO')}
            className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              !canFinish || isPending ? 'bg-slate-950 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/15 active:scale-95'
            }`}
          >
            Concluir
          </button>
        </div>
      </div>

      <div className={`bg-white rounded-[2.5rem] border-2 ${borderClass} shadow-sm overflow-hidden mx-2`}>
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumo Estratégico</p>
            <p className="text-xs text-slate-500 mt-1">Métricas de débito atualizadas em tempo real.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <div className="flex-1 sm:flex-none px-6 py-3 bg-slate-900 rounded-2xl text-center">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-tighter">Saldo Total à Receber</p>
                <p className="text-lg font-black text-white">{formatBRL(totalDevido)}</p>
             </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50/20 group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente titular</p>
            <p className="text-base font-black text-slate-900 mt-1 truncate">{emprestimo.cliente.nome}</p>
            <p className="text-xs text-slate-500 truncate">{emprestimo.cliente.email || '-'}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50/20 group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável Atual</p>
            {myRole === 'ADM' ? (
              <select 
                value={emprestimo.usuario?.id || 'unassigned'}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(async () => {
                    try {
                      await updateLoanUser(emprestimo.id, val);
                      toast.success('Responsável alterado com sucesso.');
                      router.refresh();
                    } catch (err) {
                      toast.error('Erro ao alterar responsável.');
                    }
                  });
                }}
                disabled={isPending}
                className="w-full mt-1 bg-transparent border-none p-0 text-base font-black text-blue-600 outline-none focus:ring-0 cursor-pointer hover:underline"
              >
                <option value="unassigned" disabled>Não atribuído</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            ) : (
              <p className="text-base font-black text-slate-900 mt-1 truncate">{emprestimo.usuario?.nome || 'Supercob Central'}</p>
            )}
          </div>
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50/20 group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do Empréstimo</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(emprestimo.valor)}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50/20 group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Principal Amortizado</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatBRL(valorPago)}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50/20 group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Principal</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{formatBRL(restante)}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50/20 group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Juros Pendente</p>
            <p className="text-2xl font-black text-red-600 mt-1">{formatBRL(jurosPendente)}</p>
            <p className="text-xs text-slate-500 mt-1">Acumulado ({monthsLate}m): {formatBRL(jurosAcumuladoTotal)}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-200">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento Original</p>
            <div className="mt-2 flex items-center gap-2 text-slate-900">
              <Calendar className="h-4 w-4 text-slate-400" />
              <p className="text-base font-black">{formatDate(emprestimo.vencimento)}</p>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Configuração Taxa</p>
            <p className="text-xl font-black mt-1">{(emprestimo.jurosMes ?? 0).toString().replace('.', ',')}% <span className="text-[10px] text-white/30">/ mês</span></p>
          </div>
        </div>

        {emprestimo.observacao && (
          <div className="px-8 pb-8">
            <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Notas de Observação</p>
              <p className="text-sm text-amber-900 mt-2 whitespace-pre-wrap leading-relaxed font-medium">{emprestimo.observacao}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-2">
        <div className="xl:col-span-3 space-y-6">
          <Timeline eventos={eventos} />
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative shadow-2xl sticky top-6">
            <div className="relative z-10 space-y-8">
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Central de Cobrança
                </p>
                <WhatsAppTemplates 
                  clienteNome={emprestimo.cliente.nome}
                  contratoId={`#${emprestimo.id.slice(0, 8).toUpperCase()}`}
                  vencimento={formatDate(emprestimo.vencimento)}
                  valorPendente={formatBRL(totalDevido)}
                  whatsapp={emprestimo.cliente.whatsapp || ''}
                />
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Receber Pagamento</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pagamento}
                    onChange={(e) => setPagamento(formatBRL(parseBRL(e.target.value)))}
                    className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-[2rem] text-xl font-black text-white outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-white/10"
                    placeholder="R$ 0,00"
                    disabled={isPending || status === 'CANCELADO' || status === 'QUITADO'}
                  />
                  <button
                    type="button"
                    disabled={isPending || status === 'CANCELADO' || status === 'QUITADO'}
                    onClick={handlePagamentoParcial}
                    className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all ${
                      isPending || status === 'CANCELADO' || status === 'QUITADO' ? 'bg-white/5 text-white/10' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/20'
                    }`}
                  >
                    Confirmar Recebimento
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nova Anotação</p>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-[2rem] p-6 text-xs text-white resize-none outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-white/10"
                  placeholder="Ex: Cliente prometeu pagar na segunda-feira..."
                  disabled={isPending}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleAddEvento}
                  className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all ${
                    isPending ? 'bg-white/5 text-white/10' : 'bg-white text-slate-900 hover:bg-slate-950 shadow-xl'
                  }`}
                >
                  Salvar no Histórico
                </button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 blur-[120px] rounded-full opacity-10 -mr-32 -mt-32" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline({ eventos }: { eventos: HistoricoEvento[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [filterType, setFilterType] = useState<'ALL' | 'JUROS' | 'NOTA' | 'PAGAMENTO'>('ALL')

  const filteredEventos = useMemo(() => {
    if (filterType === 'ALL') return eventos
    return eventos.filter(ev => {
      if (filterType === 'JUROS') return ev.tipo === 'JUROS'
      if (filterType === 'PAGAMENTO') return ev.tipo === 'PAGAMENTO'
      return ev.tipo !== 'JUROS' && ev.tipo !== 'PAGAMENTO'
    })
  }, [eventos, filterType])

  const totalPages = Math.ceil(filteredEventos.length / itemsPerPage)
  const currentItems = filteredEventos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const monthName = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  
  const groupedEvents = useMemo(() => {
    const groups: Record<string, HistoricoEvento[]> = {}
    currentItems.forEach(ev => {
      const month = monthName(new Date(ev.createdAt))
      if (!groups[month]) groups[month] = []
      groups[month].push(ev)
    })
    return groups
  }, [currentItems])

  return (
    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Extrato de Negociação</p>
          <p className="text-xs text-slate-500 mt-1">Histórico completo de ações e cobranças.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'NOTA', 'JUROS', 'PAGAMENTO'].map((t) => (
            <button
              key={t}
              onClick={() => { setFilterType(t as any); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                filterType === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-950'
              }`}
            >
              {t === 'ALL' ? 'Tudo' : t === 'NOTA' ? 'Notas' : t === 'JUROS' ? 'Juros' : 'Pagos'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 space-y-10">
        {filteredEventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Filter className="w-12 h-12 mb-4" />
            <p className="font-black text-sm uppercase">Nenhum registro encontrado</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([month, items]) => (
            <div key={month} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{month}</p>
                <div className="h-px w-full bg-slate-950" />
              </div>
              
              <div className="space-y-3 relative">
                <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-950 hidden md:block" />
                {items.map((ev: any) => {
                  const isJuros = ev.tipo === 'JUROS'
                  const isPagamento = ev.tipo === 'PAGAMENTO'
                  
                  return (
                    <div key={ev.id} className="relative md:pl-12 group">
                      <div className={`absolute left-[21px] top-6 h-1.5 w-1.5 rounded-full ring-4 ring-white z-10 hidden md:block ${
                        isJuros ? 'bg-orange-500 ring-orange-50' : 
                        isPagamento ? 'bg-emerald-500 ring-emerald-50' : 
                        'bg-slate-400 ring-slate-50'
                      }`} />
                      
                      <div className={`p-5 rounded-[2rem] border transition-all ${
                        isJuros ? 'bg-orange-50/30 border-orange-100/50' : 
                        isPagamento ? 'bg-emerald-50/30 border-emerald-100/50' : 
                        'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${
                              isJuros ? 'bg-orange-100 text-orange-700' : 
                              isPagamento ? 'bg-emerald-100 text-emerald-700' : 
                              'bg-slate-950 text-slate-500'
                            }`}>
                              {isJuros ? 'Correção Mensal' : isPagamento ? 'Recibo' : 'Anotaão'}
                            </span>
                            <p className="text-[10px] font-bold text-slate-400 italic">
                               {new Date(ev.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {ev.createdBy?.nome || 'Sistema'}
                            </p>
                          </div>
                          <p className="text-[10px] font-black text-slate-300">#{ev.id.slice(-4).toUpperCase()}</p>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {ev.descricao}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400">
            Mostrando página <span className="text-slate-900">{currentPage}</span> de <span className="text-slate-900">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
