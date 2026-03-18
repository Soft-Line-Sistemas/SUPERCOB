import { Loans } from '@/components/Loans'
import { getEmprestimos } from './actions'
import { getClientes } from '../clientes/actions'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export default async function EmprestimosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const params = await searchParams
  const filters = {
    status: params.status as string,
    email: params.email as string,
    whatsapp: params.whatsapp as string,
    startDate: params.startDate as string,
    endDate: params.endDate as string,
  }

  const [emprestimos, clientes, colaboradores] = await Promise.all([
    getEmprestimos(filters),
    getClientes(),
    prisma.usuario.findMany({
      where: { role: 'OPERADOR' },
      select: { id: true, nome: true }
    })
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestão de Empréstimos</h2>
          <p className="text-gray-500">Controle as cobranças, negociações e quitações de empréstimos.</p>
        </div>
      </div>
      <Loans 
        initialLoans={emprestimos as any} 
        clientes={clientes.map(c => ({ id: c.id, nome: c.nome }))} 
        colaboradores={colaboradores}
        userRole={(session?.user as any)?.role}
      />
    </div>
  )
}
