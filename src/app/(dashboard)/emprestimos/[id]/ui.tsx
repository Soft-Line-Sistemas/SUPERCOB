'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { addEmprestimoHistorico, addPagamentoParcial, setEmprestimoStatus } from './actions'

type EmprestimoStatus = string

type HistoricoEvento = {
  id: string
  descricao: string
  createdAt: Date | string
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

export function ContractDetails({ emprestimo }: { emprestimo: EmprestimoDetalhes }) {
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
  const jurosAcumulado = jurosMensalValor * monthsLate
  const canFinish = status !== 'QUITADO' && status !== 'CANCELADO' && restante <= 0

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
        setEventos((prev) => [...prev, evento as any].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)))
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
        setEventos((prev) => [...prev, evento as any].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)))
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-900 truncate">Contrato #{emprestimo.id}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black ${getStatusPillClass(status)}`}>
                {status === 'QUITADO' ? <CheckCircle2 className="h-4 w-4" /> : status === 'CANCELADO' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {statusLabel}
              </span>
              <span className="text-xs font-bold text-slate-500">Criado em {formatDate(emprestimo.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={!canCancel || isPending}
            onClick={() => handleSetStatus('CANCELADO')}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all ${
              !canCancel || isPending ? 'bg-slate-100 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/15 active:scale-95'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canFinish || isPending}
            onClick={() => handleSetStatus('QUITADO')}
            title={!canFinish && restante > 0 ? 'Finalize após quitar (restante deve ser 0)' : undefined}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all ${
              !canFinish || isPending ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/15 active:scale-95'
            }`}
          >
            Concluir
          </button>
        </div>
      </div>

      <div className={`bg-white rounded-3xl border-2 ${borderClass} shadow-sm overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <p className="text-sm font-black text-slate-900">Resumo</p>
          <p className="text-xs text-slate-500 mt-1">Informações do contrato e status atual.</p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cliente</p>
            <p className="text-base font-black text-slate-900 mt-1 truncate">{emprestimo.cliente.nome}</p>
            <p className="text-xs text-slate-500 truncate">{emprestimo.cliente.email || '-'}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Responsável</p>
            <p className="text-base font-black text-slate-900 mt-1 truncate">{emprestimo.usuario?.nome || 'Não atribuído'}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(emprestimo.valor)}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pago</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(valorPago)}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Restante</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(restante)}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Juros ao mês</p>
            <p className="text-base font-black text-slate-900 mt-1">{(emprestimo.jurosMes ?? 0).toString().replace('.', ',')}%</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Juros mensal (R$)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(jurosMensalValor)}</p>
            <p className="text-xs text-slate-500 mt-1">Recalculado pelo saldo atual.</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Juros acumulado</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(jurosAcumulado)}</p>
            <p className="text-xs text-slate-500 mt-1">{monthsLate > 0 ? `${monthsLate} mês(es)` : 'Ainda não venceu.'}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vencimento</p>
            <div className="mt-1 flex items-center gap-2 text-slate-900">
              <Calendar className="h-4 w-4 text-slate-400" />
              <p className="text-base font-black">{formatDate(emprestimo.vencimento)}</p>
            </div>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Concluído em</p>
            <p className="text-base font-black text-slate-900 mt-1">{formatDateTime(quitadoEm)}</p>
          </div>
        </div>

        {emprestimo.observacao ? (
          <div className="px-6 pb-6">
            <div className="p-4 rounded-3xl bg-white border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Observações</p>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{emprestimo.observacao}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <p className="text-sm font-black text-slate-900">Histórico de negociação</p>
            <p className="text-xs text-slate-500 mt-1">Eventos em ordem cronológica.</p>
          </div>
          <div className="p-6">
            <Timeline eventos={eventos} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <p className="text-sm font-black text-slate-900">Pagamento parcial</p>
              <p className="text-xs text-slate-500 mt-1">Disponível apenas na tela de detalhes.</p>
            </div>
            <div className="p-6 space-y-3">
              <input
                type="text"
                inputMode="numeric"
                value={pagamento}
                onChange={(e) => setPagamento(formatBRL(parseBRL(e.target.value)))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                placeholder="R$ 0,00"
                disabled={isPending || status === 'CANCELADO' || status === 'QUITADO'}
              />
              <button
                type="button"
                disabled={isPending || status === 'CANCELADO' || status === 'QUITADO'}
                onClick={handlePagamentoParcial}
                className={`w-full px-5 py-3 rounded-2xl font-black text-sm transition-all ${
                  isPending || status === 'CANCELADO' || status === 'QUITADO' ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                }`}
              >
                Registrar pagamento
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <p className="text-sm font-black text-slate-900">Adicionar detalhe</p>
              <p className="text-xs text-slate-500 mt-1">Campo obrigatório com salvamento imediato.</p>
            </div>
            <div className="p-6 space-y-3">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onBlur={() => {
                  if (descricao.trim() !== '') setErro(null)
                }}
                className={`w-full min-h-[140px] resize-none px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                  erro ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                }`}
                placeholder="Descreva a ação, proposta, retorno do cliente, etc."
                disabled={isPending}
              />
              {erro ? <p className="text-xs font-bold text-red-600">{erro}</p> : null}

              <button
                type="button"
                disabled={isPending}
                onClick={handleAddEvento}
                className={`w-full px-5 py-3 rounded-2xl font-black text-sm transition-all ${
                  isPending ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                }`}
              >
                Adicionar ao histórico
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline({ eventos }: { eventos: HistoricoEvento[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!eventos.length) {
    return (
      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-600 text-sm">
        Nenhum evento registrado.
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-4">
        {eventos.map((ev) => {
          const isOpen = expanded === ev.id
          const who = ev.createdBy?.nome ? ` • ${ev.createdBy.nome}` : ''
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => setExpanded((prev) => (prev === ev.id ? null : ev.id))}
              className="w-full text-left group"
            >
              <div className="relative pl-10">
                <div className="absolute left-1.5 top-4 h-3 w-3 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-500 transition-colors" />
                <div className="p-4 rounded-3xl border border-slate-200 bg-white group-hover:shadow-sm transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs font-black text-slate-500">
                      {new Date(ev.createdAt).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {who}
                    </p>
                    <p className="text-xs font-bold text-slate-400">{isOpen ? 'Ocultar' : 'Ver'}</p>
                  </div>
                  <p className={`mt-2 text-sm text-slate-800 whitespace-pre-wrap ${isOpen ? '' : 'line-clamp-2'}`}>{ev.descricao}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
