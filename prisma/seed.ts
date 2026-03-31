import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const opPassword = await bcrypt.hash('op123456', 10)
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@supercob.com.br' },
    update: {
      nome: 'Admin',
      role: 'ADMIN',
      isActive: true,
      canManageUsers: true,
      canManageClients: true,
      canManageLoans: true,
    },
    create: {
      email: 'admin@supercob.com.br',
      nome: 'Admin',
      senha: adminPassword,
      role: 'ADMIN',
      isActive: true,
      canManageUsers: true,
      canManageClients: true,
      canManageLoans: true,
    },
  })

  const operador = await prisma.usuario.upsert({
    where: { email: 'op@supercob.com.br' },
    update: {
      nome: 'Operador',
      role: 'OPERADOR',
      isActive: true,
      canManageUsers: false,
      canManageClients: true,
      canManageLoans: true,
    },
    create: {
      email: 'op@supercob.com.br',
      nome: 'Operador',
      senha: opPassword,
      role: 'OPERADOR',
      isActive: true,
      canManageUsers: false,
      canManageClients: true,
      canManageLoans: true,
    },
  })

  const cliente = await prisma.cliente.upsert({
    where: { id: 'cliente-demo' },
    update: {},
    create: {
      id: 'cliente-demo',
      nome: 'Cliente Demonstração',
      email: 'cliente@exemplo.com',
      whatsapp: '11999999999',
      cep: '01001000',
      endereco: 'Praça da Sé',
      numeroEndereco: 100,
      bairro: 'Sé',
      cidade: 'São Paulo',
      estado: 'SP',
    },
  })

  const contrato = await prisma.emprestimo.upsert({
    where: { id: 'contrato-demo' },
    update: {},
    create: {
      id: 'contrato-demo',
      clienteId: cliente.id,
      usuarioId: operador.id,
      valor: 1200,
      jurosMes: 3,
      vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      observacao: 'Cobrança de demonstração',
      status: 'ABERTO',
    },
  })

  await prisma.emprestimoHistorico.createMany({
    data: [
      {
        emprestimoId: contrato.id,
        descricao: 'Contrato criado e enviado para acompanhamento.',
        createdById: operador.id,
      },
      {
        emprestimoId: contrato.id,
        descricao: 'Cliente solicitou proposta de parcelamento.',
        createdById: operador.id,
      },
    ],
    skipDuplicates: true,
  })

  // Clientes adicionais com movimentações e status variados
  const clientesSeed = [
    { nome: 'Ana Silva', email: 'ana.silva@example.com', whatsapp: '11911112222', cep: '01311000', endereco: 'Av. Paulista', numeroEndereco: 1578, bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' },
    { nome: 'Bruno Costa', email: 'bruno.costa@example.com', whatsapp: '21922223333', cep: '20040002', endereco: 'Rua da Assembleia', numeroEndereco: 10, bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ' },
    { nome: 'Carla Souza', email: 'carla.souza@example.com', whatsapp: '31933334444', cep: '30140071', endereco: 'Av. Afonso Pena', numeroEndereco: 900, bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG' },
    { nome: 'Diego Lima', email: 'diego.lima@example.com', whatsapp: '41944445555', cep: '80010000', endereco: 'Rua XV de Novembro', numeroEndereco: 55, bairro: 'Centro', cidade: 'Curitiba', estado: 'PR' },
    { nome: 'Elisa Rocha', email: 'elisa.rocha@example.com', whatsapp: '51955556666', cep: '90010150', endereco: 'Rua dos Andradas', numeroEndereco: 123, bairro: 'Centro Histórico', cidade: 'Porto Alegre', estado: 'RS' },
  ]

  const createdClients = []
  for (const c of clientesSeed) {
    const cli = await prisma.cliente.create({ data: c })
    createdClients.push(cli)
  }

  // Empréstimos por cliente com diferentes status
  const now = Date.now()

  // 1) Ana - ABERTO
  const ana = createdClients[0]
  const emprestimoAna = await prisma.emprestimo.create({
    data: {
      clienteId: ana.id,
      usuarioId: operador.id,
      valor: 800,
      jurosMes: 2.5,
      vencimento: new Date(now + 10 * 24 * 60 * 60 * 1000),
      status: 'ABERTO',
    },
  })
  await prisma.emprestimoHistorico.createMany({
    data: [
      { emprestimoId: emprestimoAna.id, descricao: 'Contrato criado.', createdById: operador.id },
      { emprestimoId: emprestimoAna.id, descricao: 'Primeiro contato realizado com o cliente.', createdById: operador.id },
    ],
  })

  // 2) Bruno - NEGOCIACAO
  const bruno = createdClients[1]
  const emprestimoBruno = await prisma.emprestimo.create({
    data: {
      clienteId: bruno.id,
      usuarioId: operador.id,
      valor: 1500,
      jurosMes: 3,
      vencimento: new Date(now + 5 * 24 * 60 * 60 * 1000),
      observacao: 'Em negociação de parcelamento em 3x.',
      status: 'NEGOCIACAO',
    },
  })
  await prisma.emprestimoHistorico.createMany({
    data: [
      { emprestimoId: emprestimoBruno.id, descricao: 'Contrato criado.', createdById: operador.id },
      { emprestimoId: emprestimoBruno.id, descricao: 'Cliente solicitou parcelamento em 3x.', createdById: operador.id },
      { emprestimoId: emprestimoBruno.id, descricao: 'Proposta enviada e aguardando confirmação.', createdById: operador.id },
    ],
  })

  // 3) Carla - QUITADO
  const carla = createdClients[2]
  const emprestimoCarla = await prisma.emprestimo.create({
    data: {
      clienteId: carla.id,
      usuarioId: operador.id,
      valor: 600,
      valorPago: 600,
      jurosMes: 1.5,
      vencimento: new Date(now - 10 * 24 * 60 * 60 * 1000),
      quitadoEm: new Date(now - 2 * 24 * 60 * 60 * 1000),
      status: 'QUITADO',
    },
  })
  await prisma.emprestimoHistorico.createMany({
    data: [
      { emprestimoId: emprestimoCarla.id, descricao: 'Contrato criado.', createdById: operador.id },
      { emprestimoId: emprestimoCarla.id, descricao: 'Boleto enviado.', createdById: operador.id },
      { emprestimoId: emprestimoCarla.id, descricao: 'Pagamento confirmado. Contrato quitado.', createdById: operador.id },
    ],
  })

  // 4) Diego - CANCELADO
  const diego = createdClients[3]
  const emprestimoDiego = await prisma.emprestimo.create({
    data: {
      clienteId: diego.id,
      usuarioId: operador.id,
      valor: 950,
      jurosMes: 2,
      vencimento: new Date(now + 20 * 24 * 60 * 60 * 1000),
      status: 'CANCELADO',
    },
  })
  await prisma.emprestimoHistorico.createMany({
    data: [
      { emprestimoId: emprestimoDiego.id, descricao: 'Contrato criado.', createdById: operador.id },
      { emprestimoId: emprestimoDiego.id, descricao: 'Cancelado por solicitação do cliente.', createdById: operador.id },
    ],
  })

  // 5) Elisa - ABERTO com vencimento próximo
  const elisa = createdClients[4]
  const emprestimoElisa = await prisma.emprestimo.create({
    data: {
      clienteId: elisa.id,
      usuarioId: operador.id,
      valor: 2000,
      jurosMes: 4,
      vencimento: new Date(now + 2 * 24 * 60 * 60 * 1000),
      status: 'ABERTO',
    },
  })
  await prisma.emprestimoHistorico.createMany({
    data: [
      { emprestimoId: emprestimoElisa.id, descricao: 'Contrato criado.', createdById: operador.id },
      { emprestimoId: emprestimoElisa.id, descricao: 'Lembrete de pagamento enviado via WhatsApp.', createdById: operador.id },
    ],
  })

  console.log({
    admin: admin.email,
    operador: operador.email,
    clientes: [cliente.id, ...createdClients.map((c) => c.id)],
    contratos: [contrato.id, emprestimoAna.id, emprestimoBruno.id, emprestimoCarla.id, emprestimoDiego.id, emprestimoElisa.id],
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
