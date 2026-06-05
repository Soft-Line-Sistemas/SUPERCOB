import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface LoanDossierCliente {
  id: string
  nome: string
  cpf?: string | null
  rg?: string | null
  orgao?: string | null
  diaNasc?: number | null
  mesNasc?: number | null
  anoNasc?: number | null
  email?: string | null
  whatsapp?: string | null
  instagram?: string | null
  cep?: string | null
  endereco?: string | null
  numeroEndereco?: number | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  pontoReferencia?: string | null
  profissao?: string | null
  empresa?: string | null
  enderecoEmpresa?: string | null
  contatoEmergencia1?: string | null
  contatoEmergencia2?: string | null
  contatoEmergencia3?: string | null
  documentos?: Array<{
    id: string
    originalName: string
    fileName?: string | null
    mimeType?: string | null
    size?: number | null
    createdAt?: Date | string
  }>
}

export interface LoanDossierPayload {
  id: string
  valor: number
  valorPago?: number | null
  jurosMes?: number | null
  jurosAtrasoDia?: number | null
  vencimento?: Date | string | null
  status: string
  observacao?: string | null
  createdAt: Date | string
  arquivo1?: string | null
  arquivo2?: string | null
  arquivo3?: string | null
  arquivo4?: string | null
  arquivo5?: string | null
  cliente: LoanDossierCliente
  usuario?: {
    nome?: string | null
  } | null
}

export function sanitizeForFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

export function buildLoanFolderName(loan: { id: string; cliente: { nome: string } }) {
  const contractCode = loan.id.slice(0, 8).toUpperCase()
  const clientName = sanitizeForFileName(loan.cliente.nome || 'cliente-sem-nome')
  return `${contractCode} - ${clientName}`
}

export function buildLoanDossierFileName(loan: { cliente: { nome: string } }) {
  return `dossie-${sanitizeForFileName(loan.cliente.nome || 'cliente')}.pdf`
}

export function buildBatchExportFileName(
  date = new Date(),
  loan?: { id: string; cliente: { nome: string } }
) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('')

  if (loan) {
    const contractCode = loan.id.slice(0, 8).toUpperCase()
    const clientName = sanitizeForFileName(loan.cliente.nome || 'cliente')
    return `dossie-${contractCode}-${clientName}-${stamp}.zip`
  }

  return `dossies-lote-${stamp}.zip`
}

