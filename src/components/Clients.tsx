'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, X, User, Phone, Mail, Edit2, Trash2, MoreVertical, Filter, Download, UserPlus } from 'lucide-react';
import { createCliente, updateCliente, deleteCliente } from '@/app/(dashboard)/clientes/actions';
import { createEmprestimo } from '@/app/(dashboard)/emprestimos/actions'
import { parseDateInputToUTCNoon, sanitizeDigits, validateBirthDateParts } from '@/lib/date-utils'
import { clientFormDefaults, clientSchema, formatCEP, formatCPF, formatPhoneBR, isValidCPF, normalizeClientPayload, normalizeDigits, tabRequiredFields } from './client-modal/form-schema'
import { ClientStepAnexos } from './client-modal/StepAnexos'
import { ClientStepBasic } from './client-modal/StepBasic'
import { ClientStepCobranca } from './client-modal/StepCobranca'
import { ClientStepEmergencia } from './client-modal/StepEmergencia'
import { ClientStepEndereco } from './client-modal/StepEndereco'
import { ClientStepIdentificacao } from './client-modal/StepIdentificacao'
import { ClientStepProfissao } from './client-modal/StepProfissao'
import { ClientStepRevisao } from './client-modal/StepRevisao'
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: string;
  nome: string;
  indicacao?: string | null;
  cpf?: string | null;
  rg?: string | null;
  orgao?: string | null;
  diaNasc?: number | null;
  mesNasc?: number | null;
  anoNasc?: number | null;
  email?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numeroEndereco?: number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pontoReferencia?: string | null;
  profissao?: string | null;
  empresa?: string | null;
  cepEmpresa?: string | null;
  enderecoEmpresa?: string | null;
  cidadeEmpresa?: string | null;
  estadoEmpresa?: string | null;
  contatoEmergencia1?: string | null;
  contatoEmergencia2?: string | null;
  contatoEmergencia3?: string | null;
  createdAt: string | Date;
}

interface ClientsProps {
  initialClients: Cliente[];
}

