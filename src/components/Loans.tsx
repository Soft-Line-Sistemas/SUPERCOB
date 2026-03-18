'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, MessageCircle, Plus, X, Edit2, Trash2, Calendar, DollarSign, Info, MoreHorizontal, User, Clock, CheckCircle2, AlertCircle as AlertIcon, Send, Download } from 'lucide-react';
import { createEmprestimo, updateEmprestimo, deleteEmprestimo } from '@/app/(dashboard)/emprestimos/actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

type LoanStatus = 'ABERTO' | 'NEGOCIACAO' | 'QUITADO';

interface Loan {
  id: string;
  clienteId: string;
  usuarioId?: string | null;
  cliente: {
    nome: string;
    email: string;
    whatsapp: string;
  };
  usuario?: {
    nome: string;
  } | null;
  valor: number;
  jurosMes?: number;
  vencimento?: Date | null;
  status: LoanStatus;
  observacao?: string | null;
  quitadoEm?: Date | null;
  createdAt: Date;
}

interface LoansProps {
  initialLoans: Loan[];
  clientes: { id: string; nome: string }[];
  colaboradores: { id: string; nome: string }[];
  userRole: 'ADMIN' | 'OPERADOR';
  analytics?: { id: string; nome: string; aberto: number; negociacao: number; quitado: number; total: number }[];
}

const statusConfig: Record<LoanStatus, { label: string; color: string; icon: any; bg: string }> = {
  ABERTO: { label: 'Aberto', color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertIcon },
  QUITADO: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
};

