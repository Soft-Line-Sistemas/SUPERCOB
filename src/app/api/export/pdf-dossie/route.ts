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

  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  let y = height - 50

  const drawLine = (text: string, bold = false, size = 10, color = rgb(0, 0, 0), x = 50) => {
    if (y < 50) return // Basic overflow check
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color,
      maxWidth: width - 100,
    })
    y -= size + 5
  }

  const drawTitle = (text: string) => {
    y -= 10
    drawLine(text.toUpperCase(), true, 12, rgb(0.1, 0.1, 0.4))
    y -= 5
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatDate = (date: Date | null | undefined) => date ? new Date(date).toLocaleDateString('pt-BR') : '-'

  // Header
  drawLine('SUPERCOB - DOSSIÊ DE COBRANÇA', true, 16, rgb(0.8, 0.1, 0.1))
  drawLine(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, false, 8, rgb(0.5, 0.5, 0.5))
  y -= 10

  // 1. Dados do Empréstimo
  drawTitle('Dados da Cobrança')
  drawLine(`ID: COB-${loan.id.slice(0, 8).toUpperCase()}`)
  drawLine(`Status: ${loan.status}`)
  drawLine(`Consultor Responsável: ${loan?.usuario?.nome || 'Não atribuído'}`)
  drawLine(`Valor Original: ${formatCurrency(loan.valor)}`)
  drawLine(`Valor Pago (Principal): ${formatCurrency(loan.valorPago || 0)}`)
  drawLine(`Juros Já Pagos: ${formatCurrency(loan.jurosPagos || 0)}`)
  drawLine(`Taxa de Juros Mensal: ${loan.jurosMes}%`)
  drawLine(`Data de Criação: ${formatDate(loan.createdAt)}`)
  drawLine(`Data de Vencimento: ${formatDate(loan.vencimento)}`)
  if (loan.observacao) drawLine(`Observações: ${loan.observacao}`)

  // 2. Perfil do Cliente
  drawTitle('Perfil do Cliente')
  drawLine(`Nome: ${cliente.nome}`, true)
  drawLine(`CPF: ${cliente.cpf || '-'} | RG: ${cliente.rg || '-'} (${cliente.orgao || ''})`)
  drawLine(`Data de Nasc.: ${cliente.diaNasc}/${cliente.mesNasc}/${cliente.anoNasc}`)
  drawLine(`E-mail: ${cliente.email || '-'}`)
  drawLine(`WhatsApp: ${cliente.whatsapp || '-'}`)
  drawLine(`Instagram: ${cliente.instagram || '-'}`)

  // 3. Endereço Residencial
  drawTitle('Endereço Residencial')
  drawLine(`${cliente.endereco || '-'}, ${cliente.numeroEndereco || '-'}`)
  drawLine(`Bairro: ${cliente.bairro || '-'} | CEP: ${cliente.cep || '-'}`)
  drawLine(`Cidade: ${cliente.cidade || '-'} - ${cliente.estado || '-'}`)
  if (cliente.pontoReferencia) drawLine(`Ponto de Ref.: ${cliente.pontoReferencia}`)

  // 4. Dados Profissionais
  drawTitle('Dados Profissionais')
  drawLine(`Profissão: ${cliente.profissao || '-'}`)
  drawLine(`Empresa: ${cliente.empresa || '-'}`)
  drawLine(`Endereço Empresa: ${cliente.enderecoEmpresa || '-'}`)
  drawLine(`Cidade/Estado: ${cliente.cidadeEmpresa || '-'}/${cliente.estadoEmpresa || '-'}`)

  // 5. Contatos de Emergência
  drawTitle('Contatos Registrados')
  if (cliente.contatoEmergencia1) drawLine(`Contato 1: ${cliente.contatoEmergencia1}`)
  if (cliente.contatoEmergencia2) drawLine(`Contato 2: ${cliente.contatoEmergencia2}`)
  if (cliente.contatoEmergencia3) drawLine(`Contato 3: ${cliente.contatoEmergencia3}`)

  // 6. Anexos/Documentos
  drawTitle('Documentação e Anexos')
  const anexos = [loan.arquivo1, loan.arquivo2, loan.arquivo3, loan.arquivo4, loan.arquivo5].filter(Boolean)
  if (anexos.length > 0) {
    drawLine(`Total de anexos vinculados a esta cobrança: ${anexos.length}`)
    anexos.forEach((a, i) => drawLine(`- Anexo ${i+1}: Localizado no servidor`))
  } else {
    drawLine('Nenhum anexo encontrado para esta cobrança.')
  }

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=dossie-${cliente.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    },
  })
}
