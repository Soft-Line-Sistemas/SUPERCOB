'use client'

import React from 'react'
import { toast } from 'sonner'
import type { ClientFormData, SetState } from './types'

export function ClientStepEndereco({
  formData,
  setFormData,
  formatCEP,
  normalizeDigits,
  fetchCep,
  loadingCep,
  setLoadingCep,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  formatCEP: (value: string) => string
  normalizeDigits: (value: string) => string
  fetchCep: (cep: string) => Promise<{ endereco: string; complemento: string; bairro: string; cidade: string; estado: string }>
  loadingCep: boolean
  setLoadingCep: SetState<boolean>
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">CEP</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.cep}
            onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
            onBlur={async () => {
              const d = normalizeDigits(formData.cep)
              if (d.length !== 8 || loadingCep) return
              setLoadingCep(true)
              try {
                const data = await fetchCep(formData.cep)
                setFormData((prev) => ({
                  ...prev,
                  endereco: prev.endereco || data.endereco,
                  complemento: prev.complemento || data.complemento,
                  bairro: prev.bairro || data.bairro,
                  cidade: prev.cidade || data.cidade,
                  estado: prev.estado || data.estado,
                }))
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao consultar CEP')
              } finally {
                setLoadingCep(false)
              }
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="00000-000"
          />
        </div>
        <button
          type="button"
          disabled={loadingCep}
          onClick={async () => {
            if (loadingCep) return
            setLoadingCep(true)
            try {
              const data = await fetchCep(formData.cep)
              setFormData((prev) => ({
                ...prev,
                endereco: prev.endereco || data.endereco,
                complemento: prev.complemento || data.complemento,
                bairro: prev.bairro || data.bairro,
                cidade: prev.cidade || data.cidade,
                estado: prev.estado || data.estado,
              }))
            } catch (err: any) {
              toast.error(err?.message || 'Erro ao consultar CEP')
            } finally {
              setLoadingCep(false)
            }
          }}
          className="h-12 px-5 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {loadingCep ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Endereço</label>
          <input
            type="text"
            value={formData.endereco}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Rua, avenida..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Número</label>
          <input
            type="number"
            inputMode="numeric"
            required
            value={formData.numeroEndereco}
            onChange={(e) => setFormData({ ...formData, numeroEndereco: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="000"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Complemento</label>
          <input
            type="text"
            value={formData.complemento}
            onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Apto, bloco..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Bairro</label>
          <input
            type="text"
            value={formData.bairro}
            onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Bairro"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Cidade</label>
          <input
            type="text"
            value={formData.cidade}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Cidade"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Estado</label>
          <input
            type="text"
            value={formData.estado}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="UF"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Ponto de Referência</label>
        <input
          type="text"
          value={formData.pontoReferencia}
          onChange={(e) => setFormData({ ...formData, pontoReferencia: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="Próximo a..."
        />
      </div>
    </div>
  )
}

