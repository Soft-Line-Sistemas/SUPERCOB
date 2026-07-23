import path from 'path'

export function clienteDocumentPath(clienteId: string, fileName: string) {
  return path.join(process.cwd(), 'uploads', 'clientes', clienteId, fileName)
}

export function buildContentDisposition(fileName: string, forceDownload: boolean, mimeType: string) {
  const safeName = fileName.replace(/"/g, '')
  const encodedName = encodeURIComponent(fileName)
  const dispositionType = forceDownload || !/pdf|image\/|video\//.test(mimeType) ? 'attachment' : 'inline'

  return `${dispositionType}; filename="${safeName}"; filename*=UTF-8''${encodedName}`
}
