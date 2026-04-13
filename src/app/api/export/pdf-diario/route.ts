import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const [newLoans, eventsToday] = await Promise.all([
    prisma.emprestimo.findMany({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      include: {
        cliente: { select: { nome: true } },
        usuario: { select: { nome: true } }
      }
    }),
    prisma.emprestimoHistorico.findMany({
      where: { createdAt: { gte: startOfToday, lte: endOfToday }, descricao: { contains: 'Pagamento registrado' } },
      include: {
        emprestimo: {
          include: {
            cliente: { select: { nome: true } },
            usuario: { select: { nome: true } }
          }
        }
      }
    })
  ])

  // Get interest anniversaries today
  const allActiveLoans = await prisma.emprestimo.findMany({
    where: { status: { notIn: ['QUITADO', 'CANCELADO'] } },
    select: {
      id: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      vencimento: true,
      createdAt: true,
      jurosPagos: true,
      cliente: { select: { nome: true } }
    }
  })

  const dayToday = now.getDate()
  const anniversariesToday = allActiveLoans.filter(loan => {
    const base = loan.vencimento ?? loan.createdAt
    return base.getDate() === dayToday
  }).map(loan => {
    const principalRestante = Math.max(loan.valor - (loan.valorPago ?? 0), 0)
    const jurosMensal = principalRestante * ((loan.jurosMes ?? 0) / 100)
    
    // Check if paid (same logic as Reports page)
    const base = loan.vencimento ?? loan.createdAt
    const monthsAccrued = Math.max(1, (now.getUTCFullYear() * 12 + now.getUTCMonth()) - (base.getUTCFullYear() * 12 + base.getUTCMonth()) + 1)
    const totalOwedUntilNow = jurosMensal * monthsAccrued
    const isPaid = (loan.jurosPagos || 0) >= (totalOwedUntilNow - 0.01)

    return { ...loan, jurosMensal, isPaid }
  })

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  let y = height - 50

  const drawLine = (text: string, options: { bold?: boolean, size?: number, color?: any, x?: number, align?: 'left' | 'right' | 'center' } = {}) => {
    const { bold = false, size = 10, color = rgb(0,0,0), x = 50, align = 'left' } = options
    const f = bold ? fontBold : font
    const textWidth = f.widthOfTextAtSize(text, size)
    
    let targetX = x
    if (align === 'right') targetX = width - x - textWidth
    if (align === 'center') targetX = (width - textWidth) / 2

    page.drawText(text, {
      x: targetX,
      y,
      size,
      font: f,
      color,
    })
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Header Box
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.05, 0.1, 0.2), // Dark Navy
  })

  y = height - 45
  drawLine('SUPERCOB - GESTÃO DE COBRANÇAS', { bold: true, size: 18, color: rgb(1,1,1), align: 'center' })
  y -= 25
  drawLine(`RELATÓRIO DE CONFERÊNCIA DIÁRIA`, { bold: true, size: 14, color: rgb(0.9, 0.9, 1), align: 'center' })
  y -= 18
  drawLine(now.toLocaleDateString('pt-BR', { dateStyle: 'long' }), { size: 10, color: rgb(0.7, 0.7, 0.8), align: 'center' })
  
  y = height - 140

  // RESUMO DE CAIXA
  drawLine('1. RESUMO GERAL DO DIA', { bold: true, size: 12 })
  y -= 15
  page.drawRectangle({ x: 50, y: y - 50, width: width - 100, height: 60, color: rgb(0.97, 0.98, 1), borderColor: rgb(0.8, 0.8, 0.9), borderWidth: 1 })
  
  let totalPaymentsToday = 0
  eventsToday.forEach(e => {
    const match = e.descricao.match(/R\$\s?([\d.,]+)/)
    if (match) {
      const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      if (!isNaN(val)) totalPaymentsToday += val
    }
  })
  const totalNewAmount = newLoans.reduce((acc, l) => acc + l.valor, 0)

  y -= 20
  drawLine(`ENTRADAS HOJE (PAGAMENTOS):`, { size: 10, x: 65 })
  drawLine(formatCurrency(totalPaymentsToday), { bold: true, size: 11, x: 65, align: 'right' })
  y -= 20
  drawLine(`NOVOS CONTRATOS (VALOR TOTAL):`, { size: 10, x: 65 })
  drawLine(formatCurrency(totalNewAmount), { bold: true, size: 11, x: 65, align: 'right' })
  
  y -= 45

  // TABLE HELPER
  const drawTableHeader = (titles: string[], widths: number[]) => {
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) })
    let currentX = 55
    titles.forEach((t, i) => {
      page.drawText(t, { x: currentX, y: y, size: 8, font: fontBold })
      currentX += widths[i]
    })
    y -= 25
  }

  // TABLE: PAGAMENTOS RECEBIDOS (MAIS IMPORTANTE)
  drawLine('2. DETALHAMENTO DE PAGAMENTOS RECEBIDOS', { bold: true, size: 12, color: rgb(0.05, 0.4, 0.1) })
  y -= 15
  if (eventsToday.length === 0) {
    drawLine('Nenhum pagamento registrado hoje até o momento.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 20
  } else {
    drawTableHeader(['CONTRATO', 'CLIENTE', 'DESCRIÇÃO DO LANÇAMENTO', 'VALOR'], [70, 110, 230, 80])
    eventsToday.forEach(e => {
      if (y < 60) { page.addPage(); y = height - 50; }
      const cobId = `COB-${e.emprestimoId.slice(0, 6).toUpperCase()}`
      const client = e.emprestimo.cliente.nome.slice(0, 18)
      const desc = e.descricao.replace('Pagamento registrado: ', '').slice(0, 50)
      
      const match = e.descricao.match(/R\$\s?([\d.,]+)/)
      const amount = match ? formatCurrency(parseFloat(match[1].replace(/\./g, '').replace(',', '.'))) : '-'

      drawLine(cobId, { size: 8, x: 55 })
      drawLine(client, { size: 8, x: 125 })
      drawLine(desc, { size: 7, x: 235 })
      drawLine(amount, { bold: true, size: 8, x: 50, align: 'right' })
      y -= 15
      page.drawLine({ start: { x: 50, y: y + 5 }, end: { x: width - 50, y: y + 5 }, color: rgb(0.95, 0.95, 0.95) })
    })
    y -= 15
  }

  // TABLE: NOVOS CONTRATOS
  drawLine('3. NOVAS COBRANÇAS GERADAS HOJE', { bold: true, size: 12, color: rgb(0.1, 0.2, 0.5) })
  y -= 15
  if (newLoans.length === 0) {
    drawLine('Nenhum contrato novo gerado hoje.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 20
  } else {
    drawTableHeader(['ID', 'CLIENTE', 'JUROS (%)', 'VENCIMENTO', 'VALOR'], [70, 180, 60, 90, 80])
    newLoans.forEach(l => {
      if (y < 60) { page.addPage(); y = height - 50; }
      drawLine(`COB-${l.id.slice(0, 6).toUpperCase()}`, { size: 8, x: 55 })
      drawLine(l.cliente.nome.slice(0, 30), { size: 8, x: 125 })
      drawLine(`${l.jurosMes}%`, { size: 8, x: 305 })
      drawLine(l.vencimento ? l.vencimento.toLocaleDateString('pt-BR') : '-', { size: 8, x: 365 })
      drawLine(formatCurrency(l.valor), { bold: true, size: 8, x: 50, align: 'right' })
      y -= 15
    })
    y -= 15
  }

  // TABLE: AGENDA DE JUROS (ANIVERSÁRIOS)
  drawLine('4. AGENDA DE JUROS DO DIA (CONFERÊNCIA)', { bold: true, size: 12, color: rgb(0.5, 0.3, 0) })
  y -= 15
  if (anniversariesToday.length === 0) {
    drawLine('Nenhum juros mensal vence hoje para os contratos ativos.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
  } else {
    drawTableHeader(['ID', 'CLIENTE', 'TOTAL JUROS DEVIDO', 'STATUS ATUAL'], [70, 240, 100, 80])
    anniversariesToday.forEach(l => {
      if (y < 60) { page.addPage(); y = height - 50; }
      drawLine(`COB-${l.id.slice(0, 6).toUpperCase()}`, { size: 8, x: 55 })
      drawLine(l.cliente.nome.slice(0, 40), { size: 8, x: 125 })
      drawLine(formatCurrency(l.jurosMensal), { size: 8, x: 365, bold: true })
      drawLine(l.isPaid ? 'PAGO' : 'PENDENTE', { size: 8, bold: true, x: 50, align: 'right', color: l.isPaid ? rgb(0, 0.5, 0) : rgb(0.7, 0, 0) })
      y -= 15
    })
  }

  // Footer
  y = 30
  page.drawLine({ start: { x: 50, y: y + 15 }, end: { x: width - 50, y: y + 15 }, color: rgb(0.8, 0.8, 0.8) })
  drawLine(`Documento para conferência interna • SUPERCOB v1.0 • Emitido em: ${now.toLocaleString('pt-BR')}`, { size: 7, color: rgb(0.5, 0.5, 0.5), align: 'center' })

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Conferencia_Diaria_${now.toISOString().split('T')[0]}.pdf`,
    },
  })
}
