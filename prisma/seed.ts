import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@supercob.com' },
    update: {},
    create: {
      email: 'admin@supercob.com',
      nome: 'Administrador',
      senha: adminPassword,
      role: 'ADMIN',
      canManageUsers: true,
      canManageClients: true,
      canManageLoans: true,
    },
  })

  console.log({ admin })
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