export function Loans({ initialLoans, clientes, colaboradores, userRole, analytics }: LoansProps) {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    status: '',
    email: '',
    whatsapp: '',
    startDate: '',
    endDate: '',
  });

  const [formData, setFormData] = useState({
    clienteId: '',
    usuarioId: '',
    valor: 0,
    jurosMes: 0,
    vencimento: '',
    observacao: '',
    quitadoEm: '',
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const generateWhatsAppLink = (loan: Loan) => {
    const text = `Olá ${loan.cliente.nome}, sou da SUPERCOB. Gostaria de falar sobre a sua cobrança no valor de ${formatCurrency(loan.valor)}.`;
    const phone = loan.cliente.whatsapp.replace(/\D/g, '');
    return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
  };

  useEffect(() => {
    const clienteId = searchParams.get('clienteId')
    const novo = searchParams.get('novo')
    if (novo === '1' && clienteId) {
      setEditingLoan(null)
      setFormData({
        clienteId,
        usuarioId: '',
        valor: 0,
        jurosMes: 0,
        vencimento: '',
        observacao: '',
        quitadoEm: '',
      })
      setIsModalOpen(true)
    }
  }, [searchParams])

  const handleOpenModal = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        clienteId: loan.clienteId,
        usuarioId: loan.usuarioId || '',
        valor: loan.valor,
        jurosMes: (loan.jurosMes as any) ?? 0,
        vencimento: loan.vencimento ? format(new Date(loan.vencimento), 'yyyy-MM-dd') : '',
        observacao: loan.observacao || '',
        quitadoEm: loan.quitadoEm ? format(new Date(loan.quitadoEm), 'yyyy-MM-dd') : '',
      });
    } else {
      setEditingLoan(null);
      setFormData({
        clienteId: '',
        usuarioId: '',
        valor: 0,
        jurosMes: 0,
        vencimento: '',
        observacao: '',
        quitadoEm: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDetailModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        usuarioId: formData.usuarioId || null,
        jurosMes: Number(formData.jurosMes) || 0,
        vencimento: formData.vencimento ? new Date(formData.vencimento) : null,
        quitadoEm: formData.quitadoEm ? new Date(formData.quitadoEm) : null,
      };

      if (editingLoan) {
        await updateEmprestimo(editingLoan.id, data as any);
        toast.success('Cobrança atualizada com sucesso!');
      } else {
        await createEmprestimo(data as any);
        toast.success('Cobrança registrada com sucesso!');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar cobrança.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    toast.warning('Excluir cobrança?', {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteEmprestimo(id);
            toast.success('Excluído com sucesso!');
          } catch (err) {
            toast.error('Erro ao excluir.');
          }
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Carteira</h1>
          <p className="text-slate-500">Monitore e gerencie todos os ativos financeiros.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar contrato..."
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm appearance-none min-w-[140px]"
          >
            <option value="">Todos Status</option>
            <option value="ABERTO">Abertos</option>
            <option value="NEGOCIACAO">Negociação</option>
            <option value="QUITADO">Quitados</option>
          </select>
        </div>
      </div>

      {userRole === 'ADMIN' && analytics && analytics.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Visão por Colaborador</h3>
              <p className="text-sm text-slate-500">Andamento da carteira por responsável</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {analytics.map((a) => (
              <div key={a.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-slate-900">{a.nome}</p>
                  <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                    {a.total} casos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Aberto</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{a.aberto}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Negociação</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{a.negociacao}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Quitado</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{a.quitado}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout for Loans */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode='popLayout'>
          {initialLoans.map((loan, idx) => {
            const config = statusConfig[loan.status];
            const StatusIcon = config.icon;
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                key={loan.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color} text-[10px] font-bold uppercase tracking-wider`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(loan)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(loan.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 cursor-pointer" onClick={() => handleOpenDetail(loan)}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold border border-slate-100">
                      {loan.cliente.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{loan.cliente.nome}</h3>
                      <p className="text-xs text-slate-500 truncate">{loan.cliente.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Total</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(loan.valor)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data Início</p>
                      <p className="text-sm font-bold text-slate-700">{formatDate(loan.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {loan.usuario?.nome?.[0] || '?'}
                    </div>
                    <span className="text-xs font-medium text-slate-500 truncate max-w-[100px]">
                      {loan.usuario?.nome || 'Não atribuído'}
                    </span>
                  </div>
                  
                  <a 
                    href={generateWhatsAppLink(loan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Cobrar
                  </a>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal Novo/Editar Cobrança */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {editingLoan ? 'Editar Cobrança' : 'Nova Cobrança'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {!editingLoan && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                      <select
                        required
                        value={formData.clienteId}
                        onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                        className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                      >
                        <option value="">Selecione um cliente</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {userRole === 'ADMIN' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agente Responsável</label>
                      <select
                        value={formData.usuarioId}
                        onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                        className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                      >
                        <option value="">Não atribuído</option>
                        {colaboradores.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                        className="pl-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Juros ao mês (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.jurosMes}
                      onChange={(e) => setFormData({ ...formData, jurosMes: parseFloat(e.target.value) })}
                      className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.vencimento}
                        onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                        className="pl-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação (Gera status NEGOCIAÇÃO)</label>
                    <textarea
                      value={formData.observacao}
                      onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                      className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                      rows={3}
                      placeholder="Detalhes da negociação ou observações..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Quitação (Gera status QUITADO)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.quitadoEm}
                        onChange={(e) => setFormData({ ...formData, quitadoEm: e.target.value })}
                        className="pl-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border p-2"
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex flex-row-reverse gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : 'Salvar Cobrança'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Cobrança */}
      {isDetailModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsDetailModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 flex items-center">
                    <Info className="h-5 w-5 mr-2 text-blue-600" /> Detalhes da Cobrança
                  </h3>
                  <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Cliente</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLoan.cliente.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                      <span className={`mt-1 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[selectedLoan.status].bg} ${statusConfig[selectedLoan.status].color}`}>
                        {statusConfig[selectedLoan.status].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Agente Responsável</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLoan.usuario?.nome || 'Não atribuído'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Valor</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedLoan.valor)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Data de Criação</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedLoan.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedLoan.observacao && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Observações</p>
                      <p className="text-sm text-gray-700">{selectedLoan.observacao}</p>
                    </div>
                  )}

                  {selectedLoan.quitadoEm && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Quitado Em</p>
                      <p className="text-sm text-green-600 font-bold">{formatDate(selectedLoan.quitadoEm)}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <a
                      href={generateWhatsAppLink(selectedLoan)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Iniciar Cobrança via WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
