import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildContentDisposition, buildLoanExtractedFiles } from '@/lib/loan-zip-export'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Não autorizado', { status: 401 })

  const { searchParams } = new URL(req.url)
  const loanId = searchParams.get('loanId')
  if (!loanId) return NextResponse.json({ error: 'ID do empréstimo é obrigatório' }, { status: 400 })

  try {
    const files = await buildLoanExtractedFiles(loanId)
    return NextResponse.json({ total: files.length })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao preparar arquivos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Não autorizado', { status: 401 })

  const { loanId, index } = await req.json().catch(() => ({}))
  if (!loanId || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: 'Arquivo solicitado é inválido' }, { status: 400 })
  }

  try {
    const files = await buildLoanExtractedFiles(loanId)
    const file = files[index]
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })

    return new NextResponse(file.data, {
      headers: {
        // Evita a pré-visualização automática de PDFs e imagens durante o download em lote.
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': buildContentDisposition(file.fileName),
        'X-Extracted-Files-Total': String(files.length),
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao baixar arquivo' }, { status: 500 })
  }
}
