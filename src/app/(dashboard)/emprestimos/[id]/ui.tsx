'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
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
import { addEmprestimoHistorico, addPagamentoParcial, setEmprestimoStatus, updateLoanUser, vincularPagamentoHistoricoACompetencia, atualizarVinculoPagamentoHistorico } from './actions'
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates'
import { calculateLoanInterest } from '@/lib/loan-interest'
import { calculateCurrentInstallment, calculateCurrentInstallmentAmounts } from '@/lib/installments'
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
  competenciaId?: string | null
  createdBy?: { nome: string } | null
}

type EmprestimoDetalhes = {
  id: string
  clienteId: string
  valor: number
  quantidadeParcelas?: number | null
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
  competencias?: { id: string; vencimento: Date | string; valorPrevisto: number; valorPago: number; pagoEm?: Date | string | null }[]
  auditorias?: { id: string; detalhes?: string | null; createdAt: Date | string }[]
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
  const [reciboHistoricoId, setReciboHistoricoId] = useState('')
  const [modalCompetenciaAberto, setModalCompetenciaAberto] = useState(false)
  const [vinculoEmEdicao, setVinculoEmEdicao] = useState<{ historicoId: string; vencimento: string } | null>(null)
  const [competenciaVencimento, setCompetenciaVencimento] = useState('')
  const [aplicarPrincipal, setAplicarPrincipal] = useState(false)
  const [competenciaRegularizacaoVencimento, setCompetenciaRegularizacaoVencimento] = useState('')
  const [descontoJuros, setDescontoJuros] = useState('')
  const [renovarCiclo, setRenovarCiclo] = useState(false)
  const [paymentConfirmationValue, setPaymentConfirmationValue] = useState<number | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'documentos'>('historico')

  const statusLabel = useMemo(() => getStatusLabel(status), [status])
  const borderClass = useMemo(() => getBorderClass(status), [status])

  const canCancel = status !== 'CANCELADO' && status !== 'QUITADO'

  const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
  const parseBRL = (value: string) => {
    const normalized = value.replace(/[^\d,\.]/g, '').trim()
    if (!normalized) return 0
    if (normalized.includes(',')) return Number(normalized.replace(/\./g, '').replace(',', '.'))
    if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) return Number(normalized.replace(/\./g, ''))
    return Number(normalized)
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
  const installmentProgress = calculateCurrentInstallment({ ...emprestimo, valorPago, status })
  const installmentAmounts = calculateCurrentInstallmentAmounts(emprestimo)
  const acordoSemJuros = jurosBase <= 0.01 && Boolean(installmentAmounts?.valorParcela)
  const competencias = useMemo(() => {
    // Contratos sem juros mensais não possuem cobrança por competência. Não
    // crie meses sintéticos com valor zero, pois 0 previsto/0 pago parecia
    // indevidamente como um pagamento confirmado no dossiê.
    const valorCompetencia = acordoSemJuros ? installmentAmounts?.valorParcela ?? 0 : jurosBase
    if (valorCompetencia <= 0.01) return []
    const existentes = new Map((emprestimo.competencias ?? []).map((item) => [
      new Date(item.vencimento).toISOString().slice(0, 10),
      { ...item, valorPrevisto: valorCompetencia },
    ]))
    const vencimentoContrato = emprestimo.vencimento ? new Date(emprestimo.vencimento) : null
    const agora = new Date()
    // As competências acompanham o mês corrente usando o dia de vencimento do
    // contrato; o vencimento original não deve congelar a lista no mês da criação.
    const referencia = vencimentoContrato
      ? new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), vencimentoContrato.getUTCDate()))
      : null
    // Mostra o mês anterior, o atual e o próximo. A competência futura
    // permite receber juros antecipadamente, sem entrar no total vencido.
    const sugestoes = referencia ? [-1, 0, 1].map((offset) => {
      const vencimento = new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth() + offset, referencia.getUTCDate()))
      const key = vencimento.toISOString().slice(0, 10)
      return existentes.get(key) ?? { id: key, vencimento, valorPrevisto: valorCompetencia, valorPago: 0, pagoEm: null }
    }) : []
    return [...existentes.values(), ...sugestoes.filter((item) => !existentes.has(new Date(item.vencimento).toISOString().slice(0, 10)))]
      .sort((a, b) => +new Date(a.vencimento) - +new Date(b.vencimento))
  }, [acordoSemJuros, emprestimo.competencias, emprestimo.vencimento, installmentAmounts?.valorParcela, jurosBase])
  const competenciaSelecionada = competencias.find((item) => new Date(item.vencimento).toISOString() === competenciaVencimento)
  const competenciaSelecionadaFutura = Boolean(competenciaSelecionada && (() => {
    const data = new Date(competenciaSelecionada.vencimento)
    const agora = new Date()
    return data.getUTCFullYear() * 12 + data.getUTCMonth() > agora.getUTCFullYear() * 12 + agora.getUTCMonth()
  })())
  // Juros de competência futura ainda não venceram e, portanto, não impedem
  // a amortização do principal quando todos os juros exigíveis estão quitados.
  const podeAplicarPrincipal = jurosPendente <= 0.01
  const jurosCobraveisNaCompetencia = competenciaSelecionada
    ? Math.max(competenciaSelecionada.valorPrevisto - competenciaSelecionada.valorPago, 0)
    : jurosPendente
  const evidenciasPorCompetencia = useMemo(() => {
    const evidencias = new Map<string, { data: Date | string; fonte: 'RECIBO' | 'AUDITORIA' }>()
    const registrar = (texto: string | null | undefined, data: Date | string, fonte: 'RECIBO' | 'AUDITORIA') => {
      const match = texto?.match(/Referente à competência de (\d{2})\/(\d{2})\/(\d{4})/)
      if (!match) return
      const chave = `${match[3]}-${match[2]}-${match[1]}`
      if (!evidencias.has(chave)) evidencias.set(chave, { data, fonte })
    }
    emprestimo.historico.filter((evento) => evento.tipo === 'PAGAMENTO').forEach((evento) => registrar(evento.descricao, evento.createdAt, 'RECIBO'))
    emprestimo.auditorias?.forEach((auditoria) => registrar(auditoria.detalhes, auditoria.createdAt, 'AUDITORIA'))
    return evidencias
  }, [emprestimo.historico, emprestimo.auditorias])
  const totalCompetenciasPendentes = competencias.reduce((sum, item) => {
    const chave = new Date(item.vencimento).toISOString().slice(0, 10)
    return new Date(item.vencimento) <= new Date() && !evidenciasPorCompetencia.has(chave)
      ? sum + Math.max(item.valorPrevisto - item.valorPago, 0)
      : sum
  }, 0)
  const competenciaRecomendada = useMemo(() => competencias
    .filter((item) => {
      const chave = new Date(item.vencimento).toISOString().slice(0, 10)
      return Math.max(item.valorPrevisto - item.valorPago, 0) > 0.01 && !evidenciasPorCompetencia.has(chave)
    })
    .sort((a, b) => +new Date(a.vencimento) - +new Date(b.vencimento))[0], [competencias, evidenciasPorCompetencia])

  useEffect(() => {
    if (!competenciaVencimento && competenciaRecomendada) {
      setCompetenciaVencimento(new Date(competenciaRecomendada.vencimento).toISOString())
      if (acordoSemJuros) setAplicarPrincipal(true)
    }
  }, [acordoSemJuros, competenciaVencimento, competenciaRecomendada])
  const pagamentosSemCompetencia = useMemo(() => emprestimo.historico.filter((evento) => (
    evento.tipo === 'PAGAMENTO' && !evento.competenciaId && !/Referente à competência de \d{2}\/\d{2}\/\d{4}/i.test(evento.descricao)
  )), [emprestimo.historico])
  const vinculosPorCompetencia = useMemo(() => {
    const vinculos = new Map<string, string[]>()
    const adicionar = (competencia: string, historicoId: string) => {
      vinculos.set(competencia, [...(vinculos.get(competencia) ?? []), historicoId])
    }
    emprestimo.historico.forEach((evento) => {
      if (evento.competenciaId) {
        const competencia = emprestimo.competencias?.find((item) => item.id === evento.competenciaId)
        if (competencia) adicionar(new Date(competencia.vencimento).toISOString().slice(0, 10), evento.id)
        return
      }
      // Regularizações históricas feitas somente por referência textual não
      // alteram os valores da competência, mas também precisam poder ser editadas.
      const referencia = evento.descricao.match(/Referente à competência de (\d{2})\/(\d{2})\/(\d{4})/i)
      if (evento.tipo === 'PAGAMENTO' && referencia) {
        adicionar(`${referencia[3]}-${referencia[2]}-${referencia[1]}`, evento.id)
      }
    })
    return vinculos
  }, [emprestimo.historico, emprestimo.competencias])

  const handleVincularPagamentoAntigo = () => {
    if (!reciboHistoricoId || !competenciaRegularizacaoVencimento) {
      toast.error('Selecione o recibo antigo e a competência.')
      return Promise.resolve(false)
    }
    return new Promise<boolean>((resolve) => startTransition(async () => {
      try {
        await vincularPagamentoHistoricoACompetencia({ emprestimoId: emprestimo.id, historicoId: reciboHistoricoId, competenciaVencimento: competenciaRegularizacaoVencimento })
        setReciboHistoricoId('')
        setCompetenciaRegularizacaoVencimento('')
        toast.success('Recibo antigo vinculado sem novo abatimento no contrato.')
        router.refresh()
        resolve(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao regularizar recibo.')
        resolve(false)
      }
    })
    )
  }
  const handleEditarVinculo = (historicoId: string, vencimento: string) => setVinculoEmEdicao({ historicoId, vencimento })
  const handleSalvarVinculo = (competenciaVencimento?: string | null) => {
    if (!vinculoEmEdicao) return
    startTransition(async () => {
      try {
        await atualizarVinculoPagamentoHistorico({ emprestimoId: emprestimo.id, historicoId: vinculoEmEdicao.historicoId, competenciaVencimento })
        setVinculoEmEdicao(null)
        toast.success(competenciaVencimento ? 'Vínculo atualizado sem novo abatimento.' : 'Vínculo removido sem alterar o saldo geral.')
        router.refresh()
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao editar vínculo.') }
    })
  }
  const canFinish = status !== 'QUITADO' && status !== 'CANCELADO' && restante <= 0 && jurosPendente <= 0
  const paymentConfirmation = useMemo(() => {
    if (paymentConfirmationValue === null) return null
    const paraJuros = aplicarPrincipal ? 0 : Math.min(paymentConfirmationValue, jurosCobraveisNaCompetencia)
    const paraPrincipal = aplicarPrincipal ? paymentConfirmationValue : 0
    const descJuros = parseBRL(descontoJuros)

    return {
      valor: paymentConfirmationValue,
      descontoJuros: descJuros,
      renovarCiclo,
      paraJuros,
      paraPrincipal,
      jurosRestanteApos: Math.max(jurosCobraveisNaCompetencia - paraJuros, 0),
      principalRestanteApos: Math.max(restante - paraPrincipal, 0),
    }
  }, [jurosCobraveisNaCompetencia, paymentConfirmationValue, restante, descontoJuros, renovarCiclo, aplicarPrincipal])

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

  const requestPaymentConfirmation = () => {
    const v = parseBRL(pagamento)
    if (!Number.isFinite(v) || v <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    if (!competenciaVencimento) {
      toast.error('Selecione o mês a que este pagamento se refere.')
      return
    }
    if (aplicarPrincipal && !podeAplicarPrincipal) {
      toast.error('O principal só pode ser abatido após quitar todos os juros pendentes.')
      return
    }
    setPaymentConfirmationValue(v)
  }

  const handlePagamentoParcial = () => {
    if (paymentConfirmationValue === null) return
    const v = paymentConfirmationValue
    const descJuros = parseBRL(descontoJuros)
    startTransition(async () => {
      try {
        const { emprestimo: updated, eventos: novosEventos } = await addPagamentoParcial({
          emprestimoId: emprestimo.id,
          valor: v,
          descontoJuros: descJuros,
          renovarCiclo,
          competenciaVencimento,
          aplicarPrincipal,
        })
        setValorPago(Number((updated as any).valorPago ?? 0) || 0)
        setStatus((updated as any).status)
        setQuitadoEm((updated as any).quitadoEm)
        setEventos((prev) => [...prev, ...(novosEventos as any)].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
        setPagamento('')
        setCompetenciaVencimento('')
        setAplicarPrincipal(false)
        setDescontoJuros('')
        setRenovarCiclo(false)
        setPaymentConfirmationValue(null)
        toast.success('Pagamento e negociação registrados.')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao registrar pagamento.')
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
            currentInterest={status === 'QUITADO' || status === 'CANCELADO' ? 0 : jurosBase}
            installmentProgress={installmentProgress}
            installmentAmounts={installmentAmounts}
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
            competenciaVencimento={competenciaVencimento}
            setCompetenciaVencimento={(value) => { setCompetenciaVencimento(value); setAplicarPrincipal(acordoSemJuros) }}
            podeAplicarPrincipal={podeAplicarPrincipal}
            aplicarPrincipal={aplicarPrincipal}
            setAplicarPrincipal={setAplicarPrincipal}
            competenciaSelecionadaFutura={competenciaSelecionadaFutura}
            acordoSemJuros={acordoSemJuros}
            competencias={competencias}
            totalCompetenciasPendentes={totalCompetenciasPendentes}
            evidenciasPorCompetencia={evidenciasPorCompetencia}
            pagamentosSemCompetencia={pagamentosSemCompetencia}
            modalCompetenciaAberto={modalCompetenciaAberto}
            setModalCompetenciaAberto={setModalCompetenciaAberto}
            reciboHistoricoId={reciboHistoricoId}
            setReciboHistoricoId={setReciboHistoricoId}
            competenciaRegularizacaoVencimento={competenciaRegularizacaoVencimento}
            setCompetenciaRegularizacaoVencimento={setCompetenciaRegularizacaoVencimento}
            handleVincularPagamentoAntigo={handleVincularPagamentoAntigo}
            vinculosPorCompetencia={vinculosPorCompetencia}
            vinculoEmEdicao={vinculoEmEdicao}
            handleEditarVinculo={handleEditarVinculo}
            setVinculoEmEdicao={setVinculoEmEdicao}
            handleSalvarVinculo={handleSalvarVinculo}
            descontoJuros={descontoJuros}
            setDescontoJuros={setDescontoJuros}
            renovarCiclo={renovarCiclo}
            setRenovarCiclo={setRenovarCiclo}
            descricao={descricao}
            setDescricao={setDescricao}
            isPending={isPending}
            handlePagamentoParcial={requestPaymentConfirmation}
            handleAddEvento={handleAddEvento}
            formatBRL={formatBRL}
            formatDate={formatDate}
          />
        </div>
      </div>

      {paymentConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar confirmação"
            className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
            disabled={isPending}
            onClick={() => setPaymentConfirmationValue(null)}
          />
          <div role="dialog" aria-modal="true" aria-labelledby="payment-confirmation-title" className="relative w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Confirmação de pagamento</p>
                <h2 id="payment-confirmation-title" className="mt-2 text-xl font-black text-slate-900 dark:text-white">Confirmar pagamento?</h2>
              </div>
              <button type="button" onClick={() => setPaymentConfirmationValue(null)} disabled={isPending} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Fechar">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Será registrado um pagamento de <strong>{formatBRL(paymentConfirmation.valor)}</strong>{competenciaSelecionada ? <> referente a <strong>{formatDate(competenciaSelecionada.vencimento)}</strong></> : null}. {aplicarPrincipal ? 'O valor será abatido do principal.' : 'O valor será aplicado somente aos juros desta competência.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Pagamento informado</p>
                <p className="mt-1 font-black text-emerald-800 dark:text-emerald-200">{formatBRL(paymentConfirmation.valor)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Juros pendentes</p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">{formatBRL(jurosCobraveisNaCompetencia)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aplicação em juros</p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">{formatBRL(paymentConfirmation.paraJuros)}</p>
              </div>
              {aplicarPrincipal ? (
                <div className="rounded-2xl border border-violet-200 p-4 dark:border-violet-500/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">Amortização do principal</p>
                  <p className="mt-1 font-black text-slate-900 dark:text-white">{formatBRL(paymentConfirmation.paraPrincipal)}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Juros restantes nesta cobrança</p>
                  <p className="mt-1 font-black text-slate-900 dark:text-white">{formatBRL(paymentConfirmation.jurosRestanteApos)}</p>
                </div>
              )}
            </div>

            {aplicarPrincipal ? (
              <p className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:bg-violet-500/10 dark:text-violet-100">
                Principal estimado após o pagamento: <strong>{formatBRL(paymentConfirmation.principalRestanteApos)}</strong>.
              </p>
            ) : (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100">
                Este recebimento será aplicado somente aos juros da competência selecionada. <strong>O principal não será alterado.</strong>
              </p>
            )}

            {pagamentosSemCompetencia.length > 0 ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setPaymentConfirmationValue(null)
                  setModalCompetenciaAberto(true)
                }}
                className="mt-4 w-full rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800 transition-colors hover:bg-violet-100 disabled:opacity-40 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"
              >
                Regularizar vínculo de mês/pagamento
              </button>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setPaymentConfirmationValue(null)} disabled={isPending} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200">Cancelar</button>
              <button type="button" onClick={handlePagamentoParcial} disabled={isPending} className="flex-[1.5] rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:opacity-40">
                {isPending ? 'Confirmando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
