'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { Wallet, PiggyBank, TrendingUp, CalendarDays, AlertTriangle, MapPin, Download, FileText, Share2, Filter, MoreVertical, X, Eye, EyeOff, BarChart3, LayoutGrid, CalendarClock, ChevronRight } from 'lucide-react';
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
  upcomingDays: number
  dueMode: 'CURRENT_MONTH' | 'NEXT_DUE' | 'UPCOMING'
  includeInadimplentes: boolean
  includePaid: boolean
}

type ExportFilters = ReportsFilters & {
  dueDayStart?: number
  dueDayEnd?: number
  includeCurrent?: boolean
  includeWhatsapp?: boolean
  markPaid?: boolean
  markCurrent?: boolean
  strikePaid?: boolean
  strikeCurrent?: boolean
  onlyInadimplentes?: boolean
  onlyAgreement?: boolean
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
  volumeByLocationFull?: { city: string; volume: number }[]
  abcCurveData: { rank: number; client: string; city: string; volume: number; class: 'A' | 'B' | 'C'; acc: string }[]
  abcCurveDataFull?: { rank: number; client: string; city: string; volume: number; class: 'A' | 'B' | 'C'; acc: string }[]
  defaultersData: { id: string; client: string; city: string; daysLate: number; amount: number }[]
  defaultersDataFull?: { id: string; client: string; city: string; daysLate: number; amount: number }[]
  dailyInterestData: { date: string; client: string; loanId: string; amount: number; isPaid: boolean }[]
  dueDayData?: { day: number; entries: { client: string; jurosAtual: number; isAcordo: boolean; parcelaAtual: number; parcelaTotal: number; valorParcela: number }[] }[]
}

type ReportSection = 'full' | 'kpis' | 'defaulters' | 'abc' | 'geo' | 'daily' | 'dueDay'
type AccessLevel = 'admin' | 'office' | 'manager'

const OFFICE_SECTIONS: ReportSection[] = ['defaulters', 'daily', 'dueDay']

const REPORT_TYPES: { section: ReportSection; title: string; description: string; icon: any; color: string }[] = [
  { section: 'kpis', title: 'Indicadores (KPIs)', description: 'Principal ativo, projeção e rentabilidade', icon: TrendingUp, color: 'indigo' },
  { section: 'defaulters', title: 'Atrasados', description: 'Contratos em atraso, lista completa', icon: AlertTriangle, color: 'red' },
  { section: 'abc', title: 'Curva ABC', description: 'Concentração de carteira por cliente', icon: LayoutGrid, color: 'blue' },
  { section: 'geo', title: 'Localidade', description: 'Distribuição geográfica da carteira', icon: MapPin, color: 'purple' },
  { section: 'daily', title: 'A vencer', description: 'Juros com vencimento próximo', icon: CalendarDays, color: 'emerald' },
  { section: 'full', title: 'Relatório Completo', description: 'Todas as seções em um único PDF', icon: BarChart3, color: 'slate' },
]

