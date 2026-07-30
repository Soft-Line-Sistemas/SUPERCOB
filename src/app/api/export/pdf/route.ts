import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type PdfCtx = {
  pdfDoc: PDFDocument
  font: any
  fontBold: any
  page: any
  width: number
  height: number
  y: number
}

function makePdfHelpers(ctx: PdfCtx) {
  const drawText = (text: string, options: { bold?: boolean; size?: number; color?: any; x?: number; y?: number; align?: 'left' | 'right' | 'center' } = {}) => {
    const { bold = false, size = 10, color = rgb(0.1, 0.1, 0.2), x = 50, y: passedY, align = 'left' } = options
    const f = bold ? ctx.fontBold : ctx.font
    const textWidth = f.widthOfTextAtSize(text, size)

    let targetX = x
    if (align === 'right') targetX = ctx.width - x - textWidth
    if (align === 'center') targetX = (ctx.width - textWidth) / 2

    ctx.page.drawText(text, {
      x: targetX,
      y: passedY !== undefined ? passedY : ctx.y,
      size,
      font: f,
      color,
    })
  }

  const drawTableHeader = (titles: string[], widths: number[], bgColor = rgb(0.95, 0.95, 0.98)) => {
    ctx.page.drawRectangle({ x: 50, y: ctx.y - 5, width: ctx.width - 100, height: 18, color: bgColor })
    let currentX = 55
    titles.forEach((t, i) => {
      ctx.page.drawText(t, { x: currentX, y: ctx.y, size: 8, font: ctx.fontBold, color: rgb(0.2, 0.2, 0.3) })
      currentX += widths[i]
    })
    ctx.y -= 22
  }

  const checkNewPage = (needed: number, continuationLabel: string, redrawTableHeader?: () => void) => {
    if (ctx.y < needed) {
      ctx.page = ctx.pdfDoc.addPage([595.28, 841.89])
      ctx.y = ctx.height - 50
      drawText(continuationLabel, { size: 7, color: rgb(0.6, 0.6, 0.6), align: 'right' })
      ctx.y -= 20
      redrawTableHeader?.()
      return true
    }
    return false
  }

  return { drawText, drawTableHeader, checkNewPage }
}

function drawHeader(ctx: PdfCtx, subtitle: string, userName: string) {
  ctx.page.drawRectangle({
    x: 0,
    y: ctx.height - 100,
    width: ctx.width,
    height: 100,
    color: rgb(0.05, 0.08, 0.15),
  })

  const { drawText } = makePdfHelpers(ctx)
  ctx.y = ctx.height - 40
  drawText('Mr Cobranças - INTELIGÊNCIA FINANCEIRA', { bold: true, size: 16, color: rgb(1, 1, 1), align: 'center' })
  ctx.y -= 22
  drawText(subtitle.toUpperCase(), { bold: true, size: 12, color: rgb(0.2, 0.5, 1), align: 'center' })
  ctx.y -= 16
  drawText(`Emitido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} • Por: ${userName}`, { size: 8, color: rgb(0.7, 0.7, 0.8), align: 'center' })

  ctx.y = ctx.height - 130
}

function drawFiltersLine(ctx: PdfCtx, filters: any, includePeriod: boolean = true) {
  const { drawText } = makePdfHelpers(ctx)
  if (!filters) return
  const fParts = [
    includePeriod && filters.startDate && filters.endDate ? `Período: ${filters.startDate} a ${filters.endDate}` : null,
    filters.status ? `Status: ${filters.status}` : null,
    filters.cidade ? `Cidade: ${filters.cidade}` : null,
    filters.estado ? `UF: ${filters.estado}` : null,
  ].filter(Boolean)
  if (fParts.length > 0) {
    drawText(`CRITÉRIOS DE FILTRO: ${fParts.join(' • ')}`, { size: 8, color: rgb(0.4, 0.4, 0.4) })
    ctx.y -= 15
    ctx.page.drawLine({ start: { x: 50, y: ctx.y + 5 }, end: { x: ctx.width - 50, y: ctx.y + 5 }, color: rgb(0.9, 0.9, 0.9), thickness: 1 })
    ctx.y -= 20
  }
}

