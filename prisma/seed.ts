import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed process...')

  // Create loan purposes
  console.log('Creating loan purposes...')
  const purposes = await Promise.all([
    prisma.loanPurpose.upsert({
      where: { name: 'Education' },
      update: {},
      create: { name: 'Education', description: 'Educational expenses' }
    }),
    prisma.loanPurpose.upsert({
      where: { name: 'Travel' },
      update: {},
      create: { name: 'Travel', description: 'Travel expenses' }
    }),
    prisma.loanPurpose.upsert({
      where: { name: 'Health' },
      update: {},
      create: { name: 'Health', description: 'Medical and health expenses' }
    }),
    prisma.loanPurpose.upsert({
      where: { name: 'Emergency' },
      update: {},
      create: { name: 'Emergency', description: 'Emergency expenses' }
    }),
    prisma.loanPurpose.upsert({
      where: { name: 'Business' },
      update: {},
      create: { name: 'Business', description: 'Business expenses' }
    }),
    prisma.loanPurpose.upsert({
      where: { name: 'Home Improvement' },
      update: {},
      create: { name: 'Home Improvement', description: 'Home renovation and improvement' }
    }),
    prisma.loanPurpose.upsert({
      where: { name: 'Vehicle' },
      update: {},
      create: { name: 'Vehicle', description: 'Vehicle purchase or repair' }
    }),
  ])

  // Create payment durations
  console.log('Creating payment durations...')
  const durations = await Promise.all([
    prisma.paymentDuration.upsert({
      where: { label: '15 days' },
      update: {},
      create: { label: '15 days', days: 15 }
    }),
    prisma.paymentDuration.upsert({
      where: { label: '30 days' },
      update: {},
      create: { label: '30 days', days: 30 }
    }),
    prisma.paymentDuration.upsert({
      where: { label: '3 months' },
      update: {},
      create: { label: '3 months', days: 90 }
    }),
    prisma.paymentDuration.upsert({
      where: { label: '6 months' },
      update: {},
      create: { label: '6 months', days: 180 }
    }),
    prisma.paymentDuration.upsert({
      where: { label: '12 months' },
      update: {},
      create: { label: '12 months', days: 365 }
    }),
  ])

  // Create loan types
  console.log('Creating loan types...')
  const loanTypes = await Promise.all([
    prisma.loanType.upsert({
      where: { name: 'Personal Loan' },
      update: {},
      create: {
        name: 'Personal Loan',
        description: 'General purpose personal loan',
        interestRatesByMonth: JSON.stringify({ 1: 12.0, 3: 10.0, 6: 9.0, 12: 8.0 }),
        minAmount: 1000,
        maxAmount: 100000
      }
    }),
    prisma.loanType.upsert({
      where: { name: 'Salary Loan' },
      update: {},
      create: {
        name: 'Salary Loan',
        description: 'Loan based on salary',
        interestRatesByMonth: JSON.stringify({ 1: 10.0, 3: 8.0, 6: 7.0, 12: 6.0 }),
        minAmount: 5000,
        maxAmount: 500000
      }
    }),
    prisma.loanType.upsert({
      where: { name: 'Quick Cash' },
      update: {},
      create: {
        name: 'Quick Cash',
        description: 'Fast approval small loan',
        interestRatesByMonth: JSON.stringify({ 1: 15.0, 3: 12.0, 6: 10.0, 12: 9.0 }),
        minAmount: 500,
        maxAmount: 50000
      }
    }),
    prisma.loanType.upsert({
      where: { name: 'Business Loan' },
      update: {},
      create: {
        name: 'Business Loan',
        description: 'Loan for business purposes',
        interestRatesByMonth: JSON.stringify({ 1: 8.5, 3: 7.0, 6: 6.0, 12: 5.0 }),
        minAmount: 10000,
        maxAmount: 1000000
      }
    }),
  ])

  // Create users
  console.log('Creating users...')
  const hashedPassword = await bcrypt.hash('password123', 10)
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@loan.com' },
    update: {},
    create: {
      email: 'admin@loan.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      phone: '+63 912 345 6789',
      creditScore: 0,
      loanLimit: 0
    }
  })

  const loanOfficer = await prisma.user.upsert({
    where: { email: 'officer@loan.com' },
    update: {},
    create: {
      email: 'officer@loan.com',
      password: hashedPassword,
      name: 'Loan Officer',
      role: 'LOAN_OFFICER',
      phone: '+63 912 345 6790',
      creditScore: 0,
      loanLimit: 0
    }
  })

  // Create borrowers
  const borrower1 = await prisma.user.upsert({
    where: { email: 'borrower1@example.com' },
    update: {},
    create: {
      email: 'borrower1@example.com',
      password: hashedPassword,
      name: 'Juan Dela Cruz',
      role: 'BORROWER',
      phone: '+63 912 345 6791',
      status: 'APPROVED',
      creditScore: 75.5,
      loanLimit: 50000
    }
  })

  const borrower2 = await prisma.user.upsert({
    where: { email: 'borrower2@example.com' },
    update: {},
    create: {
      email: 'borrower2@example.com',
      password: hashedPassword,
      name: 'Maria Santos',
      role: 'BORROWER',
      phone: '+63 912 345 6792',
      status: 'APPROVED',
      creditScore: 82.0,
      loanLimit: 75000
    }
  })

  const borrower3 = await prisma.user.upsert({
    where: { email: 'borrower3@example.com' },
    update: {},
    create: {
      email: 'borrower3@example.com',
      password: hashedPassword,
      name: 'Pedro Garcia',
      role: 'BORROWER',
      phone: '+63 912 345 6793',
      status: 'APPROVED',
      creditScore: 65.0,
      loanLimit: 30000
    }
  })

  const borrower4 = await prisma.user.upsert({
    where: { email: 'borrower4@example.com' },
    update: {},
    create: {
      email: 'borrower4@example.com',
      password: hashedPassword,
      name: 'Ana Rodriguez',
      role: 'BORROWER',
      phone: '+63 912 345 6794',
      status: 'APPROVED',
      creditScore: 90.0,
      loanLimit: 100000
    }
  })

  const borrower5 = await prisma.user.upsert({
    where: { email: 'borrower5@example.com' },
    update: {},
    create: {
      email: 'borrower5@example.com',
      password: hashedPassword,
      name: 'Carlos Mendoza',
      role: 'BORROWER',
      phone: '+63 912 345 6795',
      status: 'PENDING', // Keep one as pending for testing
      creditScore: 0,
      loanLimit: 0
    }
  })

  // Create contact persons
  console.log('Creating contact persons...')
  // Delete existing contact persons for these users first
  await prisma.contactPerson.deleteMany({
    where: {
      userId: {
        in: [borrower1.id, borrower2.id, borrower3.id, borrower4.id, borrower5.id]
      }
    }
  })

  await Promise.all([
    prisma.contactPerson.create({
      data: {
        userId: borrower1.id,
        name: 'Rosa Dela Cruz',
        relationship: 'Mother',
        phone: '+63 912 345 6801'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower1.id,
        name: 'Jose Dela Cruz',
        relationship: 'Brother',
        phone: '+63 912 345 6802'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower1.id,
        name: 'Luz Dela Cruz',
        relationship: 'Sister',
        phone: '+63 912 345 6803'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower2.id,
        name: 'Roberto Santos',
        relationship: 'Husband',
        phone: '+63 912 345 6804'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower2.id,
        name: 'Carmen Santos',
        relationship: 'Mother',
        phone: '+63 912 345 6805'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower2.id,
        name: 'Luis Santos',
        relationship: 'Brother',
        phone: '+63 912 345 6806'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower3.id,
        name: 'Elena Garcia',
        relationship: 'Mother',
        phone: '+63 912 345 6807'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower3.id,
        name: 'Miguel Garcia',
        relationship: 'Father',
        phone: '+63 912 345 6808'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower3.id,
        name: 'Sofia Garcia',
        relationship: 'Sister',
        phone: '+63 912 345 6809'
      }
    }),
  ])

  // Create loan applications
  console.log('Creating loan applications...')
  const application1 = await prisma.loanApplication.create({
    data: {
      userId: borrower1.id,
      loanTypeId: loanTypes[0].id, // Personal Loan
      purposeId: purposes[2].id, // Health
      paymentDurationId: durations[2].id, // 3 months
      salary: 35000,
      sourceOfIncome: 'Employment',
      maritalStatus: 'SINGLE',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      payslipUrl: '/uploads/placeholder-payslip.jpg',
      requestedAmount: 25000,
      purposeDescription: 'Medical expenses for family member',
      status: 'APPROVED',
      creditScore: 75.5,
      loanLimit: 50000,
      evaluatedBy: loanOfficer.id,
      evaluatedAt: new Date()
    }
  })

  const application2 = await prisma.loanApplication.create({
    data: {
      userId: borrower2.id,
      loanTypeId: loanTypes[1].id, // Salary Loan
      purposeId: purposes[0].id, // Education
      paymentDurationId: durations[3].id, // 6 months
      salary: 45000,
      sourceOfIncome: 'Employment',
      maritalStatus: 'MARRIED',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      requestedAmount: 60000,
      purposeDescription: 'Tuition fee for children',
      status: 'APPROVED',
      creditScore: 82.0,
      loanLimit: 75000,
      evaluatedBy: loanOfficer.id,
      evaluatedAt: new Date()
    }
  })

  const application3 = await prisma.loanApplication.create({
    data: {
      userId: borrower3.id,
      loanTypeId: loanTypes[2].id, // Quick Cash
      purposeId: purposes[3].id, // Emergency
      paymentDurationId: durations[1].id, // 30 days
      salary: 28000,
      sourceOfIncome: 'Employment',
      maritalStatus: 'SINGLE',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      requestedAmount: 15000,
      purposeDescription: 'Emergency car repair',
      status: 'PENDING'
    }
  })

  const application4 = await prisma.loanApplication.create({
    data: {
      userId: borrower4.id,
      loanTypeId: loanTypes[3].id, // Business Loan
      purposeId: purposes[4].id, // Business
      paymentDurationId: durations[4].id, // 12 months
      salary: 60000,
      sourceOfIncome: 'Business',
      maritalStatus: 'MARRIED',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      requestedAmount: 80000,
      purposeDescription: 'Business expansion capital',
      status: 'APPROVED',
      creditScore: 90.0,
      loanLimit: 100000,
      evaluatedBy: loanOfficer.id,
      evaluatedAt: new Date()
    }
  })

  const application5 = await prisma.loanApplication.create({
    data: {
      userId: borrower5.id,
      loanTypeId: loanTypes[0].id, // Personal Loan
      purposeId: purposes[1].id, // Travel
      paymentDurationId: durations[2].id, // 3 months
      salary: 25000,
      sourceOfIncome: 'Employment',
      maritalStatus: 'SINGLE',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      requestedAmount: 30000,
      purposeDescription: 'Family vacation',
      status: 'REJECTED',
      rejectionReason: 'Insufficient credit score and income',
      evaluatedBy: loanOfficer.id,
      evaluatedAt: new Date()
    }
  })

  // Create loans
  console.log('Creating loans...')
  const dueDate1 = new Date()
  dueDate1.setMonth(dueDate1.getMonth() + 3) // 3 months from now

  const dueDate2 = new Date()
  dueDate2.setMonth(dueDate2.getMonth() + 6) // 6 months from now

  const dueDate3 = new Date()
  dueDate3.setMonth(dueDate3.getMonth() + 12) // 12 months from now

  const dueDate4 = new Date()
  dueDate4.setDate(dueDate4.getDate() - 5) // 5 days overdue

  const loan1 = await prisma.loan.create({
    data: {
      applicationId: application1.id,
      userId: borrower1.id,
      loanTypeId: loanTypes[0].id,
      paymentDurationId: durations[2].id,
      principalAmount: 25000,
      interestRate: 12.0,
      totalAmount: 25750, // 25000 + (25000 * 0.12 * 3/12)
      amountPaid: 10000,
      remainingAmount: 15750,
      dueDate: dueDate1,
      status: 'ACTIVE'
    }
  })

  const loan2 = await prisma.loan.create({
    data: {
      applicationId: application2.id,
      userId: borrower2.id,
      loanTypeId: loanTypes[1].id,
      paymentDurationId: durations[3].id,
      principalAmount: 60000,
      interestRate: 10.0,
      totalAmount: 63000, // 60000 + (60000 * 0.10 * 6/12)
      amountPaid: 63000,
      remainingAmount: 0,
      dueDate: dueDate2,
      status: 'PAID'
    }
  })

  const loan3 = await prisma.loan.create({
    data: {
      applicationId: application4.id,
      userId: borrower4.id,
      loanTypeId: loanTypes[3].id,
      paymentDurationId: durations[4].id,
      principalAmount: 80000,
      interestRate: 8.5,
      totalAmount: 86800, // 80000 + (80000 * 0.085 * 12/12)
      amountPaid: 20000,
      remainingAmount: 66800,
      dueDate: dueDate4,
      status: 'OVERDUE'
    }
  })

  // Create payments
  console.log('Creating payments...')
  await prisma.payment.create({
    data: {
      loanId: loan1.id,
      userId: borrower1.id,
      amount: 5000,
      paymentType: 'PARTIAL',
      paymentMethod: 'GCash',
      receiptUrl: '/uploads/placeholder-receipt.jpg',
      status: 'COMPLETED'
    }
  })

  await prisma.payment.create({
    data: {
      loanId: loan1.id,
      userId: borrower1.id,
      amount: 5000,
      paymentType: 'PARTIAL',
      paymentMethod: 'Bank Transfer',
      receiptUrl: '/uploads/placeholder-receipt2.jpg',
      status: 'COMPLETED'
    }
  })

  await prisma.payment.create({
    data: {
      loanId: loan1.id,
      userId: borrower1.id,
      amount: 5000,
      paymentType: 'PARTIAL',
      paymentMethod: 'PayMaya',
      status: 'PENDING'
    }
  })

  await prisma.payment.create({
    data: {
      loanId: loan2.id,
      userId: borrower2.id,
      amount: 63000,
      paymentType: 'FULL',
      paymentMethod: 'Bank Transfer',
      receiptUrl: '/uploads/placeholder-receipt3.jpg',
      status: 'COMPLETED'
    }
  })

  await prisma.payment.create({
    data: {
      loanId: loan3.id,
      userId: borrower4.id,
      amount: 20000,
      paymentType: 'PARTIAL',
      paymentMethod: 'GCash',
      receiptUrl: '/uploads/placeholder-receipt4.jpg',
      status: 'COMPLETED'
    }
  })

  // Create SMS logs
  console.log('Creating SMS logs...')
  await prisma.sMSLog.create({
    data: {
      userId: borrower1.id,
      phone: borrower1.phone || '+63 912 345 6791',
      message: 'Your loan application has been approved. Loan limit: ₱50,000',
      status: 'sent'
    }
  })

  await prisma.sMSLog.create({
    data: {
      userId: borrower2.id,
      phone: borrower2.phone || '+63 912 345 6792',
      message: 'Your loan application has been approved. Loan limit: ₱75,000',
      status: 'sent'
    }
  })

  await prisma.sMSLog.create({
    data: {
      userId: borrower5.id,
      phone: borrower5.phone || '+63 912 345 6795',
      message: 'Your loan application has been rejected. Reason: Insufficient credit score and income',
      status: 'sent'
    }
  })

  // Count contact persons
  const contactPersonCount = await prisma.contactPerson.count()

  console.log('✅ Seed data created successfully!')
  console.log('\n📋 Summary:')
  console.log(`- ${purposes.length} loan purposes`)
  console.log(`- ${durations.length} payment durations`)
  console.log(`- ${loanTypes.length} loan types`)
  console.log('- 1 Admin user (admin@loan.com / admin123)')
  console.log('- 1 Loan Officer (officer@loan.com / password123)')
  console.log('- 5 Borrower users (borrower1-5@example.com / password123)')
  console.log(`- ${contactPersonCount} Contact persons`)
  console.log('- 5 Loan applications (3 approved, 1 pending, 1 rejected)')
  console.log('- 3 Loans (1 active, 1 paid, 1 overdue)')
  console.log('- 5 Payments (3 completed, 1 pending)')
  console.log('- 3 SMS logs')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

