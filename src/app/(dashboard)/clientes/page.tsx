import { Clients } from '@/components/Clients'
import { getClientesPage } from './actions'
import { prisma } from '@/lib/prisma'

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(getSingleParam(params.page) ?? '1') || 1)
  const perPage = Math.max(1, Number(getSingleParam(params.per_page) ?? '15') || 15)
  const sort: 'newest' | 'az' = getSingleParam(params.sort) === 'az' ? 'az' : 'newest'

  const [clientesPage, usuarios] = await Promise.all([
    getClientesPage({
      page,
      perPage,
      search: getSingleParam(params.search),
      email: getSingleParam(params.email),
      whatsapp: getSingleParam(params.whatsapp),
      cidade: getSingleParam(params.cidade),
      estado: getSingleParam(params.estado),
      cpf: getSingleParam(params.cpf),
      sort,
      emailStatus: getSingleParam(params.emailStatus) === 'missing' ? 'missing' : getSingleParam(params.emailStatus) === 'filled' ? 'filled' : undefined,
      whatsappStatus: getSingleParam(params.whatsappStatus) === 'missing' ? 'missing' : getSingleParam(params.whatsappStatus) === 'filled' ? 'filled' : undefined,
      cpfStatus: getSingleParam(params.cpfStatus) === 'missing' ? 'missing' : getSingleParam(params.cpfStatus) === 'filled' ? 'filled' : undefined,
      inadimplente: getSingleParam(params.inadimplente) === '1',
      pago: getSingleParam(params.pago) === '1',
    }),
    prisma.usuario.findMany({
      where: { isActive: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <Clients
        initialClients={clientesPage.items}
        pagination={{
          page: clientesPage.page,
          perPage: clientesPage.perPage,
          total: clientesPage.total,
          totalPages: clientesPage.totalPages,
        }}
        sort={clientesPage.sort}
        summary={clientesPage.summary}
        usuarios={usuarios}
      />
    </div>
  )
}