function drawFooter(ctx: PdfCtx, label: string) {
  ctx.page.drawLine({ start: { x: 50, y: 30 }, end: { x: ctx.width - 50, y: 30 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 })
  ctx.page.drawText(label, { x: 50, y: 20, size: 6, font: ctx.font, color: rgb(0.6, 0.6, 0.6) })
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

type SectionKind = 'full' | 'kpis' | 'defaulters' | 'abc' | 'geo' | 'daily' | 'dueDay'

const SECTION_META: Record<SectionKind, { subtitle: string; filename: string }> = {
  full: { subtitle: 'Relatório Avançado Completo', filename: 'Relatorio_Avancado' },
  kpis: { subtitle: 'Indicadores de Desempenho (KPIs)', filename: 'Indicadores_KPIs' },
  defaulters: { subtitle: 'Relatório de Atrasados', filename: 'Relatorio_Atrasados' },
  abc: { subtitle: 'Curva ABC de Clientes', filename: 'Curva_ABC_Clientes' },
  geo: { subtitle: 'Distribuição por Localidade', filename: 'Distribuicao_Localidade' },
  daily: { subtitle: 'Agenda de Juros do Dia', filename: 'Agenda_Juros_Dia' },
  dueDay: { subtitle: 'Dia de Vencimento', filename: 'Dia_de_Vencimento' },
}

async function buildPdf(section: SectionKind, filters: any, report: any, userName: string) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const ctx: PdfCtx = { pdfDoc, font, fontBold, page, width, height, y: height - 50 }
  const { drawText, drawTableHeader, checkNewPage } = makePdfHelpers(ctx)

  drawHeader(ctx, SECTION_META[section].subtitle, userName)
  drawFiltersLine(ctx, filters, section !== 'dueDay')

  if (section === 'full' || section === 'kpis') {
    const kpis = report?.kpis
    if (kpis) {
      drawText('INDICADORES DE DESEMPENHO (KPIs)', { bold: true, size: 11 })
      ctx.y -= 15

      const kpiWidth = (width - 100) / 4
      const kpiData = [
        { label: 'PRINCIPAL ATIVO', value: formatCurrency(kpis.principalAtivo ?? 0) },
        { label: 'TOTAL PROJETADO', value: formatCurrency(kpis.totalProjetado ?? 0) },
        { label: 'JUROS (MÊS)', value: formatCurrency(kpis.jurosMes ?? 0) },
        { label: 'JUROS (ANO)', value: formatCurrency(kpis.jurosAno ?? 0) },
      ]

      let currentX = 50
      kpiData.forEach((kpi) => {
        ctx.page.drawRectangle({
          x: currentX,
          y: ctx.y - 45,
          width: kpiWidth - 10,
          height: 50,
          color: rgb(0.98, 0.98, 1),
          borderColor: rgb(0.8, 0.8, 0.9),
          borderWidth: 0.5,
        })
        ctx.page.drawText(kpi.label, { x: currentX + 8, y: ctx.y - 15, size: 7, font: fontBold, color: rgb(0.4, 0.4, 0.5) })
        ctx.page.drawText(kpi.value, { x: currentX + 8, y: ctx.y - 35, size: 10, font: fontBold, color: rgb(0.05, 0.1, 0.2) })
        currentX += kpiWidth
      })
      ctx.y -= 75

      if (Array.isArray(report?.interestByMonth) && report.interestByMonth.length > 0) {
        drawText('EVOLUÇÃO DE JUROS (MENSAL)', { bold: true, size: 11 })
        ctx.y -= 15
        const redrawHeader = () => drawTableHeader(['MÊS', 'JUROS ESTIMADOS'], [300, 145])
        redrawHeader()
        report.interestByMonth.forEach((item: any, idx: number) => {
          checkNewPage(40, 'Mr Cobranças - CONTINUAÇÃO', redrawHeader)
          if (idx % 2 === 0) ctx.page.drawRectangle({ x: 50, y: ctx.y - 5, width: width - 100, height: 16, color: rgb(0.98, 0.98, 1) })
          drawText(item.month ?? '-', { size: 8, x: 55 })
          drawText(formatCurrency(item.juros ?? 0), { bold: true, size: 8, x: 50, align: 'right' })
          ctx.y -= 16
        })
        ctx.y -= 20
      }
    }
  }

  if (section === 'full' || section === 'defaulters') {
    drawText('RELATÓRIO DE ATRASADOS', { bold: true, size: 11, color: rgb(0.8, 0, 0) })
    ctx.y -= 15
    const defaulters: any[] = Array.isArray(report?.defaultersData) ? report.defaultersData : []
    if (defaulters.length === 0) {
      drawText('Nenhum registro em atraso identificado para este filtro.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
      ctx.y -= 25
    } else {
      const redrawHeader = () => drawTableHeader(['CLIENTE', 'CIDADE/UF', 'DIAS', 'DÍVIDA'], [220, 155, 90, 75])
      redrawHeader()
      defaulters.forEach((item, idx) => {
        checkNewPage(40, 'Mr Cobranças - CONTINUAÇÃO ATRASADOS', redrawHeader)
        const client = (item.client ?? '').slice(0, 38)
        const location = (item.city ?? '').slice(0, 28)
        const days = `${item.daysLate ?? 0}d`
        const amount = formatCurrency(item.amount ?? 0)

        if (idx % 2 === 0) ctx.page.drawRectangle({ x: 50, y: ctx.y - 5, width: width - 100, height: 16, color: rgb(0.99, 0.99, 1) })

        drawText(client, { size: 8, x: 55 })
        drawText(location, { size: 8, x: 275 })
        drawText(days, { size: 8, x: 415, align: 'left' })
        drawText(amount, { bold: true, size: 8, x: 50, align: 'right' })
        ctx.y -= 16
      })
      ctx.y -= 20
    }
  }

  if (section === 'full' || section === 'abc') {
    checkNewPage(120, 'Mr Cobranças - CONTINUAÇÃO')
    drawText('CURVA ABC - CONCENTRAÇÃO DE CARTEIRA', { bold: true, size: 11, color: rgb(0, 0.3, 0.6) })
    ctx.y -= 15
    const abcData: any[] = Array.isArray(report?.abcCurveData) ? report.abcCurveData : []
    if (abcData.length === 0) {
      drawText('Dados de concentração indisponíveis.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
      ctx.y -= 25
    } else {
      const redrawHeader = () => drawTableHeader(['RK', 'CLIENTE / TOMADOR', 'CIDADE/UF', 'CLASSE', 'VOLUME ACUMULADO'], [30, 200, 130, 60, 75])
      redrawHeader()
      abcData.forEach((item, idx) => {
        checkNewPage(40, 'Mr Cobranças - CONTINUAÇÃO CURVA ABC', redrawHeader)
        const rk = String(item.rank ?? idx + 1)
        const client = (item.client ?? '').slice(0, 35)
        const location = (item.city ?? '').slice(0, 25)
        const cls = item.class ?? '-'
        const vol = formatCurrency(item.volume ?? 0)

        if (idx % 2 === 0) ctx.page.drawRectangle({ x: 50, y: ctx.y - 5, width: width - 100, height: 16, color: rgb(0.98, 0.99, 0.98) })

        drawText(rk, { size: 8, x: 55 })
        drawText(client, { size: 8, x: 85 })
        drawText(location, { size: 8, x: 285 })
        drawText(cls, { bold: true, size: 8, x: 415, color: cls === 'A' ? rgb(0, 0.5, 0) : rgb(0, 0, 0) })
        drawText(vol, { bold: true, size: 8, x: 50, align: 'right' })
        ctx.y -= 16
      })
      ctx.y -= 25
    }
  }

  if (section === 'full' || section === 'geo') {
    checkNewPage(120, 'Mr Cobranças - CONTINUAÇÃO')
    drawText('DISTRIBUIÇÃO POR LOCALIDADE', { bold: true, size: 11, color: rgb(0.4, 0.2, 0.6) })
    ctx.y -= 15
    const geoData: any[] = Array.isArray(report?.volumeByLocation) ? report.volumeByLocation : []
    if (geoData.length === 0) {
      drawText('Dados geográficos indisponíveis.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    } else {
      const redrawHeader = () => drawTableHeader(['LOCALIDADE (CIDADE / UF)', 'VOLUME TOTAL EM CARTEIRA', '% PARTICIPAÇÃO'], [300, 120, 75])
      redrawHeader()
      const totalVolume = geoData.reduce((acc, g) => acc + (g.volume || 0), 0) || 1
      geoData.forEach((item, idx) => {
        checkNewPage(40, 'Mr Cobranças - CONTINUAÇÃO LOCALIDADE', redrawHeader)
        const city = item.city ?? '-'
        const volume = formatCurrency(item.volume ?? 0)
        const pct = `${((item.volume / totalVolume) * 100).toFixed(1)}%`

        if (idx % 2 === 0) ctx.page.drawRectangle({ x: 50, y: ctx.y - 5, width: width - 100, height: 16, color: rgb(0.98, 0.98, 1) })

        drawText(city, { size: 8, x: 55 })
        drawText(volume, { bold: true, size: 8, x: 355 })
        drawText(pct, { size: 8, x: 50, align: 'right' })
        ctx.y -= 16
      })
      ctx.y -= 25
    }
  }

  if (section === 'full' || section === 'daily') {
    checkNewPage(120, 'Mr Cobranças - CONTINUAÇÃO')
    drawText('AGENDA DE JUROS DO DIA (VENCIMENTOS HOJE)', { bold: true, size: 11, color: rgb(0.1, 0.5, 0.4) })
    ctx.y -= 15
    const dailyInterest: any[] = Array.isArray(report?.dailyInterestData) ? report.dailyInterestData : []
    if (dailyInterest.length === 0) {
      drawText('Nenhum vencimento de juros programado para hoje.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    } else {
      const redrawHeader = () => drawTableHeader(['CLIENTE', 'VALOR JUROS', 'STATUS'], [300, 100, 80])
      redrawHeader()
      dailyInterest.forEach((item, idx) => {
        checkNewPage(40, 'Mr Cobranças - CONTINUAÇÃO AGENDA', redrawHeader)
        const client = (item.client ?? '').slice(0, 48)
        const amount = formatCurrency(item.amount ?? 0)
        const status = item.isPaid ? 'PAGO' : 'A PAGAR'

        if (idx % 2 === 0) ctx.page.drawRectangle({ x: 50, y: ctx.y - 5, width: width - 100, height: 16, color: rgb(0.95, 0.99, 0.98) })

        drawText(client, { size: 8, x: 55 })
        drawText(amount, { bold: true, size: 8, x: 355 })
        drawText(status, { bold: true, size: 8, x: 50, align: 'right', color: item.isPaid ? rgb(0, 0.5, 0) : rgb(0.7, 0.4, 0) })
        ctx.y -= 16
      })
    }
  }

  if (section === 'dueDay') {
    const dueDayData: { day: number; entries: { client: string; jurosAtual: number; isAcordo: boolean; parcelaAtual: number; parcelaTotal: number; valorParcela: number }[] }[] =
      Array.isArray(report?.dueDayData) ? report.dueDayData : []

    drawText('Agenda de cobrança organizada por dia do mês de vencimento (contratos em aberto/negociação).', { size: 8, color: rgb(0.4, 0.4, 0.4) })
    ctx.y -= 20

    if (dueDayData.length === 0) {
      drawText('Nenhum contrato ativo com vencimento cadastrado.', { size: 9, color: rgb(0.5, 0.5, 0.5) })
    } else {
      const checkboxSize = 9
      dueDayData.forEach((group) => {
        checkNewPage(80, 'Mr Cobranças - CONTINUAÇÃO DIA DE VENCIMENTO')
        ctx.page.drawRectangle({ x: 50, y: ctx.y - 6, width: width - 100, height: 20, color: rgb(0.1, 0.5, 0.4) })
        ctx.page.drawText(`DIA ${group.day}`, { x: 58, y: ctx.y, size: 10, font: fontBold, color: rgb(1, 1, 1) })
        ctx.y -= 28

        group.entries.forEach((entry) => {
          checkNewPage(40, 'Mr Cobranças - CONTINUAÇÃO DIA DE VENCIMENTO', () => {
            ctx.page.drawRectangle({ x: 50, y: ctx.y - 6, width: width - 100, height: 20, color: rgb(0.1, 0.5, 0.4) })
            ctx.page.drawText(`DIA ${group.day} (continuação)`, { x: 58, y: ctx.y, size: 10, font: fontBold, color: rgb(1, 1, 1) })
            ctx.y -= 28
          })

          const rowTop = ctx.y + 8
          ctx.page.drawRectangle({
            x: 55,
            y: rowTop - checkboxSize,
            width: checkboxSize,
            height: checkboxSize,
            borderColor: rgb(0.3, 0.3, 0.3),
            borderWidth: 1,
          })

          const client = (entry.client ?? '').slice(0, 45)
          const jurosText = formatCurrency(entry.jurosAtual ?? 0)
          let cursorX = 72
          drawText(client, { size: 9, x: cursorX, bold: false })
          cursorX += font.widthOfTextAtSize(client, 9) + 8

          drawText(jurosText, { size: 9, x: cursorX, bold: true, color: rgb(0.05, 0.1, 0.2) })
          cursorX += fontBold.widthOfTextAtSize(jurosText, 9) + 10

          if (entry.isAcordo) {
            const acordoLabel = 'ACORDO'
            drawText(acordoLabel, { size: 8, x: cursorX, bold: true, color: rgb(0.6, 0.4, 0) })
            cursorX += fontBold.widthOfTextAtSize(acordoLabel, 8) + 5

            const parcelaText = `${entry.parcelaAtual}/${entry.parcelaTotal}`
            drawText(parcelaText, { size: 8, x: cursorX, color: rgb(0.3, 0.3, 0.3) })
            cursorX += font.widthOfTextAtSize(parcelaText, 8) + 5

            const valorText = `(${formatCurrency(entry.valorParcela ?? 0)})`
            drawText(valorText, { size: 8, x: cursorX, color: rgb(0.3, 0.3, 0.3) })
          }

          ctx.y -= 20
        })
        ctx.y -= 10
      })
    }
  }

  drawFooter(ctx, 'Mr Cobranças INTELIGÊNCIA FINANCEIRA - DOCUMENTO CONFIDENCIAL')

  return pdfDoc.save()
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Não autorizado', { status: 401 })
  }
  const role = ((session.user as any).role as string | undefined)?.toUpperCase()
  if (role !== 'ADM' && role !== 'ADMIN') {
    return new NextResponse('Acesso negado', { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const rawSection = typeof (body as any).section === 'string' ? (body as any).section : 'full'
  const section: SectionKind = (Object.keys(SECTION_META) as SectionKind[]).includes(rawSection as SectionKind)
    ? (rawSection as SectionKind)
    : 'full'

  const filters = (body as any).filters ?? {}
  const report = (body as any).report ?? null
  const userName = session.user.name || 'Usuário'

  // Para relatórios individuais, preferir os conjuntos de dados completos quando disponíveis
  const effectiveReport = { ...report }
  if (section === 'defaulters' && Array.isArray(report?.defaultersDataFull)) {
    effectiveReport.defaultersData = report.defaultersDataFull
  }
  if (section === 'abc' && Array.isArray(report?.abcCurveDataFull)) {
    effectiveReport.abcCurveData = report.abcCurveDataFull
  }
  if (section === 'geo' && Array.isArray(report?.volumeByLocationFull)) {
    effectiveReport.volumeByLocation = report.volumeByLocationFull
  }

  const pdfBytes = await buildPdf(section, filters, effectiveReport, userName)
  const filename = `${SECTION_META[section].filename}_${new Date().toISOString().split('T')[0]}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  })
}
