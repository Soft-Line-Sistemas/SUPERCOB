'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search, X, User, Phone, Mail, Edit2, Trash2, MoreVertical, Filter, Download, UserPlus, Camera, Image as ImageIcon, Eye } from 'lucide-react';
import { createCliente, updateCliente, deleteCliente } from '@/app/(dashboard)/clientes/actions';
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    email: '',
    whatsapp: '',
    cidade: '',
    estado: '',
    cpf: '',
  });
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [activeTab, setActiveTab] = useState<'basico' | 'identificacao' | 'endereco' | 'profissao' | 'emergencia' | 'cobranca' | 'anexos'>('basico');
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCepEmpresa, setLoadingCepEmpresa] = useState(false);
  const [chargeData, setChargeData] = useState({
    enabled: false,
    valor: '',
    jurosMes: '',
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

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');
  const normalizeText = (value: string) => value.trim().toLowerCase();

  const formatCPF = (value: string) => {
    const d = normalizeDigits(value).slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }

  const formatPhoneBR = (value: string) => {
    const d = normalizeDigits(value).slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  const formatCEP = (value: string) => {
    const d = normalizeDigits(value).slice(0, 8)
    if (d.length <= 5) return d
    return `${d.slice(0, 5)}-${d.slice(5)}`
  }

  const isValidCPF = (cpf: string) => {
    const digits = normalizeDigits(cpf)
    if (digits.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digits)) return false

    const calc = (len: number) => {
      let sum = 0
      for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i)
      const mod = sum % 11
      return mod < 2 ? 0 : 11 - mod
    }

    const d1 = calc(9)
    const d2 = calc(10)
    return d1 === Number(digits[9]) && d2 === Number(digits[10])
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
      setFormData({
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
      setChargeData({ enabled: false, valor: '', jurosMes: '', vencimento: '', observacao: '' })
    } else {
      setEditingClient(null);
      setFormData({
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
      setChargeData({ enabled: false, valor: '', jurosMes: '', vencimento: '', observacao: '' })
    }
    setActiveTab('basico');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizeOptional = (value: string) => {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      };
      const parseIntOrNull = (value: string) => {
        const trimmed = value.trim();
        if (trimmed === '') return null;
        const num = Number.parseInt(trimmed, 10);
        return Number.isFinite(num) ? num : null;
      };

      if (formData.nome.trim() === '') {
        toast.error('Informe o nome do cliente.')
        setActiveTab('basico')
        return
      }

      const whatsappDigits = normalizeDigits(formData.whatsapp)
      if (whatsappDigits.length < 10) {
        toast.error('Informe um WhatsApp válido.')
        setActiveTab('basico')
        return
      }

      const cpfDigits = normalizeDigits(formData.cpf)
      if (cpfDigits.length !== 11 || !isValidCPF(cpfDigits)) {
        toast.error('CPF inválido.')
        setActiveTab('identificacao')
        return
      }

      const cpfDuplicado = initialClients.some((c) => {
        const other = normalizeDigits(c.cpf ?? '')
        if (editingClient && c.id === editingClient.id) return false
        return other !== '' && other === cpfDigits
      })
      if (cpfDuplicado) {
        toast.error('Já existe um cliente cadastrado com esse CPF.')
        setActiveTab('identificacao')
        return
      }

      const cepDigits = normalizeDigits(formData.cep)
      if (cepDigits.length !== 8) {
        toast.error('Informe um CEP válido.')
        setActiveTab('endereco')
        return
      }

      if (formData.endereco.trim() === '') {
        toast.error('Informe o endereço.')
        setActiveTab('endereco')
        return
      }

      const numeroEndereco = parseIntOrNull(formData.numeroEndereco)
      if (!numeroEndereco || numeroEndereco <= 0) {
        toast.error('Informe o número do endereço.')
        setActiveTab('endereco')
        return
      }

      if (formData.bairro.trim() === '' || formData.cidade.trim() === '' || formData.estado.trim() === '') {
        toast.error('Preencha bairro, cidade e estado.')
        setActiveTab('endereco')
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

      const payload = {
        nome: formData.nome.trim(),
        indicacao: normalizeOptional(formData.indicacao),
        cpf: cpfDigits,
        rg: normalizeOptional(formData.rg),
        orgao: normalizeOptional(formData.orgao),
        diaNasc: parseIntOrNull(formData.diaNasc),
        mesNasc: parseIntOrNull(formData.mesNasc),
        anoNasc: parseIntOrNull(formData.anoNasc),
        email: normalizeOptional(formData.email),
        whatsapp: whatsappDigits,
        instagram: normalizeOptional(formData.instagram),
        cep: normalizeOptional(formData.cep),
        endereco: normalizeOptional(formData.endereco),
        numeroEndereco: parseIntOrNull(formData.numeroEndereco),
        complemento: normalizeOptional(formData.complemento),
        bairro: normalizeOptional(formData.bairro),
        cidade: normalizeOptional(formData.cidade),
        estado: normalizeOptional(formData.estado),
        pontoReferencia: normalizeOptional(formData.pontoReferencia),
        profissao: normalizeOptional(formData.profissao),
        empresa: normalizeOptional(formData.empresa),
        cepEmpresa: normalizeOptional(formData.cepEmpresa),
        enderecoEmpresa: normalizeOptional(formData.enderecoEmpresa),
        cidadeEmpresa: normalizeOptional(formData.cidadeEmpresa),
        estadoEmpresa: normalizeOptional(formData.estadoEmpresa),
        contatoEmergencia1: normalizeOptional(formData.contatoEmergencia1),
        contatoEmergencia2: normalizeOptional(formData.contatoEmergencia2),
        contatoEmergencia3: normalizeOptional(formData.contatoEmergencia3),
      };

      if (editingClient) {
        await updateCliente(editingClient.id, payload);
        toast.success('Cliente atualizado com sucesso!');
        if (selectedFile) {
          await uploadDocumento(editingClient.id, selectedFile)
        }
        setIsModalOpen(false);
        if (chargeData.enabled) {
          const q = new URLSearchParams()
          q.set('clienteId', editingClient.id)
          q.set('novo', '1')
          if (chargeData.valor.trim() !== '') q.set('valor', chargeData.valor.trim())
          if (chargeData.jurosMes.trim() !== '') q.set('jurosMes', chargeData.jurosMes.trim())
          if (chargeData.vencimento.trim() !== '') q.set('vencimento', chargeData.vencimento.trim())
          if (chargeData.observacao.trim() !== '') q.set('observacao', chargeData.observacao.trim())
          router.push(`/emprestimos?${q.toString()}`)
          return;
        }
      } else {
        const created = await createCliente(payload);
        toast.success('Cliente cadastrado com sucesso!');
        if (selectedFile) {
          await uploadDocumento(created.id, selectedFile)
        }
        setIsModalOpen(false);
        if (chargeData.enabled) {
          const q = new URLSearchParams()
          q.set('clienteId', created.id)
          q.set('novo', '1')
          if (chargeData.valor.trim() !== '') q.set('valor', chargeData.valor.trim())
          if (chargeData.jurosMes.trim() !== '') q.set('jurosMes', chargeData.jurosMes.trim())
          if (chargeData.vencimento.trim() !== '') q.set('vencimento', chargeData.vencimento.trim())
          if (chargeData.observacao.trim() !== '') q.set('observacao', chargeData.observacao.trim())
          router.push(`/emprestimos?${q.toString()}`)
          return;
        }
      }
    } catch (error) {
      toast.error('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
      if (!editingClient || activeTab !== 'anexos') return
      try {
        const res = await fetch(`/api/clientes/${editingClient.id}/documentos`)
        if (!res.ok) return
        const data = await res.json()
        setDocs(data)
      } catch {}
    }
    if (isModalOpen) loadDocs()
  }, [isModalOpen, editingClient?.id, activeTab])

  type FlowTab = 'basico' | 'identificacao' | 'endereco' | 'profissao' | 'emergencia'
  type Tab = FlowTab | 'cobranca' | 'anexos'
  const flowOrder: FlowTab[] = ['basico', 'identificacao', 'endereco', 'profissao', 'emergencia']
  const tabOrder: Tab[] = [...flowOrder, 'cobranca', 'anexos']

  const getNextFlowTab = (tab: FlowTab) => {
    const idx = flowOrder.indexOf(tab)
    return idx >= 0 && idx < flowOrder.length - 1 ? flowOrder[idx + 1] : null
  }

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
      return !cpfDuplicado
    }
    if (tab === 'endereco') {
      const cepDigits = normalizeDigits(formData.cep)
      const numero = Number.parseInt(formData.numeroEndereco.trim(), 10)
      return cepDigits.length === 8 && formData.endereco.trim() !== '' && Number.isFinite(numero) && numero > 0 && formData.bairro.trim() !== '' && formData.cidade.trim() !== '' && formData.estado.trim() !== ''
    }
    if (tab === 'cobranca') {
      if (!chargeData.enabled) return true
      const valor = Number(chargeData.valor)
      if (!Number.isFinite(valor) || valor <= 0) return false
      if (chargeData.vencimento.trim() === '') return false
      return true
    }
    return true
  }

  const validateTabBeforeNavigate = (tab: Tab) => {
    if (tab === 'basico') {
      if (formData.nome.trim() === '') {
        toast.error('Informe o nome do cliente.')
        return false
      }
      if (normalizeDigits(formData.whatsapp).length < 10) {
        toast.error('Informe um WhatsApp válido.')
        return false
      }
      return true
    }
    if (tab === 'identificacao') {
      const cpfDigits = normalizeDigits(formData.cpf)
      if (cpfDigits.length !== 11 || !isValidCPF(cpfDigits)) {
        toast.error('CPF inválido.')
        return false
      }
      const cpfDuplicado = initialClients.some((c) => {
        const other = normalizeDigits(c.cpf ?? '')
        if (editingClient && c.id === editingClient.id) return false
        return other !== '' && other === cpfDigits
      })
      if (cpfDuplicado) {
        toast.error('Já existe um cliente cadastrado com esse CPF.')
        return false
      }
      return true
    }
    if (tab === 'endereco') {
      const cepDigits = normalizeDigits(formData.cep)
      if (cepDigits.length !== 8) {
        toast.error('Informe um CEP válido.')
        return false
      }
      if (formData.endereco.trim() === '') {
        toast.error('Informe o endereço.')
        return false
      }
      const numero = Number.parseInt(formData.numeroEndereco.trim(), 10)
      if (!Number.isFinite(numero) || numero <= 0) {
        toast.error('Informe o número do endereço.')
        return false
      }
      if (formData.bairro.trim() === '' || formData.cidade.trim() === '' || formData.estado.trim() === '') {
        toast.error('Preencha bairro, cidade e estado.')
        return false
      }
      return true
    }
    if (tab === 'cobranca') {
      if (!chargeData.enabled) return true
      const valor = Number(chargeData.valor)
      if (!Number.isFinite(valor) || valor <= 0) {
        toast.error('Informe um valor válido para a cobrança inicial.')
        return false
      }
      if (chargeData.vencimento.trim() === '') {
        toast.error('Informe o vencimento da cobrança inicial.')
        return false
      }
      return true
    }
    return true
  }

  const handleTabNavigate = (target: Tab) => {
    const currentIdx = tabOrder.indexOf(activeTab)
    const targetIdx = tabOrder.indexOf(target)
    if (targetIdx <= currentIdx) {
      setActiveTab(target)
      return
    }
    for (let i = 0; i < targetIdx; i++) {
      const tab = tabOrder[i]
      const ok = validateTabBeforeNavigate(tab)
      if (!ok) {
        setActiveTab(tab)
        return
      }
    }
    setActiveTab(target)
  }

  useEffect(() => {
    if (!isModalOpen) return
    if (!flowOrder.includes(activeTab as any)) return
    const next = getNextFlowTab(activeTab as FlowTab)
    if (!next) return
    if (!isTabComplete(activeTab as any)) return
    if (lastAutoAdvanceRef.current === activeTab) return
    const t = window.setTimeout(() => {
      lastAutoAdvanceRef.current = activeTab
      setActiveTab(next)
    }, 350)
    return () => window.clearTimeout(t)
  }, [activeTab, formData, isModalOpen])

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
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Filter className="h-5 w-5" />
          </button>
          
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
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
                <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-colors">
                  Ver Histórico
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredClients.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
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
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-8 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                    </h3>
                    <p className="text-slate-500 text-sm">Preencha os dados cadastrais abaixo.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('basico')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'basico' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Básico
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('identificacao')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'identificacao' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Identificação
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('endereco')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'endereco' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Endereço
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('profissao')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'profissao' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Profissão
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('emergencia')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'emergencia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Emergência
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('cobranca')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'cobranca' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Cobrança
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabNavigate('anexos')}
                    className={`px-3 py-2 text-xs font-black rounded-xl transition-colors ${activeTab === 'anexos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Anexos
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {activeTab === 'basico' && (
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
                  )}

                  {activeTab === 'identificacao' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">CPF</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={formData.cpf}
                            onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">RG</label>
                          <input
                            type="text"
                            value={formData.rg}
                            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                            placeholder="00.000.000-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Órgão Expedidor</label>
                        <input
                          type="text"
                          value={formData.orgao}
                          onChange={(e) => setFormData({ ...formData, orgao: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="SSP/UF"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Data de Nascimento</label>
                        <div className="grid grid-cols-3 gap-3">
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={formData.diaNasc}
                            onChange={(e) => setFormData({ ...formData, diaNasc: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                            placeholder="Dia"
                          />
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={formData.mesNasc}
                            onChange={(e) => setFormData({ ...formData, mesNasc: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                            placeholder="Mês"
                          />
                          <input
                            type="number"
                            min={1900}
                            max={2100}
                            value={formData.anoNasc}
                            onChange={(e) => setFormData({ ...formData, anoNasc: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                            placeholder="Ano"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'cobranca' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">Cobrança inicial</p>
                            <p className="text-xs text-slate-500">Opcional: criar uma cobrança vinculada ao cliente.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setChargeData((p) => ({ ...p, enabled: !p.enabled }))}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              chargeData.enabled ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            {chargeData.enabled ? 'Ativado' : 'Desativado'}
                          </button>
                        </div>

                        {chargeData.enabled && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Valor (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={chargeData.valor}
                                onChange={(e) => setChargeData((p) => ({ ...p, valor: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                                placeholder="0,00"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Juros ao mês (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={chargeData.jurosMes}
                                onChange={(e) => setChargeData((p) => ({ ...p, jurosMes: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Vencimento</label>
                              <input
                                type="date"
                                value={chargeData.vencimento}
                                onChange={(e) => setChargeData((p) => ({ ...p, vencimento: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                              />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Observação</label>
                              <input
                                type="text"
                                value={chargeData.observacao}
                                onChange={(e) => setChargeData((p) => ({ ...p, observacao: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'anexos' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">Anexos de Documentos</p>
                          {!editingClient && <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pode anexar agora e enviar ao salvar</span>}
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => inputFileRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl"
                          >
                            <ImageIcon className="w-4 h-4" /> Selecionar Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => inputCameraRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl"
                          >
                            <Camera className="w-4 h-4" /> Capturar Foto
                          </button>
                          <input
                            ref={inputFileRef}
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                          />
                          <input
                            ref={inputCameraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                          />
                        </div>

                        {selectedFile && (
                          <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3">
                              {previewUrl ? (
                                <img src={previewUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                  <Download className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500">{formatSize(selectedFile.size)}</p>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={uploading || !editingClient}
                                  onClick={handleUpload}
                                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl disabled:opacity-50"
                                >
                                  Enviar
                                </button>
                                <button
                                  type="button"
                                  disabled={uploading}
                                  onClick={() => {
                                    setSelectedFile(null)
                                    if (previewUrl) {
                                      URL.revokeObjectURL(previewUrl)
                                      setPreviewUrl(null)
                                    }
                                  }}
                                  className="px-3 py-2 bg-white border border-slate-200 text-xs font-black rounded-xl"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                            {uploading && (
                              <div className="mt-3 w-full h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4">
                          {!editingClient ? (
                            <p className="text-xs text-slate-500">Após salvar o cliente, os anexos enviados aparecerão aqui.</p>
                          ) : docs.length === 0 ? (
                            <p className="text-xs text-slate-500">Nenhum documento anexado.</p>
                          ) : (
                            <div className="space-y-2">
                              {docs.map((d) => (
                                <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                    {d.mimeType.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-slate-500" /> : <Download className="w-5 h-5 text-slate-500" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{d.originalName}</p>
                                    <p className="text-[10px] font-bold text-slate-500">{formatSize(d.size)}</p>
                                  </div>
                                  <div className="ml-auto flex items-center gap-2">
                                    <a
                                      href={d.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-2 bg-white border border-slate-200 text-xs font-black rounded-xl flex items-center gap-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Ver
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(d.id)}
                                      className="px-3 py-2 bg-red-600 text-white text-xs font-black rounded-xl flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'endereco' && (
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
                  )}

                  {activeTab === 'profissao' && (
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
                  )}

                  {activeTab === 'emergencia' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Contato de Emergência 1</label>
                        <input
                          type="text"
                          value={formData.contatoEmergencia1}
                          onChange={(e) => setFormData({ ...formData, contatoEmergencia1: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="Nome e telefone"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Contato de Emergência 2</label>
                        <input
                          type="text"
                          value={formData.contatoEmergencia2}
                          onChange={(e) => setFormData({ ...formData, contatoEmergencia2: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="Nome e telefone"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Contato de Emergência 3</label>
                        <input
                          type="text"
                          value={formData.contatoEmergencia3}
                          onChange={(e) => setFormData({ ...formData, contatoEmergencia3: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="Nome e telefone"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-3.5 px-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processando...' : (editingClient ? 'Atualizar Dados' : 'Cadastrar Cliente')}
                    </button>
                  </div>
                </form>
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
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
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
                    className="flex-1 py-3.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
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
