import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { DocumentsPreview } from './DocumentsPreview'

function parseYMD(value: unknown) {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const [y, m, d] = v.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  return { y, m, d, ymd: v }
}

function addDaysYMD(ymd: string, days: number) {
  const p = parseYMD(ymd)
  if (!p) return ymd
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0, 0))
  base.setUTCDate(base.getUTCDate() + days)
  const yyyy = base.getUTCFullYear()
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(base.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function saoPauloDayStartUtc(ymd: string) {
  const p = parseYMD(ymd)
  if (!p) return new Date()
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 3, 0, 0, 0))
}

function todayYMDInSaoPaulo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '-'
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export default async function ClienteHistoricoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const sp = await searchParams
  const startDateParam = Array.isArray(sp.startDate) ? sp.startDate[0] : sp.startDate
  const endDateParam = Array.isArray(sp.endDate) ? sp.endDate[0] : sp.endDate

  const todayYMD = todayYMDInSaoPaulo()
  const defaultStartYMD = addDaysYMD(todayYMD, -180)
  let startYMD = parseYMD(startDateParam)?.ymd ?? defaultStartYMD
  let endYMD = parseYMD(endDateParam)?.ymd ?? todayYMD
  if (startYMD > endYMD) {
    const tmp = startYMD
    startYMD = endYMD
    endYMD = tmp
  }

  const rangeStartUtc = saoPauloDayStartUtc(startYMD)
  const rangeEndExclusiveUtc = saoPauloDayStartUtc(addDaysYMD(endYMD, 1))

  const role = (session.user as any).role as 'ADMIN' | 'OPERADOR'
  const userId = (session.user as any).id as string

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      indicacao: true,
      cpf: true,
      rg: true,
      orgao: true,
      diaNasc: true,
      mesNasc: true,
      anoNasc: true,
      email: true,
      whatsapp: true,
      instagram: true,
      cep: true,
      endereco: true,
      numeroEndereco: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      pontoReferencia: true,
      profissao: true,
      empresa: true,
      cepEmpresa: true,
      enderecoEmpresa: true,
      cidadeEmpresa: true,
      estadoEmpresa: true,
      contatoEmergencia1: true,
      contatoEmergencia2: true,
      contatoEmergencia3: true,
      createdAt: true,
      documentos: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
    },
  })

  if (!cliente) notFound()

  if (role === 'OPERADOR') {
    const allowed = await prisma.emprestimo.findFirst({ where: { clienteId: id, usuarioId: userId }, select: { id: true } })
    if (!allowed) redirect('/clientes')
  }

  const emprestimos = await prisma.emprestimo.findMany({
    where: {
      clienteId: id,
      OR: [
        { createdAt: { gte: rangeStartUtc, lt: rangeEndExclusiveUtc } },
        { vencimento: { gte: rangeStartUtc, lt: rangeEndExclusiveUtc } },
        { status: { in: ['ABERTO', 'NEGOCIACAO'] } }, // Garante que contratos ativos sempre apareçam
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      vencimento: true,
      quitadoEm: true,
      status: true,
      observacao: true,
      createdAt: true,
      usuario: { select: { nome: true } },
    },
  })

  const total = emprestimos.reduce((acc, e) => acc + e.valor, 0)
  const pago = emprestimos.reduce((acc, e) => acc + (e.valorPago ?? 0), 0)
  const saldo = emprestimos.reduce((acc, e) => {
    if (e.status === 'CANCELADO') return acc
    return acc + Math.max(e.valor - (e.valorPago ?? 0), 0)
  }, 0)

  const now = new Date()
  const pendencias = emprestimos.filter((e) => e.status !== 'QUITADO' && e.status !== 'CANCELADO' && e.vencimento && e.vencimento.getTime() < now.getTime() && Math.max(e.valor - (e.valorPago ?? 0), 0) > 0)

  const exportParams = new URLSearchParams()
  exportParams.set('startDate', startYMD)
  exportParams.set('endDate', endYMD)

  const docs = cliente.documentos.map((d) => ({
    id: d.id,
    originalName: d.originalName,
    mimeType: d.mimeType,
    size: d.size,
    createdAt: d.createdAt.toISOString(),
    url: `/api/clientes/${cliente.id}/documentos/${d.id}`,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">{cliente.nome}</h1>
          <p className="text-sm text-slate-500">Histórico do cliente • {formatDate(cliente.createdAt)}</p>
        </div>
        <a
          href={`/api/clientes/${cliente.id}/export?${exportParams.toString()}`}
          className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black"
        >
          Exportar CSV
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-slate-200 bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(total)}</p>
        </div>
        <div className="p-5 rounded-3xl border border-slate-200 bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pago</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(pago)}</p>
        </div>
        <div className="p-5 rounded-3xl border border-slate-200 bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatBRL(saldo)}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-900">Período</p>
            <p className="text-xs text-slate-500">Filtra por vencimento (quando houver) ou data de criação.</p>
          </div>
          <form method="get" className="flex flex-col sm:flex-row gap-3">
            <input type="date" name="startDate" defaultValue={startYMD} className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700" />
            <input type="date" name="endDate" defaultValue={endYMD} className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700" />
            <button type="submit" className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black">Aplicar</button>
          </form>
        </div>

        <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <p className="text-sm font-black text-slate-900">Contratos / Cobranças</p>
            {emprestimos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum contrato no período.</p>
            ) : (
              <div className="space-y-3">
                {emprestimos.map((e) => {
                  const saldoLocal = e.status === 'CANCELADO' ? 0 : Math.max(e.valor - (e.valorPago ?? 0), 0)
                  return (
                    <a key={e.id} href={`/emprestimos/${e.id}`} className="block p-4 rounded-2xl border border-slate-200 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-sm font-black text-slate-900">COB-{e.id.slice(0, 6).toUpperCase()}</p>
                        <p className="text-xs font-black text-slate-500">{e.usuario?.nome ? `Responsável: ${e.usuario.nome}` : 'Sem atribuição'}</p>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                          <p className="text-xs font-black text-slate-700">{e.status}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Valor</p>
                          <p className="text-xs font-black text-slate-700">{formatBRL(e.valor)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Pago</p>
                          <p className="text-xs font-black text-slate-700">{formatBRL(e.valorPago ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Saldo</p>
                          <p className="text-xs font-black text-slate-700">{formatBRL(saldoLocal)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Venc.: {formatDate(e.vencimento)}</span>
                        <span>Lanç.: {formatDate(e.createdAt)}</span>
                        <span>Quit.: {formatDate(e.quitadoEm)}</span>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="p-5 rounded-3xl border border-slate-200 bg-white">
              <p className="text-sm font-black text-slate-900">Dados cadastrais</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="font-black">CPF:</span> {cliente.cpf ?? '-'}</p>
                <p><span className="font-black">WhatsApp:</span> {cliente.whatsapp ?? '-'}</p>
                <p><span className="font-black">Email:</span> {cliente.email ?? '-'}</p>
                <p><span className="font-black">Endereço:</span> {[cliente.endereco, cliente.numeroEndereco, cliente.bairro, cliente.cidade, cliente.estado].filter((x) => x != null && String(x).trim() !== '').join(' • ') || '-'}</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 bg-white">
              <p className="text-sm font-black text-slate-900">Pendências</p>
              <p className="text-xs text-slate-500 mt-1">Vencidas com saldo em aberto.</p>
              {pendencias.length === 0 ? (
                <p className="text-sm text-slate-700 mt-3">Nenhuma pendência.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {pendencias.slice(0, 8).map((e) => (
                    <a key={e.id} href={`/emprestimos/${e.id}`} className="block px-4 py-3 rounded-2xl border border-red-200 bg-red-50">
                      <p className="text-xs font-black text-red-700">COB-{e.id.slice(0, 6).toUpperCase()} • Venc.: {formatDate(e.vencimento)}</p>
                      <p className="text-sm font-black text-red-900 mt-1">{formatBRL(Math.max(e.valor - (e.valorPago ?? 0), 0))}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 bg-white">
              <p className="text-sm font-black text-slate-900">Documentos</p>
              <DocumentsPreview docs={docs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
