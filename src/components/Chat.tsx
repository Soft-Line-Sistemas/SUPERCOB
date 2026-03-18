'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Users, MessageSquare, Megaphone, ShieldCheck, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getChatUsers, getMessages, sendMessage, sendMassMessage } from '@/app/(dashboard)/chat/actions';
import { toast } from 'sonner';

interface ChatUser {
  id: string;
  nome: string;
  email: string;
  role: 'ADMIN' | 'OPERADOR';
}

interface Message {
  id: string;
  conteudo: string;
  remetenteId: string;
  destinatarioId: string | null;
  isMassiva: boolean;
  createdAt: Date;
  remetente: { nome: string; role: string };
}

export function Chat({ currentUser }: { currentUser: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMassMode, setIsMassMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('supercob:open-chat', handler)
    return () => window.removeEventListener('supercob:open-chat', handler)
  }, [])

  useEffect(() => {
    if (selectedUser || isMassMode) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Poll for new messages
      return () => clearInterval(interval);
    }
  }, [selectedUser, isMassMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadUsers = async () => {
    try {
      const data = await getChatUsers();
      setUsers(data as any);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await getMessages(selectedUser?.id);
      setMessages(data as any);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      if (isMassMode) {
        await sendMassMessage(newMessage);
        toast.success('Mensagem em massa enviada!');
      } else if (selectedUser) {
        await sendMessage(selectedUser.id, newMessage);
      }
      setNewMessage('');
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">Comunicação Interna</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Supercob Network</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* User List Sidebar */}
              <div className="w-20 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-4 gap-4">
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => { setSelectedUser(null); setIsMassMode(true); }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isMassMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                    title="Mensagem em Massa"
                  >
                    <Megaphone className="w-5 h-5" />
                  </button>
                )}
                <div className="w-8 h-[1px] bg-slate-200" />
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setIsMassMode(false); }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all relative ${selectedUser?.id === u.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                    title={u.nome}
                  >
                    {u.nome.charAt(0)}
                    {u.role === 'ADMIN' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-slate-50" />}
                  </button>
                ))}
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-white">
                {(selectedUser || isMassMode) ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {isMassMode ? <Megaphone className="w-4 h-4" /> : selectedUser?.nome.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{isMassMode ? 'Broadcast para Equipe' : selectedUser?.nome}</h4>
                          <span className="text-[10px] text-emerald-500 font-bold uppercase">Online</span>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.remetenteId === currentUser.id;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                              isMe 
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10' 
                                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                            }`}>
                              {msg.isMassiva && !isMe && (
                                <p className="text-[9px] font-black uppercase tracking-tighter opacity-50 mb-1 flex items-center gap-1">
                                  <Megaphone className="w-2.5 h-2.5" /> Comunicado Oficial
                                </p>
                              )}
                              {msg.conteudo}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 font-bold">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 bg-slate-50 border-t border-slate-100">
                      <div className="relative group">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={isMassMode ? "Enviar comunicado para todos..." : "Sua mensagem..."}
                          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || loading}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                      <MessageSquare className="w-10 h-10 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Mensagens</h4>
                    <p className="text-sm text-slate-500">Selecione um contato ao lado para iniciar uma conversa.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
