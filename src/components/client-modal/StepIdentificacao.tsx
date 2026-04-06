'use client'

import React from 'react'
import type { BirthErrors, ClientFormData, SetState } from './types'

export function ClientStepIdentificacao({
  formData,
  setFormData,
  formatCPF,
  birthErrors,
  setBirthErrors,
  sanitizeDigits,
  validateBirthDateParts,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  formatCPF: (value: string) => string
  birthErrors: BirthErrors
  setBirthErrors: SetState<BirthErrors>
  sanitizeDigits: (value: string, maxLen: number) => string
  validateBirthDateParts: (dia: string, mes: string, ano: string) => BirthErrors
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">CPF</label>
          <input
            type="text"
            inputMode="numeric"
            required
            value={formData.cpf}
            onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="000.000.000-00"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">RG</label>
          <input
            type="text"
            value={formData.rg}
            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="00.000.000-0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Órgão Expedidor</label>
        <input
          type="text"
          value={formData.orgao}
          onChange={(e) => setFormData({ ...formData, orgao: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="SSP/UF"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Data de Nascimento</label>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={formData.diaNasc}
            onChange={(e) => {
              const dia = sanitizeDigits(e.target.value, 2)
              const nextForm = { ...formData, diaNasc: dia }
              setFormData(nextForm)
              setBirthErrors(validateBirthDateParts(dia, nextForm.mesNasc, nextForm.anoNasc))
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="DD"
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={formData.mesNasc}
            onChange={(e) => {
              const mes = sanitizeDigits(e.target.value, 2)
              const nextForm = { ...formData, mesNasc: mes }
              setFormData(nextForm)
              setBirthErrors(validateBirthDateParts(nextForm.diaNasc, mes, nextForm.anoNasc))
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="MM"
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={formData.anoNasc}
            onChange={(e) => {
              const ano = sanitizeDigits(e.target.value, 4)
              const nextForm = { ...formData, anoNasc: ano }
              setFormData(nextForm)
              setBirthErrors(validateBirthDateParts(nextForm.diaNasc, nextForm.mesNasc, ano))
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="AAAA"
          />
        </div>
        {birthErrors.dia || birthErrors.mes || birthErrors.ano ? (
          <p className="text-xs font-black text-red-600">
            {[birthErrors.dia, birthErrors.mes, birthErrors.ano].filter(Boolean).join(' • ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

