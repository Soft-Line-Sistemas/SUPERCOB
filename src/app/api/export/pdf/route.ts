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

  const title = typeof (body as any).title === 'string' && (body as any).title.trim() !== '' ? (body as any).title : 'Relatório SUPERCOB'
  const filters = (body as any).filters ?? {}
  const report = (body as any).report ?? null

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  let y = height - 56

  const drawLine = (text: string, bold = false, size = 11, color = rgb(0.12, 0.16, 0.23)) => {
    page.drawText(text, {
      x: 48,
      y,
      size,
      font: bold ? fontBold : font,
      color,
      maxWidth: width - 96,
    })
    y -= size + 8
  }

  drawLine(title, true, 18, rgb(0.05, 0.09, 0.16))
  drawLine(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, false, 10, rgb(0.39, 0.45, 0.55))

  if (filters && typeof filters === 'object') {
    const startDate = (filters as any).startDate
    const endDate = (filters as any).endDate
    const status = (filters as any).status
    const cidade = (filters as any).cidade
    const estado = (filters as any).estado
    const parts = [
      startDate && endDate ? `Período: ${startDate} a ${endDate}` : null,
      status ? `Status: ${status}` : null,
      cidade ? `Cidade: ${cidade}` : null,
      estado ? `Estado: ${estado}` : null,
    ].filter(Boolean)
    if (parts.length > 0) {
      y -= 4
      drawLine(parts.join(' • '), false, 10, rgb(0.39, 0.45, 0.55))
    }
  }

  y -= 12
  drawLine('Resumo', true, 14, rgb(0.05, 0.09, 0.16))

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const kpis = report?.kpis
  if (kpis) {
    drawLine(`Principal Ativo: ${formatCurrency(kpis.principalAtivo ?? 0)}`)
    drawLine(`Total Projetado: ${formatCurrency(kpis.totalProjetado ?? 0)}`)
    drawLine(`Juros (Mês): ${formatCurrency(kpis.jurosMes ?? 0)}`)
    drawLine(`Juros (Ano): ${formatCurrency(kpis.jurosAno ?? 0)}`)
  } else {
    drawLine('Sem dados para exibir.')
  }

  y -= 12
  drawLine('Inadimplência (Top)', true, 14, rgb(0.05, 0.09, 0.16))
  const defaulters: any[] = Array.isArray(report?.defaultersData) ? report.defaultersData : []
  if (defaulters.length === 0) {
    drawLine('Nenhum registro em atraso no filtro atual.')
  } else {
    for (const item of defaulters.slice(0, 10)) {
      const line = `${item.id ?? ''} • ${item.client ?? ''} • ${item.city ?? ''} • ${item.daysLate ?? 0} dias • ${formatCurrency(item.amount ?? 0)}`
      if (y < 72) break
      drawLine(line, false, 10)
    }
  }

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=relatorio-supercob.pdf',
    },
  })
}
