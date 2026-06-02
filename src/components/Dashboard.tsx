'use client';

import React, { useState, useTransition } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertCircle, Percent, Coins, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDashboardData } from '@/app/(dashboard)/dashboard/actions';

interface DashboardProps {
  data: {
    metrics: {
      open: { count: number; amount: number };
      paid: { count: number; amount: number };
      rentabilidade: number;
      totalClients: number;
      taxaRecuperacao: string;
    };
    statusDistribution: { name: string; value: number; color: string }[];
    agentData: { name: string; value: number; color: string }[];
    evolutionData: { name: string; valor: number }[];
  };
}

export function Dashboard({ data }: DashboardProps) {
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje')
  const [currentData, setCurrentData] = useState(data)
  const [isPending, startTransition] = useTransition()

  const { metrics, statusDistribution, agentData, evolutionData } = currentData;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
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
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Executivo</h1>
          <p className="text-slate-500 dark:text-slate-400">Bem-vindo ao centro de comando do Mr Cobrança.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <button
            type="button"
            disabled={isPending}
            className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${period === 'hoje' ? 'text-white bg-gold-600 shadow-lg shadow-gold-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'} ${isPending ? 'opacity-60' : ''}`}
          >
            Hoje
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setPeriod('semana')
              startTransition(async () => {
                const next = await getDashboardData('semana')
                setCurrentData(next)
              })
            }}
            className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${period === 'semana' ? 'text-white bg-gold-600 shadow-lg shadow-gold-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'} ${isPending ? 'opacity-60' : ''}`}
          >
            Semana
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setPeriod('mes')
              startTransition(async () => {
                const next = await getDashboardData('mes')
                setCurrentData(next)
              })
            }}
            className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${period === 'mes' ? 'text-white bg-gold-600 shadow-lg shadow-gold-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'} ${isPending ? 'opacity-60' : ''}`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item}>
          <ModernMetricCard
            title="Total Recuperado"
            value={formatCurrency(metrics.paid.amount)}
            trend="+12.5%"
            trendUp={true}
            icon={TrendingUp}
            color="emerald"
          />
        </motion.div>
        <motion.div variants={item}>
          <ModernMetricCard
            title="Principal Ativo"
            value={formatCurrency(metrics.open.amount)}
            trend="-2.4%"
            trendUp={false}
            icon={AlertCircle}
            color="gold"
          />
        </motion.div>
        <motion.div variants={item}>
          <ModernMetricCard
            title="Rentabilidade"
            value={formatCurrency(metrics.rentabilidade)}
            trend="+5.2%"
            trendUp={true}
            icon={Coins}
            color="amber"
          />
        </motion.div>
        <motion.div variants={item}>
          <ModernMetricCard
            title="Eficiência Global"
            value={`${metrics.taxaRecuperacao}%`}
            trend="+1.8%"
            trendUp={true}
            icon={Percent}
            color="indigo"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Evolution Chart */}
        <motion.div variants={item} className="min-w-0 lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Evolução de Cobranças</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Volume recuperado nos últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-950 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/10">
              <Calendar className="w-4 h-4 text-gold-500" />
              Últimos 6 meses
            </div>
          </div>
          <div className="h-80 min-w-0 w-full">
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
                  className="text-slate-400 dark:text-slate-500 uppercase tracking-widest"
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
                  className="text-slate-400 dark:text-slate-500"
                  tickFormatter={(value) => `R$ ${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value as number), 'Recuperado']}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#D4AF37" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div variants={item} className="min-w-0 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Status da Carteira</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Distribuição total de ativos</p>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {statusDistribution.map((status, i) => (
              <div key={i} className="flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: status.color }} />
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">{status.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{status.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Agents Ranking (Admin only) */}
      {agentData && agentData.length > 0 && (
        <motion.div variants={item} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Performance por Agente</h3>
            <button className="text-sm font-medium text-gold-600 hover:underline">Ver ranking completo</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agentData.map((agent, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-950 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-white shadow-sm">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{agent.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gold-500 rounded-full" 
                        style={{ width: `${(agent.value / Math.max(...agentData.map(a => a.value))) * 100}%` }} 
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{agent.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ModernMetricCard({ title, value, trend, trendUp, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-600/10 text-blue-600 border-blue-200 dark:border-blue-500/20',
    red: 'bg-red-600/10 text-red-600 border-red-200 dark:border-red-500/20',
    emerald: 'bg-emerald-600/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20',
    indigo: 'bg-indigo-600/10 text-indigo-600 border-indigo-200 dark:border-indigo-500/20',
    gold: 'bg-gold-600/10 text-gold-600 border-gold-200 dark:border-gold-500/20',
    amber: 'bg-amber-600/10 text-amber-600 border-amber-200 dark:border-amber-500/20',
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-2xl border transition-colors ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${trendUp ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
          {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</p>
        <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 group-hover:scale-105 transition-transform origin-left">{value}</h4>
      </div>
    </div>
  );
}
