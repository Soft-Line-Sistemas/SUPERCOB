import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildLoanDossierFileName, buildLoanDossierPdf } from '@/lib/loan-dossier'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const { emprestimoId } = await req.json().catch(() => ({}))
  if (!emprestimoId) {
    return NextResponse.json({ error: 'ID do empréstimo é obrigatório' }, { status: 400 })
  }

  const loan = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    include: {
      cliente: true,
      usuario: { select: { nome: true } }
    }
  })

  if (!loan) {
    return NextResponse.json({ error: 'Empréstimo não encontrado' }, { status: 404 })
  }

  const pdfBytes = await buildLoanDossierPdf(loan)
  const fileName = buildLoanDossierFileName(loan)
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${fileName}`,
    },
  })
}