export function Clients({ initialClients }: ClientsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sincronizar termo de busca da URL (para busca global)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('search')
    if (s) setSearchTerm(s)
  }, [])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    email: '',
    whatsapp: '',
    cidade: '',
    estado: '',
    cpf: '',
  });
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [activeTab, setActiveTab] = useState<'basico' | 'identificacao' | 'endereco' | 'profissao' | 'emergencia' | 'cobranca' | 'anexos' | 'revisao'>('basico');
  const form = useForm({
    resolver: zodResolver(clientSchema),
    mode: 'onChange',
    defaultValues: clientFormDefaults,
  })
  const formData = form.watch()
  const fieldErrors = form.formState.errors
  const setFormData = (next: any) => {
    const payload = typeof next === 'function' ? next(form.getValues()) : next
    for (const [key, value] of Object.entries(payload)) {
      form.setValue(key as any, value as any, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    }
  }

  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCepEmpresa, setLoadingCepEmpresa] = useState(false);
  const [chargeData, setChargeData] = useState({
    enabled: false,
    valor: '',
    jurosMes: '',
    jurosAtrasoDia: '',
    vencimento: '',
    observacao: '',
  })
  const [docs, setDocs] = useState<Array<{ id: string; originalName: string; mimeType: string; size: number; createdAt: string; url: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const lastAutoAdvanceRef = useRef<string | null>(null)
  const [birthErrors, setBirthErrors] = useState<{ dia?: string; mes?: string; ano?: string }>({})

  const formErrorMessages = Object.fromEntries(
    Object.entries(fieldErrors).map(([key, value]) => [key, value?.message ? String(value.message) : undefined]),
  ) as Partial<Record<keyof typeof formData, string>>

const normalizeText = (value: string) => value.trim().toLowerCase();

  const parseEmergency = (value: string) => {
    const raw = (value ?? '').trim()
    if (raw === '') return { nome: '', telefone: '' }
    if (raw.includes('|')) {
      const [nome, telefone] = raw.split('|')
      return { nome: (nome ?? '').trim(), telefone: (telefone ?? '').trim() }
    }
    const parts = raw.split('-')
    if (parts.length >= 2) {
      const telefone = parts.slice(1).join('-').trim()
      const nome = parts[0].trim()
      return { nome, telefone }
    }
    return { nome: raw, telefone: '' }
  }

  const buildEmergency = (nome: string, telefone: string) => {
    const n = nome.trim()
    const t = telefone.trim()
    if (n === '' && t === '') return ''
    return `${n}|${t}`
  }

  const fetchCep = async (cep: string) => {
    const d = normalizeDigits(cep)
    if (d.length !== 8) throw new Error('CEP inválido')
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`)
    if (!res.ok) throw new Error('Erro ao consultar CEP')
    const data = await res.json()
    if ((data as any)?.erro) throw new Error('CEP não encontrado')
    return {
      endereco: String((data as any).logradouro ?? ''),
      complemento: String((data as any).complemento ?? ''),
      bairro: String((data as any).bairro ?? ''),
      cidade: String((data as any).localidade ?? ''),
      estado: String((data as any).uf ?? ''),
    }
  }

  const filteredClients = initialClients.filter((client) => {
    const q = normalizeText(searchTerm);
    const searchOk =
      q === '' ||
      normalizeText(client.nome).includes(q) ||
      (client.email ? normalizeText(client.email).includes(q) : false) ||
      (client.whatsapp ? normalizeDigits(client.whatsapp).includes(normalizeDigits(q)) : false) ||
      (client.cpf ? normalizeDigits(client.cpf).includes(normalizeDigits(q)) : false) ||
      (client.cidade ? normalizeText(client.cidade).includes(q) : false) ||
      (client.estado ? normalizeText(client.estado).includes(q) : false);

    const emailOk = filters.email === '' || (client.email ? normalizeText(client.email).includes(normalizeText(filters.email)) : false);
    const whatsappOk =
      filters.whatsapp === '' ||
      (client.whatsapp ? normalizeDigits(client.whatsapp).includes(normalizeDigits(filters.whatsapp)) : false);
    const cidadeOk = filters.cidade === '' || (client.cidade ? normalizeText(client.cidade).includes(normalizeText(filters.cidade)) : false);
    const estadoOk = filters.estado === '' || (client.estado ? normalizeText(client.estado).includes(normalizeText(filters.estado)) : false);
    const cpfOk = filters.cpf === '' || (client.cpf ? normalizeDigits(client.cpf).includes(normalizeDigits(filters.cpf)) : false);

    return searchOk && emailOk && whatsappOk && cidadeOk && estadoOk && cpfOk;
  });

  const handleOpenModal = (client?: Cliente) => {
    if (client) {
      setEditingClient(client);
      form.reset({
        nome: client.nome ?? '',
        indicacao: client.indicacao ?? '',
        cpf: formatCPF(client.cpf ?? ''),
        rg: client.rg ?? '',
        orgao: client.orgao ?? '',
        diaNasc: client.diaNasc == null ? '' : String(client.diaNasc),
        mesNasc: client.mesNasc == null ? '' : String(client.mesNasc),
        anoNasc: client.anoNasc == null ? '' : String(client.anoNasc),
        email: client.email ?? '',
        whatsapp: formatPhoneBR(client.whatsapp ?? ''),
        instagram: client.instagram ?? '',
        cep: formatCEP(client.cep ?? ''),
        endereco: client.endereco ?? '',
        numeroEndereco: client.numeroEndereco == null ? '' : String(client.numeroEndereco),
        complemento: client.complemento ?? '',
        bairro: client.bairro ?? '',
        cidade: client.cidade ?? '',
        estado: client.estado ?? '',
        pontoReferencia: client.pontoReferencia ?? '',
        profissao: client.profissao ?? '',
        empresa: client.empresa ?? '',
        cepEmpresa: formatCEP(client.cepEmpresa ?? ''),
        enderecoEmpresa: client.enderecoEmpresa ?? '',
        cidadeEmpresa: client.cidadeEmpresa ?? '',
        estadoEmpresa: client.estadoEmpresa ?? '',
        contatoEmergencia1: client.contatoEmergencia1 ?? '',
        contatoEmergencia2: client.contatoEmergencia2 ?? '',
        contatoEmergencia3: client.contatoEmergencia3 ?? '',
      });
      setChargeData({ enabled: false, valor: '', jurosMes: '', jurosAtrasoDia: '', vencimento: '', observacao: '' })
    } else {
      setEditingClient(null);
      form.reset({
        nome: '',
        indicacao: '',
        cpf: '',
        rg: '',
        orgao: '',
        diaNasc: '',
        mesNasc: '',
        anoNasc: '',
        email: '',
        whatsapp: '',
        instagram: '',
        cep: '',
        endereco: '',
        numeroEndereco: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        pontoReferencia: '',
        profissao: '',
        empresa: '',
        cepEmpresa: '',
        enderecoEmpresa: '',
        cidadeEmpresa: '',
        estadoEmpresa: '',
        contatoEmergencia1: '',
        contatoEmergencia2: '',
        contatoEmergencia3: '',
      });
      setChargeData({ enabled: false, valor: '', jurosMes: '', jurosAtrasoDia: '', vencimento: '', observacao: '' })
    }
    setActiveTab('basico');
    setIsModalOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const formData = values
      const cpfDigits = normalizeDigits(formData.cpf)
      const cpfDuplicado = initialClients.some((c) => {
        const other = normalizeDigits(c.cpf ?? '')
        if (editingClient && c.id === editingClient.id) return false
        return other !== '' && other === cpfDigits
      })
      if (cpfDuplicado) {
        form.setError('cpf', { message: 'Já existe um cliente cadastrado com esse CPF.' })
        setActiveTab('identificacao')
        return
      }

      if (chargeData.enabled) {
        const valor = Number(chargeData.valor)
        if (!Number.isFinite(valor) || valor <= 0) {
          toast.error('Informe um valor válido para a cobrança inicial.')
          setActiveTab('cobranca')
          return
        }
        if (chargeData.vencimento.trim() === '') {
          toast.error('Informe o vencimento da cobrança inicial.')
          setActiveTab('cobranca')
          return
        }
      }

      const payload = normalizeClientPayload(formData)

      if (editingClient) {
        await updateCliente(editingClient.id, payload);
        toast.success('Cliente atualizado com sucesso!');
        if (selectedFile) {
          await uploadDocumento(editingClient.id, selectedFile)
        }
        if (chargeData.enabled) {
          await createEmprestimo({
            clienteId: editingClient.id,
            valor: Number(chargeData.valor),
            jurosMes: Number(chargeData.jurosMes) || 0,
            jurosAtrasoDia: Number(chargeData.jurosAtrasoDia) || 0,
            vencimento: parseDateInputToUTCNoon(chargeData.vencimento),
            observacao: chargeData.observacao.trim(),
          })
          toast.success('Cobrança inicial criada.')
        }
        setIsModalOpen(false);
        router.push(`/clientes/${editingClient.id}`)
      } else {
        const created = await createCliente(payload);
        toast.success('Cliente cadastrado com sucesso!');
        if (selectedFile) {
          await uploadDocumento(created.id, selectedFile)
        }
        if (chargeData.enabled) {
          await createEmprestimo({
            clienteId: created.id,
            valor: Number(chargeData.valor),
            jurosMes: Number(chargeData.jurosMes) || 0,
            jurosAtrasoDia: Number(chargeData.jurosAtrasoDia) || 0,
            vencimento: parseDateInputToUTCNoon(chargeData.vencimento),
            observacao: chargeData.observacao.trim(),
          })
          toast.success('Cobrança inicial criada.')
        }
        setIsModalOpen(false);
        router.push(`/clientes/${created.id}`)
      }
    } catch (error) {
      toast.error('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  });

  const handleDelete = async (id: string) => {
    toast.info('Ação de exclusão solicitada', {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteCliente(id);
            toast.success('Cliente excluído com sucesso!');
          } catch (error) {
            toast.error('Erro ao excluir cliente. Verifique se há contratos ativos.');
          }
        },
      },
    });
  };

  useEffect(() => {
    const loadDocs = async () => {
      if (!editingClient?.id || activeTab !== 'anexos') return
      try {
        const res = await fetch(`/api/clientes/${editingClient.id}/documentos`)
        if (!res.ok) return
        const data = await res.json()
        setDocs(data)
      } catch {}
    }
    if (isModalOpen) loadDocs()
  }, [isModalOpen, editingClient, activeTab])

  type Tab = 'basico' | 'identificacao' | 'endereco' | 'profissao' | 'emergencia' | 'cobranca' | 'anexos' | 'revisao'
  const tabOrder: Tab[] = ['basico', 'identificacao', 'endereco', 'profissao', 'emergencia', 'cobranca', 'anexos', 'revisao']
  const autoAdvanceOrder: Array<'basico' | 'identificacao' | 'endereco'> = ['basico', 'identificacao', 'endereco']

  const isTabComplete = (tab: Tab) => {
    if (tab === 'basico') {
      return formData.nome.trim() !== '' && normalizeDigits(formData.whatsapp).length >= 10
    }
    if (tab === 'identificacao') {
      const cpfDigits = normalizeDigits(formData.cpf)
      if (cpfDigits.length !== 11 || !isValidCPF(cpfDigits)) return false
      const cpfDuplicado = initialClients.some((c) => {
        const other = normalizeDigits(c.cpf ?? '')
        if (editingClient && c.id === editingClient.id) return false
        return other !== '' && other === cpfDigits
      })
      const birthCheck = validateBirthDateParts(formData.diaNasc, formData.mesNasc, formData.anoNasc)
      return !cpfDuplicado && !birthCheck.dia && !birthCheck.mes && !birthCheck.ano
    }
    if (tab === 'endereco') {
      const cepDigits = normalizeDigits(formData.cep)
      const numero = Number.parseInt(formData.numeroEndereco.trim(), 10)
      return cepDigits.length === 8 && formData.endereco.trim() !== '' && Number.isFinite(numero) && numero > 0 && formData.bairro.trim() !== '' && formData.cidade.trim() !== '' && formData.estado.trim() !== ''
    }
    if (tab === 'profissao') {
      const any =
        formData.profissao.trim() !== '' ||
        formData.empresa.trim() !== '' ||
        normalizeDigits(formData.cepEmpresa).length === 8 ||
        formData.enderecoEmpresa.trim() !== '' ||
        formData.cidadeEmpresa.trim() !== '' ||
        formData.estadoEmpresa.trim() !== ''
      return any
    }
    if (tab === 'emergencia') {
      const any =
        formData.contatoEmergencia1.trim() !== '' ||
        formData.contatoEmergencia2.trim() !== '' ||
        formData.contatoEmergencia3.trim() !== ''
      return any
    }
    if (tab === 'cobranca') {
      if (!chargeData.enabled) return false
      const valor = Number(chargeData.valor)
      if (!Number.isFinite(valor) || valor <= 0) return false
      if (chargeData.vencimento.trim() === '') return false
      return true
    }
    if (tab === 'anexos') {
      return !!selectedFile || (editingClient ? docs.length > 0 : false)
    }
    if (tab === 'revisao') return false
    return false
  }

  const validateTabBeforeNavigate = async (tab: Tab) => {
    const fields = tabRequiredFields[tab]
    if (!fields.length) return true
    const ok = await form.trigger(fields as any)
    if (!ok) return false

    if (tab === 'identificacao') {
      const cpfDigits = normalizeDigits(formData.cpf)
      const cpfDuplicado = initialClients.some((c) => {
        const other = normalizeDigits(c.cpf ?? '')
        if (editingClient && c.id === editingClient.id) return false
        return other !== '' && other === cpfDigits
      })
      if (cpfDuplicado) {
        form.setError('cpf', { message: 'Já existe um cliente cadastrado com esse CPF.' })
        return false
      }
    }

    if (tab === 'cobranca' && chargeData.enabled) {
      const valor = Number(chargeData.valor)
      if (!Number.isFinite(valor) || valor <= 0) {
        toast.error('Informe um valor válido para a cobrança inicial.')
        return false
      }
      if (chargeData.vencimento.trim() === '') {
        toast.error('Informe o vencimento da cobrança inicial.')
        return false
      }
    }
    return true
  }


  const handleTabNavigate = (target: Tab) => {
    lastAutoAdvanceRef.current = null
    setActiveTab(target)
  }

  const validateFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast.error('Tipos permitidos: JPEG, PNG, PDF')
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Tamanho máximo: 5MB')
      return false
    }
    return true
  }

  const onPickFile = (f: File | null) => {
    if (!f) return
    if (!validateFile(f)) return
    setSelectedFile(f)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const uploadDocumento = async (clienteId: string, file: File) => {
    setUploading(true)
    setProgress(0)
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `/api/clientes/${clienteId}/documentos`)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error('Falha ao enviar'))
          }
        }
        const form = new FormData()
        form.append('file', file)
        xhr.send(form)
      })
      const res = await fetch(`/api/clientes/${clienteId}/documentos`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data)
      }
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setProgress(0)
      toast.success('Documento enviado')
    } catch {
      toast.error('Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async () => {
    if (!editingClient || !selectedFile || uploading) return
    await uploadDocumento(editingClient.id, selectedFile)
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!editingClient) return
    try {
      const res = await fetch(`/api/clientes/${editingClient.id}/documentos/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDocs((prev) => prev.filter((d) => d.id !== docId))
      toast.success('Documento excluído')
    } catch {
      toast.error('Erro ao excluir documento')
    }
  }

  const formatSize = (n: number) => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  const flowCompleted = autoAdvanceOrder.filter((t) => isTabComplete(t)).length
  const flowProgress = Math.round((flowCompleted / autoAdvanceOrder.length) * 100)
  const emergencia1 = parseEmergency(formData.contatoEmergencia1)
  const emergencia2 = parseEmergency(formData.contatoEmergencia2)
  const emergencia3 = parseEmergency(formData.contatoEmergencia3)
  const currentTabIndex = tabOrder.indexOf(activeTab)
  const prevTab = currentTabIndex > 0 ? tabOrder[currentTabIndex - 1] : null
  const nextTab = currentTabIndex >= 0 && currentTabIndex < tabOrder.length - 1 ? tabOrder[currentTabIndex + 1] : null

  const handlePrevTab = () => {
    if (!prevTab) return
    lastAutoAdvanceRef.current = null
    setActiveTab(prevTab)
  }

  const handleNextTab = async () => {
    if (!nextTab) return
    const ok = await validateTabBeforeNavigate(activeTab)
    if (ok) setActiveTab(nextTab)
  }

  const printReview = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
    if (!w) return
    const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] as string))
    const lines: Array<[string, string]> = [
      ['Nome', formData.nome],
      ['CPF', formData.cpf],
      ['WhatsApp', formData.whatsapp],
      ['Email', formData.email],
      ['Nascimento', [formData.diaNasc, formData.mesNasc, formData.anoNasc].filter(Boolean).join('/')],
      ['Endereço', [formData.endereco, formData.numeroEndereco, formData.bairro, formData.cidade, formData.estado].filter((x) => x != null && String(x).trim() !== '').join(' • ')],
      ['Empresa', formData.empresa],
      ['Contatos Emergência', [emergencia1.nome, emergencia2.nome, emergencia3.nome].filter((x) => (x ?? '').trim() !== '').join(' | ')],
    ]
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cliente - Revisão</title>
          <style>
            body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;margin:24px;color:#0f172a}
            h1{margin:0 0 6px 0;font-size:20px}
            .sub{color:#64748b;font-size:12px;margin-bottom:18px}
            table{width:100%;border-collapse:collapse}
            td{padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;vertical-align:top}
            td.k{width:220px;font-weight:700;background:#f8fafc}
          </style>
        </head>
        <body>
          <h1>Revisão do cadastro</h1>
          <div class="sub">Supercob • ${new Date().toLocaleString('pt-BR')}</div>
          <table>
            ${lines.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
          </table>
          <script>window.focus(); setTimeout(()=>window.print(), 250);</script>
        </body>
      </html>
    `
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carteira de Clientes</h1>
          <p className="text-slate-500">Cadastre e organize as informações de contato dos seus clientes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
            />
          </div>
          
          <button
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-950 transition-colors shadow-sm"
          >
            <Filter className="h-5 w-5" />
          </button>
          
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-950 transition-colors shadow-sm">
            <Download className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <UserPlus className="h-5 w-5" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Grid of Clients (Modern approach instead of just table) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode='popLayout'>
          {filteredClients.map((client, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              key={client.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  {client.nome.charAt(0)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal(client)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(client.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{client.nome}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="h-4 w-4" />
                    <span>{client.whatsapp ? formatPhoneBR(client.whatsapp) : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Desde {new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                <button
                  type="button"
                  onClick={() => router.push(`/clientes/${client.id}`)}
                  className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                >
                  Ver Histórico
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredClients.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Nenhum cliente encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>

      {/* Modal Modernizado */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl md:max-w-4xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                    </h3>
                    <p className="text-slate-500 text-sm">Preencha os dados cadastrais abaixo.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-2 hover:bg-slate-950 rounded-full text-slate-400 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
                  <aside className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-500">Progresso</p>
                        <p className="text-xs font-black text-slate-700">{flowProgress}%</p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white overflow-hidden border border-slate-200">
                        <div className="h-full bg-blue-600" style={{ width: `${flowProgress}%` }} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-2">
                        Obrigatórios: {autoAdvanceOrder.filter((t) => isTabComplete(t)).length}/{autoAdvanceOrder.length}
                      </p>
                    </div>

                    <div className="space-y-1">
                      {tabOrder.map((tab) => {
                        const labels: Record<Tab, string> = {
                          basico: 'Básico',
                          identificacao: 'Identificação',
                          endereco: 'Endereço',
                          profissao: 'Profissão',
                          emergencia: 'Emergência',
                          cobranca: 'Cobrança',
                          anexos: 'Anexos',
                          revisao: 'Revisão',
                        }
                        const done = isTabComplete(tab)
                        const isActive = activeTab === tab
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => handleTabNavigate(tab)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl border transition-colors ${
                              isActive
                                ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
                                : 'bg-slate-950 border-slate-200 text-slate-600 hover:bg-slate-950'
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                done ? 'bg-emerald-500' : isActive ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                            />
                            <span className={`text-xs ${done ? 'font-black text-emerald-700' : 'font-black'}`}>{labels[tab]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </aside>

                  <div className="min-w-0">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                  {activeTab === 'basico' && <ClientStepBasic formData={formData} setFormData={setFormData} formatPhoneBR={formatPhoneBR} errors={formErrorMessages} />}

                  {activeTab === 'identificacao' && (
                    <ClientStepIdentificacao
                      formData={formData}
                      setFormData={setFormData}
                      formatCPF={formatCPF}
                      birthErrors={birthErrors}
                      setBirthErrors={setBirthErrors}
                      sanitizeDigits={sanitizeDigits}
                      validateBirthDateParts={validateBirthDateParts}
                      errors={formErrorMessages}
                    />
                  )}

                  {activeTab === 'cobranca' && <ClientStepCobranca chargeData={chargeData} setChargeData={setChargeData} />}

                  {activeTab === 'anexos' && (
                    <ClientStepAnexos
                      editingClient={!!editingClient}
                      docs={docs}
                      selectedFile={selectedFile}
                      previewUrl={previewUrl}
                      inputFileRef={inputFileRef}
                      inputCameraRef={inputCameraRef}
                      onPickFile={onPickFile}
                      handleUpload={handleUpload}
                      uploading={uploading}
                      progress={progress}
                      setSelectedFile={setSelectedFile}
                      setPreviewUrl={setPreviewUrl}
                      formatSize={formatSize}
                      handleDeleteDoc={handleDeleteDoc}
                    />
                  )}

                  {activeTab === 'endereco' && (
                    <ClientStepEndereco
                      formData={formData}
                      setFormData={setFormData}
                      formatCEP={formatCEP}
                      normalizeDigits={normalizeDigits}
                      fetchCep={fetchCep}
                      loadingCep={loadingCep}
                      setLoadingCep={setLoadingCep}
                      errors={formErrorMessages}
                    />
                  )}

                  {activeTab === 'profissao' && (
                    <ClientStepProfissao
                      formData={formData}
                      setFormData={setFormData}
                      formatCEP={formatCEP}
                      normalizeDigits={normalizeDigits}
                      fetchCep={fetchCep}
                      loadingCepEmpresa={loadingCepEmpresa}
                      setLoadingCepEmpresa={setLoadingCepEmpresa}
                    />
                  )}

                  {activeTab === 'emergencia' && (
                    <ClientStepEmergencia
                      formData={formData}
                      setFormData={setFormData}
                      emergencia1={emergencia1}
                      emergencia2={emergencia2}
                      emergencia3={emergencia3}
                      buildEmergency={buildEmergency}
                      formatPhoneBR={formatPhoneBR}
                    />
                  )}

                  {activeTab === 'revisao' && (
                    <ClientStepRevisao
                      formData={formData}
                      chargeData={chargeData}
                      selectedFile={selectedFile}
                      docs={docs}
                      editingClient={!!editingClient}
                      emergencia1={emergencia1}
                      emergencia2={emergencia2}
                      emergencia3={emergencia3}
                      printReview={printReview}
                      setActiveTab={setActiveTab}
                    />
                  )}

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3.5 px-4 bg-slate-950 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    {activeTab !== 'basico' ? (
                      <button
                        type="button"
                        onClick={handlePrevTab}
                        className="flex-1 py-3.5 px-4 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        Voltar
                      </button>
                    ) : null}

                    {activeTab !== 'revisao' ? (
                      <button
                        type="button"
                        onClick={handleNextTab}
                        className="flex-[2] py-3.5 px-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                      >
                        Próxima
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] py-3.5 px-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Processando...' : (editingClient ? 'Confirmar atualização' : 'Confirmar cadastro')}
                      </button>
                    )}
                  </div>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFiltersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFiltersOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Filtros</h3>
                    <p className="text-slate-500 text-sm">Refine a lista de clientes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="p-2 hover:bg-slate-950 rounded-full text-slate-400 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
                    <input
                      type="text"
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      placeholder="email@..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">WhatsApp</label>
                    <input
                      type="text"
                      value={filters.whatsapp}
                      onChange={(e) => setFilters({ ...filters, whatsapp: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      placeholder="Somente números"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Cidade</label>
                      <input
                        type="text"
                        value={filters.cidade}
                        onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Estado</label>
                      <input
                        type="text"
                        value={filters.estado}
                        onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                        placeholder="UF"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">CPF</label>
                    <input
                      type="text"
                      value={filters.cpf}
                      onChange={(e) => setFilters({ ...filters, cpf: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      placeholder="Somente números"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFilters({ email: '', whatsapp: '', cidade: '', estado: '', cpf: '' })}
                    className="flex-1 py-3.5 px-4 bg-slate-950 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="flex-[2] py-3.5 px-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
