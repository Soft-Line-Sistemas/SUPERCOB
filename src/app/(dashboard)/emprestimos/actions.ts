'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { logSystemAction } from '@/lib/audit'
import { isAdminRole } from '@/lib/admin-auth'
import { archiveEmprestimo, unarchiveEmprestimo } from '@/lib/archive'

export async function getEmprestimos(filters?: {
  status?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  usuarioId?: string;
  cobrancaOnly?: boolean;
  dateFilterMode?: 'created' | 'vencimento';
  vencimentoDay?: string;
  contactOnly?: boolean;
  page?: number;
  pageSize?: number;
  sort?: 'newest' | 'az';
  overdue?: 'yes' | 'no';
  lifecycle?: 'open' | 'closed';
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const sort: 'newest' | 'az' = filters?.sort === 'az' ? 'az' : 'newest'

  // Gerência e Operador veem somente os contratos atribuídos a eles.
  const isOwnPortfolioRole = role === 'GERENTE' || role === 'OPERADOR'
  const where: any = isOwnPortfolioRole ? { usuarioId: userId } : {}

  if (!isOwnPortfolioRole && filters?.usuarioId && filters.usuarioId.trim() !== '') {
    if (filters.usuarioId === '__UNASSIGNED__') where.usuarioId = null
    else where.usuarioId = filters.usuarioId
  }

  if (filters?.status) {
    where.status = filters.status
  } else if (filters?.lifecycle === 'open') {
    where.status = { in: ['ABERTO', 'NEGOCIACAO'] }
  } else if (filters?.lifecycle === 'closed') {
    where.status = { in: ['QUITADO', 'CANCELADO'] }
  } else {
    // Default: only show open/active contracts by default
    where.status = { in: ['ABERTO', 'NEGOCIACAO'] }
  }

  if (filters?.q && filters.q.trim() !== '') {
    const q = filters.q.trim()
    const digits = q.replace(/\D/g, '')
    where.cliente = {
      OR: [
        { nome: { contains: q } },
        { email: { contains: q } },
        digits ? { whatsapp: { contains: digits } } : undefined,
      ].filter(Boolean),
    }
  }

  if (filters?.startDate && filters?.endDate) {
    const dateRange = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    }
    if (filters.dateFilterMode === 'vencimento') {
      where.vencimento = dateRange
    } else {
      where.createdAt = dateRange
    }
  }

  if (filters?.cobrancaOnly) {
    where.cobrancaAtiva = true
  }

  const pageSize = filters?.pageSize ?? 50
  const page = filters?.page ?? 1
  const skip = (page - 1) * pageSize
  const orderBy =
    sort === 'az'
      ? ([{ cliente: { nome: 'asc' as const } }, { createdAt: 'desc' as const }] satisfies Prisma.EmprestimoOrderByWithRelationInput[])
      : ([{ createdAt: 'desc' as const }] satisfies Prisma.EmprestimoOrderByWithRelationInput[])

  // Only filter out CANCELADO by default, unless lifecycle is 'closed'
  const effectiveWhere = filters?.lifecycle === 'closed' 
    ? where 
    : { AND: [where, { status: { not: 'CANCELADO' as const } }] }

  const selectFields = Prisma.validator<Prisma.EmprestimoSelect>()({
    id: true,
    clienteId: true,
    usuarioId: true,
    valor: true,
    quantidadeParcelas: true,
    valorPago: true,
    jurosMes: true,
    jurosAtrasoDia: true,
    vencimento: true,
    quitadoEm: true,
    status: true,
    observacao: true,
    createdAt: true,
    cobrancaAtiva: true,
    jurosPagos: true,
    cliente: {
      select: { nome: true, email: true, whatsapp: true },
    },
    usuario: {
      select: { nome: true },
    },
    historico: {
      where: { tipo: 'PAGAMENTO' },
      orderBy: { createdAt: 'desc' as const },
      take: 120,
      select: { createdAt: true, descricao: true },
    },
  })
  type EmprestimoListItem = Prisma.EmprestimoGetPayload<{ select: typeof selectFields }>
  const candidateFields = Prisma.validator<Prisma.EmprestimoSelect>()({
    id: true,
    status: true,
    valor: true,
    cobrancaAtiva: true,
    vencimento: true,
    createdAt: true,
    cliente: {
      select: { nome: true, whatsapp: true },
    },
  })
  type EmprestimoCandidate = Prisma.EmprestimoGetPayload<{ select: typeof candidateFields }>

  const hasVencimentoDayFilter = (() => {
    const day = Number(filters?.vencimentoDay)
    return !Number.isNaN(day) && day >= 1 && day <= 31
  })()
  const hasContactOnlyFilter = Boolean(filters?.contactOnly)
  const overdueFilter = filters?.overdue

  if (hasVencimentoDayFilter && !where.vencimento) {
    where.vencimento = { not: null }
  }

  const normalizeDigits = (value?: string | null) => (value || '').replace(/\D/g, '')
  const matchesSpecialFilters = (loan: {
    status: string
    vencimento: Date | null
    cliente: { whatsapp: string | null }
  }) => {
    if (overdueFilter === 'yes') {
      const isOverdue =
        loan.status !== 'QUITADO' &&
        loan.status !== 'CANCELADO' &&
        !!loan.vencimento &&
        new Date(loan.vencimento).getTime() < Date.now()
      if (!isOverdue) return false
    } else if (overdueFilter === 'no') {
      const isOverdue =
        loan.status !== 'QUITADO' &&
        loan.status !== 'CANCELADO' &&
        !!loan.vencimento &&
        new Date(loan.vencimento).getTime() < Date.now()
      if (isOverdue) return false
    }

    if (hasVencimentoDayFilter) {
      const day = Number(filters?.vencimentoDay)
      if (!loan.vencimento || new Date(loan.vencimento).getUTCDate() !== day) return false
    }

    if (hasContactOnlyFilter) {
      const hasWhatsapp = normalizeDigits(loan.cliente.whatsapp).length >= 10
      const notPaid = loan.status !== 'QUITADO' && loan.status !== 'CANCELADO'
      if (!hasWhatsapp || !notPaid) return false
    }

    return true
  }

  const orderQuitadosLast = <T extends { status: string }>(loans: T[]) => {
    const abertas = loans.filter((loan) => loan.status !== 'QUITADO')
    const quitadas = loans.filter((loan) => loan.status === 'QUITADO')
    return [...abertas, ...quitadas]
  }

  const orderMostOverdueFirst = <T extends { vencimento: Date | null }>(loans: T[]) =>
    [...loans].sort((a, b) => (a.vencimento?.getTime() ?? 0) - (b.vencimento?.getTime() ?? 0))

  const buildSummary = (loans: EmprestimoCandidate[]) => {
    const now = new Date()
    return loans.reduce(
      (acc, loan) => {
        acc.total += 1
        acc.valorTotal += Number(loan.valor) || 0
        if (loan.status === 'ABERTO') acc.aberto += 1
        if (loan.status === 'NEGOCIACAO') acc.negociacao += 1
        if (loan.status === 'QUITADO') acc.quitado += 1
        if (loan.cobrancaAtiva) acc.cobrancaAtiva += 1
        if (
          loan.status !== 'QUITADO' &&
          loan.vencimento &&
          new Date(loan.vencimento).getTime() < now.getTime()
        ) {
          acc.vencidos += 1
        }
        return acc
      },
      { total: 0, valorTotal: 0, aberto: 0, negociacao: 0, quitado: 0, cancelado: 0, vencidos: 0, cobrancaAtiva: 0 },
    )
  }

  let items: EmprestimoListItem[] = []
  let total = 0
  let summary = {
    total: 0,
    valorTotal: 0,
    aberto: 0,
    negociacao: 0,
    quitado: 0,
    cancelado: 0,
    vencidos: 0,
    cobrancaAtiva: 0,
  }

  const candidates = await prisma.emprestimo.findMany({
    where: effectiveWhere,
    select: candidateFields,
    orderBy,
  })

  const visibleCandidates = filters?.lifecycle === 'closed' 
    ? candidates 
    : candidates.filter((loan) => loan.status !== 'CANCELADO')

  const filteredCandidates =
    hasVencimentoDayFilter || hasContactOnlyFilter || overdueFilter === 'yes' || overdueFilter === 'no'
      ? visibleCandidates.filter(matchesSpecialFilters)
      : visibleCandidates

  // Na fila de inadimplência, os vencimentos mais antigos vêm primeiro para
  // priorizar quem está há mais tempo em atraso.
  const orderedCandidates = overdueFilter === 'yes'
    ? orderMostOverdueFirst(filteredCandidates)
    : orderQuitadosLast(filteredCandidates)
  const pagedIds = orderedCandidates.slice(skip, skip + pageSize).map((loan) => loan.id)

  total = orderedCandidates.length
  summary = buildSummary(orderedCandidates)

  if (pagedIds.length > 0) {
    const pageItems = await prisma.emprestimo.findMany({
      where: { id: { in: pagedIds } },
      select: selectFields,
    })
    const order = new Map(pagedIds.map((id, index) => [id, index]))
    items = pageItems.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  return { items, total, page, pageSize, sort, summary }
}

export async function createEmprestimo(data: {
  clienteId: string;
  valor: number;
  valorPago?: number | null;
  quantidadeParcelas?: number | null;
  jurosMes?: number;
  jurosAtrasoDia?: number;
  vencimento?: Date | null;
  observacao?: string;
  quitadoEm?: Date | null;
  usuarioId?: string;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  if (!Number.isFinite(Number(data.valor)) || Number(data.valor) <= 0) {
    throw new Error('Valor inválido para a cobrança')
  }
  if (!data.vencimento) {
    throw new Error('Vencimento é obrigatório para criar a cobrança')
  }
  if (data.quantidadeParcelas != null && (!Number.isInteger(Number(data.quantidadeParcelas)) || Number(data.quantidadeParcelas) <= 0)) {
    throw new Error('Quantidade de parcelas inválida')
  }
  if (data.valorPago != null && (!Number.isFinite(Number(data.valorPago)) || Number(data.valorPago) < 0 || Number(data.valorPago) > Number(data.valor))) {
    throw new Error('Valor pago inválido para a cobrança')
  }

  const role = (session.user as any).role
  const userId = (session.user as any).id

  if (role === 'OPERADOR') {
    throw new Error('Operadores não podem criar contratos.')
  }

  let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
  
  if (data.quitadoEm || Number(data.valorPago ?? 0) >= Number(data.valor)) {
    status = 'QUITADO'
  } else if (data.observacao && data.observacao.trim() !== '') {
    status = 'NEGOCIACAO'
  }

  if (status === 'QUITADO' && !isAdminRole(role) && role !== 'GERENTE') {
    throw new Error('Apenas administradores ou gerentes podem concluir contratos.')
  }

  // Se for GERENTE, o empréstimo é automaticamente atribuído a ele
  // Se for ADMIN/ADM, ele pode atribuir a qualquer um (passado no data.usuarioId)
  const usuarioId = role === 'GERENTE' ? userId : data.usuarioId

  const createData: Prisma.EmprestimoUncheckedCreateInput = {
    clienteId: data.clienteId,
    usuarioId: usuarioId ?? undefined,
    valor: Number(data.valor),
    valorPago: data.valorPago == null ? undefined : Number(data.valorPago),
    quantidadeParcelas: data.quantidadeParcelas == null ? undefined : Number(data.quantidadeParcelas),
    jurosMes: Number(data.jurosMes ?? 0),
    jurosAtrasoDia: Number(data.jurosAtrasoDia ?? 0),
    vencimento: data.vencimento ?? undefined,
    observacao: data.observacao?.trim() || undefined,
    quitadoEm: data.quitadoEm ?? undefined,
    status,
  }

  const emprestimo = await prisma.emprestimo.create({
    data: createData,
  })

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: emprestimo.id,
    acao: 'CREATE',
    detalhes: `Contrato de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor)} criado.`,
    depois: emprestimo
  })

  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
  return emprestimo
}

