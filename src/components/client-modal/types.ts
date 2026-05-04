import type React from 'react'

export type ClientModalTab = 'basico' | 'identificacao' | 'endereco' | 'profissao' | 'emergencia' | 'cobranca' | 'anexos' | 'revisao'

export type BirthErrors = { dia?: string; mes?: string; ano?: string }

export type ChargeData = {
  enabled: boolean
  valor: string
  jurosMes: string
  jurosAtrasoDia: string
  vencimento: string
  observacao: string
}

export type DocItem = { id: string; originalName: string; mimeType: string; size: number; createdAt: string; url: string }

export type ClientFormData = {
  nome: string
  indicacao: string
  cpf: string
  rg: string
  orgao: string
  diaNasc: string
  mesNasc: string
  anoNasc: string
  email: string
  whatsapp: string
  instagram: string
  cep: string
  endereco: string
  numeroEndereco: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  pontoReferencia: string
  profissao: string
  empresa: string
  cepEmpresa: string
  enderecoEmpresa: string
  cidadeEmpresa: string
  estadoEmpresa: string
  contatoEmergencia1: string
  contatoEmergencia2: string
  contatoEmergencia3: string
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type EmergencyParts = { nome: string; telefone: string }
