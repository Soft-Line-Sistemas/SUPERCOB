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
  errors,
}: {
  formData: ClientFormData
  setFormData: SetState<ClientFormData>
  formatCEP: (value: string) => string
  normalizeDigits: (value: string) => string
  fetchCep: (cep: string) => Promise<{ endereco: string; complemento: string; bairro: string; cidade: string; estado: string }>
  loadingCep: boolean
  setLoadingCep: SetState<boolean>
  errors?: Partial<Record<keyof ClientFormData, string>>
}) {
  const [loadingCep2, setLoadingCep2] = React.useState(false)
  const fieldClass = (hasError?: boolean) =>
    `w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-4 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/5'}`

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
            className={fieldClass(!!errors?.cep)}
            placeholder="00000-000"
          />
          {errors?.cep ? <p className="text-xs font-black text-red-600">{errors.cep}</p> : null}
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
          <input type="text" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className={fieldClass(!!errors?.endereco)} placeholder="Rua, avenida..." />
          {errors?.endereco ? <p className="text-xs font-black text-red-600">{errors.endereco}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Número</label>
          <input type="number" inputMode="numeric" required value={formData.numeroEndereco} onChange={(e) => setFormData({ ...formData, numeroEndereco: e.target.value })} className={fieldClass(!!errors?.numeroEndereco)} placeholder="000" />
          {errors?.numeroEndereco ? <p className="text-xs font-black text-red-600">{errors.numeroEndereco}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Complemento</label>
          <input type="text" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} className={fieldClass(false)} placeholder="Apto, bloco..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Bairro</label>
          <input type="text" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} className={fieldClass(!!errors?.bairro)} placeholder="Bairro" />
          {errors?.bairro ? <p className="text-xs font-black text-red-600">{errors.bairro}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Cidade</label>
          <input type="text" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className={fieldClass(!!errors?.cidade)} placeholder="Cidade" />
          {errors?.cidade ? <p className="text-xs font-black text-red-600">{errors.cidade}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Estado</label>
          <input type="text" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className={fieldClass(!!errors?.estado)} placeholder="UF" />
          {errors?.estado ? <p className="text-xs font-black text-red-600">{errors.estado}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Ponto de Referência</label>
        <input type="text" value={formData.pontoReferencia} onChange={(e) => setFormData({ ...formData, pontoReferencia: e.target.value })} className={fieldClass(false)} placeholder="Próximo a..." />
      </div>

      {/* Endereço Secundário */}
      <div className="h-px bg-slate-200 my-6" />
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Endereço Secundário (Opcional)</h4>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">CEP 2</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.cep2 || ''}
            onChange={(e) => setFormData({ ...formData, cep2: formatCEP(e.target.value) })}
            onBlur={async () => {
              const d = normalizeDigits(formData.cep2 || '')
              if (d.length !== 8 || loadingCep2) return
              setLoadingCep2(true)
              try {
                const data = await fetchCep(formData.cep2)
                setFormData((prev) => ({
                  ...prev,
                  endereco2: prev.endereco2 || data.endereco,
                  complemento2: prev.complemento2 || data.complemento,
                  bairro2: prev.bairro2 || data.bairro,
                  cidade2: prev.cidade2 || data.cidade,
                  estado2: prev.estado2 || data.estado,
                }))
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao consultar CEP 2')
              } finally {
                setLoadingCep2(false)
              }
            }}
            className={fieldClass(!!errors?.cep2)}
            placeholder="00000-000"
          />
          {errors?.cep2 ? <p className="text-xs font-black text-red-600">{errors.cep2}</p> : null}
        </div>
        <button
          type="button"
          disabled={loadingCep2}
          onClick={async () => {
            if (loadingCep2) return
            setLoadingCep2(true)
            try {
              const data = await fetchCep(formData.cep2)
              setFormData((prev) => ({
                ...prev,
                endereco2: prev.endereco2 || data.endereco,
                complemento2: prev.complemento2 || data.complemento,
                bairro2: prev.bairro2 || data.bairro,
                cidade2: prev.cidade2 || data.cidade,
                estado2: prev.estado2 || data.estado,
              }))
            } catch (err: any) {
              toast.error(err?.message || 'Erro ao consultar CEP 2')
            } finally {
              setLoadingCep2(false)
            }
          }}
          className="h-12 px-5 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {loadingCep2 ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Endereço 2</label>
          <input type="text" value={formData.endereco2 || ''} onChange={(e) => setFormData({ ...formData, endereco2: e.target.value })} className={fieldClass(!!errors?.endereco2)} placeholder="Rua, avenida..." />
          {errors?.endereco2 ? <p className="text-xs font-black text-red-600">{errors.endereco2}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Número 2</label>
          <input type="number" inputMode="numeric" value={formData.numeroEndereco2 || ''} onChange={(e) => setFormData({ ...formData, numeroEndereco2: e.target.value })} className={fieldClass(!!errors?.numeroEndereco2)} placeholder="000" />
          {errors?.numeroEndereco2 ? <p className="text-xs font-black text-red-600">{errors.numeroEndereco2}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Complemento 2</label>
          <input type="text" value={formData.complemento2 || ''} onChange={(e) => setFormData({ ...formData, complemento2: e.target.value })} className={fieldClass(false)} placeholder="Apto, bloco..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Bairro 2</label>
          <input type="text" value={formData.bairro2 || ''} onChange={(e) => setFormData({ ...formData, bairro2: e.target.value })} className={fieldClass(!!errors?.bairro2)} placeholder="Bairro" />
          {errors?.bairro2 ? <p className="text-xs font-black text-red-600">{errors.bairro2}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Cidade 2</label>
          <input type="text" value={formData.cidade2 || ''} onChange={(e) => setFormData({ ...formData, cidade2: e.target.value })} className={fieldClass(!!errors?.cidade2)} placeholder="Cidade" />
          {errors?.cidade2 ? <p className="text-xs font-black text-red-600">{errors.cidade2}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Estado 2</label>
          <input type="text" value={formData.estado2 || ''} onChange={(e) => setFormData({ ...formData, estado2: e.target.value })} className={fieldClass(!!errors?.estado2)} placeholder="UF" />
          {errors?.estado2 ? <p className="text-xs font-black text-red-600">{errors.estado2}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Ponto de Referência 2</label>
        <input type="text" value={formData.pontoReferencia2 || ''} onChange={(e) => setFormData({ ...formData, pontoReferencia2: e.target.value })} className={fieldClass(false)} placeholder="Próximo a..." />
      </div>
    </div>
  )
}
