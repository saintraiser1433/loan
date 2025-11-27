import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@loan.com' }
  })

  if (!admin) {
    console.log('❌ Admin user not found!')
    return
  }

  console.log('✅ Admin user found:')
  console.log('   Email:', admin.email)
  console.log('   Name:', admin.name)
  console.log('   Role:', admin.role)
  console.log('   Password hash exists:', !!admin.password)

  // Test password
  const testPassword = 'admin123'
  const isValid = await bcrypt.compare(testPassword, admin.password)
  console.log('   Password "admin123" is valid:', isValid)

  if (!isValid) {
    console.log('\n⚠️  Password mismatch! Creating new admin...')
    const newHash = await bcrypt.hash('admin123', 10)
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: newHash }
    })
    console.log('✅ Admin password updated!')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())