export async function updateEmprestimo(id: string, data: {
  valor: number;
  valorPago?: number | null;
  quantidadeParcelas?: number | null;
  jurosMes?: number;
  jurosAtrasoDia?: number;
  vencimento?: Date | null;
  observacao?: string;
  quitadoEm?: Date | null;
  usuarioId?: string;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  if (role === 'OPERADOR') {
    throw new Error('Operadores não podem editar contratos.')
  }

  if (!Number.isFinite(Number(data.valor)) || Number(data.valor) <= 0) {
    throw new Error('Valor inválido para a cobrança')
  }
  if (!data.vencimento) {
    throw new Error('Vencimento é obrigatório para atualizar a cobrança')
  }
  if (data.quantidadeParcelas != null && (!Number.isInteger(Number(data.quantidadeParcelas)) || Number(data.quantidadeParcelas) <= 0)) {
    throw new Error('Quantidade de parcelas inválida')
  }
  if (data.valorPago != null && (!Number.isFinite(Number(data.valorPago)) || Number(data.valorPago) < 0 || Number(data.valorPago) > Number(data.valor))) {
    throw new Error('Valor pago inválido para a cobrança')
  }

  let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
  
  if (data.quitadoEm || Number(data.valorPago ?? 0) >= Number(data.valor)) {
    status = 'QUITADO'
  } else if (data.observacao && data.observacao.trim() !== '') {
    status = 'NEGOCIACAO'
  }

  if (status === 'QUITADO' && !isAdminRole(role) && role !== 'GERENTE') {
    throw new Error('Apenas administradores ou gerentes podem concluir contratos.')
  }

  const before = await prisma.emprestimo.findUnique({ where: { id } })
  if (role === 'GERENTE' && before?.usuarioId !== (session.user as any).id) {
    throw new Error('Gerentes só podem editar contratos da própria carteira.')
  }

  const updateData: Prisma.EmprestimoUncheckedUpdateInput = {
    valor: Number(data.valor),
    valorPago: data.valorPago == null ? undefined : Number(data.valorPago),
    quantidadeParcelas: data.quantidadeParcelas == null ? null : Number(data.quantidadeParcelas),
    jurosMes: Number(data.jurosMes ?? 0),
    jurosAtrasoDia: Number(data.jurosAtrasoDia ?? 0),
    vencimento: data.vencimento ?? null,
    observacao: data.observacao?.trim() || null,
    quitadoEm: data.quitadoEm ?? null,
    status,
  }

  if (data.usuarioId !== undefined) {
    updateData.usuarioId = data.usuarioId
  }

  const emprestimo = await prisma.emprestimo.update({
    where: { id },
    data: updateData,
  })

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: emprestimo.id,
    acao: 'UPDATE',
    detalhes: `Contrato atualizado via formulário.`,
    antes: before,
    depois: emprestimo
  })

  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
  return emprestimo
}

