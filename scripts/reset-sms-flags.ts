import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Resetting SMS notification flags...')
  
  try {
    // Reset reminder SMS flags
    const resetReminders = await (prisma as any).loanTerm.updateMany({
      where: {
        reminderSmsSent: 1
      },
      data: {
        reminderSmsSent: 0
      }
    })
    
    console.log(`✅ Reset ${resetReminders.count} reminder SMS flags`)
    
    // Reset overdue SMS flags
    const resetOverdue = await (prisma as any).loanTerm.updateMany({
      where: {
        overdueSmsSent: 1
      },
      data: {
        overdueSmsSent: 0
      }
    })
    
    console.log(`✅ Reset ${resetOverdue.count} overdue SMS flags`)
    
    console.log('\n✅ Successfully reset all SMS notification flags!')
    console.log('You can now test SMS notifications again.')
    
  } catch (error) {
    console.error('❌ Error resetting SMS flags:', error)
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