export function Reports({
  report,
  filters,
  colaboradores,
  accessLevel = 'admin',
}: {
  report: ReportsData
  filters: ReportsFilters
  colaboradores: { id: string; nome: string }[]
  accessLevel?: AccessLevel
}) {
  const router = useRouter()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isDueDayRangeOpen, setIsDueDayRangeOpen] = useState(false)
  const [isDueDayPreviewVisible, setIsDueDayPreviewVisible] = useState(false)
  const [exportingSection, setExportingSection] = useState<ReportSection | null>(null)
  const [dueDayStart, setDueDayStart] = useState(1)
  const [dueDayEnd, setDueDayEnd] = useState(31)
  const [dueDayUpcomingDays, setDueDayUpcomingDays] = useState(30)
  const [dueDayMode, setDueDayMode] = useState<ReportsFilters['dueMode']>('CURRENT_MONTH')
  const [dueDayIncludeInadimplentes, setDueDayIncludeInadimplentes] = useState(true)
  const [dueDayIncludePaid, setDueDayIncludePaid] = useState(false)
  const [dueDayIncludeCurrent, setDueDayIncludeCurrent] = useState(true)
  const [dueDayIncludeWhatsapp, setDueDayIncludeWhatsapp] = useState(false)
  const [dueDayMarkPaid, setDueDayMarkPaid] = useState(false)
  const [dueDayMarkCurrent, setDueDayMarkCurrent] = useState(true)
  const [dueDayStrikePaid, setDueDayStrikePaid] = useState(false)
  const [dueDayStrikeCurrent, setDueDayStrikeCurrent] = useState(false)
  const [dueDayOnlyInadimplentes, setDueDayOnlyInadimplentes] = useState(false)
  const [dueDayOnlyAgreement, setDueDayOnlyAgreement] = useState(false)
  const [isDueDayPreferencesLoaded, setIsDueDayPreferencesLoaded] = useState(false)
  const [dueDayPreviewUrl, setDueDayPreviewUrl] = useState<string | null>(null)
  const [isDueDayPreviewLoading, setIsDueDayPreviewLoading] = useState(false)
  const [dueDayPreviewError, setDueDayPreviewError] = useState(false)
  const [draftFilters, setDraftFilters] = useState<ReportsFilters>(filters)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const paginatedDailyInterest = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return report.dailyInterestData.slice(start, start + itemsPerPage)
  }, [report.dailyInterestData, currentPage])

  const totalPages = Math.ceil(report.dailyInterestData.length / itemsPerPage)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reports-due-day-preferences-v6')
      if (!saved) return
      const preferences = JSON.parse(saved)
      if (Number.isInteger(preferences.dayStart) && preferences.dayStart >= 1 && preferences.dayStart <= 31) setDueDayStart(preferences.dayStart)
      if (Number.isInteger(preferences.dayEnd) && preferences.dayEnd >= 1 && preferences.dayEnd <= 31) setDueDayEnd(preferences.dayEnd)
      if (Number.isInteger(preferences.upcomingDays) && preferences.upcomingDays >= 1 && preferences.upcomingDays <= 3650) setDueDayUpcomingDays(preferences.upcomingDays)
      if (preferences.dueMode === 'CURRENT_MONTH' || preferences.dueMode === 'NEXT_DUE' || preferences.dueMode === 'UPCOMING') setDueDayMode(preferences.dueMode)
      if (typeof preferences.includeInadimplentes === 'boolean') setDueDayIncludeInadimplentes(preferences.includeInadimplentes)
      if (typeof preferences.includePaid === 'boolean') setDueDayIncludePaid(preferences.includePaid)
      if (typeof preferences.includeCurrent === 'boolean') setDueDayIncludeCurrent(preferences.includeCurrent)
      if (typeof preferences.includeWhatsapp === 'boolean') setDueDayIncludeWhatsapp(preferences.includeWhatsapp)
      if (typeof preferences.markPaid === 'boolean') setDueDayMarkPaid(preferences.markPaid)
      if (typeof preferences.markCurrent === 'boolean') setDueDayMarkCurrent(preferences.markCurrent)
      if (typeof preferences.strikePaid === 'boolean') setDueDayStrikePaid(preferences.strikePaid)
      if (typeof preferences.strikeCurrent === 'boolean') setDueDayStrikeCurrent(preferences.strikeCurrent)
      if (typeof preferences.onlyInadimplentes === 'boolean') setDueDayOnlyInadimplentes(preferences.onlyInadimplentes)
      if (typeof preferences.onlyAgreement === 'boolean') setDueDayOnlyAgreement(preferences.onlyAgreement)
    } catch {
      // Preferências inválidas não impedem o uso do relatório.
    } finally {
      setIsDueDayPreferencesLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isDueDayPreferencesLoaded) return
    localStorage.setItem('reports-due-day-preferences-v6', JSON.stringify({
      dayStart: dueDayStart,
      dayEnd: dueDayEnd,
      upcomingDays: dueDayUpcomingDays,
      dueMode: dueDayMode,
      includeInadimplentes: dueDayIncludeInadimplentes,
      includePaid: dueDayIncludePaid,
      includeCurrent: dueDayIncludeCurrent,
      includeWhatsapp: dueDayIncludeWhatsapp,
      markPaid: dueDayMarkPaid,
      markCurrent: dueDayMarkCurrent,
      strikePaid: dueDayStrikePaid,
      strikeCurrent: dueDayStrikeCurrent,
      onlyInadimplentes: dueDayOnlyInadimplentes,
      onlyAgreement: dueDayOnlyAgreement,
    }))
  }, [dueDayStart, dueDayEnd, dueDayUpcomingDays, dueDayMode, dueDayIncludeInadimplentes, dueDayIncludePaid, dueDayIncludeCurrent, dueDayIncludeWhatsapp, dueDayMarkPaid, dueDayMarkCurrent, dueDayStrikePaid, dueDayStrikeCurrent, dueDayOnlyInadimplentes, dueDayOnlyAgreement, isDueDayPreferencesLoaded])

  useEffect(() => {
    if (!isDueDayRangeOpen || !isDueDayPreviewVisible) {
      setDueDayPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url)
        return null
      })
      if (!isDueDayRangeOpen) setIsDueDayPreviewVisible(false)
      return
    }

    if (!Number.isInteger(dueDayStart) || !Number.isInteger(dueDayEnd) || dueDayStart < 1 || dueDayEnd > 31 || dueDayStart > dueDayEnd) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsDueDayPreviewLoading(true)
      setDueDayPreviewError(false)
      try {
        const res = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            kind: 'reports',
            section: 'dueDay',
            filters: {
              ...filters,
              upcomingDays: dueDayUpcomingDays,
              dueMode: dueDayMode,
              includeInadimplentes: dueDayIncludeInadimplentes,
              includePaid: dueDayIncludePaid,
              includeCurrent: dueDayIncludeCurrent,
              includeWhatsapp: dueDayIncludeWhatsapp,
              markPaid: false,
              markCurrent: dueDayMarkCurrent,
              strikePaid: false,
              strikeCurrent: dueDayStrikeCurrent,
              onlyInadimplentes: dueDayOnlyInadimplentes,
              onlyAgreement: dueDayOnlyAgreement,
              dueDayStart,
              dueDayEnd,
            },
            report,
          }),
        })
        if (!res.ok) throw new Error('Não foi possível gerar a prévia')
        const nextUrl = URL.createObjectURL(await res.blob())
        setDueDayPreviewUrl((url) => {
          if (url) URL.revokeObjectURL(url)
          return nextUrl
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setDueDayPreviewError(true)
      } finally {
        if (!controller.signal.aborted) setIsDueDayPreviewLoading(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [isDueDayRangeOpen, isDueDayPreviewVisible, dueDayStart, dueDayEnd, dueDayUpcomingDays, dueDayMode, dueDayIncludeInadimplentes, dueDayIncludePaid, dueDayIncludeCurrent, dueDayIncludeWhatsapp, dueDayMarkPaid, dueDayMarkCurrent, dueDayStrikePaid, dueDayStrikeCurrent, dueDayOnlyInadimplentes, dueDayOnlyAgreement, filters, report])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const leaderCity = useMemo(() => report.volumeByLocation[0]?.city, [report.volumeByLocation])
  const isOffice = accessLevel === 'office'
  const isManager = accessLevel === 'manager'
  const exportableReports = isOffice
    ? REPORT_TYPES.filter((reportType) => OFFICE_SECTIONS.includes(reportType.section))
    : REPORT_TYPES

  const handleExportSection = async (section: ReportSection, exportFilters: ExportFilters = filters) => {
    const toastId = `pdf-${section}`
    try {
      setExportingSection(section)
      toast.loading('Gerando relatório PDF...', { id: toastId })
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'reports',
          section,
          filters: exportFilters,
          report,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Erro ao gerar PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sectionTitle = section === 'dueDay' ? 'Dia de Vencimento' : REPORT_TYPES.find((t) => t.section === section)?.title
      const sectionSlug = (sectionTitle ?? section).toLowerCase().replace(/\s+/g, '-')
      a.download = section === 'dueDay'
        ? `relatorio-${sectionSlug}-${new Date().toISOString().split('T')[0]}.pdf`
        : `relatorio-${sectionSlug}-${filters.startDate}_a_${filters.endDate}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Relatório exportado com sucesso!', { id: toastId })
      setIsExportOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar PDF.', { id: toastId })
    } finally {
      setExportingSection(null)
    }
  }

  const handleDueDayRangeExport = () => {
    if (!Number.isInteger(dueDayStart) || !Number.isInteger(dueDayEnd) || dueDayStart < 1 || dueDayEnd > 31 || dueDayStart > dueDayEnd) {
      toast.error('Informe um intervalo válido entre os dias 1 e 31.')
      return
    }
    if (!Number.isInteger(dueDayUpcomingDays) || dueDayUpcomingDays < 1 || dueDayUpcomingDays > 3650) {
      toast.error('Informe uma quantidade de dias entre 1 e 3650.')
      return
    }
    handleExportSection('dueDay', {
      ...filters,
      upcomingDays: dueDayUpcomingDays,
      dueMode: dueDayMode,
      includeInadimplentes: dueDayIncludeInadimplentes,
      includePaid: dueDayIncludePaid,
      includeCurrent: dueDayIncludeCurrent,
      includeWhatsapp: dueDayIncludeWhatsapp,
      markPaid: false,
      markCurrent: dueDayMarkCurrent,
      strikePaid: false,
      strikeCurrent: dueDayStrikeCurrent,
      onlyInadimplentes: dueDayOnlyInadimplentes,
      onlyAgreement: dueDayOnlyAgreement,
      dueDayStart,
      dueDayEnd,
    })
  }

  const handleExportDailyPDF = async () => {
    try {
      toast.loading('Gerando resumo diário...', { id: 'daily-pdf' })
      const res = await fetch('/api/export/pdf-diario')

      if (!res.ok) throw new Error('Erro ao gerar resumo')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Resumo_Diario_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Resumo diário pronto para compartilhar!', { id: 'daily-pdf' })
    } catch (e) {
      toast.error('Erro ao gerar resumo diário.', { id: 'daily-pdf' })
    }
  }

  const applyFilters = () => {
    const sp = new URLSearchParams()
    if (draftFilters.startDate) sp.set('startDate', draftFilters.startDate)
    if (draftFilters.endDate) sp.set('endDate', draftFilters.endDate)
    if (draftFilters.status) sp.set('status', draftFilters.status)
    if (draftFilters.cidade) sp.set('cidade', draftFilters.cidade)
    if (draftFilters.estado) sp.set('estado', draftFilters.estado)
    if (!isManager && draftFilters.usuarioId) sp.set('usuarioId', draftFilters.usuarioId)
    sp.set('upcomingDays', String(draftFilters.upcomingDays))
    sp.set('dueMode', draftFilters.dueMode)
    sp.set('includeInadimplentes', String(draftFilters.includeInadimplentes))
    sp.set('includePaid', String(draftFilters.includePaid))
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isOffice ? 'Relatórios Operacionais' : isManager ? 'Relatórios da Minha Carteira' : 'Relatórios Avançados'}</h1>
          <p className="text-slate-500 dark:text-slate-400">{isOffice ? 'Agenda de cobrança, vencimentos e contratos em atraso.' : isManager ? 'Análise dos contratos atribuídos a você.' : 'Análise profunda de métricas e performance de cobrança.'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDraftFilters(filters)
              setIsFiltersOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-950 transition-all shadow-sm"
          >
            <Filter className="w-4 h-4 text-gold-500" />
            Filtros
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-gold-600 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-gold-700 shadow-lg shadow-slate-900/20 dark:shadow-gold-600/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          {!isOffice && !isManager && <button
            onClick={handleExportDailyPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <CalendarDays className="w-4 h-4" />
            Relatório Diário
          </button>}
          {!isOffice && <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm">
            <Share2 className="w-5 h-5" />
          </button>}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {!isOffice && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </div>}

      {/* Daily Interest Entries Table */}
      <motion.div variants={item} className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-indigo-50/30 dark:bg-white/5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gold-500" />
              Juros a Vencer
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filters.dueMode === 'CURRENT_MONTH'
                ? 'Vencimentos restantes deste mês.'
                : filters.dueMode === 'NEXT_DUE'
                  ? 'Próximo vencimento de cada contrato ativo.'
                  : `Vencimentos nos próximos ${filters.upcomingDays} dias.`}
            </p>
          </div>
          <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
            {report.dailyInterestData.length} Lançamentos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-indigo-50/50 dark:bg-indigo-950/50 backdrop-blur-xl border-b border-indigo-100/50 dark:border-indigo-900/50 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Data</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-4 text-right text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Valor Juros</th>
                <th className="px-8 py-4 text-center text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5 bg-white dark:bg-slate-950">
              {paginatedDailyInterest.length === 0 ? (
                <tr className="bg-white dark:bg-slate-950">
                  <td colSpan={4} className="px-8 py-10 text-center text-sm text-slate-400">
                    Nenhum vencimento de juros encontrado para este critério.
                  </td>
                </tr>
              ) : (
                paginatedDailyInterest.map((entry, idx) => (
                  <tr key={`${entry.loanId}-${entry.date}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors bg-white dark:bg-slate-950">
                    <td className="px-8 py-4">
                      <div className="text-sm font-black text-slate-700 dark:text-slate-300">{entry.date}</div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.client}</div>
                      <div className="text-[10px] font-medium text-slate-400">{entry.loanId}</div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(entry.amount)}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black ${entry.isPaid
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}>
                        {entry.isPaid ? 'Pago' : 'A Pagar'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-8 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Mostrando {Math.min(report.dailyInterestData.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(report.dailyInterestData.length, currentPage * itemsPerPage)} de {report.dailyInterestData.length} lançamentos
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Charts Row */}
      {!isOffice && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interest Evolution Chart */}
        <motion.div variants={item} className="min-w-0 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Evolução de Juros (Mensal)</h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <AreaChart data={report.interestByMonth}>
                <defs>
                  <linearGradient id="colorJuros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }} className="text-slate-400 dark:text-slate-500" dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
                  className="text-slate-400 dark:text-slate-500"
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
        <motion.div variants={item} className="min-w-0 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Distribuição por Localidade</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              Liderança: {leaderCity || '-'}
            </div>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <BarChart data={report.volumeByLocation} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }} className="text-slate-400 dark:text-slate-500" tickFormatter={(value) => `${value / 1000}k`} />
                <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }} className="text-slate-600 dark:text-slate-400" width={100} />
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
      </div>}



      {/* Detailed Tables Section */}
      <div className={`grid grid-cols-1 ${isOffice ? '' : 'lg:grid-cols-2'} gap-6`}>
        {/* ABC Curve Table */}
        {!isOffice && <motion.div variants={item} className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-950/30 dark:bg-white/5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Curva ABC de Clientes</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Concentração de risco por tomador</p>
            </div>
            <FileText className="w-5 h-5 text-gold-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-50/50 dark:bg-indigo-950/50 backdrop-blur-xl border-b border-indigo-100/50 dark:border-indigo-900/50">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Volume</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Classe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5 bg-white dark:bg-slate-950">
                {report.abcCurveData.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors bg-white dark:bg-slate-950">
                    <td className="px-8 py-4">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.client}</div>
                      <div className="text-[10px] font-medium text-slate-400">{item.city}</div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(item.volume)}</div>
                      <div className="text-[10px] font-bold text-gold-500">Acumulado: {item.acc}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${item.class === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          item.class === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                            'bg-slate-950 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                        }`}>
                        {item.class}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>}

        {/* Defaulters Report Table */}
        <motion.div variants={item} className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-red-50/30 dark:bg-red-500/5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Relatório de Atrasados
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Contratos com atraso superior a 5 dias</p>
            </div>
            <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
              {report.defaultersData.length} ALERTAS
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-50/50 dark:bg-indigo-950/50 backdrop-blur-xl border-b border-indigo-100/50 dark:border-indigo-900/50">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Contrato</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Atraso</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Dívida Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5 bg-white dark:bg-slate-950">
                {report.defaultersData.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 dark:hover:bg-red-500/10 transition-colors bg-white dark:bg-slate-950">
                    <td className="px-8 py-4">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.client}</div>
                      <div className="text-[10px] font-medium text-slate-400">{item.id} • {item.city}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black bg-red-100 text-red-700 border border-red-200/50 dark:bg-red-500/10 dark:text-red-400">
                        {item.daysLate} dias
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="text-sm font-black text-red-600 dark:text-red-400">{formatCurrency(item.amount)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-950 dark:bg-white/5 mt-auto text-center border-t border-slate-100 dark:border-white/10">
            <button className="text-xs font-bold text-gold-500 hover:underline">Ver todos os atrasados</button>
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
              className="relative bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-white/10"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Filtros</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Selecione período e critérios.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Início</label>
                      <input
                        type="date"
                        value={draftFilters.startDate}
                        onChange={(e) => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 outline-none transition-all dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Fim</label>
                      <input
                        type="date"
                        value={draftFilters.endDate}
                        onChange={(e) => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 outline-none transition-all dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Status</label>
                    <select
                      value={draftFilters.status}
                      onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-gold-500/5"
                    >
                      <option value="">Todos</option>
                      <option value="ABERTO">Aberto</option>
                      <option value="NEGOCIACAO">Negociação</option>
                      <option value="QUITADO">Quitado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>

                  {!isManager && <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Consultor</label>
                    <select
                      value={draftFilters.usuarioId ?? ''}
                      onChange={(e) => setDraftFilters({ ...draftFilters, usuarioId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-gold-500/5"
                    >
                      <option value="">Todos</option>
                      <option value="__UNASSIGNED__">Sem atribuição</option>
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Cidade</label>
                      <input
                        type="text"
                        value={draftFilters.cidade}
                        onChange={(e) => setDraftFilters({ ...draftFilters, cidade: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 outline-none transition-all dark:text-slate-200"
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Estado</label>
                      <input
                        type="text"
                        value={draftFilters.estado}
                        onChange={(e) => setDraftFilters({ ...draftFilters, estado: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 outline-none transition-all dark:text-slate-200"
                        placeholder="UF"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4 dark:border-gold-500/20 dark:bg-gold-500/5">
                    <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">Quais vencimentos devem aparecer?</p>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <input type="radio" name="upcoming-mode" checked={draftFilters.dueMode === 'CURRENT_MONTH'} onChange={() => setDraftFilters({ ...draftFilters, dueMode: 'CURRENT_MONTH' })} className="mt-0.5 h-4 w-4 border-slate-300 text-gold-600 focus:ring-gold-500" />
                      <span><span className="block font-bold">Mostrar somente os vencimentos deste mês</span><span className="block text-xs text-slate-500 dark:text-slate-400">Padrão: não exibe contratos cujo primeiro vencimento é no próximo mês.</span></span>
                    </label>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <input type="radio" name="upcoming-mode" checked={draftFilters.dueMode === 'NEXT_DUE'} onChange={() => setDraftFilters({ ...draftFilters, dueMode: 'NEXT_DUE' })} className="mt-0.5 h-4 w-4 border-slate-300 text-gold-600 focus:ring-gold-500" />
                      <span>
                        <span className="block font-bold">Mostrar somente o próximo vencimento de cada contrato</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Ex.: se um contrato vence dia 10 e outro dia 25, será exibido o próximo vencimento de cada um.</span>
                      </span>
                    </label>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <input type="radio" name="upcoming-mode" checked={draftFilters.dueMode === 'UPCOMING'} onChange={() => setDraftFilters({ ...draftFilters, dueMode: 'UPCOMING' })} className="mt-0.5 h-4 w-4 border-slate-300 text-gold-600 focus:ring-gold-500" />
                      <span className="font-bold">Mostrar os que estão a vencer nos próximos</span>
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <input id="upcoming-days" type="number" min="1" max="3650" value={draftFilters.upcomingDays} disabled={draftFilters.dueMode !== 'UPCOMING'} onChange={(e) => {
                        const value = Number(e.target.value)
                        setDraftFilters({ ...draftFilters, upcomingDays: Number.isFinite(value) ? value : 30 })
                      }} className="w-24 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none disabled:cursor-not-allowed disabled:opacity-50" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">dias</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDraftFilters({ startDate: '', endDate: '', status: '', cidade: '', estado: '', usuarioId: '', upcomingDays: 30, dueMode: 'CURRENT_MONTH', includeInadimplentes: false, includePaid: false })}
                    className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="flex-[2] py-3.5 px-4 bg-slate-900 dark:bg-gold-600 text-white font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-gold-700 shadow-lg shadow-slate-900/20 dark:shadow-gold-600/20 transition-all"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExportOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-white/10"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Exportar Relatório</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Escolha qual relatório deseja baixar em PDF, com todos os dados.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExportOpen(false)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {(!isOffice || OFFICE_SECTIONS.includes('dueDay')) && <button
                  type="button"
                  disabled={exportingSection !== null}
                  onClick={() => setIsDueDayRangeOpen(true)}
                  className="group w-full flex items-center gap-4 p-5 mb-4 text-left bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
                >
                  <div className="p-3 rounded-2xl bg-white/15 text-white shrink-0">
                    <CalendarClock className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white uppercase tracking-wide">Dia de Vencimento</p>
                    <p className="text-xs text-white/80 mt-0.5">Agenda de cobrança organizada por dia do mês, pronta para imprimir e marcar</p>
                  </div>
                  <div className="shrink-0">
                    {exportingSection === 'dueDay' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </button>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exportableReports.map((rt) => {
                    const Icon = rt.icon
                    const isLoading = exportingSection === rt.section
                    const colorMap: Record<string, string> = {
                      indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                      red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
                      blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
                      emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      slate: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300',
                    }
                    return (
                      <button
                        key={rt.section}
                        type="button"
                        disabled={exportingSection !== null}
                        onClick={() => handleExportSection(rt.section)}
                        className="group flex items-start gap-4 p-5 text-left bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-gold-500 hover:bg-white dark:hover:bg-white/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className={`p-3 rounded-2xl ${colorMap[rt.color]} shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{rt.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rt.description}</p>
                        </div>
                        <div className="ml-auto shrink-0 self-center">
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-gold-500 transition-colors" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDueDayRangeOpen && (
          <div className={`fixed inset-0 z-[60] flex items-center justify-center ${isDueDayPreviewVisible ? 'p-8 sm:p-10' : 'p-4'}`}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !exportingSection && setIsDueDayRangeOpen(false)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full overflow-y-auto rounded-[2rem] border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 ${isDueDayPreviewVisible ? 'h-[calc(100vh-4rem)] max-w-none p-6 sm:h-[calc(100vh-5rem)] sm:p-8' : 'max-h-[90vh] max-w-5xl p-8'}`}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Dia de Vencimento</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Defina quais vencimentos devem constar no PDF.</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsDueDayPreviewVisible((visible) => !visible)}
                    className={`rounded-full p-2 transition-colors ${isDueDayPreviewVisible ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    aria-label={isDueDayPreviewVisible ? 'Desativar preview do PDF' : 'Ativar preview do PDF'}
                    title={isDueDayPreviewVisible ? 'Desativar preview' : 'Ativar preview'}
                  >
                    {isDueDayPreviewVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  <button type="button" onClick={() => setIsDueDayRangeOpen(false)} disabled={exportingSection !== null} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/5" aria-label="Fechar">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className={isDueDayPreviewVisible ? 'grid gap-6 lg:grid-cols-[minmax(220px,20%)_minmax(0,1fr)] lg:items-start' : ''}>
                <div>
                  <div className={`grid grid-cols-2 gap-4 ${isDueDayPreviewVisible ? 'lg:grid-cols-1' : ''}`}>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Dia inicial
                      <input type="number" min="1" max="31" step="1" value={dueDayStart} onChange={(event) => setDueDayStart(Number(event.target.value))} disabled={exportingSection !== null} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-gold-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" />
                    </label>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Dia final
                      <input type="number" min="1" max="31" step="1" value={dueDayEnd} onChange={(event) => setDueDayEnd(Number(event.target.value))} disabled={exportingSection !== null} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-gold-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" />
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Intervalo inclusivo, de 1 a 31.</p>
                  <div className={`mt-5 grid grid-cols-2 gap-5 ${isDueDayPreviewVisible ? 'lg:grid-cols-1' : ''}`}>
              <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4 dark:border-gold-500/20 dark:bg-gold-500/5">
                <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Quais vencimentos devem aparecer?</p>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input type="radio" name="due-day-upcoming-mode" checked={dueDayMode === 'CURRENT_MONTH'} onChange={() => setDueDayMode('CURRENT_MONTH')} className="mt-0.5 h-4 w-4 border-slate-300 text-gold-600 focus:ring-gold-500" />
                  <span><span className="block font-bold">Mostrar somente os vencimentos deste mês</span><span className="block text-xs text-slate-500 dark:text-slate-400">Padrão: não inclui o primeiro vencimento do próximo mês.</span></span>
                </label>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input type="radio" name="due-day-upcoming-mode" checked={dueDayMode === 'NEXT_DUE'} onChange={() => setDueDayMode('NEXT_DUE')} className="mt-0.5 h-4 w-4 border-slate-300 text-gold-600 focus:ring-gold-500" />
                  <span><span className="block font-bold">Mostrar somente o próximo vencimento de cada contrato</span><span className="block text-xs text-slate-500 dark:text-slate-400">Ex.: se um contrato vence dia 10 e outro dia 25, será exibido o próximo vencimento de cada um.</span></span>
                </label>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input type="radio" name="due-day-upcoming-mode" checked={dueDayMode === 'UPCOMING'} onChange={() => setDueDayMode('UPCOMING')} className="mt-0.5 h-4 w-4 border-slate-300 text-gold-600 focus:ring-gold-500" />
                  <span className="font-bold">Mostrar os que estão a vencer nos próximos</span>
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input id="due-day-upcoming-days" type="number" min="1" max="3650" step="1" value={dueDayUpcomingDays} disabled={dueDayMode !== 'UPCOMING'} onChange={(event) => setDueDayUpcomingDays(Number(event.target.value))} className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-gold-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">dias</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Quero apenas:</p>
                <div className={`grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200 ${isDueDayPreviewVisible ? 'lg:grid-cols-1' : ''}`}>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={dueDayOnlyInadimplentes} onChange={(event) => { setDueDayOnlyInadimplentes(event.target.checked); if (event.target.checked) setDueDayIncludeInadimplentes(true) }} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Inadimplentes</label>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={dueDayOnlyAgreement} onChange={(event) => setDueDayOnlyAgreement(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Em acordo</label>
                </div>
                {dueDayOnlyInadimplentes && dueDayOnlyAgreement && <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">Serão exibidos somente os contratos inadimplentes que também estão em acordo.</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Marcação no PDF</p>
                <div className={`grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200 ${isDueDayPreviewVisible ? 'lg:grid-cols-1' : ''}`}>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={dueDayMarkCurrent} onChange={(event) => { setDueDayMarkCurrent(event.target.checked); if (event.target.checked) setDueDayIncludeCurrent(true) }} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Marcar ✔ pagos</label>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={dueDayStrikeCurrent} onChange={(event) => { setDueDayStrikeCurrent(event.target.checked); if (event.target.checked) setDueDayIncludeCurrent(true) }} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Riscar pagos</label>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={dueDayIncludeWhatsapp} onChange={(event) => setDueDayIncludeWhatsapp(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Adicionar WhatsApp</label>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Quero excluir:</p>
                <div className={`grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200 ${isDueDayPreviewVisible ? 'lg:grid-cols-1' : ''}`}>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={!dueDayIncludeCurrent} onChange={(event) => { setDueDayIncludeCurrent(!event.target.checked); if (event.target.checked) { setDueDayMarkCurrent(false); setDueDayStrikeCurrent(false) } }} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Pagos</label>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={!dueDayIncludePaid} onChange={(event) => setDueDayIncludePaid(!event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Quitados</label>
                  <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={!dueDayIncludeInadimplentes} onChange={(event) => { setDueDayIncludeInadimplentes(!event.target.checked); if (event.target.checked) setDueDayOnlyInadimplentes(false) }} className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500" />Inadimplentes</label>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Sem exclusões, todas as situações são incluídas no relatório.</p>
              </div>
              </div>
                  <button type="button" onClick={handleDueDayRangeExport} disabled={exportingSection !== null} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                    {exportingSection === 'dueDay' ? 'Gerando PDF...' : 'Baixar PDF'}
                  </button>
                </div>
                {isDueDayPreviewVisible && <DueDayPdfPreview
                    previewUrl={dueDayPreviewUrl}
                    isLoading={isDueDayPreviewLoading}
                    hasError={dueDayPreviewError}
                  />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type DueDayPdfPreviewProps = {
  previewUrl: string | null
  isLoading: boolean
  hasError: boolean
}

function DueDayPdfPreview({ previewUrl, isLoading, hasError }: DueDayPdfPreviewProps) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-white/10 dark:bg-white/5 lg:sticky lg:top-0">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        <FileText className="h-4 w-4 text-emerald-600" />
        Preview do PDF
      </div>
      <div className="relative min-h-[70vh] overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-slate-200" style={{ colorScheme: 'light' }}>
        {previewUrl && <iframe title="Prévia do PDF de dia de vencimento" src={`${previewUrl}#toolbar=0&navpanes=0`} className="absolute inset-0 h-full w-full border-0" />}
        {(isLoading || (!previewUrl && !hasError)) && <div className="absolute inset-0 flex items-center justify-center bg-white text-sm font-medium text-slate-500">Gerando prévia do PDF...</div>}
        {hasError && !isLoading && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">Não há dados para montar a prévia com estes filtros.</div>}
      </div>
    </aside>
  )
}

function ReportMetricCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500 text-blue-600',
    emerald: 'bg-emerald-500 text-emerald-600',
    indigo: 'bg-indigo-500 text-indigo-600',
    purple: 'bg-purple-500 text-purple-600',
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color].split(' ')[0]} bg-opacity-10 dark:bg-opacity-20 ${colorMap[color].split(' ')[1]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <button className="p-2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{value}</p>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
