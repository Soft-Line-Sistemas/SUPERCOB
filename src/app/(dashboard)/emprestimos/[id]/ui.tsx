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
import { DocumentsTab } from '@/components/loans/DocumentsTab'
import { DossieHeader } from './components/DossieHeader'
import { FinancialSummary } from './components/FinancialSummary'
import { ClientProfile } from './components/ClientProfile'
import { TerminalCobranca } from './components/TerminalCobranca'
import { DossieTimeline } from './components/DossieTimeline'

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
  clienteId: string
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
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'documentos'>('historico')

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
    nextMonthInterest,
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

  const handleSetStatus = (nextStatus: 'CANCELADO' | 'QUITADO' | 'ABERTO') => {
    startTransition(async () => {
      try {
        const { emprestimo: updated, evento } = await setEmprestimoStatus({ emprestimoId: emprestimo.id, status: nextStatus as any })
        setStatus(updated.status)
        setQuitadoEm(updated.quitadoEm)
        setEventos((prev) => [...prev, evento as any].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
        toast.success(nextStatus === 'QUITADO' ? 'Contrato concluído.' : nextStatus === 'ABERTO' ? 'Contrato reaberto.' : 'Contrato cancelado.')
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
        setEventos((prev) => [...prev, ...(novosEventos as any)].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
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
      <DossieHeader 
        id={emprestimo.id}
        status={status}
        statusLabel={statusLabel}
        statusPillClass={getStatusPillClass(status)}
        createdAt={formatDate(emprestimo.createdAt)}
        isPending={isPending}
        canCancel={canCancel}
        canFinish={canFinish}
        myRole={myRole}
        handleSetStatus={handleSetStatus}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 px-2">
        {/* Main Dossier Content */}
        <div className="xl:col-span-8 space-y-6">
          <FinancialSummary 
            totalDevido={totalDevido}
            restante={restante}
            jurosPendente={jurosPendente}
            nextMonthInterest={nextMonthInterest}
            valorPago={valorPago}
            valorOriginal={emprestimo.valor}
            priorityLevel={priorityLevel}
            daysLate={daysLate}
            monthsAccrued={monthsAccrued}
            usesDailyLateInterest={usesDailyLateInterest}
            borderClass={borderClass}
            formatBRL={formatBRL}
          />

          <div className="space-y-6">
            <ClientProfile cliente={emprestimo.cliente} />

            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsável Atual</p>
              {myRole === 'ADMIN' ? (
                <select 
                  value={emprestimo.usuario?.id || 'unassigned'}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(async () => {
                      try {
                        await updateLoanUser(emprestimo.id, val);
                        toast.success('Responsável alterado.');
                        router.refresh();
                      } catch (err) {
                        toast.error('Erro ao alterar.');
                      }
                    });
                  }}
                  disabled={isPending}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-blue-600 outline-none"
                >
                  <option value="unassigned" disabled>Não atribuído</option>
                  {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gold-50 dark:bg-gold-500/10 rounded-xl border border-gold-100 dark:border-gold-500/20">
                  <div className="w-6 h-6 rounded-full bg-gold-600 flex items-center justify-center text-[10px] font-black text-white">
                    {emprestimo.usuario?.nome?.[0] || 'S'}
                  </div>
                  <p className="text-sm font-black text-gold-900 dark:text-gold-400">{emprestimo.usuario?.nome || 'Mr Cobrança Central'}</p>
                </div>
              )}
            </div>

            {emprestimo.observacao && (
              <div className="bg-amber-50/50 dark:bg-amber-500/5 rounded-[2.5rem] border border-amber-100 dark:border-amber-500/20 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">Observações Estratégicas</h3>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed font-medium whitespace-pre-wrap">{emprestimo.observacao}</p>
              </div>
            )}

            <DossieTimeline 
              eventos={eventos}
              abaAtiva={abaAtiva}
              setAbaAtiva={setAbaAtiva}
              clienteId={emprestimo.clienteId}
              emprestimoId={emprestimo.id}
              loanFiles={[(emprestimo as any).arquivo1, (emprestimo as any).arquivo2, (emprestimo as any).arquivo3, (emprestimo as any).arquivo4, (emprestimo as any).arquivo5]}
            />
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="xl:col-span-4">
          <TerminalCobranca 
            emprestimo={emprestimo}
            totalDevido={totalDevido}
            pagamento={pagamento}
            setPagamento={setPagamento}
            descricao={descricao}
            setDescricao={setDescricao}
            isPending={isPending}
            handlePagamentoParcial={handlePagamentoParcial}
            handleAddEvento={handleAddEvento}
            formatBRL={formatBRL}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  )
}
