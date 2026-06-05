import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildContentDisposition, buildLoanZipExport } from '@/lib/loan-zip-export'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  try {
    const { loanIds, password } = await req.json().catch(() => ({}))
    const { zipBuffer, fileName } = await buildLoanZipExport({ loanIds, password })

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': buildContentDisposition(fileName),
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar pacote em lote'
    const status =
      message.includes('Selecione ao menos') || message.includes('senha') || message.includes('só pode incluir')
        ? 400
        : message.includes('Nenhum contrato encontrado')
          ? 404
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