export async function deleteEmprestimo(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  if (!isAdminRole(role)) throw new Error('Apenas administradores podem excluir contratos.')

  await prisma.emprestimo.delete({
    where: { id },
  })
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
}

export async function archiveEmprestimoAction(id: string, motivo?: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  if (!isAdminRole(role)) throw new Error('Apenas administradores podem arquivar contratos.')

  await archiveEmprestimo(id, { actorUserId: (session.user as any).id, motivo })
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
  revalidatePath('/arquivados')
}

export async function unarchiveEmprestimoAction(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  if (!isAdminRole(role)) throw new Error('Apenas administradores podem desarquivar contratos.')

  await unarchiveEmprestimo(id, { actorUserId: (session.user as any).id })
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
  revalidatePath('/arquivados')
}

export async function toggleCobrancaAtiva(id: string, active: boolean) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  if ((session.user as any).role === 'OPERADOR') {
    throw new Error('Operadores não podem alterar contratos.')
  }

  if ((session.user as any).role === 'GERENTE') {
    const contrato = await prisma.emprestimo.findUnique({ where: { id }, select: { usuarioId: true } })
    if (contrato?.usuarioId !== (session.user as any).id) {
      throw new Error('Gerentes só podem alterar contratos da própria carteira.')
    }
  }

  await prisma.emprestimo.update({
    where: { id },
    data: { cobrancaAtiva: active }
  })
  revalidatePath('/emprestimos')
}
