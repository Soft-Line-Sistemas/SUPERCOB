import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

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

  const { cliente } = loan

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  let y = height - 50

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatDate = (date: Date | null | undefined) => date ? new Date(date).toLocaleDateString('pt-BR') : '-'

  const drawText = (text: string, options: { bold?: boolean; size?: number; color?: any; x?: number; y?: number; align?: 'left' | 'right' | 'center' } = {}) => {
    const { bold = false, size = 10, color = rgb(0.1, 0.1, 0.2), x = 50, y: passedY, align = 'left' } = options
    const f = bold ? fontBold : font
    const textWidth = f.widthOfTextAtSize(text, size)
    let targetX = x
    if (align === 'right') targetX = width - x - textWidth
    if (align === 'center') targetX = (width - textWidth) / 2
    page.drawText(text, { x: targetX, y: passedY !== undefined ? passedY : y, size, font: f, color })
  }

  // Header Background
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.05, 0.08, 0.15),
  })

  y = height - 40
  drawText('SUPERCOB - DOSSIÊ ESTRATÉGICO', { bold: true, size: 20, color: rgb(1, 1, 1), align: 'center' })
  y -= 22
  drawText(`CLIENTE: ${cliente.nome.toUpperCase()}`, { bold: true, size: 10, color: rgb(0.2, 0.5, 1), align: 'center' })
  y -= 16
  drawText(`Documento Gerado em: ${new Date().toLocaleString('pt-BR')} • Confidencial`, { size: 8, color: rgb(0.7, 0.7, 0.8), align: 'center' })

  y = height - 130

  const drawSectionTitle = (title: string) => {
    y -= 15
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 18, color: rgb(0.95, 0.95, 0.98) })
    page.drawText(title.toUpperCase(), { x: 60, y, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.5) })
    y -= 25
  }

  const drawField = (label: string, value: string, x: number, w: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 6.5, font: fontBold, color: rgb(0.4, 0.4, 0.5) })
    page.drawText(String(value || '-'), { x, y: y - 12, size: 9.5, font: font, color: rgb(0, 0, 0), maxWidth: w })
  }

  const checkNewPage = (needed: number) => {
    if (y < needed) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = height - 50
      drawText('SUPERCOB - CONTINUAÇÃO DO DOSSIÊ', { size: 7, color: rgb(0.6, 0.6, 0.6), align: 'right' })
      y -= 20
      return true
    }
    return false
  }

  // 1. DADOS DA COBRANÇA
  drawSectionTitle('Informações da Cobrança Ativa')
  drawField('ID do Contrato', `#${loan.id.slice(0, 8).toUpperCase()}`, 50, 150)
  drawField('Status Atual', loan.status, 210, 150)
  drawField('Consultor Responsável', loan.usuario?.nome || 'Sistema Central', 370, 150)
  
  y -= 35
  drawField('Valor Original', formatCurrency(loan.valor), 50, 150)
  drawField('Valor Amortizado', formatCurrency(loan.valorPago || 0), 210, 150)
  drawField('Data Vencimento', formatDate(loan.vencimento), 370, 150)

  y -= 35
  drawField('Taxa Mensal', `${loan.jurosMes}%`, 50, 150)
  drawField('Taxa Atraso/Dia', `${loan.jurosAtrasoDia || 0}%`, 210, 150)
  drawField('Data de Início', formatDate(loan.createdAt), 370, 150)

  y -= 45

  // 2. PERFIL DO CLIENTE
  drawSectionTitle('Perfil do Cliente Titular')
  drawField('Nome Completo', cliente.nome, 50, 300)
  drawField('WhatsApp', cliente.whatsapp || '-', 370, 150)
  
  y -= 35
  drawField('CPF', cliente.cpf || '-', 50, 150)
  drawField('RG / Órgão', `${cliente.rg || '-'} ${cliente.orgao ? `(${cliente.orgao})` : ''}`, 210, 150)
  drawField('Data Nascimento', cliente.diaNasc ? `${cliente.diaNasc}/${cliente.mesNasc}/${cliente.anoNasc}` : '-', 370, 150)

  y -= 35
  drawField('E-mail de Contato', cliente.email || '-', 50, 300)
  drawField('Instagram', cliente.instagram || '-', 370, 150)

  y -= 45

  // 3. ENDEREÇO
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

  // 4. DADOS PROFISSIONAIS
  drawSectionTitle('Dados Profissionais e Empresa')
  drawField('Empresa', cliente.empresa || '-', 50, 300)
  drawField('Profissão', cliente.profissao || '-', 370, 150)
  
  y -= 35
  drawField('Endereço Profissional', cliente.enderecoEmpresa || '-', 50, 500)

  y -= 45

  // 5. OBSERVAÇÕES E CONTATOS
  checkNewPage(150)
  drawSectionTitle('Observações e Contatos de Emergência')
  drawField('Contato 1', cliente.contatoEmergencia1 || '-', 50, 150)
  drawField('Contato 2', cliente.contatoEmergencia2 || '-', 210, 150)
  drawField('Contato 3', cliente.contatoEmergencia3 || '-', 370, 150)

  if (loan.observacao) {
    y -= 45
    page.drawText('NOTAS ESTRATÉGICAS:', { x: 50, y, size: 7, font: fontBold, color: rgb(0.5, 0, 0) })
    page.drawText(loan.observacao, { x: 50, y: y - 12, size: 9, font: font, color: rgb(0.2, 0.2, 0.2), maxWidth: width - 100 })
    y -= 30
  }

  // 6. ANEXOS
  y -= 45
  checkNewPage(100)
  drawSectionTitle('Documentação e Anexos')
  const anexos = [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5].filter(Boolean)
  drawField('Total de Anexos Registrados', String(anexos.length), 50, 200)
  if (anexos.length > 0) {
    y -= 35
    anexos.forEach((_, i) => {
      page.drawText(`[X] Documento Digitalizado Anexo ${i+1} verificado`, { x: 50, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) })
      y -= 15
    })
  }

  // Footer
  page.drawLine({ start: { x: 50, y: 30 }, end: { x: width - 50, y: 30 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 })
  drawText('DOCUMENTO CONFIDENCIAL - SUPERCOB GESTÃO DE ATIVOS E COBRANÇAS', { x: 50, y: 20, size: 6.5, color: rgb(0.6, 0.6, 0.6), align: 'center' })

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=dossie-${cliente.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    },
  })
}
