'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Clock, CheckCircle2, AlertCircle as AlertIcon, X, Download, Send, Wallet } from 'lucide-react';
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
  quantidadeParcelas?: number | null;
  valorPago?: number | null;
  jurosMes?: number;
  vencimento?: Date | null;
  status: LoanStatus;
  observacao?: string | null;
  quitadoEm?: Date | null;
  createdAt: Date;
  jurosPagos?: number | null;
  cobrancaAtiva?: boolean;
  historico?: { createdAt: Date | string; descricao?: string | null }[];
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
  onOpenPaymentTerminal: (loan: Loan) => void;
  onConfirmMonthlyPayment: (loan: Loan) => void;
  formatCurrency: (val: number) => string;
  formatDate: (date: Date | null | undefined) => string;
  generateWhatsAppLink: (loan: Loan) => string;
  contactFilter: (loan: Loan) => boolean;
  isAdmin?: boolean;
  installmentProgress?: { current: number; total: number } | null;
  canOpenPaymentTerminal?: boolean;
  canConfirmMonthlyPayment?: boolean;
  isMonthlyPaymentSettled?: boolean;
  isConfirmMonthlyPaymentPending?: boolean;
}

export function LoanCard({
  loan,
  idx,
  onEdit,
  onDelete,
  onDetail,
  onToggleCobranca,
  onExportDossie,
  onOpenPaymentTerminal,
  onConfirmMonthlyPayment,
  formatCurrency,
  formatDate,
  generateWhatsAppLink,
  contactFilter,
  isAdmin,
  installmentProgress = null,
  canOpenPaymentTerminal = false,
  canConfirmMonthlyPayment = false,
  isMonthlyPaymentSettled = false,
  isConfirmMonthlyPaymentPending = false,
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
      <div className={`p-4 md:p-6 border-b border-slate-50 flex items-center justify-between ${headerBg} transition-colors`}>
        <div className="flex flex-wrap items-center gap-2">
          {canOpenPaymentTerminal ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPaymentTerminal(loan);
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-full border border-slate-200/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${config.bg} ${config.color}`}
              title="Abrir terminal de cobrança"
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {isDraft ? 'Cobrança inicial' : config.label}
            </button>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color} text-[10px] font-bold uppercase tracking-wider shadow-sm border border-slate-200/50`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {isDraft ? 'Cobrança inicial' : config.label}
            </div>
          )}

          {canConfirmMonthlyPayment ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfirmMonthlyPayment(loan);
              }}
              disabled={isConfirmMonthlyPaymentPending}
              className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 shadow-sm transition-all hover:scale-[1.02] hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              title="Confirmar pagamento integral do mês"
            >
              <Wallet className="h-3.5 w-3.5" />
              {isConfirmMonthlyPaymentPending ? 'Confirmando...' : 'Confirmar Mês'}
            </button>
          ) : null}

          {isMonthlyPaymentSettled ? (
            <div
              className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 shadow-sm"
              title="Pagamento do mês já confirmado"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pago
            </div>
          ) : null}
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
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(loan.id);
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div
        className="p-4 md:p-6 cursor-pointer flex-1"
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
          <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Capital Emprest.</p>
            <p className="text-base font-black text-slate-900 dark:text-slate-100">{formatCurrency(loan.valor)}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Juros Mensal</p>
            <p className="text-base font-black text-gold-600 dark:text-gold-500">{loan.jurosMes}%</p>
          </div>
        </div>

        {installmentProgress ? (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Parcelamento</p>
            <p className="mt-1 text-sm font-black text-blue-900">
              Parcela {installmentProgress.current}/{installmentProgress.total}
            </p>
          </div>
        ) : null}
      </div>

      {/* Card Footer */}
      <div className="px-4 md:px-6 py-3 md:py-4 bg-slate-50 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-white/10">
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
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
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
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md active:scale-95"
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
