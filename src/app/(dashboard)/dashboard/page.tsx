import { Dashboard } from '@/components/Dashboard'
import { getDashboardData } from './actions'

export default async function DashboardPage() {
  const data = await getDashboardData('hoje')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Visão Geral</h2>
          <p className="text-gray-500">Acompanhe o desempenho das cobranças em tempo real.</p>
        </div>
      </div>
      <Dashboard data={data} />
    </div>
  )
}
