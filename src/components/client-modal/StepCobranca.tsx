'use client'

import React from 'react'
import type { ChargeData, SetState } from './types'

export function ClientStepCobranca({
  chargeData,
  setChargeData,
  parcelarValor,
  onParcelarValorChange,
  parcelingMode,
  onParcelingModeChange,
  parcelingModeOptions,
  remainingGrossAmountLabel,
  currentInstallment,
  currentInstallmentOptions,
  onCurrentInstallmentChange,
  discountPaidInstallments,
  onDiscountPaidInstallmentsChange,
  discountedPaidInstallmentsLabel,
  onParcelasManualChange,
  installmentHint,
  expectedInterestPercent,
  expectedInterestOptions,
  onExpectedInterestPercentChange,
}: {
  chargeData: ChargeData
  setChargeData: SetState<ChargeData>
  parcelarValor: boolean
  onParcelarValorChange: (checked: boolean) => void
  parcelingMode: 'integral' | 'remaining'
  onParcelingModeChange: (value: 'integral' | 'remaining') => void
  parcelingModeOptions: Array<{ value: 'integral' | 'remaining'; label: string; disabled?: boolean }>
  remainingGrossAmountLabel: string | null
  currentInstallment: number
  currentInstallmentOptions: number[]
  onCurrentInstallmentChange: (value: number) => void
  discountPaidInstallments: boolean
  onDiscountPaidInstallmentsChange: (checked: boolean) => void
  discountedPaidInstallmentsLabel: string | null
  onParcelasManualChange: (value: string) => void
  installmentHint: string | null
  expectedInterestPercent: string
  expectedInterestOptions: number[]
  onExpectedInterestPercentChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">Cobrança inicial</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Opcional: criar uma cobrança vinculada ao cliente.</p>
          </div>
          <button
            type="button"
            onClick={() => setChargeData((p) => ({ ...p, enabled: !p.enabled }))}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              chargeData.enabled ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {chargeData.enabled ? 'Ativado' : 'Desativado'}
          </button>
        </div>

        {chargeData.enabled && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={chargeData.valor}
                onChange={(e) => setChargeData((p) => ({ ...p, valor: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Juros ao mês (%)</label>
              <input
                type="number"
                step="0.01"
                value={chargeData.jurosMes}
                onChange={(e) => setChargeData((p) => ({ ...p, jurosMes: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                placeholder="0"
              />
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
              <input
                type="checkbox"
                checked={parcelarValor}
                onChange={(e) => onParcelarValorChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Parcelar valor
            </label>
            {parcelarValor ? (
              <>
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Modalidade</label>
                  <select
                    value={parcelingMode}
                    onChange={(e) => onParcelingModeChange(e.target.value as 'integral' | 'remaining')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {parcelingModeOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {parcelingMode === 'integral' ? (
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Receita esperada (%)</label>
                    <select
                      value={expectedInterestPercent}
                      onChange={(e) => onExpectedInterestPercentChange(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {expectedInterestOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}%
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor bruto (R$)</label>
                    <input
                      type="text"
                      value={remainingGrossAmountLabel ?? '-'}
                      readOnly
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={chargeData.quantidadeParcelas}
                    onChange={(e) => onParcelasManualChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Auto"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Parcela atual</label>
                  <select
                    value={currentInstallment}
                    onChange={(e) => onCurrentInstallmentChange(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    disabled={currentInstallmentOptions.length === 0}
                  >
                    {(currentInstallmentOptions.length > 0 ? currentInstallmentOptions : [0]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={discountPaidInstallments}
                    onChange={(e) => onDiscountPaidInstallmentsChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    disabled={currentInstallment <= 0}
                  />
                  Descontar as parcelas ja pagas?
                </label>
              </>
            ) : null}
            <div className="space-y-1.5">
              <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Atraso ao dia (%)</label>
              <input
                type="number"
                step="0.01"
                value={chargeData.jurosAtrasoDia}
                onChange={(e) => setChargeData((p) => ({ ...p, jurosAtrasoDia: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Vencimento</label>
              <input
                type="date"
                value={chargeData.vencimento}
                onChange={(e) => setChargeData((p) => ({ ...p, vencimento: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              {parcelarValor && installmentHint ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                  {installmentHint}
                </div>
              ) : null}
              {parcelarValor ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {parcelingMode === 'integral'
                  ? 'Receita esperada serve apenas como base local para sugerir a quantidade de parcelas e nao e salva.'
                  : 'Valor bruto usa o saldo restante atualizado com juros apenas como base local para calcular a parcela e nao e salvo.'}
              </p> : null}
              {parcelarValor && discountPaidInstallments && discountedPaidInstallmentsLabel ? (
                <p className="mt-2 text-xs font-black text-red-600 dark:text-red-400">
                  Descontado as parcelas ja pagas valor: {discountedPaidInstallmentsLabel}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="ml-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Observação</label>
              <input
                type="text"
                value={chargeData.observacao}
                onChange={(e) => setChargeData((p) => ({ ...p, observacao: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Opcional"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
