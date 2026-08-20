import fs from 'fs/promises'
import path from 'path'
import { PassThrough } from 'stream'
import { prisma } from '@/lib/prisma'
import {
  buildBatchExportFileName,
  buildLoanDossierFileName,
  buildLoanDossierPdf,
  buildLoanFolderName,
  sanitizeForFileName,
} from '@/lib/loan-dossier'

const archiverModule = require('archiver')
const archiver = archiverModule

const zipEncryptedModule = require('archiver-zip-encrypted')
const zipEncrypted = zipEncryptedModule

let zipEncryptedRegistered = false

function ensureEncryptedZipFormat() {
  if (zipEncryptedRegistered) return
  archiver.registerFormat('zip-encrypted', zipEncrypted)
  zipEncryptedRegistered = true
}

function customerUploadsDir(clienteId: string) {
  return path.join(process.cwd(), 'uploads', 'clientes', clienteId)
}

export function buildContentDisposition(fileName: string) {
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

async function loadExportableLoans(loanIds: string[]) {
  const loans = await prisma.emprestimo.findMany({
    where: {
      id: { in: loanIds },
      cobrancaAtiva: true,
    },
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

  return loans
}

export async function buildLoanZipExport(input: { loanIds: string[]; password?: string; keepFilesInRoot?: boolean }) {
  const { loanIds, password, keepFilesInRoot = true } = input

  if (!Array.isArray(loanIds) || loanIds.length === 0) {
    throw new Error('Selecione ao menos um contrato para exportar.')
  }

  if (password && password.trim().length < 4) {
    throw new Error('A senha do zip deve ter pelo menos 4 caracteres.')
  }

  const loans = await loadExportableLoans(loanIds)

  if (loans.length === 0) {
    throw new Error('Nenhum contrato encontrado para exportação.')
  }

  if (loans.length !== loanIds.length) {
    throw new Error('O pacote de dossiês só pode incluir contratos com "Enviar para Cobrança" ativo.')
  }

  const archive = createArchive(password?.trim() ? password.trim() : undefined)
  const stream = new PassThrough()
  const chunks: Buffer[] = []
  let exportedFiles = 0

  stream.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  })

  const completion = new Promise<Buffer>((resolve, reject) => {
    stream.on('finish', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
    archive.on('error', reject)
  })

  archive.pipe(stream)

  for (const loan of loans) {
    const folderName = buildLoanFolderName(loan)
    const warnings: string[] = []
    const dossierPdf = await buildLoanDossierPdf(loan)
    const dossierFileName = buildLoanDossierFileName(loan)
    const rootPrefix = `${folderName} - `
    const archiveName = (fileName: string, directory?: string) =>
      keepFilesInRoot
        ? `${rootPrefix}${fileName}`
        : `${folderName}${directory ? `/${directory}` : ''}/${fileName}`

    archive.append(Buffer.from(dossierPdf), {
      name: archiveName(dossierFileName, '01-dossie'),
    })
    exportedFiles += 1

    const legacyAttachments = [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5]
      .filter((value): value is string => Boolean(value))

    for (const [index, attachment] of legacyAttachments.entries()) {
      const resolved = await resolveLegacyAttachment(attachment, `anexo-contrato-${index + 1}`)
      if ('error' in resolved) {
        warnings.push(resolved.error)
        continue
      }

      archive.append(resolved.data, {
        name: archiveName(`anexo-contrato-${String(index + 1).padStart(2, '0')}-${resolved.fileName}`, '02-anexos-contrato'),
      })
      exportedFiles += 1
    }

    for (const [index, document] of loan.cliente.documentos.entries()) {
      try {
        const data = await readCustomerDocument(loan.clienteId, document.fileName)
        archive.append(data, {
          name: archiveName(`documento-cliente-${String(index + 1).padStart(2, '0')}-${safeArchiveName(document.originalName)}`, '03-documentos-cliente'),
        })
        exportedFiles += 1
      } catch {
        warnings.push(`Falha ao ler documento do cliente: ${document.originalName}`)
      }
    }

    if (warnings.length > 0) {
      archive.append(warnings.join('\n'), {
        name: archiveName('alertas-de-exportacao.txt', '99-alertas-de-exportacao'),
      })
      exportedFiles += 1
    }
  }

  if (exportedFiles === 0) {
    throw new Error('Não há arquivos disponíveis para exportar.')
  }

  await archive.finalize()
  const zipBuffer = await completion
  const fileName = loans.length === 1 ? buildBatchExportFileName(new Date(), loans[0]) : buildBatchExportFileName()

  return {
    zipBuffer,
    fileName,
    loans,
  }
}
