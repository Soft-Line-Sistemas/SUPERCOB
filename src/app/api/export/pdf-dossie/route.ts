import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildLoanDossierFileName, buildLoanDossierPdf, type LoanDossierImage } from '@/lib/loan-dossier'
import { resolveLegacyAttachment } from '@/lib/loan-zip-export'

function isEmbeddableImage(mimeType: string | null | undefined, fileName: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png' || /\.(jpe?g|png)$/i.test(fileName)
}

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
      cliente: {
        include: {
          documentos: {
            select: {
              id: true,
              originalName: true,
              fileName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      usuario: { select: { nome: true } }
    }
  })

  if (!loan) {
    return NextResponse.json({ error: 'Empréstimo não encontrado' }, { status: 404 })
  }

  if (!loan.cobrancaAtiva) {
    return NextResponse.json(
      { error: 'O dossiê só pode ser gerado para contratos com "Enviar para Cobrança" ativo.' },
      { status: 400 }
    )
  }

  const images: LoanDossierImage[] = []
  const legacyAttachments = [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5]
    .filter((value): value is string => Boolean(value))

  for (const [index, attachment] of legacyAttachments.entries()) {
    const resolved = await resolveLegacyAttachment(attachment, `anexo-contrato-${index + 1}`)
    if (!('error' in resolved) && isEmbeddableImage(resolved.mimeType, resolved.fileName)) {
      images.push({ name: resolved.fileName, data: resolved.data, mimeType: resolved.mimeType })
    }
  }

  for (const document of loan.cliente.documentos) {
    if (!isEmbeddableImage(document.mimeType, document.fileName)) continue
    try {
      const filePath = path.join(process.cwd(), 'uploads', 'clientes', loan.clienteId, document.fileName)
      images.push({
        name: document.originalName,
        data: await fs.readFile(filePath),
        mimeType: document.mimeType,
      })
    } catch {
      // O arquivo pode ter sido removido depois do cadastro; o dossiê ainda é gerado.
    }
  }

  const pdfBytes = await buildLoanDossierPdf(loan, images)
  const fileName = buildLoanDossierFileName(loan)
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${fileName}`,
    },
  })
}
