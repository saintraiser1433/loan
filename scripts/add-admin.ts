import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('👤 Adding admin user...')
  
  // Get admin details from command line arguments or use defaults
  const args = process.argv.slice(2)
  const email = args[0] || 'admin@loan.com'
  const password = args[1] || 'admin123'
  const name = args[2] || 'Admin User'
  const phone = args[3] || '+63 912 345 6789'
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingAdmin) {
      console.log(`⚠️  Admin with email ${email} already exists!`)
      console.log('   Use a different email or update the existing admin manually.')
      return
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'ADMIN',
        creditScore: 0,
        loanLimit: 0,
        status: null, // Admins don't need borrower status
      }
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('\n📋 Admin Details:')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Name: ${admin.name}`)
    console.log(`   Phone: ${admin.phone}`)
    console.log(`   Password: ${password}`)
    console.log(`   Role: ${admin.role}`)
    console.log('\n⚠️  Please save these credentials securely!')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })







