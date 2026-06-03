import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import { PassThrough } from 'stream'
import {
  buildBatchExportFileName,
  buildLoanDossierFileName,
  buildLoanDossierPdf,
  buildLoanFolderName,
  buildLoanSummaryText,
  sanitizeForFileName,
} from '@/lib/loan-dossier'
import { unwrapCommonJsDefault } from '@/lib/module-interop'

export const runtime = 'nodejs'

const archiverModule = require('archiver')
const archiver = unwrapCommonJsDefault(archiverModule)

const zipEncryptedModule = require('archiver-zip-encrypted')
const zipEncrypted = unwrapCommonJsDefault(zipEncryptedModule)

let zipEncryptedRegistered = false

function ensureEncryptedZipFormat() {
  if (zipEncryptedRegistered) return
  archiver.registerFormat('zip-encrypted', zipEncrypted)
  zipEncryptedRegistered = true
}

function customerUploadsDir(clienteId: string) {
  return path.join(process.cwd(), 'uploads', 'clientes', clienteId)
}

function buildContentDisposition(fileName: string) {
  const encodedName = encodeURIComponent(fileName)
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`
}

function inferMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case '.pdf':
      return 'application/pdf'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    case '.mov':
      return 'video/quicktime'
    default:
      return 'application/octet-stream'
  }
}

function safeArchiveName(fileName: string) {
  const ext = path.extname(fileName)
  const base = path.basename(fileName, ext)
  return `${sanitizeForFileName(base) || 'arquivo'}${ext.toLowerCase()}`
}

function buildRootManifest(totalLoans: number, protectedZip: boolean) {
  return [
    'SUPERCOB :: PACOTE DE DOSSIES',
    '',
    `Contratos exportados: ${totalLoans}`,
    `Zip protegido por senha: ${protectedZip ? 'sim' : 'nao'}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    '',
    'Estrutura do pacote:',
    '- 00-resumo-do-contrato.txt',
    '- 01-dossie/',
    '- 02-anexos-contrato/',
    '- 03-documentos-cliente/',
    '- 99-alertas-de-exportacao.txt (quando necessario)',
  ].join('\n')
}

async function readCustomerDocument(clienteId: string, fileName: string) {
  const filePath = path.join(customerUploadsDir(clienteId), fileName)
  const data = await fs.readFile(filePath)
  return Buffer.from(data)
}

