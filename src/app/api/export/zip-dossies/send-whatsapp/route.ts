import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildLoanZipExport } from '@/lib/loan-zip-export'
import { whatsappService } from '@/lib/whatsapp-client'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const createdById = (session.user as any).id as string | undefined

  try {
    const { loanId, phone, password } = await req.json().catch(() => ({}))

    if (!loanId || typeof loanId !== 'string') {
      return NextResponse.json({ error: 'Contrato é obrigatório.' }, { status: 400 })
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Número de WhatsApp é obrigatório.' }, { status: 400 })
    }

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 13) {
      return NextResponse.json({ error: 'Informe um número válido no formato (71) 98382-8779.' }, { status: 400 })
    }

    const { zipBuffer, fileName, loans } = await buildLoanZipExport({
      loanIds: [loanId],
      password: typeof password === 'string' ? password : undefined,
    })

    const loan = loans[0]
    if (!loan) {
      return NextResponse.json({ error: 'Contrato não encontrado para envio.' }, { status: 404 })
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'supercob-whatsapp-'))
    const tempFilePath = path.join(tempDir, fileName)
    await fs.writeFile(tempFilePath, zipBuffer)

    try {
      const message = `Segue o pacote de cobrança do contrato #${loan.id.slice(0, 8).toUpperCase()} do cliente ${loan.cliente.nome}.`
      const sent = await whatsappService.sendMessage(phone, message, tempFilePath)

      await prisma.emprestimoHistorico.create({
        data: {
          emprestimoId: loan.id,
          tipo: 'COBRANCA_WPP',
          createdById,
          descricao: `Pacote de cobrança enviado por WhatsApp para ${phone} • Ref: ${sent.referenceId}`,
        },
      })

      return NextResponse.json({
        success: true,
        fileName,
        normalized: sent.normalized,
        jid: sent.jid,
        referenceId: sent.referenceId,
      })
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null)
    }
  } catch (error) {
    console.error('Erro ao enviar zip via WhatsApp:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar pacote por WhatsApp.' },
      { status: 500 },
    )
  }
}
