'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates'

interface TerminalCobrancaProps {
  emprestimo: any
  totalDevido: number
  pagamento: string
  setPagamento: (val: string) => void
  competenciaVencimento: string
  setCompetenciaVencimento: (val: string) => void
  podeAplicarPrincipal: boolean
  aplicarPrincipal: boolean
  setAplicarPrincipal: (val: boolean) => void
  competenciaSelecionadaFutura: boolean
  acordoSemJuros: boolean
  competencias: { id: string; vencimento: Date | string; valorPrevisto: number; valorPago: number; pagoEm?: Date | string | null }[]
  totalCompetenciasPendentes: number
  evidenciasPorCompetencia: Map<string, { data: Date | string; fonte: 'RECIBO' | 'AUDITORIA' }>
  pagamentosSemCompetencia: { id: string; descricao: string; createdAt: Date | string }[]
  modalCompetenciaAberto: boolean
  setModalCompetenciaAberto: (aberto: boolean) => void
  reciboHistoricoId: string
  setReciboHistoricoId: (val: string) => void
  competenciaRegularizacaoVencimento: string
  setCompetenciaRegularizacaoVencimento: (val: string) => void
  handleVincularPagamentoAntigo: () => Promise<boolean>
  vinculosPorCompetencia: Map<string, string[]>
  vinculoEmEdicao: { historicoId: string; vencimento: string } | null
  handleEditarVinculo: (historicoId: string, vencimento: string) => void
  setVinculoEmEdicao: (vinculo: { historicoId: string; vencimento: string } | null) => void
  handleSalvarVinculo: (competenciaVencimento?: string | null) => void
  descontoJuros?: string
  setDescontoJuros?: (val: string) => void
  renovarCiclo?: boolean
  setRenovarCiclo?: (val: boolean) => void
  descricao: string
  setDescricao: (val: string) => void
  isPending: boolean
  handlePagamentoParcial: () => void
  handleAddEvento: () => void
  formatBRL: (val: number) => string
  formatDate: (val: any) => string
}

