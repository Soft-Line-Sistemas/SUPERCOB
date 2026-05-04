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
import { calculateLoanInterest } from '@/lib/loan-interest'

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
  jurosAtrasoDia?: number | null
  vencimento?: Date | string | null
  quitadoEm?: Date | string | null
  status: EmprestimoStatus
  observacao?: string | null
  createdAt: Date | string
  cliente: {
    nome: string
    indicacao?: string | null
    email?: string | null
    whatsapp?: string | null
    cpf?: string | null
    rg?: string | null
    orgao?: string | null
    diaNasc?: number | null
    mesNasc?: number | null
    anoNasc?: number | null
    instagram?: string | null
    cep?: string | null
    endereco?: string | null
    complemento?: string | null
    bairro?: string | null
    cidade?: string | null
    estado?: string | null
    pontoReferencia?: string | null
    profissao?: string | null
    empresa?: string | null
    cepEmpresa?: string | null
    enderecoEmpresa?: string | null
    cidadeEmpresa?: string | null
    estadoEmpresa?: string | null
    contatoEmergencia1?: string | null
    contatoEmergencia2?: string | null
    contatoEmergencia3?: string | null
    numeroEndereco?: number | null
  }
  usuario?: { id?: string; nome: string } | null
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
  const {
    principalRestante: restante,
    jurosBase,
    jurosAcumuladoTotal,
    jurosPendente,
    totalDevido,
    monthsAccrued,
    daysLate,
    usesDailyLateInterest,
  } = calculateLoanInterest({ ...emprestimo, valorPago })
  const canFinish = status !== 'QUITADO' && status !== 'CANCELADO' && restante <= 0 && jurosPendente <= 0

  const priorityLevel = useMemo(() => {
    if (status === 'QUITADO' || status === 'CANCELADO') return 'BLOQUEADO'
    if (totalDevido > 5000 && (monthsAccrued > 2 || daysLate > 15)) return 'URGENTE'
    if (totalDevido > 1000 || monthsAccrued > 1 || daysLate > 0) return 'ALTA'
    return 'NORMAL'
  }, [totalDevido, monthsAccrued, daysLate, status])

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
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Dossiê de Cobrança</h1>
              <span className="text-slate-400 font-medium text-sm hidden md:inline">#{emprestimo.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusPillClass(status)}`}>
                {status === 'QUITADO' ? <CheckCircle2 className="h-3 w-3" /> : status === 'CANCELADO' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {statusLabel}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                Início: {formatDate(emprestimo.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canCancel || isPending}
            onClick={() => handleSetStatus('CANCELADO')}
            className={`flex-1 md:flex-none px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
              !canCancel || isPending ? 'bg-slate-100 text-slate-400' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50 active:scale-95'
            }`}
          >
            Cancelar Contrato
          </button>
          <button
            type="button"
            disabled={!canFinish || isPending}
            onClick={() => handleSetStatus('QUITADO')}
            className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
              !canFinish || isPending ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95'
            }`}
          >
            Concluir Cobrança
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 px-2">
        {/* Main Dossier Content */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Financial Summary Card */}
          <div className={`bg-white rounded-[2.5rem] border-2 ${borderClass} shadow-xl shadow-slate-200/50 overflow-hidden relative group`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10 p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Resumo de Ativos</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h2 className="text-4xl font-black text-slate-900">{formatBRL(totalDevido)}</h2>
                  <span className="text-xs font-bold text-slate-400 uppercase">Saldo Total</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {priorityLevel !== 'BLOQUEADO' && (
                  <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 ${
                    priorityLevel === 'URGENTE' ? 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-600/20' : 
                    priorityLevel === 'ALTA' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${priorityLevel === 'URGENTE' ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Prioridade {priorityLevel}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-100">
              <div className="bg-white p-8 group/item">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-blue-500 transition-colors">Principal Aberto</p>
                <p className="text-2xl font-black text-slate-900">{formatBRL(restante)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (restante / (emprestimo.valor || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 group/item">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-red-500 transition-colors">Juros Pendente</p>
                <p className="text-2xl font-black text-red-600">{formatBRL(jurosPendente)}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-2">
                  {usesDailyLateInterest ? `${daysLate} dias em atraso` : `${monthsAccrued} meses acumulados`}
                </p>
              </div>
              <div className="bg-white p-8 group/item">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-emerald-500 transition-colors">Total Amortizado</p>
                <p className="text-2xl font-black text-emerald-600">{formatBRL(valorPago)}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Ref. ao valor principal</p>
              </div>
            </div>
          </div>

          {/* Client Information Dossier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Perfil do Cliente */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Perfil do Titular</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</p>
                  <p className="text-base font-black text-slate-900">{emprestimo.cliente.nome}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF</p>
                    <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.cpf || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RG / Orgão</p>
                    <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.rg || '-'} {emprestimo.cliente.orgao ? `(${emprestimo.cliente.orgao})` : ''}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Indicação / Origem</p>
                  <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.indicacao || 'Direto / Sem indicação'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Nascimento</p>
                    <p className="text-sm font-bold text-slate-700">
                      {emprestimo.cliente.diaNasc ? `${emprestimo.cliente.diaNasc}/${emprestimo.cliente.mesNasc}/${emprestimo.cliente.anoNasc}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp</p>
                    <p className="text-sm font-black text-emerald-600">{emprestimo.cliente.whatsapp || '-'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{emprestimo.cliente.email || '-'}</p>
                </div>
              </div>
            </div>

            {/* Localização e Endereço */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Localização Residencial</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</p>
                  <p className="text-sm font-bold text-slate-900">{emprestimo.cliente.endereco || '-'}, {emprestimo.cliente.numeroEndereco || '-'}</p>
                  <p className="text-xs text-slate-500">{emprestimo.cliente.complemento}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bairro</p>
                    <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.bairro || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CEP</p>
                    <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.cep || '-'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cidade / UF</p>
                  <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.cidade || '-'} / {emprestimo.cliente.estado || '-'}</p>
                </div>

                {emprestimo.cliente.pontoReferencia && (
                  <div className="border-t border-slate-100 pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ponto de Referência</p>
                    <p className="text-xs text-slate-500 leading-relaxed italic">"{emprestimo.cliente.pontoReferencia}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dados Profissionais */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Informações Profissionais</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Profissão</p>
                  <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.profissao || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
                  <p className="text-base font-black text-slate-900">{emprestimo.cliente.empresa || '-'}</p>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço Profissional</p>
                  <p className="text-sm font-bold text-slate-700">{emprestimo.cliente.enderecoEmpresa || '-'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {emprestimo.cliente.cepEmpresa ? `CEP: ${emprestimo.cliente.cepEmpresa} • ` : ''}
                    {emprestimo.cliente.cidadeEmpresa} {emprestimo.cliente.estadoEmpresa ? `/ ${emprestimo.cliente.estadoEmpresa}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Contatos e Configurações */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Contatos e Alçadas</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contatos de Emergência</p>
                  <div className="space-y-2">
                    {[emprestimo.cliente.contatoEmergencia1, emprestimo.cliente.contatoEmergencia2, emprestimo.cliente.contatoEmergencia3].filter(Boolean).map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <p className="text-[11px] font-bold text-slate-700">{c}</p>
                      </div>
                    ))}
                    {![emprestimo.cliente.contatoEmergencia1, emprestimo.cliente.contatoEmergencia2, emprestimo.cliente.contatoEmergencia3].some(Boolean) && (
                      <p className="text-[10px] text-slate-400 italic">Nenhum contato registrado</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsável Atual</p>
                  {myRole === 'ADM' ? (
                    <div className="flex items-center gap-2 group cursor-pointer">
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
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="unassigned" disabled>Não atribuído</option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                        {emprestimo.usuario?.nome?.[0] || 'S'}
                      </div>
                      <p className="text-sm font-black text-blue-900">{emprestimo.usuario?.nome || 'Supercob Central'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Observations and Timeline */}
          {emprestimo.observacao && (
            <div className="bg-amber-50/50 rounded-[2.5rem] border border-amber-100 p-8">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Observações Estratégicas</h3>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed font-medium whitespace-pre-wrap">{emprestimo.observacao}</p>
            </div>
          )}

          <Timeline eventos={eventos} />
        </div>

        {/* Sidebar Actions - Cobrança Central */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-950 rounded-[3rem] p-8 text-white relative shadow-2xl overflow-hidden sticky top-6 border border-white/5">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 blur-[100px] rounded-full opacity-10 -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 blur-[100px] rounded-full opacity-10 -ml-32 -mb-32" />

            <div className="relative z-10 space-y-8">
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Terminal de Cobrança Ativo
                </p>
                <WhatsAppTemplates 
                  clienteNome={emprestimo.cliente.nome}
                  contratoId={`#${emprestimo.id.slice(0, 8).toUpperCase()}`}
                  vencimento={formatDate(emprestimo.vencimento)}
                  valorPendente={formatBRL(totalDevido)}
                  whatsapp={emprestimo.cliente.whatsapp || ''}
                />
              </div>

              {/* Financial Config Display */}
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Taxa Mensal</p>
                  <p className="text-lg font-black text-white">{(emprestimo.jurosMes ?? 0).toString().replace('.', ',')}%</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Atraso/Dia</p>
                  <p className="text-lg font-black text-white">{(emprestimo.jurosAtrasoDia ?? 0).toString().replace('.', ',')}%</p>
                </div>
              </div>

              {/* Payment Action */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Registrar Recebimento</p>
                <div className="space-y-3">
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-lg group-focus-within:text-white/50 transition-colors">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pagamento}
                      onChange={(e) => setPagamento(formatBRL(parseBRL(e.target.value)))}
                      className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[2rem] text-xl font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-white/5"
                      placeholder="0,00"
                      disabled={isPending || status === 'CANCELADO' || status === 'QUITADO'}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isPending || status === 'CANCELADO' || status === 'QUITADO'}
                    onClick={handlePagamentoParcial}
                    className={`w-full py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 ${
                      isPending || status === 'CANCELADO' || status === 'QUITADO' 
                      ? 'bg-white/5 text-white/10' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20'
                    }`}
                  >
                    Confirmar Transação
                  </button>
                </div>
              </div>

              {/* History Note Action */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Anotação de Ocorrência</p>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full min-h-[140px] bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-xs text-white resize-none outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-white/10"
                  placeholder="Descreva o andamento da negociação, promessas de pagamento ou dificuldades encontradas..."
                  disabled={isPending}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleAddEvento}
                  className={`w-full py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 ${
                    isPending ? 'bg-white/5 text-white/10' : 'bg-white text-slate-950 hover:bg-slate-100 shadow-xl'
                  }`}
                >
                  Registrar no Dossiê
                </button>
              </div>
            </div>
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
