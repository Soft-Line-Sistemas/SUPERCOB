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

  console.log({ admin: admin.email, operador: operador.email, cliente: cliente.id, contrato: contrato.id })
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
