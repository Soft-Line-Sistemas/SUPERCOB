import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Chat } from '@/components/Chat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const userId = (session.user as any).id
  const unreadCount = await prisma.mensagemInterna.count({
    where: {
      destinatarioId: userId,
      isLida: false
    }
  })

  const recentNotificationsRaw = await prisma.mensagemInterna.findMany({
    where: {
      OR: [
        { destinatarioId: userId },
        { isMassiva: true, destinatarioId: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      remetente: { select: { nome: true, role: true } },
    },
  })

  const recentNotifications = recentNotificationsRaw.map((n) => ({
    id: n.id,
    conteudo: n.conteudo,
    createdAt: n.createdAt,
    isMassiva: n.isMassiva,
    remetenteNome: n.remetente.nome,
    remetenteRole: n.remetente.role,
  }))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={session.user}
          notifications={recentNotifications.map((n) => ({
            id: n.id,
            conteudo: n.conteudo,
            createdAt: n.createdAt,
            isMassiva: n.isMassiva,
            remetenteNome: n.remetente.nome,
            remetenteRole: n.remetente.role,
          }))}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <Chat currentUser={session.user} />
    </div>
  )
}
