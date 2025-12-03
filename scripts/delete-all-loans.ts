import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Starting deletion of all loans...')
  
  try {
    // First, count what we're about to delete
    const loanCount = await prisma.loan.count()
    const paymentCount = await prisma.payment.count()
    const termCount = await (prisma as any).loanTerm.count()
    
    console.log(`\n📊 Current data:`)
    console.log(`- Loans: ${loanCount}`)
    console.log(`- Payments: ${paymentCount}`)
    console.log(`- Loan Terms: ${termCount}`)
    
    if (loanCount === 0) {
      console.log('\n✅ No loans to delete.')
      return
    }
    
    console.log('\n⚠️  WARNING: This will delete ALL loans, payments, and loan terms!')
    console.log('This action cannot be undone.\n')
    
    // Delete payments first (they reference loans)
    console.log('Deleting payments...')
    const deletedPayments = await prisma.payment.deleteMany({})
    console.log(`✅ Deleted ${deletedPayments.count} payments`)
    
    // Delete loan terms (they reference loans, but have cascade delete)
    console.log('Deleting loan terms...')
    const deletedTerms = await (prisma as any).loanTerm.deleteMany({})
    console.log(`✅ Deleted ${deletedTerms.count} loan terms`)
    
    // Delete loans (this will also cascade delete terms, but we already did it)
    console.log('Deleting loans...')
    const deletedLoans = await prisma.loan.deleteMany({})
    console.log(`✅ Deleted ${deletedLoans.count} loans`)
    
    console.log('\n✅ Successfully deleted all loans and related data!')
    console.log('\n📊 Summary:')
    console.log(`- Deleted ${deletedLoans.count} loans`)
    console.log(`- Deleted ${deletedPayments.count} payments`)
    console.log(`- Deleted ${deletedTerms.count} loan terms`)
    
  } catch (error) {
    console.error('❌ Error deleting loans:', error)
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








