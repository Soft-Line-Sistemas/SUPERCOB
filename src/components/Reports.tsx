'use client';

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { Wallet, PiggyBank, TrendingUp, CalendarDays, AlertTriangle, MapPin, Download, FileText, Share2, Filter, MoreVertical, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type ReportsFilters = {
  startDate: string
  endDate: string
  status: string
  cidade: string
  estado: string
  usuarioId?: string
}

type ReportsData = {
  kpis: {
    principalAtivo: number
    totalProjetado: number
    jurosMes: number
    jurosAno: number
  }
  interestByMonth: { month: string; juros: number }[]
  volumeByLocation: { city: string; volume: number }[]
  abcCurveData: { rank: number; client: string; city: string; volume: number; class: 'A' | 'B' | 'C'; acc: string }[]
  defaultersData: { id: string; client: string; city: string; daysLate: number; amount: number }[]
}

export function Reports({
  report,
  filters,
  colaboradores,
}: {
  report: ReportsData
  filters: ReportsFilters
  colaboradores: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<ReportsFilters>(filters)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const leaderCity = useMemo(() => report.volumeByLocation[0]?.city, [report.volumeByLocation])

  const handleExportPDF = async () => {
    try {
      toast.loading('Gerando relatório PDF...', { id: 'pdf' })
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'reports',
          filters,
          report,
        }),
      })

      if (!res.ok) throw new Error('Erro ao gerar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-supercob-${filters.startDate}_a_${filters.endDate}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Relatório exportado com sucesso!', { id: 'pdf' })
    } catch (e) {
      toast.error('Erro ao gerar PDF.', { id: 'pdf' })
    }
  }

  const applyFilters = () => {
    const sp = new URLSearchParams()
    if (draftFilters.startDate) sp.set('startDate', draftFilters.startDate)
    if (draftFilters.endDate) sp.set('endDate', draftFilters.endDate)
    if (draftFilters.status) sp.set('status', draftFilters.status)
    if (draftFilters.cidade) sp.set('cidade', draftFilters.cidade)
    if (draftFilters.estado) sp.set('estado', draftFilters.estado)
    if (draftFilters.usuarioId) sp.set('usuarioId', draftFilters.usuarioId)
    router.push(`/reports?${sp.toString()}`)
    setIsFiltersOpen(false)
  }

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
          <p className="text-slate-500">Análise profunda de métricas e performance de cobrança.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDraftFilters(filters)
              setIsFiltersOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
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
            value={formatCurrency(report.kpis.principalAtivo)}
            subtitle={`Período: ${filters.startDate} até ${filters.endDate}`}
            icon={Wallet}
            color="blue"
          />
        </motion.div>
        <motion.div variants={item}>
          <ReportMetricCard
            title="Total Projetado"
            value={formatCurrency(report.kpis.totalProjetado)}
            subtitle="Principal + juros estimados"
            icon={PiggyBank}
            color="emerald"
          />
        </motion.div>
        <motion.div variants={item}>
          <ReportMetricCard
            title="Rentabilidade Mês"
            value={formatCurrency(report.kpis.jurosMes)}
            subtitle="Juros estimados no mês"
            icon={TrendingUp}
            color="indigo"
          />
        </motion.div>
        <motion.div variants={item}>
          <ReportMetricCard
            title="Rentabilidade Ano"
            value={formatCurrency(report.kpis.jurosAno)}
            subtitle="Juros estimados no ano"
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
              <AreaChart data={report.interestByMonth}>
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
              Liderança: {leaderCity || '-'}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.volumeByLocation} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `${value / 1000}k`} />
                <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} width={100} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value as number), 'Volume']}
                />
                <Bar dataKey="volume" radius={[0, 8, 8, 0]}>
                  {report.volumeByLocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#cbd5e1'} />
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
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
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
                {report.abcCurveData.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-700 transition-colors">
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
              {report.defaultersData.length} ALERTAS
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
                {report.defaultersData.map((item) => (
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
                    <p className="text-slate-500 text-sm">Selecione período e critérios.</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Início</label>
                      <input
                        type="date"
                        value={draftFilters.startDate}
                        onChange={(e) => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Fim</label>
                      <input
                        type="date"
                        value={draftFilters.endDate}
                        onChange={(e) => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Status</label>
                    <select
                      value={draftFilters.status}
                      onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                    >
                      <option value="">Todos</option>
                      <option value="ABERTO">Aberto</option>
                      <option value="NEGOCIACAO">Negociação</option>
                      <option value="QUITADO">Quitado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Consultor</label>
                    <select
                      value={draftFilters.usuarioId ?? ''}
                      onChange={(e) => setDraftFilters({ ...draftFilters, usuarioId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
                    >
                      <option value="">Todos</option>
                      <option value="__UNASSIGNED__">Sem atribuição</option>
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Cidade</label>
                      <input
                        type="text"
                        value={draftFilters.cidade}
                        onChange={(e) => setDraftFilters({ ...draftFilters, cidade: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Estado</label>
                      <input
                        type="text"
                        value={draftFilters.estado}
                        onChange={(e) => setDraftFilters({ ...draftFilters, estado: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                        placeholder="UF"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDraftFilters({ startDate: '', endDate: '', status: '', cidade: '', estado: '', usuarioId: '' })}
                    className="flex-1 py-3.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="flex-[2] py-3.5 px-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