export function TerminalCobranca({
  emprestimo,
  totalDevido,
  pagamento,
  setPagamento,
  competenciaVencimento,
  setCompetenciaVencimento,
  podeAplicarPrincipal,
  aplicarPrincipal,
  setAplicarPrincipal,
  competenciaSelecionadaFutura,
  acordoSemJuros,
  competencias,
  totalCompetenciasPendentes,
  evidenciasPorCompetencia,
  pagamentosSemCompetencia,
  modalCompetenciaAberto,
  setModalCompetenciaAberto,
  reciboHistoricoId,
  setReciboHistoricoId,
  competenciaRegularizacaoVencimento,
  setCompetenciaRegularizacaoVencimento,
  handleVincularPagamentoAntigo,
  vinculosPorCompetencia,
  vinculoEmEdicao,
  handleEditarVinculo,
  setVinculoEmEdicao,
  handleSalvarVinculo,
  descontoJuros = '',
  setDescontoJuros,
  renovarCiclo = false,
  setRenovarCiclo,
  descricao,
  setDescricao,
  isPending,
  handlePagamentoParcial,
  handleAddEvento,
  formatBRL,
  formatDate
}: TerminalCobrancaProps) {
  // Competência representa uma data de vencimento, não um instante. Formatar
  // pelos campos UTC evita que meia-noite UTC apareça como o dia anterior no Brasil.
  const formatCompetenciaDate = (value: Date | string) => {
    const date = new Date(value)
    return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const chaveCompetencia = (value: Date | string) => new Date(value).toISOString().slice(0, 10)
  const competenciaEstaPaga = (item: TerminalCobrancaProps['competencias'][number]) => (
    Math.max(item.valorPrevisto - item.valorPago, 0) <= 0.01 || evidenciasPorCompetencia.has(chaveCompetencia(item.vencimento))
  )
  const competenciaAtual = competencias
    .filter((item) => !competenciaEstaPaga(item))
    .sort((a, b) => +new Date(a.vencimento) - +new Date(b.vencimento))[0]
  const vencimentoAtual = competenciaAtual ? new Date(competenciaAtual.vencimento) : null
  if (vencimentoAtual) vencimentoAtual.setHours(0, 0, 0, 0)
  const diasParaVencer = vencimentoAtual ? Math.ceil((vencimentoAtual.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000)) : null
  const ultimaCompetenciaPaga = [...competencias]
    .filter(competenciaEstaPaga)
    .sort((a, b) => +new Date(b.vencimento) - +new Date(a.vencimento))[0]
  const competenciaSelecionada = competencias.find((item) => new Date(item.vencimento).toISOString() === competenciaVencimento)
  const pendenteSelecionado = competenciaSelecionada ? Math.max(competenciaSelecionada.valorPrevisto - competenciaSelecionada.valorPago, 0) : 0
  const diasDaCompetenciaSelecionada = competenciaSelecionada
    ? Math.ceil((new Date(competenciaSelecionada.vencimento).getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000))
    : null

  return (
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
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{acordoSemJuros ? 'Registrar parcela do acordo' : 'Registrar Recebimento / Renegociação'}</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{acordoSemJuros ? 'Parcelas do acordo' : 'Por competência'}</p>
              <p className="text-xs font-black text-amber-300">Total: {formatBRL(totalCompetenciasPendentes)}</p>
            </div>
            {ultimaCompetenciaPaga ? (
              <p className="mb-3 text-xs font-bold text-emerald-300">Último mês pago: {formatCompetenciaDate(ultimaCompetenciaPaga.vencimento)}</p>
            ) : null}
            {competenciaAtual && diasParaVencer !== null ? (
              <p className={`mb-3 rounded-xl px-3 py-2 text-xs font-black ${
                diasParaVencer < 0
                  ? 'bg-orange-500/15 text-orange-300'
                  : diasParaVencer <= 10
                    ? 'bg-amber-400/15 text-amber-200'
                    : 'bg-blue-500/15 text-blue-200'
              }`}>
                {diasParaVencer < 0
                  ? `Vencido há ${Math.abs(diasParaVencer)} dia${Math.abs(diasParaVencer) === 1 ? '' : 's'} · ${formatCompetenciaDate(competenciaAtual.vencimento)}`
                  : diasParaVencer === 0
                    ? `Vence hoje · ${formatCompetenciaDate(competenciaAtual.vencimento)}`
                    : diasParaVencer <= 10
                      ? `Vence em ${diasParaVencer} dias · ${formatCompetenciaDate(competenciaAtual.vencimento)}`
                      : `Próximo vencimento: ${formatCompetenciaDate(competenciaAtual.vencimento)}`}
              </p>
            ) : null}
            <div className="space-y-2">
              {competencias.map((item) => {
                const pendente = Math.max(item.valorPrevisto - item.valorPago, 0)
                const venceNoFuturo = new Date(item.vencimento) > new Date()
                const chave = new Date(item.vencimento).toISOString().slice(0, 10)
                const evidencia = evidenciasPorCompetencia.get(chave)
                const historicoIds = vinculosPorCompetencia.get(chave) ?? []
                const pago = competenciaEstaPaga(item)
                return <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-white/75">{formatCompetenciaDate(item.vencimento)}</span>
                  <span className="flex items-center gap-2"><span className={pago ? 'font-bold text-emerald-300' : venceNoFuturo ? 'font-bold text-blue-300' : 'font-bold text-orange-300'}>{pago ? `Pago confirmado em ${formatDate(evidencia?.data ?? item.pagoEm ?? item.vencimento)}${evidencia ? evidencia.fonte === 'RECIBO' ? ' · recibo' : ' · auditoria' : ' · registro'}` : venceNoFuturo ? `A vencer ${formatBRL(pendente)}` : `Vencido ${formatBRL(pendente)}`}</span>{historicoIds.map((historicoId) => <button key={historicoId} type="button" onClick={() => handleEditarVinculo(historicoId, new Date(item.vencimento).toISOString())} className="grid h-7 w-7 place-items-center rounded-md border border-white/15 bg-white/5 text-white/60 transition-colors hover:bg-white/15 hover:text-white" aria-label={`Editar vínculo de ${formatCompetenciaDate(item.vencimento)}`}><Pencil className="h-3.5 w-3.5" /></button>)}</span>
                </div>
              })}
            </div>
            {pagamentosSemCompetencia.length > 0 ? (
              <button type="button" onClick={() => setModalCompetenciaAberto(true)} className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors hover:text-red-300">Regularizar vínculo de mês/pagamento</button>
            ) : null}
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/50 mb-1 block">{acordoSemJuros ? 'Parcela referente a' : 'Pagamento referente a'} <span className="text-red-300">*</span></label>
            <select value={competenciaVencimento} onChange={(e) => setCompetenciaVencimento(e.target.value)} disabled={isPending} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none">
              <option value="" className="text-slate-900">Selecione o mês de referência</option>
              {competencias.filter((item) => {
                const chave = new Date(item.vencimento).toISOString().slice(0, 10)
                return Math.max(item.valorPrevisto - item.valorPago, 0) > 0.01 && !evidenciasPorCompetencia.has(chave)
              }).map((item) => (
                <option key={item.id} value={new Date(item.vencimento).toISOString()} className="text-slate-900">{formatCompetenciaDate(item.vencimento)} · pendente {formatBRL(Math.max(item.valorPrevisto - item.valorPago, 0))}</option>
              ))}
            </select>
            {competenciaSelecionada && diasDaCompetenciaSelecionada !== null ? (
              <div className={`mt-3 rounded-2xl border p-3 text-xs ${
                diasDaCompetenciaSelecionada < 0
                  ? 'border-orange-400/25 bg-orange-500/10 text-orange-200'
                  : diasDaCompetenciaSelecionada === 0
                    ? 'border-amber-300/25 bg-amber-400/10 text-amber-100'
                    : 'border-blue-400/25 bg-blue-500/10 text-blue-100'
              }`}>
                <div className="flex items-center justify-between gap-3 font-black">
                  <span>Competência selecionada: {formatCompetenciaDate(competenciaSelecionada.vencimento)}</span>
                  <span>{formatBRL(pendenteSelecionado)}</span>
                </div>
                <p className="mt-1 font-semibold opacity-90">
                  {diasDaCompetenciaSelecionada < 0
                    ? `Vencida há ${Math.abs(diasDaCompetenciaSelecionada)} dia${Math.abs(diasDaCompetenciaSelecionada) === 1 ? '' : 's'}`
                    : diasDaCompetenciaSelecionada === 0
                      ? 'Vence hoje'
                      : `Vence em ${diasDaCompetenciaSelecionada} dias`}
                </p>
              </div>
            ) : null}
            {competenciaSelecionadaFutura ? (
              <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-200">Atenção: esta competência ainda não venceu. O pagamento será lançado como juros antecipados do próximo mês.</p>
            ) : null}
          </div>
          {modalCompetenciaAberto ? createPortal(<div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
          <button type="button" aria-label="Fechar ações por competência" onClick={() => setModalCompetenciaAberto(false)} disabled={isPending} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" aria-labelledby="competencia-modal-title" className="relative z-10 w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">Regularização</p><h2 id="competencia-modal-title" className="mt-1 text-xl font-black text-white">Vincular pagamento antigo</h2></div>
              <button type="button" onClick={() => setModalCompetenciaAberto(false)} disabled={isPending} className="rounded-full px-3 py-1 text-xl font-black text-white/50 hover:bg-white/10 hover:text-white">×</button>
            </div>
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-white/60">Selecione o recibo antigo e o mês correspondente. Essa ação não desconta novamente juros, principal ou saldo do contrato.</p>
            {pagamentosSemCompetencia.length > 0 ? <div>
              <label className="text-[10px] font-bold text-white/50 mb-1 block">Recibo antigo sem competência</label>
              <select value={reciboHistoricoId} onChange={(e) => setReciboHistoricoId(e.target.value)} disabled={isPending} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-white outline-none">
                <option value="">Selecione o recibo antigo</option>
                {pagamentosSemCompetencia.map((item) => <option key={item.id} value={item.id}>{formatDate(item.createdAt)} · {item.descricao.slice(0, 75)}</option>)}
              </select>
            </div> : null}
            <div>
              <label className="text-[10px] font-bold text-white/50 mb-1 block">Competência a vincular</label>
              <select value={competenciaRegularizacaoVencimento} onChange={(e) => setCompetenciaRegularizacaoVencimento(e.target.value)} disabled={isPending} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none">
                <option value="" className="text-slate-900">Selecione o mês a regularizar</option>
                {competencias.map((item) => (
                  <option key={item.id} value={new Date(item.vencimento).toISOString()} className="text-slate-900">{formatCompetenciaDate(item.vencimento)} · {Math.max(item.valorPrevisto - item.valorPago, 0) <= 0.01 ? 'pago' : `pendente ${formatBRL(Math.max(item.valorPrevisto - item.valorPago, 0))}`}</option>
                ))}
              </select>
            </div>
            <button type="button" disabled={isPending || !reciboHistoricoId || !competenciaRegularizacaoVencimento} onClick={async () => { if (await handleVincularPagamentoAntigo()) setModalCompetenciaAberto(false) }} className="w-full rounded-2xl bg-violet-500 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">Vincular recibo à competência</button>
          </div>
          </div>
          </div>, document.body) : null}
          {vinculoEmEdicao ? createPortal(<div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            <button type="button" aria-label="Fechar edição de vínculo" onClick={() => setVinculoEmEdicao(null)} disabled={isPending} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
            <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
              <h2 className="text-xl font-black text-white">Editar vínculo do recibo</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/60">Troque a competência ou remova o vínculo. O saldo geral do contrato não será alterado.</p>
              <select value={vinculoEmEdicao.vencimento} onChange={(e) => setVinculoEmEdicao({ ...vinculoEmEdicao, vencimento: e.target.value })} disabled={isPending} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none">
                {competencias.map((item) => <option key={item.id} value={new Date(item.vencimento).toISOString()} className="text-slate-900">{formatCompetenciaDate(item.vencimento)}</option>)}
              </select>
              <div className="mt-5 flex gap-3"><button type="button" onClick={() => handleSalvarVinculo(null)} disabled={isPending} className="rounded-2xl border border-red-500/40 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-300 disabled:opacity-40">Remover vínculo</button><button type="button" onClick={() => handleSalvarVinculo(vinculoEmEdicao.vencimento)} disabled={isPending} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40">Salvar vínculo</button></div>
            </div>
          </div>, document.body) : null}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-white/50 mb-1 block">Valor Recebido (Caixa)</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-lg group-focus-within:text-white/50 transition-colors">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pagamento}
                  onChange={(e) => setPagamento(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 pl-14 pr-6 text-xl font-black text-white outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all placeholder:text-white/10"
                  placeholder="0,00"
                  disabled={isPending}
                />
              </div>
            </div>

            {setDescontoJuros && (
              <div>
                <label className="text-[10px] font-bold text-amber-400/70 mb-1 block">Desconto nos Juros (Abatimento)</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-400/40 font-black text-sm group-focus-within:text-amber-400 transition-colors">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={descontoJuros}
                    onChange={(e) => setDescontoJuros(e.target.value)}
                    className="w-full bg-amber-500/5 border border-amber-500/20 rounded-[2rem] py-3.5 pl-14 pr-6 text-sm font-bold text-amber-300 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all placeholder:text-amber-500/20"
                    placeholder="0,00"
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            {setRenovarCiclo && (
              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={renovarCiclo}
                  onChange={(e) => setRenovarCiclo(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-emerald-600 focus:ring-emerald-500 bg-white/5"
                  disabled={isPending}
                />
                <span className="text-xs font-semibold text-white/80">Renovar ciclo de juros (resetar atraso)</span>
              </label>
            )}

            {podeAplicarPrincipal ? (
              <label className="flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-400/25 rounded-2xl cursor-pointer hover:bg-violet-500/15 transition-colors">
                <input
                  type="checkbox"
                  checked={aplicarPrincipal}
                  onChange={(e) => setAplicarPrincipal(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-violet-600 focus:ring-violet-500 bg-white/5"
                  disabled={isPending}
                />
                <span className="text-xs font-semibold text-violet-100">{acordoSemJuros ? 'Confirmar abatimento desta parcela no principal' : 'Abater este pagamento do principal'}</span>
              </label>
            ) : null}

            <button
              type="button"
              disabled={isPending || !pagamento || !competenciaVencimento}
              onClick={handlePagamentoParcial}
              className={`w-full py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 ${
                isPending ? 'bg-white/5 text-white/10' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-900/20'
              }`}
            >
              Confirmar Pagamento
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
  )
}
