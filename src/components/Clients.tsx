'use client';

import React, { useState } from 'react';
import { Plus, Search, X, User, Phone, Mail, Edit2, Trash2, MoreVertical, Filter, Download, UserPlus } from 'lucide-react';
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
  endereco?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pontoReferencia?: string | null;
  profissao?: string | null;
  empresa?: string | null;
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
  const [activeTab, setActiveTab] = useState<'basico' | 'documentos' | 'endereco' | 'profissao' | 'emergencia'>('basico');
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
    endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    pontoReferencia: '',
    profissao: '',
    empresa: '',
    enderecoEmpresa: '',
    cidadeEmpresa: '',
    estadoEmpresa: '',
    contatoEmergencia1: '',
    contatoEmergencia2: '',
    contatoEmergencia3: '',
  });
  const [loading, setLoading] = useState(false);

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');
  const normalizeText = (value: string) => value.trim().toLowerCase();

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
        cpf: client.cpf ?? '',
        rg: client.rg ?? '',
        orgao: client.orgao ?? '',
        diaNasc: client.diaNasc == null ? '' : String(client.diaNasc),
        mesNasc: client.mesNasc == null ? '' : String(client.mesNasc),
        anoNasc: client.anoNasc == null ? '' : String(client.anoNasc),
        email: client.email ?? '',
        whatsapp: client.whatsapp ?? '',
        instagram: client.instagram ?? '',
        endereco: client.endereco ?? '',
        complemento: client.complemento ?? '',
        bairro: client.bairro ?? '',
        cidade: client.cidade ?? '',
        estado: client.estado ?? '',
        pontoReferencia: client.pontoReferencia ?? '',
        profissao: client.profissao ?? '',
        empresa: client.empresa ?? '',
        enderecoEmpresa: client.enderecoEmpresa ?? '',
        cidadeEmpresa: client.cidadeEmpresa ?? '',
        estadoEmpresa: client.estadoEmpresa ?? '',
        contatoEmergencia1: client.contatoEmergencia1 ?? '',
        contatoEmergencia2: client.contatoEmergencia2 ?? '',
        contatoEmergencia3: client.contatoEmergencia3 ?? '',
      });
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
        endereco: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        pontoReferencia: '',
        profissao: '',
        empresa: '',
        enderecoEmpresa: '',
        cidadeEmpresa: '',
        estadoEmpresa: '',
        contatoEmergencia1: '',
        contatoEmergencia2: '',
        contatoEmergencia3: '',
      });
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

      const payload = {
        nome: formData.nome.trim(),
        indicacao: normalizeOptional(formData.indicacao),
        cpf: normalizeOptional(formData.cpf),
        rg: normalizeOptional(formData.rg),
        orgao: normalizeOptional(formData.orgao),
        diaNasc: parseIntOrNull(formData.diaNasc),
        mesNasc: parseIntOrNull(formData.mesNasc),
        anoNasc: parseIntOrNull(formData.anoNasc),
        email: normalizeOptional(formData.email),
        whatsapp: normalizeOptional(formData.whatsapp),
        instagram: normalizeOptional(formData.instagram),
        endereco: normalizeOptional(formData.endereco),
        complemento: normalizeOptional(formData.complemento),
        bairro: normalizeOptional(formData.bairro),
        cidade: normalizeOptional(formData.cidade),
        estado: normalizeOptional(formData.estado),
        pontoReferencia: normalizeOptional(formData.pontoReferencia),
        profissao: normalizeOptional(formData.profissao),
        empresa: normalizeOptional(formData.empresa),
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
      } else {
        const created = await createCliente(payload);
        toast.success('Cliente cadastrado com sucesso!');
        setIsModalOpen(false);
        router.push(`/emprestimos?clienteId=${created.id}&novo=1`);
        return;
      }
      setIsModalOpen(false);
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
            toast.error('Erro ao excluir cliente. Verifique se há empréstimos ativos.');
          }
        },
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carteira de Clientes</h1>
          <p className="text-slate-500">Gerencie sua base de contatos e tomadores.</p>
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
                    <span>{client.whatsapp || '-'}</span>
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

                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('basico')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'basico' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Básico
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documentos')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'documentos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Documentos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('endereco')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'endereco' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Endereço
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profissao')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'profissao' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Profissão
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('emergencia')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'emergencia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Emergência
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
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
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

                  {activeTab === 'documentos' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">CPF</label>
                          <input
                            type="text"
                            value={formData.cpf}
                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
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

                  {activeTab === 'endereco' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Endereço</label>
                        <input
                          type="text"
                          value={formData.endereco}
                          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="Rua, número"
                        />
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
