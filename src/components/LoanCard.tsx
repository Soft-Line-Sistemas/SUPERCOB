'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Clock, CheckCircle2, AlertCircle as AlertIcon, X, Download, Send } from 'lucide-react';
import { format } from 'date-fns';

type LoanStatus = 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' | 'CANCELADO';

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
  valorPago?: number | null;
  jurosMes?: number;
  vencimento?: Date | null;
  status: LoanStatus;
  observacao?: string | null;
  quitadoEm?: Date | null;
  createdAt: Date;
  jurosPagos?: number | null;
  cobrancaAtiva?: boolean;
}

const statusConfig: Record<LoanStatus, { label: string; color: string; icon: any; bg: string; border: string }> = {
  ABERTO: { label: 'Aberto', color: 'text-slate-600', bg: 'bg-slate-950', border: 'border-slate-200', icon: Clock },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', icon: AlertIcon },
  QUITADO: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', icon: CheckCircle2 },
  CANCELADO: { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-950', border: 'border-slate-300', icon: X },
};

interface LoanCardProps {
  loan: Loan;
  idx: number;
  onEdit: (loan: Loan) => void;
  onDelete: (id: string) => void;
  onDetail: (loan: Loan) => void;
  onToggleCobranca: (id: string, active: boolean) => void;
  onExportDossie: (id: string) => void;
  formatCurrency: (val: number) => string;
  formatDate: (date: Date | null | undefined) => string;
  generateWhatsAppLink: (loan: Loan) => string;
  contactFilter: (loan: Loan) => boolean;
}

export function LoanCard({
  loan,
  idx,
  onEdit,
  onDelete,
  onDetail,
  onToggleCobranca,
  onExportDossie,
  formatCurrency,
  formatDate,
  generateWhatsAppLink,
  contactFilter
}: LoanCardProps) {
  const config = statusConfig[loan.status];
  const StatusIcon = config.icon;
  const cobrancaActive = loan.cobrancaAtiva ?? false;
  const isDraft = loan.id.startsWith('draft-');

  // Cor da borda e cabeçalho dinâmicos
  const borderColor = cobrancaActive ? 'border-red-600' : config.border;
  const headerBg = cobrancaActive ? 'bg-red-50' : config.bg.replace('50', '25').replace('100', '50');

  const getSaldo = (loan: Loan) => {
    if (loan.status === 'CANCELADO') return 0;
    const pago = Number(loan.valorPago ?? 0) || 0;
    return Math.max((Number(loan.valor) || 0) - pago, 0);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      className={`bg-white rounded-3xl border-2 ${borderColor} shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col`}
    >
      {/* Card Header */}
      <div className={`p-6 border-b border-slate-50 flex items-center justify-between ${headerBg} transition-colors`}>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color} text-[10px] font-bold uppercase tracking-wider shadow-sm border border-slate-200/50`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {isDraft ? 'Cobrança inicial' : config.label}
        </div>

        {cobrancaActive ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExportDossie(loan.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-full hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 animate-pulse"
          >
            <Download className="w-3 h-3" />
            Enviar para Cobrança
          </button>
        ) : !isDraft && (
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(loan);
              }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(loan.id);
              }}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div
        className="p-6 cursor-pointer flex-1"
        onClick={() => onDetail(loan)}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-slate-400 font-bold border border-slate-100 shadow-inner">
            {loan.cliente.nome.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{loan.cliente.nome}</h3>
            <p className={`text-xs font-black truncate ${cobrancaActive ? 'text-red-600' : 'text-slate-700'}`}>
              Saldo: {formatCurrency(getSaldo(loan))}
            </p>
            <p className="text-xs text-slate-500 truncate">{loan.cliente.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Total</p>
            <p className="text-lg font-black text-slate-900">{formatCurrency(loan.valor)}</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data Início</p>
            <p className="text-sm font-bold text-slate-700">{formatDate(loan.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-slate-950 flex items-center justify-between gap-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {/* Atribuição/Consultor Info */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
              {loan.usuario?.nome?.[0] || '?'}
            </div>
            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]">
              {loan.usuario?.nome || 'Não atribuído'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 py-1 px-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Cobrança</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleCobranca(loan.id, !cobrancaActive);
              }}
              className={`w-8 h-4 rounded-full flex items-center transition-colors cursor-pointer ${cobrancaActive ? 'bg-red-500' : 'bg-slate-300'}`}
            >
              <motion.div
                animate={{ x: cobrancaActive ? 16 : 2 }}
                className="w-3 h-3 rounded-full bg-white shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDetail(loan);
            }}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-950 transition-colors shadow-sm"
          >
            Detalhes
          </button>

          {!cobrancaActive && (
            contactFilter(loan) ? (
              <a
                href={generateWhatsAppLink(loan)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                Cobrar
              </a>
            ) : (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Sem WA
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
