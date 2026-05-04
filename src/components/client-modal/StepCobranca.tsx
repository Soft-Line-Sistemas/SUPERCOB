'use client'

import React from 'react'
import type { ChargeData, SetState } from './types'

export function ClientStepCobranca({
  chargeData,
  setChargeData,
}: {
  chargeData: ChargeData
  setChargeData: SetState<ChargeData>
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">Cobrança inicial</p>
            <p className="text-xs text-slate-500">Opcional: criar uma cobrança vinculada ao cliente.</p>
          </div>
          <button
            type="button"
            onClick={() => setChargeData((p) => ({ ...p, enabled: !p.enabled }))}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              chargeData.enabled ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {chargeData.enabled ? 'Ativado' : 'Desativado'}
          </button>
        </div>

        {chargeData.enabled && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={chargeData.valor}
                onChange={(e) => setChargeData((p) => ({ ...p, valor: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Juros ao mês (%)</label>
              <input
                type="number"
                step="0.01"
                value={chargeData.jurosMes}
                onChange={(e) => setChargeData((p) => ({ ...p, jurosMes: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Atraso ao dia (%)</label>
              <input
                type="number"
                step="0.01"
                value={chargeData.jurosAtrasoDia}
                onChange={(e) => setChargeData((p) => ({ ...p, jurosAtrasoDia: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Vencimento</label>
              <input
                type="date"
                value={chargeData.vencimento}
                onChange={(e) => setChargeData((p) => ({ ...p, vencimento: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Observação</label>
              <input
                type="text"
                value={chargeData.observacao}
                onChange={(e) => setChargeData((p) => ({ ...p, observacao: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                placeholder="Opcional"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