export function buildLoanSummaryText(input: {
  loan: LoanDossierPayload
  legacyAttachmentCount: number
  clientDocumentCount: number
}) {
  const { loan, legacyAttachmentCount, clientDocumentCount } = input
  const lines = [
    'SUPERCOB :: EXPORTACAO DE DOSSIE',
    '',
    `Contrato: ${loan.id}`,
    `Cliente: ${loan.cliente.nome || '-'}`,
    `Status: ${loan.status || '-'}`,
    `Valor original: ${formatCurrency(loan.valor)}`,
    `Valor pago: ${formatCurrency(loan.valorPago || 0)}`,
    `Juros ao mes: ${loan.jurosMes || 0}%`,
    `Juros atraso por dia: ${loan.jurosAtrasoDia || 0}%`,
    `Vencimento: ${formatDate(loan.vencimento)}`,
    `Responsavel: ${loan.usuario?.nome || 'Sistema Central'}`,
    `Dossie PDF: ${buildLoanDossierFileName(loan)}`,
    `Anexos do contrato: ${legacyAttachmentCount}`,
    `Documentos do cliente: ${clientDocumentCount}`,
    '',
    `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
  ]

  if (loan.observacao) {
    lines.push('', 'Observacoes:', loan.observacao)
  }

  return lines.join('\n')
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function sanitizePdfText(value: string | null | undefined) {
  return String(value ?? '-')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim() || '-'
}

function formatDate(date: Date | string | null | undefined) {
  return date ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'
}

export async function buildLoanDossierPdf(loan: LoanDossierPayload) {
  const { cliente } = loan

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  let y = height - 50

  const drawText = (
    text: string,
    options: {
      bold?: boolean
      size?: number
      color?: ReturnType<typeof rgb>
      x?: number
      y?: number
      align?: 'left' | 'right' | 'center'
    } = {}
  ) => {
    const { bold = false, size = 10, color = rgb(0.1, 0.1, 0.2), x = 50, y: passedY, align = 'left' } = options
    const selectedFont = bold ? fontBold : font
    const textWidth = selectedFont.widthOfTextAtSize(text, size)
    let targetX = x
    if (align === 'right') targetX = width - x - textWidth
    if (align === 'center') targetX = (width - textWidth) / 2
    page.drawText(text, { x: targetX, y: passedY !== undefined ? passedY : y, size, font: selectedFont, color })
  }

  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: rgb(0.05, 0.08, 0.15),
  })

  y = height - 40
  drawText('Mr Cobranças - DOSSIÊ ESTRATÉGICO', { bold: true, size: 20, color: rgb(1, 1, 1), align: 'center' })
  y -= 22
  drawText(`CLIENTE: ${(cliente.nome || '-').toUpperCase()}`, { bold: true, size: 10, color: rgb(0.2, 0.5, 1), align: 'center' })
  y -= 16
  drawText(
    `Documento Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} • Confidencial`,
    { size: 8, color: rgb(0.7, 0.7, 0.8), align: 'center' }
  )

  y = height - 130

  const drawSectionTitle = (title: string) => {
    y -= 15
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 18, color: rgb(0.95, 0.95, 0.98) })
    page.drawText(title.toUpperCase(), { x: 60, y, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.5) })
    y -= 25
  }

  const drawField = (label: string, value: string, x: number, maxWidth: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 6.5, font: fontBold, color: rgb(0.4, 0.4, 0.5) })
    page.drawText(String(value || '-'), { x, y: y - 12, size: 9.5, font, color: rgb(0, 0, 0), maxWidth })
  }

  const checkNewPage = (needed: number) => {
    if (y >= needed) return false
    page = pdfDoc.addPage([595.28, 841.89])
    y = height - 50
    drawText('Mr Cobranças - CONTINUAÇÃO DO DOSSIÊ', { size: 7, color: rgb(0.6, 0.6, 0.6), align: 'right' })
    y -= 20
    return true
  }

  drawSectionTitle('Informações da Cobrança Ativa')
  drawField('ID do Contrato', `#${loan.id.slice(0, 8).toUpperCase()}`, 50, 150)
  drawField('Status Atual', loan.status, 210, 150)
  drawField('Consultor Responsável', loan.usuario?.nome || 'Sistema Central', 370, 150)

  y -= 35
  drawField('Valor Original', formatCurrency(loan.valor), 50, 150)
  drawField('Valor Amortizado', formatCurrency(loan.valorPago || 0), 210, 150)
  drawField('Data Vencimento', formatDate(loan.vencimento), 370, 150)

  y -= 35
  drawField('Taxa Mensal', `${loan.jurosMes || 0}%`, 50, 150)
  drawField('Taxa Atraso/Dia', `${loan.jurosAtrasoDia || 0}%`, 210, 150)
  drawField('Data de Início', formatDate(loan.createdAt), 370, 150)

  y -= 45

  drawSectionTitle('Perfil do Cliente Titular')
  drawField('Nome Completo', cliente.nome || '-', 50, 300)
  drawField('WhatsApp', cliente.whatsapp || '-', 370, 150)

  y -= 35
  drawField('CPF', cliente.cpf || '-', 50, 150)
  drawField('RG / Órgão', `${cliente.rg || '-'} ${cliente.orgao ? `(${cliente.orgao})` : ''}`, 210, 150)
  drawField(
    'Data Nascimento',
    cliente.diaNasc ? `${cliente.diaNasc}/${cliente.mesNasc}/${cliente.anoNasc}` : '-',
    370,
    150
  )

  y -= 35
  drawField('E-mail de Contato', cliente.email || '-', 50, 300)
  drawField('Instagram', cliente.instagram || '-', 370, 150)

  y -= 45

  drawSectionTitle('Localização e Endereço Residencial')
  drawField('Endereço', `${cliente.endereco || '-'}, ${cliente.numeroEndereco || '-'}`, 50, 300)
  drawField('CEP', cliente.cep || '-', 370, 150)

  y -= 35
  drawField('Bairro', cliente.bairro || '-', 50, 150)
  drawField('Cidade / UF', `${cliente.cidade || '-'} / ${cliente.estado || '-'}`, 210, 150)
  drawField('Complemento', cliente.complemento || '-', 370, 150)

  if (cliente.pontoReferencia) {
    y -= 35
    drawField('Ponto de Referência', cliente.pontoReferencia, 50, 500)
  }

  y -= 45

  drawSectionTitle('Dados Profissionais e Empresa')
  drawField('Empresa', cliente.empresa || '-', 50, 300)
  drawField('Profissão', cliente.profissao || '-', 370, 150)

  y -= 35
  drawField('Endereço Profissional', cliente.enderecoEmpresa || '-', 50, 500)

  y -= 45

  checkNewPage(150)
  drawSectionTitle('Observações e Contatos de Emergência')
  drawField('Contato 1', cliente.contatoEmergencia1 || '-', 50, 150)
  drawField('Contato 2', cliente.contatoEmergencia2 || '-', 210, 150)
  drawField('Contato 3', cliente.contatoEmergencia3 || '-', 370, 150)

  if (loan.observacao) {
    y -= 45
    page.drawText('NOTAS ESTRATÉGICAS:', { x: 50, y, size: 7, font: fontBold, color: rgb(0.5, 0, 0) })
    page.drawText(loan.observacao, { x: 50, y: y - 12, size: 9, font, color: rgb(0.2, 0.2, 0.2), maxWidth: width - 100 })
    y -= 30
  }

  y -= 45
  checkNewPage(100)
  drawSectionTitle('Documentação e Anexos')
  const anexosLegados = [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5].filter(Boolean)
  const documentosCliente = loan.cliente.documentos ?? []
  const totalDocumentos = anexosLegados.length + documentosCliente.length

  drawField('Anexos do Contrato', String(anexosLegados.length), 50, 140)
  drawField('Documentos do Cliente', String(documentosCliente.length), 210, 140)
  drawField('Total de Arquivos', String(totalDocumentos), 370, 140)

  if (totalDocumentos > 0) {
    y -= 35
    anexosLegados.forEach((_, index) => {
      page.drawText(`[X] Documento Digitalizado Anexo ${index + 1} verificado`, {
        x: 50,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= 15
    })

    documentosCliente.forEach((documento, index) => {
      page.drawText(`[X] Documento do Cliente ${index + 1}: ${sanitizePdfText(documento.originalName)}`, {
        x: 50,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
        maxWidth: width - 100,
      })
      y -= 15
    })
  } else {
    y -= 35
    page.drawText('Nenhum arquivo vinculado ao contrato ou ao cadastro do cliente.', {
      x: 50,
      y,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
  }

  page.drawLine({ start: { x: 50, y: 30 }, end: { x: width - 50, y: 30 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 })
  drawText('DOCUMENTO CONFIDENCIAL - Mr Cobranças GESTÃO DE ATIVOS E COBRANÇAS', {
    x: 50,
    y: 20,
    size: 6.5,
    color: rgb(0.6, 0.6, 0.6),
    align: 'center',
  })

  return pdfDoc.save()
}
