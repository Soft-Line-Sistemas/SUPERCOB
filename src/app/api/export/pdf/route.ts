import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const title = typeof (body as any).title === 'string' && (body as any).title.trim() !== '' ? (body as any).title : 'Relatório Avançado Supercob'
  const filters = (body as any).filters ?? {}
  const report = (body as any).report ?? null

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

    page.drawText(text, {
      x: targetX,
      y: passedY !== undefined ? passedY : y,
      size,
      font: f,
      color,
    })
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  // Header Background
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.05, 0.08, 0.15),
  })

  y = height - 40
  drawText('SUPERCOB - INTELIGÊNCIA FINANCEIRA', { bold: true, size: 16, color: rgb(1, 1, 1), align: 'center' })
  y -= 22
  drawText(title.toUpperCase(), { bold: true, size: 12, color: rgb(0.2, 0.5, 1), align: 'center' })
  y -= 16
  drawText(`Emitido em: ${new Date().toLocaleString('pt-BR')} • Por: ${session.user.name || 'Usuário'}`, { size: 8, color: rgb(0.7, 0.7, 0.8), align: 'center' })

  y = height - 130

  // Filters Section
  if (filters) {
    const fParts = [
      filters.startDate && filters.endDate ? `Período: ${filters.startDate} a ${filters.endDate}` : null,
      filters.status ? `Status: ${filters.status}` : null,
      filters.cidade ? `Cidade: ${filters.cidade}` : null,
      filters.estado ? `UF: ${filters.estado}` : null,
    ].filter(Boolean)
    if (fParts.length > 0) {
      drawText(`CRITÉRIOS DE FILTRO: ${fParts.join(' • ')}`, { size: 8, color: rgb(0.4, 0.4, 0.4) })
      y -= 15
      page.drawLine({ start: { x: 50, y: y + 5 }, end: { x: width - 50, y: y + 5 }, color: rgb(0.9, 0.9, 0.9), thickness: 1 })
      y -= 20
    }
  }

  // KPI Section
  const kpis = report?.kpis
  if (kpis) {
    drawText('1. INDICADORES DE DESEMPENHO (KPIs)', { bold: true, size: 11 })
    y -= 15
    
    const kpiWidth = (width - 100) / 4
    const kpiData = [
      { label: 'PRINCIPAL ATIVO', value: formatCurrency(kpis.principalAtivo ?? 0) },
      { label: 'TOTAL PROJETADO', value: formatCurrency(kpis.totalProjetado ?? 0) },
      { label: 'JUROS (MÊS)', value: formatCurrency(kpis.jurosMes ?? 0) },
      { label: 'JUROS (ANO)', value: formatCurrency(kpis.jurosAno ?? 0) }
    ]

    let currentX = 50
    kpiData.forEach((kpi, idx) => {
      page.drawRectangle({
        x: currentX,
        y: y - 45,
        width: kpiWidth - 10,
        height: 50,
        color: rgb(0.98, 0.98, 1),
        borderColor: rgb(0.8, 0.8, 0.9),
        borderWidth: 0.5
      })
      page.drawText(kpi.label, { x: currentX + 8, y: y - 15, size: 7, font: fontBold, color: rgb(0.4, 0.4, 0.5) })
      page.drawText(kpi.value, { x: currentX + 8, y: y - 35, size: 10, font: fontBold, color: rgb(0.05, 0.1, 0.2) })
      currentX += kpiWidth
    })
    y -= 75
  }

  // TABLE HELPER
  const drawTableHeader = (titles: string[], widths: number[], bgColor = rgb(0.95, 0.95, 0.98)) => {
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 18, color: bgColor })
    let currentX = 55
    titles.forEach((t, i) => {
      page.drawText(t, { x: currentX, y: y, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.3) })
      currentX += widths[i]
    })
    y -= 22
  }

  const checkNewPage = (needed: number) => {
    if (y < needed) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = height - 50
      drawText('SUPERCOB - CONTINUAÇÃO DO RELATÓRIO', { size: 7, color: rgb(0.6, 0.6, 0.6), align: 'right' })
      y -= 20
      return true
    }
    return false
  }

  // SECTION 2: INADIMPLÊNCIA
  drawText('2. RELATÓRIO DE INADIMPLÊNCIA (MAIORES ATRASOS)', { bold: true, size: 11, color: rgb(0.8, 0, 0) })
  y -= 15
  const defaulters: any[] = Array.isArray(report?.defaultersData) ? report.defaultersData : []
  if (defaulters.length === 0) {
    drawText('Nenhum registro em atraso identificado para este filtro.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 25
  } else {
    drawTableHeader(['CONTRATO', 'CLIENTE', 'CIDADE/UF', 'DIAS', 'DÍVIDA'], [80, 160, 120, 60, 75])
    defaulters.slice(0, 15).forEach((item, idx) => {
      checkNewPage(40)
      const cobId = item.id ?? '-'
      const client = (item.client ?? '').slice(0, 30)
      const location = (item.city ?? '').slice(0, 22)
      const days = `${item.daysLate ?? 0}d`
      const amount = formatCurrency(item.amount ?? 0)

      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(0.99, 0.99, 1) })
      
      drawText(cobId, { size: 8, x: 55 })
      drawText(client, { size: 8, x: 135 })
      drawText(location, { size: 8, x: 295 })
      drawText(days, { size: 8, x: 415, align: 'left' })
      drawText(amount, { bold: true, size: 8, x: 50, align: 'right' })
      y -= 16
    })
    y -= 20
  }

  // SECTION 3: CURVA ABC
  checkNewPage(120)
  drawText('3. CURVA ABC - CONCENTRAÇÃO DE CARTEIRA', { bold: true, size: 11, color: rgb(0, 0.3, 0.6) })
  y -= 15
  const abcData: any[] = Array.isArray(report?.abcCurveData) ? report.abcCurveData : []
  if (abcData.length === 0) {
    drawText('Dados de concentração indisponíveis.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 25
  } else {
    drawTableHeader(['RK', 'CLIENTE / TOMADOR', 'CIDADE/UF', 'CLASSE', 'VOLUME ACUMULADO'], [30, 200, 130, 60, 75])
    abcData.slice(0, 12).forEach((item, idx) => {
      checkNewPage(40)
      const rk = String(item.rank ?? idx + 1)
      const client = (item.client ?? '').slice(0, 35)
      const location = (item.city ?? '').slice(0, 25)
      const cls = item.class ?? '-'
      const vol = formatCurrency(item.volume ?? 0)

      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(0.98, 0.99, 0.98) })

      drawText(rk, { size: 8, x: 55 })
      drawText(client, { size: 8, x: 85 })
      drawText(location, { size: 8, x: 285 })
      drawText(cls, { bold: true, size: 8, x: 415, color: cls === 'A' ? rgb(0, 0.5, 0) : rgb(0, 0, 0) })
      drawText(vol, { bold: true, size: 8, x: 50, align: 'right' })
      y -= 16
    })
    y -= 25
  }

  // SECTION 4: DISTRIBUIÇÃO GEOGRÁFICA
  checkNewPage(120)
  drawText('4. DISTRIBUIÇÃO POR LOCALIDADE', { bold: true, size: 11, color: rgb(0.4, 0.2, 0.6) })
  y -= 15
  const geoData: any[] = Array.isArray(report?.volumeByLocation) ? report.volumeByLocation : []
  if (geoData.length === 0) {
    drawText('Dados geográficos indisponíveis.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
  } else {
    drawTableHeader(['LOCALIDADE (CIDADE / UF)', 'VOLUME TOTAL EM CARTEIRA', '% PARTICIPAÇÃO'], [300, 120, 75])
    const totalVolume = geoData.reduce((acc, g) => acc + (g.volume || 0), 0) || 1
    geoData.slice(0, 8).forEach((item, idx) => {
      checkNewPage(40)
      const city = item.city ?? '-'
      const volume = formatCurrency(item.volume ?? 0)
      const pct = `${((item.volume / totalVolume) * 100).toFixed(1)}%`

      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(0.98, 0.98, 1) })
      
      drawText(city, { size: 8, x: 55 })
      drawText(volume, { bold: true, size: 8, x: 355 })
      drawText(pct, { size: 8, x: 50, align: 'right' })
      y -= 16
    })
    y -= 25
  }

  // SECTION 5: AGENDA DE JUROS DO DIA
  checkNewPage(120)
  drawText('5. AGENDA DE JUROS DO DIA (VENCIMENTOS HOJE)', { bold: true, size: 11, color: rgb(0.1, 0.5, 0.4) })
  y -= 15
  const dailyInterest: any[] = Array.isArray(report?.dailyInterestData) ? report.dailyInterestData : []
  if (dailyInterest.length === 0) {
    drawText('Nenhum vencimento de juros programado para hoje.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
  } else {
    drawTableHeader(['ID CONTRATO', 'CLIENTE', 'VALOR JUROS', 'STATUS'], [100, 200, 100, 80])
    dailyInterest.slice(0, 15).forEach((item, idx) => {
      checkNewPage(40)
      const loanId = item.loanId ?? '-'
      const client = (item.client ?? '').slice(0, 40)
      const amount = formatCurrency(item.amount ?? 0)
      const status = item.isPaid ? 'PAGO' : 'A PAGAR'

      if (idx % 2 === 0) page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 16, color: rgb(0.95, 0.99, 0.98) })
      
      drawText(loanId, { size: 8, x: 55 })
      drawText(client, { size: 8, x: 155 })
      drawText(amount, { bold: true, size: 8, x: 355 })
      drawText(status, { bold: true, size: 8, x: 50, align: 'right', color: item.isPaid ? rgb(0, 0.5, 0) : rgb(0.7, 0.4, 0) })
      y -= 16
    })
  }

  // Footer on current page
  page.drawLine({ start: { x: 50, y: 30 }, end: { x: width - 50, y: 30 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 })
  page.drawText('SUPERCOB INTELIGÊNCIA FINANCEIRA - DOCUMENTO CONFIDENCIAL', { x: 50, y: 20, size: 6, font: font, color: rgb(0.6, 0.6, 0.6) })
  page.drawText(`Página 1 de 1`, { x: width - 100, y: 20, size: 6, font: font, color: rgb(0.6, 0.6, 0.6) })

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Relatorio_Avancado_${new Date().toISOString().split('T')[0]}.pdf`,
    },
  })
}
