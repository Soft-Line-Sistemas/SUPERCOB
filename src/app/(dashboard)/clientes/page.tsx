import { Clients } from '@/components/Clients'
import { getClientes } from './actions'

export default async function ClientesPage() {
  const clientes = await getClientes()

  return (
    <div className="space-y-6">
      {/* <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gerenciamento de Clientes</h2>
          <p className="text-gray-500">Cadastre e organize as informações de contato dos seus clientes.</p>
        </div>
      </div> */}
      <Clients initialClients={clientes} />
    </div>
  )
}
