'use client'

import React from 'react'
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates'

interface TerminalCobrancaProps {
  emprestimo: any
  totalDevido: number
  pagamento: string
  setPagamento: (val: string) => void
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
  descricao,
  setDescricao,
  isPending,
  handlePagamentoParcial,
  handleAddEvento,
  formatBRL,
  formatDate
}: TerminalCobrancaProps) {
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
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Registrar Recebimento</p>
          <div className="space-y-3">
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-lg group-focus-within:text-white/50 transition-colors">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={pagamento}
                onChange={(e) => setPagamento(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-14 pr-6 text-xl font-black text-white outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all placeholder:text-white/10"
                placeholder="0,00"
                disabled={isPending}
              />
            </div>
            <button
              type="button"
              disabled={isPending || !pagamento}
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