async function resolveLegacyAttachment(
  rawPath: string,
  fallbackName: string
): Promise<{ fileName: string; data: Buffer; mimeType: string } | { error: string }> {
  const trimmed = rawPath.trim()
  const internalDocMatch = trimmed.match(/^\/api\/clientes\/([^/]+)\/documentos\/([^/?#]+)/)

  if (internalDocMatch) {
    const [, clienteId, docId] = internalDocMatch
    const doc = await prisma.clienteDocumento.findFirst({
      where: { id: docId, clienteId },
      select: { fileName: true, originalName: true, mimeType: true },
    })
    if (!doc) {
      return { error: `Documento interno não encontrado para ${trimmed}` }
    }

    try {
      const data = await readCustomerDocument(clienteId, doc.fileName)
      return {
        fileName: safeArchiveName(doc.originalName),
        data,
        mimeType: doc.mimeType,
      }
    } catch {
      return { error: `Falha ao ler documento interno ${doc.originalName}` }
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed)
      if (!response.ok) {
        return { error: `Download remoto falhou (${response.status}) para ${trimmed}` }
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      const fileName = safeArchiveName(path.basename(new URL(trimmed).pathname) || fallbackName)
      return {
        fileName,
        data: buffer,
        mimeType: response.headers.get('content-type') || inferMimeType(fileName),
      }
    } catch {
      return { error: `Erro ao buscar anexo remoto ${trimmed}` }
    }
  }

  const normalized = trimmed.replace(/^\/+/, '')
  const candidates = [
    trimmed,
    path.join(process.cwd(), normalized),
    path.join(process.cwd(), 'public', normalized),
    path.join(process.cwd(), 'uploads', normalized),
  ]

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (!stat.isFile()) continue
      const data = await fs.readFile(candidate)
      const fileName = safeArchiveName(path.basename(candidate) || fallbackName)
      return {
        fileName,
        data: Buffer.from(data),
        mimeType: inferMimeType(fileName),
      }
    } catch {
      continue
    }
  }

  return { error: `Caminho de anexo não pôde ser resolvido: ${trimmed}` }
}

function createArchive(password?: string) {
  if (password) {
    ensureEncryptedZipFormat()
    return archiver.create('zip-encrypted', {
      zlib: { level: 9 },
      encryptionMethod: 'aes256',
      password,
    } as any)
  }

  return archiver('zip', { zlib: { level: 9 } })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const { loanIds, password } = await req.json().catch(() => ({}))

  if (!Array.isArray(loanIds) || loanIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um contrato para exportar.' }, { status: 400 })
  }

  if (password && typeof password !== 'string') {
    return NextResponse.json({ error: 'Senha inválida.' }, { status: 400 })
  }

  if (typeof password === 'string' && password.trim() !== '' && password.trim().length < 4) {
    return NextResponse.json({ error: 'A senha do zip deve ter pelo menos 4 caracteres.' }, { status: 400 })
  }

  const loans = await prisma.emprestimo.findMany({
    where: { id: { in: loanIds } },
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
      usuario: { select: { nome: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (loans.length === 0) {
    return NextResponse.json({ error: 'Nenhum contrato encontrado para exportação.' }, { status: 404 })
  }

  const archive = createArchive(typeof password === 'string' && password.trim() ? password.trim() : undefined)
  const stream = new PassThrough()
  const chunks: Buffer[] = []

  stream.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  })

  const completion = new Promise<Buffer>((resolve, reject) => {
    stream.on('finish', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
    archive.on('error', reject)
  })

  archive.pipe(stream)
  archive.append(buildRootManifest(loans.length, Boolean(password && password.trim())), { name: 'LEIA-ME.txt' })

  for (const loan of loans) {
    const folderName = buildLoanFolderName(loan)
    const warnings: string[] = []
    const dossierPdf = await buildLoanDossierPdf(loan)
    const dossierFileName = buildLoanDossierFileName(loan)

    archive.append(Buffer.from(buildLoanSummaryText({
      loan,
      legacyAttachmentCount: [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5].filter(Boolean).length,
      clientDocumentCount: loan.cliente.documentos.length,
    })), {
      name: `${folderName}/00-resumo-do-contrato.txt`,
    })

    archive.append(Buffer.from(dossierPdf), {
      name: `${folderName}/01-dossie/${dossierFileName}`,
    })

    const legacyAttachments = [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5]
      .filter((value): value is string => Boolean(value))

    if (legacyAttachments.length === 0) {
      archive.append('Nenhum anexo legado vinculado a este contrato.', {
        name: `${folderName}/02-anexos-contrato/sem-anexos.txt`,
      })
    } else {
      for (const [index, attachment] of legacyAttachments.entries()) {
        const resolved = await resolveLegacyAttachment(attachment, `anexo-contrato-${index + 1}`)
        if ('error' in resolved) {
          warnings.push(resolved.error)
          continue
        }

        archive.append(resolved.data, {
          name: `${folderName}/02-anexos-contrato/${String(index + 1).padStart(2, '0')}-${resolved.fileName}`,
        })
      }
    }

    if (loan.cliente.documentos.length === 0) {
      archive.append('Nenhum documento adicional do cliente cadastrado.', {
        name: `${folderName}/03-documentos-cliente/sem-documentos.txt`,
      })
    } else {
      for (const [index, document] of loan.cliente.documentos.entries()) {
        try {
          const data = await readCustomerDocument(loan.clienteId, document.fileName)
          archive.append(data, {
            name: `${folderName}/03-documentos-cliente/${String(index + 1).padStart(2, '0')}-${safeArchiveName(document.originalName)}`,
          })
        } catch {
          warnings.push(`Falha ao ler documento do cliente: ${document.originalName}`)
        }
      }
    }

    if (warnings.length > 0) {
      archive.append(warnings.join('\n'), {
        name: `${folderName}/99-alertas-de-exportacao.txt`,
      })
    }
  }

  await archive.finalize()
  const zipBuffer = await completion
  const fileName = buildBatchExportFileName()

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': buildContentDisposition(fileName),
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}
