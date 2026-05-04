import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { calculateLoanInterest } from '@/lib/loan-interest'

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

  const allActiveLoans = await prisma.emprestimo.findMany({
    where: { status: { notIn: ['QUITADO', 'CANCELADO'] } },
    select: {
      id: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      jurosAtrasoDia: true,
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
    const interest = calculateLoanInterest(loan)
    const jurosMensal = interest.jurosBase
    const isPaid = interest.jurosPendente <= 0.01
    return { ...loan, jurosMensal, isPaid }
  })

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  let y = height - 50

  const drawText = (text: string, options: { bold?: boolean; size?: number; color?: any; x?: number; y?: number; align?: 'left' | 'right' | 'center' } = {}) => {
    const { bold = false, size = 10, color = rgb(0.1, 0.1, 0.2), x = 50, y: passedY, align = 'left' } = options
    const f = bold ? fontBold : font
    const textWidth = f.widthOfTextAtSize(text, size)
    
    let targetX = x
    if (align === 'right') targetX = width - x - textWidth
    if (align === 'center') targetX = (width - textWidth) / 2

    page.drawText(text, { x: targetX, y: passedY !== undefined ? passedY : y, size: size, font: f, color })
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Header Background
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.05, 0.1, 0.2),
  })

  y = height - 40
  drawText('SUPERCOB - GESTÃO DE COBRANÇAS', { bold: true, size: 16, color: rgb(1, 1, 1), align: 'center' })
  y -= 22
  drawText('RELATÓRIO DE CONFERÊNCIA DIÁRIA', { bold: true, size: 12, color: rgb(0.2, 0.5, 1), align: 'center' })
  y -= 16
  drawText(now.toLocaleDateString('pt-BR', { dateStyle: 'long' }), { size: 9, color: rgb(0.7, 0.7, 0.8), align: 'center' })

  y = height - 135

  // 1. RESUMO DE CAIXA
  drawText('1. RESUMO GERAL DO DIA', { bold: true, size: 11 })
  y -= 15

  let totalPaymentsToday = 0
  eventsToday.forEach(e => {
    const match = e.descricao.match(/R\$\s?([\d.,]+)/)
    if (match) {
      const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      if (!isNaN(val)) totalPaymentsToday += val
    }
  })
  const totalNewAmount = newLoans.reduce((acc, l) => acc + l.valor, 0)

  const kpiWidth = (width - 110) / 3
  const kpis = [
    { label: 'ENTRADAS (PAGAMENTOS)', value: formatCurrency(totalPaymentsToday), color: rgb(0.05, 0.5, 0.1) },
    { label: 'NOVOS CONTRATOS', value: formatCurrency(totalNewAmount), color: rgb(0.1, 0.4, 0.9) },
    { label: 'OPERAÇÕES REALIZADAS', value: String(newLoans.length + eventsToday.length), color: rgb(0.4, 0.4, 0.5) }
  ]

  let currentX = 50
  kpis.forEach(kpi => {
    page.drawRectangle({
      x: currentX,
      y: y - 45,
      width: kpiWidth,
      height: 50,
      color: rgb(0.98, 0.98, 1),
      borderColor: rgb(0.8, 0.8, 0.9),
      borderWidth: 0.5
    })
    page.drawText(kpi.label, { x: currentX + 8, y: y - 15, size: 7, font: fontBold, color: rgb(0.4, 0.4, 0.5) })
    page.drawText(kpi.value, { x: currentX + 8, y: y - 35, size: 10, font: fontBold, color: kpi.color })
    currentX += kpiWidth + 5
  })
  y -= 75

  const drawTableHeader = (titles: string[], widths: number[]) => {
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 18, color: rgb(0.95, 0.95, 0.98) })
    let curX = 55
    titles.forEach((t, i) => {
      page.drawText(t, { x: curX, y: y, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.3) })
      curX += widths[i]
    })
    y -= 22
  }

  const checkNewPage = (needed: number) => {
    if (y < needed) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = height - 50
      drawText('SUPERCOB - CONTINUAÇÃO CONFERÊNCIA DIÁRIA', { size: 7, color: rgb(0.6, 0.6, 0.6), align: 'right' })
      y -= 20
      return true
    }
    return false
  }

  // 2. PAGAMENTOS
  drawText('2. DETALHAMENTO DE PAGAMENTOS RECEBIDOS', { bold: true, size: 11, color: rgb(0.05, 0.4, 0.1) })
  y -= 15
  if (eventsToday.length === 0) {
    drawText('Nenhum pagamento registrado hoje.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 25
  } else {
    drawTableHeader(['CONTRATO', 'CLIENTE', 'DESCRIÇÃO', 'VALOR'], [80, 130, 200, 85])
    eventsToday.forEach((e, idx) => {
      checkNewPage(40)
      const cobId = `COB-${e.emprestimoId.slice(0, 6).toUpperCase()}`
      const client = (e.emprestimo.cliente.nome).slice(0, 22)
      const desc = e.descricao.replace('Pagamento registrado: ', '').slice(0, 40)
      const match = e.descricao.match(/R\$\s?([\d.,]+)/)
      const amount = match ? formatCurrency(parseFloat(match[1].replace(/\./g, '').replace(',', '.'))) : '-'

      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(0.98, 1, 0.98) })
      
      drawText(cobId, { size: 8, x: 55 })
      drawText(client, { size: 8, x: 135 })
      drawText(desc, { size: 7, x: 265 })
      drawText(amount, { bold: true, size: 8, x: 50, align: 'right' })
      y -= 16
    })
    y -= 20
  }

  // 3. NOVOS CONTRATOS
  checkNewPage(100)
  drawText('3. NOVAS COBRANÇAS GERADAS HOJE', { bold: true, size: 11, color: rgb(0.1, 0.3, 0.7) })
  y -= 15
  if (newLoans.length === 0) {
    drawText('Nenhum contrato novo gerado hoje.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 25
  } else {
    drawTableHeader(['ID', 'CLIENTE', 'TAXA (%)', 'VENCIMENTO', 'VALOR'], [80, 180, 80, 90, 65])
    newLoans.forEach((l, idx) => {
      checkNewPage(40)
      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(0.98, 0.98, 1) })
      drawText(`COB-${l.id.slice(0, 6).toUpperCase()}`, { size: 8, x: 55 })
      drawText(l.cliente.nome.slice(0, 30), { size: 8, x: 135 })
      drawText(`${l.jurosMes}%`, { size: 8, x: 315 })
      drawText(l.vencimento ? l.vencimento.toLocaleDateString('pt-BR') : '-', { size: 8, x: 395 })
      drawText(formatCurrency(l.valor), { bold: true, size: 8, x: 50, align: 'right' })
      y -= 16
    })
    y -= 20
  }

  // 4. AGENDA DE JUROS
  checkNewPage(100)
  drawText('4. AGENDA DE JUROS DO DIA (CONFERÊNCIA)', { bold: true, size: 11, color: rgb(0.5, 0.3, 0) })
  y -= 15
  if (anniversariesToday.length === 0) {
    drawText('Nenhum juros mensal vence hoje.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
  } else {
    drawTableHeader(['ID', 'CLIENTE', 'VALOR JUROS', 'STATUS'], [80, 220, 110, 85])
    anniversariesToday.forEach((l, idx) => {
      checkNewPage(40)
      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(1, 0.99, 0.95) })
      drawText(`COB-${l.id.slice(0, 6).toUpperCase()}`, { size: 8, x: 55 })
      drawText(l.cliente.nome.slice(0, 40), { size: 8, x: 135 })
      drawText(formatCurrency(l.jurosMensal), { size: 8, x: 355, bold: true })
      drawText(l.isPaid ? 'PAGO' : 'PENDENTE', { size: 8, bold: true, x: 50, align: 'right', color: l.isPaid ? rgb(0, 0.5, 0) : rgb(0.7, 0.3, 0) })
      y -= 16
    })
  }

  // Footer
  page.drawLine({ start: { x: 50, y: 30 }, end: { x: width - 50, y: 30 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 })
  drawText(`Documento para conferência interna • SUPERCOB v1.2 • Emitido: ${now.toLocaleString('pt-BR')}`, { size: 7, color: rgb(0.6, 0.6, 0.6), align: 'center', x: 50 })

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Conferencia_Diaria_${now.toISOString().split('T')[0]}.pdf`,
    },
  })
}
