'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { logSystemAction } from '@/lib/audit'
import { isAdminRole } from '@/lib/admin-auth'

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
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  // Regra: GERENTE vê apenas os próprios contratos. ADM e ESCRITORIO veem tudo.
  const where: any = role === 'GERENTE' ? { usuarioId: userId } : {}

  if (role !== 'GERENTE' && filters?.usuarioId && filters.usuarioId.trim() !== '') {
    if (filters.usuarioId === '__UNASSIGNED__') where.usuarioId = null
    else where.usuarioId = filters.usuarioId
  }

  if (filters?.status) {
    where.status = filters.status
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

  const hasVencimentoDayFilter = (() => {
    const day = Number(filters?.vencimentoDay)
    return !Number.isNaN(day) && day >= 1 && day <= 31
  })()
  const hasContactOnlyFilter = Boolean(filters?.contactOnly)

  if (hasVencimentoDayFilter && !where.vencimento) {
    where.vencimento = { not: null }
  }

  const normalizeDigits = (value?: string | null) => (value || '').replace(/\D/g, '')
  const matchesSpecialFilters = (loan: {
    status: string
    vencimento: Date | null
    cliente: { whatsapp: string | null }
  }) => {
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

  let items: EmprestimoListItem[] = []
  let total = 0

  if (hasVencimentoDayFilter || hasContactOnlyFilter) {
    const filteredCandidates = await prisma.emprestimo.findMany({
      where,
      select: {
        id: true,
        status: true,
        vencimento: true,
        createdAt: true,
        cliente: {
          select: { whatsapp: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const filteredIds = filteredCandidates.filter(matchesSpecialFilters).map((loan) => loan.id)
    total = filteredIds.length

    const pagedIds = filteredIds.slice(skip, skip + pageSize)
    if (pagedIds.length === 0) {
      items = []
    } else {
      const pageItems = await prisma.emprestimo.findMany({
        where: { id: { in: pagedIds } },
        select: selectFields,
      })
      const order = new Map(pagedIds.map((id, index) => [id, index]))
      items = pageItems.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    }
  } else {
    ;[items, total] = await Promise.all([
      prisma.emprestimo.findMany({
        where,
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.emprestimo.count({ where }),
    ])
  }

  return { items, total, page, pageSize }
}

export async function createEmprestimo(data: {
  clienteId: string;
  valor: number;
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

  const role = (session.user as any).role
  const userId = (session.user as any).id

  let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
  
  if (data.quitadoEm) {
    status = 'QUITADO'
  } else if (data.observacao && data.observacao.trim() !== '') {
    status = 'NEGOCIACAO'
  }

  // Se for GERENTE, o empréstimo é automaticamente atribuído a ele
  // Se for ADMIN/ADM, ele pode atribuir a qualquer um (passado no data.usuarioId)
  const usuarioId = role === 'GERENTE' ? userId : data.usuarioId

  const emprestimo = await prisma.emprestimo.create({
    data: {
      ...data,
      usuarioId,
      status,
    },
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
    throw new Error('Vencimento é obrigatório para atualizar a cobrança')
  }
  if (data.quantidadeParcelas != null && (!Number.isInteger(Number(data.quantidadeParcelas)) || Number(data.quantidadeParcelas) <= 0)) {
    throw new Error('Quantidade de parcelas inválida')
  }

  let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
  
  if (data.quitadoEm) {
    status = 'QUITADO'
  } else if (data.observacao && data.observacao.trim() !== '') {
    status = 'NEGOCIACAO'
  }

  const before = await prisma.emprestimo.findUnique({ where: { id } })

  const emprestimo = await prisma.emprestimo.update({
    where: { id },
    data: {
      ...data,
      status,
    },
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

export async function toggleCobrancaAtiva(id: string, active: boolean) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  await prisma.emprestimo.update({
    where: { id },
    data: { cobrancaAtiva: active }
  })
  revalidatePath('/emprestimos')
}
