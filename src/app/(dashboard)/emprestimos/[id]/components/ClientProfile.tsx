'use client'

import React from 'react'
import { Clock, Calendar, Briefcase, Phone } from 'lucide-react'

interface ClientProfileProps {
  cliente: any
}

export function ClientProfile({ cliente }: ClientProfileProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Perfil do Titular */}
      <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Perfil do Titular</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Nome Completo</p>
            <p className="text-base font-black text-slate-900 dark:text-slate-100">{cliente.nome}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">CPF</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente.cpf || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">RG / Orgão</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente.rg || '-'} {cliente.orgao ? `(${cliente.orgao})` : ''}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-white/5 pt-6">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Indicação / Origem</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente.indicacao || 'Direto / Sem indicação'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Data Nascimento</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {cliente.diaNasc ? `${cliente.diaNasc}/${cliente.mesNasc}/${cliente.anoNasc}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">WhatsApp</p>
              <p className="text-sm font-black text-emerald-600">{cliente.whatsapp || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Localização e Endereço */}
      <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Localização Residencial</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Endereço</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{cliente.endereco || '-'}, {cliente.numeroEndereco || '-'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{cliente.complemento}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Bairro</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente.bairro || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">CEP</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente.cep || '-'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-white/5 pt-6">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Cidade / UF</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cliente.cidade || '-'} / {cliente.estado || '-'}</p>
          </div>
        </div>
      </div>

      {/* Dados Profissionais */}
      <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-2xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Informação Profissional</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Profissão / Cargo</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{cliente.profissao || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Empresa</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{cliente.empresa || '-'}</p>
          </div>
          <div className="border-t border-slate-100 dark:border-white/5 pt-6">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Local de Trabalho</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {cliente.enderecoEmpresa || '-'} • {cliente.cidadeEmpresa || '-'}/{cliente.estadoEmpresa || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Contatos de Emergência */}
      <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Contatos de Emergência</h3>
        </div>
        
        <div className="space-y-4">
          {[cliente.contatoEmergencia1, cliente.contatoEmergencia2, cliente.contatoEmergencia3].map((c, i) => {
            if (!c) return null
            return (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">{c}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Contato #{i + 1}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
