import { prisma } from './prisma'
import { auth } from '@/auth'

export async function logSystemAction(input: {
  entidade: 'EMPRESTIMO' | 'CLIENTE' | 'USUARIO'
  entidadeId: string
  acao: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'JUROS_AUTO'
  detalhes?: string
  antes?: any
  depois?: any
}) {
  try {
    const session = await auth()
    const autorId = (session?.user as any)?.id as string | undefined

    await prisma.auditoriaGeral.create({
      data: {
        autorId,
        entidade: input.entidade,
        entidadeId: input.entidadeId,
        acao: input.acao,
        detalhes: input.detalhes,
        antes: input.antes ? JSON.stringify(input.antes) : null,
        depois: input.depois ? JSON.stringify(input.depois) : null,
      }
    })
  } catch (err) {
    console.error('Erro ao registrar log de auditoria:', err)
  }
}
