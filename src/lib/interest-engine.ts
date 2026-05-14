import { prisma } from './prisma'
import { logSystemAction } from './audit'

export async function processInterestAccrual(loanId: string) {
  const loan = await prisma.emprestimo.findUnique({
    where: { id: loanId },
    include: { cliente: { select: { nome: true } } }
  })

  if (!loan || loan.status === 'QUITADO' || loan.status === 'CANCELADO') return

  const jurosPercent = Number(loan.jurosMes ?? 0)
  if (jurosPercent <= 0) return
  if (Number((loan as any).jurosAtrasoDia ?? 0) > 0) return

  const now = new Date()
  const baseDate = new Date((loan.vencimento ?? loan.createdAt) as any)
  
  // Usar casting para 'any' para evitar erros de tipagem persistente no Prisma Client local
  const lastAccrualDate = (loan as any).lastInterestAccrual 
    ? new Date((loan as any).lastInterestAccrual) 
    : new Date(baseDate)

  // Calcular quantos meses se passaram desde o último lançamento
  let currentPointer = new Date(lastAccrualDate)
  currentPointer.setUTCMonth(currentPointer.getUTCMonth() + 1)

  const entriesGenerated = []

  // Para capitalização, precisamos saber o total de juros já gerados mas não pagos
  const history = await prisma.emprestimoHistorico.findMany({
    where: { emprestimoId: loan.id, tipo: 'JUROS' },
    select: { descricao: true }
  })
  
  const jurosPagos = Number(loan.jurosPagos || 0)
  const principalBase = Math.max(loan.valor - (loan.valorPago || 0), 0)
  
  // Como não temos um campo 'jurosAcumulado' persistente fácil, 
  // vamos simular a capitalização mês a mês
  let compoundedBase = principalBase

  while (currentPointer <= now) {
    if (compoundedBase <= 0) break

    const jurosValor = compoundedBase * (jurosPercent / 100)
    const formattedDate = currentPointer.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    
    // VERIFICAÇÃO DE IDEMPOTÊNCIA: Evitar duplicatas para o mesmo mês
    const monthStart = new Date(currentPointer.getUTCFullYear(), currentPointer.getUTCMonth(), 1)
    const monthEnd = new Date(currentPointer.getUTCFullYear(), currentPointer.getUTCMonth() + 1, 0, 23, 59, 59)
    
    const existing = await prisma.emprestimoHistorico.findFirst({
      where: {
        emprestimoId: loan.id,
        tipo: 'JUROS',
        createdAt: { gte: monthStart, lte: monthEnd }
      }
    })

    if (!existing) {
      const description = `Juros mensal (Capitalizado): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jurosValor)} (Ref. ${formattedDate})`

      const entry = await prisma.emprestimoHistorico.create({
        data: {
          emprestimoId: loan.id,
          descricao: description,
          tipo: 'JUROS',
          createdAt: new Date(currentPointer),
        }
      })
      entriesGenerated.push(entry)
    }
    
    // Na capitalização, o juros gerado aumenta a base para o próximo mês
    compoundedBase += jurosValor
    
    // Avançar um mês
    currentPointer = new Date(currentPointer)
    currentPointer.setUTCMonth(currentPointer.getUTCMonth() + 1)
  }

  if (entriesGenerated.length > 0) {
    // Pegar a última data processada (currentPointer - 1 mês)
    const finalAccrual = new Date(currentPointer)
    finalAccrual.setUTCMonth(finalAccrual.getUTCMonth() - 1)

    await prisma.emprestimo.update({
      where: { id: loan.id },
      data: { lastInterestAccrual: finalAccrual }
    })

    await logSystemAction({
      entidade: 'EMPRESTIMO',
      entidadeId: loan.id,
      acao: 'JUROS_AUTO',
      detalhes: `Gerados ${entriesGenerated.length} lançamentos de juros automáticos.`
    })
  }

  return entriesGenerated
}
