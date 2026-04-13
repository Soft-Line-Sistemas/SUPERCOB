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
      negotiation: { count: number; amount: number };
      paid: { count: number; amount: number };
      totalClients: number;
      taxaRecuperacao: string;
      jurosEsperados: number;
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
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Executivo</h1>
          <p className="text-slate-500">Bem-vindo ao centro de comando do SUPERCOB.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setPeriod('hoje')
              startTransition(async () => {
                const next = await getDashboardData('hoje')
                setCurrentData(next)
              })
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${period === 'hoje' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-950'} ${isPending ? 'opacity-60' : ''}`}
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
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${period === 'semana' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-950'} ${isPending ? 'opacity-60' : ''}`}
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
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${period === 'mes' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-950'} ${isPending ? 'opacity-60' : ''}`}
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
            color="blue"
          />
        </motion.div>
        <motion.div variants={item}>
          <ModernMetricCard
            title="Capital em Risco"
            value={formatCurrency(metrics.open.amount)}
            trend="-2.4%"
            trendUp={false}
            icon={AlertCircle}
            color="red"
          />
        </motion.div>
        <motion.div variants={item}>
          <ModernMetricCard
            title="Juros Projetados"
            value={formatCurrency(metrics.jurosEsperados)}
            trend="+5.2%"
            trendUp={true}
            icon={Coins}
            color="emerald"
          />
        </motion.div>
        <motion.div variants={item}>
          <ModernMetricCard
            title="Taxa de Conversão"
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
        <motion.div variants={item} className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Evolução de Cobranças</h3>
              <p className="text-sm text-slate-500">Volume recuperado nos últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-100">
              <Calendar className="w-4 h-4" />
              Últimos 6 meses
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value as number), 'Recuperado']}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Status da Carteira</h3>
          <p className="text-sm text-slate-500 mb-8">Distribuição total de ativos</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-sm font-medium text-slate-600">{status.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{status.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Agents Ranking (Admin only) */}
      {agentData && agentData.length > 0 && (
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Performance por Agente</h3>
            <button className="text-sm font-medium text-blue-600 hover:underline">Ver ranking completo</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agentData.map((agent, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{agent.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(agent.value / Math.max(...agentData.map(a => a.value))) * 100}%` }} 
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{agent.value}</span>
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
    blue: 'bg-blue-500 text-blue-500 border-blue-100',
    red: 'bg-red-500 text-red-500 border-red-100',
    emerald: 'bg-emerald-500 text-emerald-500 border-emerald-100',
    indigo: 'bg-indigo-500 text-indigo-500 border-indigo-100',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-2xl bg-opacity-10 ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]}`}>
          <Icon className="w-6 h-6  text-white" />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
      </div>
    </div>
  );
}
