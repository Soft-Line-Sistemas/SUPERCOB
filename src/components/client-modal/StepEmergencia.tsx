'use client'

import React from 'react'
import type { ClientFormData, EmergencyParts, SetState } from './types'

export function ClientStepEmergencia({
  formData,
  setFormData,
  emergencia1,
  emergencia2,
  emergencia3,
  buildEmergency,
  formatPhoneBR,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  emergencia1: EmergencyParts
  emergencia2: EmergencyParts
  emergencia3: EmergencyParts
  buildEmergency: (nome: string, telefone: string) => string
  formatPhoneBR: (value: string) => string
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Contato de Emergência 1</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={emergencia1.nome}
            onChange={(e) => setFormData({ ...formData, contatoEmergencia1: buildEmergency(e.target.value, emergencia1.telefone) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Nome"
          />
          <input
            type="text"
            inputMode="numeric"
            value={emergencia1.telefone}
            onChange={(e) => setFormData({ ...formData, contatoEmergencia1: buildEmergency(emergencia1.nome, formatPhoneBR(e.target.value)) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Telefone"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Contato de Emergência 2</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={emergencia2.nome}
            onChange={(e) => setFormData({ ...formData, contatoEmergencia2: buildEmergency(e.target.value, emergencia2.telefone) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Nome"
          />
          <input
            type="text"
            inputMode="numeric"
            value={emergencia2.telefone}
            onChange={(e) => setFormData({ ...formData, contatoEmergencia2: buildEmergency(emergencia2.nome, formatPhoneBR(e.target.value)) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Telefone"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Contato de Emergência 3</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={emergencia3.nome}
            onChange={(e) => setFormData({ ...formData, contatoEmergencia3: buildEmergency(e.target.value, emergencia3.telefone) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Nome"
          />
          <input
            type="text"
            inputMode="numeric"
            value={emergencia3.telefone}
            onChange={(e) => setFormData({ ...formData, contatoEmergencia3: buildEmergency(emergencia3.nome, formatPhoneBR(e.target.value)) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Telefone"
          />
        </div>
      </div>
    </div>
  )
}

