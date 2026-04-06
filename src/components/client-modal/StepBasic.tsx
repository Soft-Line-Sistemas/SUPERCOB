'use client'

import React from 'react'
import { Mail, Phone, User } from 'lucide-react'
import type { ClientFormData, SetState } from './types'

export function ClientStepBasic({
  formData,
  setFormData,
  formatPhoneBR,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  formatPhoneBR: (value: string) => string
}) {
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
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Ex: João Silva"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Indicação</label>
        <input
          type="text"
          value={formData.indicacao}
          onChange={(e) => setFormData({ ...formData, indicacao: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="Quem indicou?"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="email@empresa.com"
          />
        </div>
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
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Instagram</label>
        <input
          type="text"
          value={formData.instagram}
          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="@perfil"
        />
      </div>
    </div>
  )
}

