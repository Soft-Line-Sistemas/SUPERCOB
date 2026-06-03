import { describe, expect, it } from 'vitest'

import {
  buildBatchExportFileName,
  buildLoanDossierFileName,
  buildLoanFolderName,
  buildLoanSummaryText,
  buildLoanDossierPdf,
  sanitizeForFileName,
} from '@/lib/loan-dossier'

describe('loan-dossier helpers', () => {
  it('sanitizes names for file usage', () => {
    expect(sanitizeForFileName('João da Silva / Contrato #1')).toBe('joao-da-silva-contrato-1')
  })

  it('builds stable folder and file names', () => {
    const loan = {
      id: 'abc12345xyz',
      cliente: { nome: 'Maria de Souza' },
    }

    expect(buildLoanFolderName(loan)).toBe('ABC12345 - maria-de-souza')
    expect(buildLoanDossierFileName(loan)).toBe('dossie-maria-de-souza.pdf')
  })

  it('includes the date stamp in batch zip file name', () => {
    const fileName = buildBatchExportFileName(new Date(2026, 5, 3, 13, 45))

    expect(fileName).toBe('dossies-lote-20260603-1345.zip')
  })

  it('builds a readable text summary', () => {
    const summary = buildLoanSummaryText({
      loan: {
        id: 'loan-12345678',
        valor: 1500,
        valorPago: 200,
        jurosMes: 5,
        jurosAtrasoDia: 0.5,
        vencimento: '2026-06-10T12:00:00.000Z',
        status: 'NEGOCIACAO',
        observacao: 'Cliente solicitou retorno.',
        createdAt: '2026-06-01T12:00:00.000Z',
        cliente: { id: 'c1', nome: 'Carlos Pereira' },
        usuario: { nome: 'Operador 1' },
      },
      legacyAttachmentCount: 2,
      clientDocumentCount: 3,
    })

    expect(summary).toContain('Contrato: loan-12345678')
    expect(summary).toContain('Cliente: Carlos Pereira')
    expect(summary).toContain('Anexos do contrato: 2')
    expect(summary).toContain('Documentos do cliente: 3')
    expect(summary).toContain('Observacoes:')
  })

  it('generates a non-empty dossier pdf', async () => {
    const bytes = await buildLoanDossierPdf({
      id: 'loan-87654321',
      valor: 2500,
      valorPago: 500,
      jurosMes: 4,
      jurosAtrasoDia: 0.25,
      vencimento: '2026-06-12T12:00:00.000Z',
      status: 'ABERTO',
      observacao: 'Teste automatizado.',
      createdAt: '2026-06-01T12:00:00.000Z',
      cliente: {
        id: 'c1',
        nome: 'Ana Lima',
        whatsapp: '71999999999',
        cpf: '12345678900',
        endereco: 'Rua Central',
        numeroEndereco: 100,
        bairro: 'Centro',
        cidade: 'Salvador',
        estado: 'BA',
      },
      usuario: { nome: 'Operador 2' },
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(1000)
  })
})
