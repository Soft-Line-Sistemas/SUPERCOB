'use client'

import React from 'react'
import { AlertCircle, Mail, Phone, User } from 'lucide-react'
import type { ClientFormData, SetState } from './types'

export function ClientStepBasic({
  formData,
  setFormData,
  formatPhoneBR,
  errors,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  formatPhoneBR: (value: string) => string
  errors?: Partial<Record<keyof ClientFormData, string>>
}) {
  const fieldClass = (hasError?: boolean) =>
    `w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-4 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/5'}`

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
        <div className="relative group">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className={`${fieldClass(!!errors?.nome)} pl-11 pr-10`}
            placeholder="Ex: João Silva"
          />
          {errors?.nome ? <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : null}
        </div>
        {errors?.nome ? <p className="text-xs font-black text-red-600">{errors.nome}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Indicação</label>
        <input type="text" value={formData.indicacao} onChange={(e) => setFormData({ ...formData, indicacao: e.target.value })} className={fieldClass(false)} placeholder="Quem indicou?" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`${fieldClass(!!errors?.email)} pl-11 pr-10`}
            placeholder="email@empresa.com"
          />
          {errors?.email ? <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : null}
        </div>
        {errors?.email ? <p className="text-xs font-black text-red-600">{errors.email}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">WhatsApp</label>
        <div className="relative group">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            inputMode="tel"
            required
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: formatPhoneBR(e.target.value) })}
            className={`${fieldClass(!!errors?.whatsapp)} pl-11 pr-10`}
            placeholder="(00) 00000-0000"
          />
          {errors?.whatsapp ? <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : null}
        </div>
        {errors?.whatsapp ? <p className="text-xs font-black text-red-600">{errors.whatsapp}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Instagram</label>
        <input type="text" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className={fieldClass(false)} placeholder="@perfil" />
      </div>
    </div>
  )
}
