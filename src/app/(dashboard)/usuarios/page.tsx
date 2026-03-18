import { getUsuarios } from './actions'
import { Users } from '@/components/Users'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function UsuariosPage() {
  const session = await auth()
  
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const users = await getUsuarios()
  
  return (
    <div className="space-y-6">
      <Users initialUsers={users as any} />
    </div>
  )
}
