'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { EMERGENCY_CONTACT_NAME_MAX_LENGTH, EMERGENCY_CONTACT_PHONE_MAX_LENGTH } from '@/lib/client-emergency'
import type { ClientFormData, EmergencyParts, SetState } from './types'

export function ClientStepEmergencia({
  formData,
  setFormData,
  emergencia1,
  emergencia2,
  emergencia3,
  buildEmergency,
  formatPhoneBR,
  errors,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  emergencia1: EmergencyParts
  emergencia2: EmergencyParts
  emergencia3: EmergencyParts
  buildEmergency: (nome: string, telefone: string) => string
  formatPhoneBR: (value: string) => string
  errors?: Partial<Record<keyof ClientFormData, string>>
}) {
  const fieldClass = (hasError?: boolean) =>
    `w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-4 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/5'} dark:border-white/10 dark:bg-slate-900 dark:text-slate-100`

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
        <label className="ml-1 text-sm font-bold text-slate-700 dark:text-slate-300">Contato de Emergência 1</label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:gap-4">
          <div className="relative">
            <input
              type="text"
              value={emergencia1.nome}
              onChange={(e) => setFormData({ ...formData, contatoEmergencia1: buildEmergency(e.target.value, emergencia1.telefone) })}
              className={fieldClass(!!errors?.contatoEmergencia1)}
              placeholder="Nome"
              maxLength={EMERGENCY_CONTACT_NAME_MAX_LENGTH}
            />
            {errors?.contatoEmergencia1 ? <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : null}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="tel"
              value={emergencia1.telefone}
              onChange={(e) => setFormData({ ...formData, contatoEmergencia1: buildEmergency(emergencia1.nome, formatPhoneBR(e.target.value)) })}
              className={fieldClass(!!errors?.contatoEmergencia1)}
              placeholder="(00) 00000-0000"
              maxLength={EMERGENCY_CONTACT_PHONE_MAX_LENGTH}
            />
          </div>
        </div>
        {errors?.contatoEmergencia1 ? <p className="text-xs font-black text-red-600">{errors.contatoEmergencia1}</p> : null}
      </div>

      <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
        <label className="ml-1 text-sm font-bold text-slate-700 dark:text-slate-300">Contato de Emergência 2</label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:gap-4">
          <div className="relative">
            <input
              type="text"
              value={emergencia2.nome}
              onChange={(e) => setFormData({ ...formData, contatoEmergencia2: buildEmergency(e.target.value, emergencia2.telefone) })}
              className={fieldClass(!!errors?.contatoEmergencia2)}
              placeholder="Nome"
              maxLength={EMERGENCY_CONTACT_NAME_MAX_LENGTH}
            />
            {errors?.contatoEmergencia2 ? <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : null}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="tel"
              value={emergencia2.telefone}
              onChange={(e) => setFormData({ ...formData, contatoEmergencia2: buildEmergency(emergencia2.nome, formatPhoneBR(e.target.value)) })}
              className={fieldClass(!!errors?.contatoEmergencia2)}
              placeholder="(00) 00000-0000"
              maxLength={EMERGENCY_CONTACT_PHONE_MAX_LENGTH}
            />
          </div>
        </div>
        {errors?.contatoEmergencia2 ? <p className="text-xs font-black text-red-600">{errors.contatoEmergencia2}</p> : null}
      </div>

      <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
        <label className="ml-1 text-sm font-bold text-slate-700 dark:text-slate-300">Contato de Emergência 3</label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:gap-4">
          <div className="relative">
            <input
              type="text"
              value={emergencia3.nome}
              onChange={(e) => setFormData({ ...formData, contatoEmergencia3: buildEmergency(e.target.value, emergencia3.telefone) })}
              className={fieldClass(!!errors?.contatoEmergencia3)}
              placeholder="Nome"
              maxLength={EMERGENCY_CONTACT_NAME_MAX_LENGTH}
            />
            {errors?.contatoEmergencia3 ? <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : null}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="tel"
              value={emergencia3.telefone}
              onChange={(e) => setFormData({ ...formData, contatoEmergencia3: buildEmergency(emergencia3.nome, formatPhoneBR(e.target.value)) })}
              className={fieldClass(!!errors?.contatoEmergencia3)}
              placeholder="(00) 00000-0000"
              maxLength={EMERGENCY_CONTACT_PHONE_MAX_LENGTH}
            />
          </div>
        </div>
        {errors?.contatoEmergencia3 ? <p className="text-xs font-black text-red-600">{errors.contatoEmergencia3}</p> : null}
      </div>
    </div>
  )
}
