'use client'

import React from 'react'
import { toast } from 'sonner'
import type { ClientFormData, SetState } from './types'

export function ClientStepProfissao({
  formData,
  setFormData,
  formatCEP,
  normalizeDigits,
  fetchCep,
  loadingCepEmpresa,
  setLoadingCepEmpresa,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  formatCEP: (value: string) => string
  normalizeDigits: (value: string) => string
  fetchCep: (cep: string) => Promise<{ endereco: string; complemento: string; bairro: string; cidade: string; estado: string }>
  loadingCepEmpresa: boolean
  setLoadingCepEmpresa: SetState<boolean>
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Profissão</label>
        <input
          type="text"
          value={formData.profissao}
          onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="Profissão"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Empresa</label>
        <input
          type="text"
          value={formData.empresa}
          onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="Empresa"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">CEP (Empresa)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.cepEmpresa}
            onChange={(e) => setFormData({ ...formData, cepEmpresa: formatCEP(e.target.value) })}
            onBlur={async () => {
              const d = normalizeDigits(formData.cepEmpresa)
              if (d.length !== 8 || loadingCepEmpresa) return
              setLoadingCepEmpresa(true)
              try {
                const data = await fetchCep(formData.cepEmpresa)
                setFormData((prev) => ({
                  ...prev,
                  enderecoEmpresa: prev.enderecoEmpresa || [data.endereco, data.complemento].filter(Boolean).join(' ').trim(),
                  cidadeEmpresa: prev.cidadeEmpresa || data.cidade,
                  estadoEmpresa: prev.estadoEmpresa || data.estado,
                }))
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao consultar CEP')
              } finally {
                setLoadingCepEmpresa(false)
              }
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="00000-000"
          />
        </div>
        <button
          type="button"
          disabled={loadingCepEmpresa}
          onClick={async () => {
            if (loadingCepEmpresa) return
            setLoadingCepEmpresa(true)
            try {
              const data = await fetchCep(formData.cepEmpresa)
              setFormData((prev) => ({
                ...prev,
                enderecoEmpresa: prev.enderecoEmpresa || [data.endereco, data.complemento].filter(Boolean).join(' ').trim(),
                cidadeEmpresa: prev.cidadeEmpresa || data.cidade,
                estadoEmpresa: prev.estadoEmpresa || data.estado,
              }))
            } catch (err: any) {
              toast.error(err?.message || 'Erro ao consultar CEP')
            } finally {
              setLoadingCepEmpresa(false)
            }
          }}
          className="h-12 px-5 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {loadingCepEmpresa ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Endereço da Empresa</label>
        <input
          type="text"
          value={formData.enderecoEmpresa}
          onChange={(e) => setFormData({ ...formData, enderecoEmpresa: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          placeholder="Rua, número"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Cidade (Empresa)</label>
          <input
            type="text"
            value={formData.cidadeEmpresa}
            onChange={(e) => setFormData({ ...formData, cidadeEmpresa: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="Cidade"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Estado (Empresa)</label>
          <input
            type="text"
            value={formData.estadoEmpresa}
            onChange={(e) => setFormData({ ...formData, estadoEmpresa: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            placeholder="UF"
          />
        </div>
      </div>
    </div>
  )
}

