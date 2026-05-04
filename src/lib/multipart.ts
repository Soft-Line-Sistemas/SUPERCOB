type ParsedMultipartFile = {
  fieldName: string
  fileName: string
  mimeType: string
  data: Buffer
}

function getBoundary(contentType: string | null) {
  if (!contentType) return null
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  return match?.[1] ?? match?.[2] ?? null
}

function parseContentDisposition(value: string) {
  const name = value.match(/name="([^"]+)"/i)?.[1] ?? ''
  const fileName = value.match(/filename="([^"]*)"/i)?.[1] ?? ''
  return { name, fileName }
}

export async function parseMultipartFileFromRequest(req: Request, expectedField = 'file'): Promise<ParsedMultipartFile | null> {
  const boundary = getBoundary(req.headers.get('content-type'))
  if (!boundary) return null

  const raw = Buffer.from(await req.arrayBuffer())
  const body = raw.toString('latin1')
  const marker = `--${boundary}`
  const parts = body.split(marker)

  for (const part of parts) {
    if (!part || part === '--' || part === '--\r\n') continue

    const normalized = part.startsWith('\r\n') ? part.slice(2) : part
    const headerEnd = normalized.indexOf('\r\n\r\n')
    if (headerEnd < 0) continue

    const headerBlock = normalized.slice(0, headerEnd)
    let content = normalized.slice(headerEnd + 4)
    if (content.endsWith('\r\n')) {
      content = content.slice(0, -2)
    }

    const headers = headerBlock.split('\r\n')
    const disposition = headers.find((line) => line.toLowerCase().startsWith('content-disposition:'))
    if (!disposition) continue

    const { name, fileName } = parseContentDisposition(disposition)
    if (name !== expectedField || !fileName) continue

    const mimeType = headers
      .find((line) => line.toLowerCase().startsWith('content-type:'))
      ?.split(':', 2)[1]
      ?.trim() ?? 'application/octet-stream'

    return {
      fieldName: name,
      fileName,
      mimeType,
      data: Buffer.from(content, 'latin1'),
    }
  }

  return null
}
