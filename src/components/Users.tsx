'use client';

import React, { useState } from 'react';
import { Plus, Search, X, User, Mail, Edit2, Trash2, Shield, Lock, MoreHorizontal, UserCheck, ShieldAlert, Key, Monitor } from 'lucide-react';
import { createUsuario, updateUsuario, deleteUsuario } from '@/app/(dashboard)/usuarios/actions';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'ADM' | 'ESCRITORIO' | 'GERENTE';
  createdAt: Date;
}

interface UsersProps {
  initialUsers: Usuario[];
  myRole?: string;
}

export function Users({ initialUsers, myRole }: UsersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'GERENTE' as 'ADM' | 'ESCRITORIO' | 'GERENTE',
  });

  const filteredUsers = initialUsers.filter(user =>
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (user?: Usuario) => {
    setError(null);
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        senha: '', // Don't show password
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        nome: '',
        email: '',
        senha: '',
        role: 'GERENTE',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingUser) {
        await updateUsuario(editingUser.id, formData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        if (!formData.senha || formData.senha.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        await createUsuario(formData as any);
        toast.success('Usuário criado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Erro ao salvar usuário.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    toast.warning('Excluir este acesso?', {
      description: 'Esta ação não pode ser desfeita.',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteUsuario(id);
            toast.success('Acesso revogado com sucesso!');
          } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir.');
          }
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Equipe</h1>
          <p className="text-slate-500">Controle de acessos e níveis de permissão do sistema.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
              placeholder="Buscar por nome ou e-mail..."
            />
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Modern User Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode='popLayout'>
          {filteredUsers.map((user, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              key={user.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Role Badge Overlay */}
              <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${
                user.role === 'ADM' ? 'bg-indigo-600 text-white' : 
                user.role === 'ESCRITORIO' ? 'bg-emerald-600 text-white' :
                'bg-slate-950 text-slate-500'
              }`}>
                {user.role === 'GERENTE' ? 'GERÊNCIA' : user.role === 'ESCRITORIO' ? 'ESCRITÓRIO' : user.role}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                  user.role === 'ADM' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-950 text-slate-400'
                }`}>
                  {user.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate pr-16">{user.nome}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {user.role === 'ADM' ? <Shield className="w-3.5 h-3.5" /> : user.role === 'ESCRITORIO' ? <Monitor className="w-3.5 h-3.5 text-emerald-500" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {user.role === 'ADM' ? 'Acesso Total' : user.role === 'ESCRITORIO' ? 'Gestão e Visão' : 'Acesso Limitado'}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(user)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Editar Usuário"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Revogar Acesso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modernized User Modal */}
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
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {editingUser ? 'Configurar Acesso' : 'Novo Usuário'}
                    </h3>
                    <p className="text-slate-500 text-sm">Defina as permissões e credenciais.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-950 rounded-full text-slate-400 transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 mb-6 flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Nome do Agente</label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="Ex: Roberto Oliveira"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">E-mail de Acesso</label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder="email@supercob.com.br"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">
                        {editingUser ? 'Alterar Senha' : 'Senha de Acesso'}
                      </label>
                      <div className="relative group">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="password"
                          required={!editingUser}
                          value={formData.senha}
                          onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                          placeholder={editingUser ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Nível de Permissão</label>
                      <div className={`grid ${(myRole === 'ADM' || myRole === 'ADMIN') ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, role: 'GERENTE'})}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                            formData.role === 'GERENTE' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:bg-slate-950'
                          }`}
                        >
                          <User className={`w-6 h-6 ${formData.role === 'GERENTE' ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-bold ${formData.role === 'GERENTE' ? 'text-blue-700' : 'text-slate-500'}`}>GERÊNCIA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({...formData, role: 'ESCRITORIO'})}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                            formData.role === 'ESCRITORIO' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-950 hover:bg-slate-950'
                          }`}
                        >
                          <Monitor className={`w-6 h-6 ${formData.role === 'ESCRITORIO' ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-bold ${formData.role === 'ESCRITORIO' ? 'text-emerald-700' : 'text-slate-500'}`}>ESCRITÓRIO</span>
                        </button>

                        {(myRole === 'ADM' || myRole === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, role: 'ADM'})}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                              formData.role === 'ADM' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-white hover:bg-slate-950'
                            }`}
                          >
                            <Shield className={`w-6 h-6 ${formData.role === 'ADM' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className={`text-[10px] font-extrabold ${formData.role === 'ADM' ? 'text-indigo-700' : 'text-slate-500'}`}>ADM</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 bg-slate-950 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processando...' : (editingUser ? 'Salvar Alterações' : 'Criar Acesso')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
