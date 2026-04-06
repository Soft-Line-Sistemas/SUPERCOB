'use client'

import React from 'react'
import type { ChargeData, ClientFormData, DocItem, EmergencyParts, SetState } from './types'

export function ClientStepRevisao({
  formData,
  chargeData,
  selectedFile,
  docs,
  editingClient,
  emergencia1,
  emergencia2,
  emergencia3,
  printReview,
  setActiveTab,
}: {
  formData: ClientFormData
  chargeData: ChargeData
  selectedFile: File | null
  docs: DocItem[]
  editingClient: boolean
  emergencia1: EmergencyParts
  emergencia2: EmergencyParts
  emergencia3: EmergencyParts
  printReview: () => void
  setActiveTab: SetState<any>
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">Revisão do cadastro</p>
            <p className="text-xs text-slate-500">Confira antes de confirmar. Você pode voltar e editar.</p>
          </div>
          <button type="button" onClick={printReview} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black">
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Básico</p>
            <button type="button" onClick={() => setActiveTab('basico')} className="text-xs font-black text-blue-600">
              Editar
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-800 space-y-1">
            <p>
              <span className="font-black">Nome:</span> {formData.nome || '-'}
            </p>
            <p>
              <span className="font-black">WhatsApp:</span> {formData.whatsapp || '-'}
            </p>
            <p>
              <span className="font-black">Email:</span> {formData.email || '-'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Identificação</p>
            <button type="button" onClick={() => setActiveTab('identificacao')} className="text-xs font-black text-blue-600">
              Editar
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-800 space-y-1">
            <p>
              <span className="font-black">CPF:</span> {formData.cpf || '-'}
            </p>
            <p>
              <span className="font-black">RG:</span> {formData.rg || '-'}
            </p>
            <p>
              <span className="font-black">Nascimento:</span> {[formData.diaNasc, formData.mesNasc, formData.anoNasc].filter(Boolean).join('/') || '-'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Endereço</p>
            <button type="button" onClick={() => setActiveTab('endereco')} className="text-xs font-black text-blue-600">
              Editar
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-800 space-y-1">
            <p>
              <span className="font-black">CEP:</span> {formData.cep || '-'}
            </p>
            <p>
              <span className="font-black">Endereço:</span> {[formData.endereco, formData.numeroEndereco].filter(Boolean).join(', ') || '-'}
            </p>
            <p>
              <span className="font-black">Cidade/UF:</span> {[formData.cidade, formData.estado].filter(Boolean).join(' / ') || '-'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Cobrança inicial</p>
            <button type="button" onClick={() => setActiveTab('cobranca')} className="text-xs font-black text-blue-600">
              Editar
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-800 space-y-1">
            <p>
              <span className="font-black">Ativa:</span> {chargeData.enabled ? 'Sim' : 'Não'}
            </p>
            {chargeData.enabled ? (
              <>
                <p>
                  <span className="font-black">Valor:</span> {chargeData.valor || '-'}
                </p>
                <p>
                  <span className="font-black">Juros/mês:</span> {chargeData.jurosMes || '0'}%
                </p>
                <p>
                  <span className="font-black">Vencimento:</span> {chargeData.vencimento || '-'}
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Emergência</p>
            <button type="button" onClick={() => setActiveTab('emergencia')} className="text-xs font-black text-blue-600">
              Editar
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-800 space-y-1">
            <p>
              <span className="font-black">Contato 1:</span> {[emergencia1.nome, emergencia1.telefone].filter(Boolean).join(' • ') || '-'}
            </p>
            <p>
              <span className="font-black">Contato 2:</span> {[emergencia2.nome, emergencia2.telefone].filter(Boolean).join(' • ') || '-'}
            </p>
            <p>
              <span className="font-black">Contato 3:</span> {[emergencia3.nome, emergencia3.telefone].filter(Boolean).join(' • ') || '-'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Anexos</p>
            <button type="button" onClick={() => setActiveTab('anexos')} className="text-xs font-black text-blue-600">
              Editar
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-800 space-y-1">
            <p>
              <span className="font-black">Arquivo selecionado:</span> {selectedFile ? selectedFile.name : '-'}
            </p>
            <p>
              <span className="font-black">Enviados:</span> {editingClient ? docs.length : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

