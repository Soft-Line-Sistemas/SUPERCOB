import { WhatsAppAutomationHub } from '@/components/WhatsAppAutomationHub'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export default async function DashboardWhatsappPage() {
  const session = await auth()
  if (!isAdminRole(session?.user?.role)) {
    redirect('/dashboard')
  }

  return <WhatsAppAutomationHub />
}
