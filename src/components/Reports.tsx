'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { Wallet, PiggyBank, TrendingUp, CalendarDays, AlertTriangle, MapPin, Download, FileText, Share2, Filter, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// --- MOCK DATA ---
const interestByMonth = [
  { month: 'Jan', juros: 12500 },
  { month: 'Fev', juros: 14200 },
  { month: 'Mar', juros: 15800 },
  { month: 'Abr', juros: 16100 },
  { month: 'Mai', juros: 18500 },
  { month: 'Jun', juros: 21000 },
];

const volumeByLocation = [
  { city: 'Salvador, BA', volume: 450000 },
  { city: 'São Paulo, SP', volume: 280000 },
  { city: 'Rio de Janeiro, RJ', volume: 150000 },
  { city: 'Belo Horizonte, MG', volume: 95000 },
];

const abcCurveData = [
  { rank: 1, client: 'Empresa Alpha Ltda', city: 'Salvador/BA', volume: 150000, class: 'A', acc: '25%' },
  { rank: 2, client: 'Roberto Almeida', city: 'Salvador/BA', volume: 120000, class: 'A', acc: '45%' },
  { rank: 3, client: 'Tech Solutions', city: 'São Paulo/SP', volume: 90000, class: 'A', acc: '60%' },
  { rank: 4, client: 'Ana Beatriz', city: 'Salvador/BA', volume: 60000, class: 'B', acc: '70%' },
  { rank: 5, client: 'João Silva', city: 'São Paulo/SP', volume: 40000, class: 'B', acc: '76%' },
  { rank: 6, client: 'Maria Oliveira', city: 'Rio de Janeiro/RJ', volume: 15000, class: 'C', acc: '79%' },
];

const defaultersData = [
  { id: 'EMP-089', client: 'Carlos Santos', city: 'Belo Horizonte/MG', daysLate: 45, amount: 10000 },
  { id: 'EMP-102', client: 'Pedro Henrique', city: 'Salvador/BA', daysLate: 15, amount: 5400 },
  { id: 'EMP-045', client: 'Comercial Souza', city: 'São Paulo/SP', daysLate: 60, amount: 25000 },
];

export function Reports() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleExportPDF = () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 2000));
    toast.promise(promise, {
      loading: 'Gerando relatório PDF detalhado...',
      success: 'Relatório exportado com sucesso! O download começará em instantes.',
      error: 'Erro ao gerar PDF.',
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header with Export Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios Avançados</h1>
          <p className="text-slate-500">Análise profunda de métricas e performance de crédito.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item}>
          <ReportMetricCard
            title="Principal Ativo"
            value="R$ 975.000"
            subtitle="Capital em circulação"
            icon={Wallet}
            color="blue"
          />
        </motion.div>
        <motion.div variants={item}>
          <ReportMetricCard
            title="Total Projetado"
            value="R$ 1.245.000"
            subtitle="Principal + Juros"
            icon={PiggyBank}
            color="emerald"
          />
        </motion.div>
        <motion.div variants={item}>
          <ReportMetricCard
            title="Rentabilidade Mês"
            value="R$ 21.000"
            subtitle="Juros em Junho/26"
            icon={TrendingUp}
            color="indigo"
          />
        </motion.div>
        <motion.div variants={item}>
          <ReportMetricCard
            title="Rentabilidade Ano"
            value="R$ 98.100"
            subtitle="Acumulado 2026"
            icon={CalendarDays}
            color="purple"
          />
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interest Evolution Chart */}
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Evolução de Juros (Mensal)</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interestByMonth}>
                <defs>
                  <linearGradient id="colorJuros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value as number), 'Juros']}
                />
                <Area type="monotone" dataKey="juros" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorJuros)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Volume by Location Chart */}
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Distribuição por Localidade</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              Liderança: Salvador
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByLocation} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `${value / 1000}k`} />
                <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value as number), 'Volume']}
                />
                <Bar dataKey="volume" radius={[0, 8, 8, 0]}>
                  {volumeByLocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.city.includes('Salvador') ? '#3B82F6' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Detailed Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ABC Curve Table */}
        <motion.div variants={item} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Curva ABC de Clientes</h3>
              <p className="text-sm text-slate-500">Concentração de risco por tomador</p>
            </div>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume</th>
                  <th className="px-8 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {abcCurveData.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="text-sm font-bold text-slate-900">{item.client}</div>
                      <div className="text-[10px] font-medium text-slate-400">{item.city}</div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="text-sm font-black text-slate-900">{formatCurrency(item.volume)}</div>
                      <div className="text-[10px] font-bold text-blue-500">Acumulado: {item.acc}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${
                        item.class === 'A' ? 'bg-emerald-100 text-emerald-700' :
                        item.class === 'B' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.class}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Defaulters Report Table */}
        <motion.div variants={item} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-red-50/30">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Relatório de Inadimplência
              </h3>
              <p className="text-sm text-slate-500">Contratos com atraso superior a 5 dias</p>
            </div>
            <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
              {defaultersData.length} ALERTAS
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrato</th>
                  <th className="px-8 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atraso</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dívida Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {defaultersData.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-8 py-4">
                      <div className="text-sm font-bold text-slate-900">{item.client}</div>
                      <div className="text-[10px] font-medium text-slate-400">{item.id} • {item.city}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black bg-red-100 text-red-700 border border-red-200/50">
                        {item.daysLate} dias
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="text-sm font-black text-red-600">{formatCurrency(item.amount)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 mt-auto text-center border-t border-slate-100">
            <button className="text-xs font-bold text-blue-600 hover:underline">Ver todos os inadimplentes</button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ReportMetricCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500 text-blue-600',
    emerald: 'bg-emerald-500 text-emerald-600',
    indigo: 'bg-indigo-500 text-indigo-600',
    purple: 'bg-purple-500 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-opacity-10 ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        <p className="text-xs font-medium text-slate-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// Re-using MoreVertical from lucide-react which was missing in the destructuring
import { MoreVertical as MoreVerticalIcon } from 'lucide-react';
