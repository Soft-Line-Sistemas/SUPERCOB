import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Chat } from '@/components/Chat'
import { prisma } from '@/lib/prisma'

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
  const [unreadCount, notifications] = await Promise.all([
    prisma.mensagemInterna.count({
      where: {
        destinatarioId: userId,
        isLida: false,
      },
    }),
    prisma.mensagemInterna.findMany({
      where: {
        OR: [
          { destinatarioId: userId, isLida: false },
          { isMassiva: true, destinatarioId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        remetente: { select: { nome: true, role: true } },
      },
    }),
  ])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={session.user}
          notifications={notifications.map((n) => ({
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
