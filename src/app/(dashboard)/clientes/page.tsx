import { Clients } from '@/components/Clients'
import { getClientesPage } from './actions'

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
  const clientesPage = await getClientesPage({
    page,
    perPage,
    search: getSingleParam(params.search),
    email: getSingleParam(params.email),
    whatsapp: getSingleParam(params.whatsapp),
    cidade: getSingleParam(params.cidade),
    estado: getSingleParam(params.estado),
    cpf: getSingleParam(params.cpf),
  })

  return (
    <div className="space-y-6">
      {/* <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gerenciamento de Clientes</h2>
          <p className="text-gray-500">Cadastre e organize as informações de contato dos seus clientes.</p>
        </div>
      </div> */}
      <Clients
        initialClients={clientesPage.items}
        pagination={{
          page: clientesPage.page,
          perPage: clientesPage.perPage,
          total: clientesPage.total,
          totalPages: clientesPage.totalPages,
        }}
      />
    </div>
  )
}
