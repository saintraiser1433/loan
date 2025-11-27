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

  const borrower6 = await prisma.user.upsert({
    where: { email: 'borrower6@example.com' },
    update: {},
    create: {
      email: 'borrower6@example.com',
      password: hashedPassword,
      name: 'Liza Fernandez',
      role: 'BORROWER',
      phone: '+63 912 345 6796',
      status: 'APPROVED',
      creditScore: 88.5,
      loanLimit: 120000
    }
  })

  const borrower7 = await prisma.user.upsert({
    where: { email: 'borrower7@example.com' },
    update: {},
    create: {
      email: 'borrower7@example.com',
      password: hashedPassword,
      name: 'Roberto Martinez',
      role: 'BORROWER',
      phone: '+63 912 345 6797',
      status: 'APPROVED',
      creditScore: 70.0,
      loanLimit: 40000
    }
  })

  // Create contact persons
  console.log('Creating contact persons...')
  // Delete existing contact persons for these users first
  await prisma.contactPerson.deleteMany({
    where: {
      userId: {
        in: [borrower1.id, borrower2.id, borrower3.id, borrower4.id, borrower5.id, borrower6.id, borrower7.id]
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
    prisma.contactPerson.create({
      data: {
        userId: borrower4.id,
        name: 'Miguel Rodriguez',
        relationship: 'Husband',
        phone: '+63 912 345 6810'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower6.id,
        name: 'Antonio Fernandez',
        relationship: 'Father',
        phone: '+63 912 345 6811'
      }
    }),
    prisma.contactPerson.create({
      data: {
        userId: borrower7.id,
        name: 'Carmen Martinez',
        relationship: 'Wife',
        phone: '+63 912 345 6812'
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

  const application6 = await prisma.loanApplication.create({
    data: {
      userId: borrower6.id,
      loanTypeId: loanTypes[1].id, // Salary Loan
      purposeId: purposes[5].id, // Home Improvement
      paymentDurationId: durations[3].id, // 6 months
      salary: 55000,
      sourceOfIncome: 'Employment',
      maritalStatus: 'MARRIED',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      requestedAmount: 70000,
      purposeDescription: 'Home renovation project',
      status: 'APPROVED',
      creditScore: 88.5,
      loanLimit: 120000,
      evaluatedBy: loanOfficer.id,
      evaluatedAt: new Date()
    }
  })

  const application7 = await prisma.loanApplication.create({
    data: {
      userId: borrower7.id,
      loanTypeId: loanTypes[2].id, // Quick Cash
      purposeId: purposes[6].id, // Vehicle
      paymentDurationId: durations[1].id, // 30 days
      salary: 32000,
      sourceOfIncome: 'Employment',
      maritalStatus: 'MARRIED',
      primaryIdUrl: '/uploads/placeholder-id.jpg',
      secondaryId1Url: '/uploads/placeholder-id2.jpg',
      secondaryId2Url: '/uploads/placeholder-id3.jpg',
      selfieWithIdUrl: '/uploads/placeholder-selfie.jpg',
      requestedAmount: 20000,
      purposeDescription: 'Motorcycle repair',
      status: 'PENDING'
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

  const dueDate5 = new Date()
  dueDate5.setMonth(dueDate5.getMonth() + 6) // 6 months from now

  const loan4 = await prisma.loan.create({
    data: {
      applicationId: application6.id,
      userId: borrower6.id,
      loanTypeId: loanTypes[1].id,
      paymentDurationId: durations[3].id,
      principalAmount: 70000,
      interestRate: 10.0,
      totalAmount: 73500, // 70000 + (70000 * 0.10 * 6/12)
      amountPaid: 24500,
      remainingAmount: 49000,
      dueDate: dueDate5,
      status: 'ACTIVE'
    }
  })

  // Create payment methods
  console.log('Creating payment methods...')
  const paymentMethods = await Promise.all([
    prisma.paymentMethod.upsert({
      where: { name: 'GCash' },
      update: {},
      create: {
        name: 'GCash',
        accountNumber: '09123456789',
        accountName: 'Glan Credible and Capital Inc.',
        isActive: true
      }
    }),
    prisma.paymentMethod.upsert({
      where: { name: 'PayMaya' },
      update: {},
      create: {
        name: 'PayMaya',
        accountNumber: '09123456790',
        accountName: 'Glan Credible and Capital Inc.',
        isActive: true
      }
    }),
    prisma.paymentMethod.upsert({
      where: { name: 'Bank Transfer - BDO' },
      update: {},
      create: {
        name: 'Bank Transfer - BDO',
        accountNumber: '1234567890',
        accountName: 'Glan Credible and Capital Inc.',
        isActive: true
      }
    }),
    prisma.paymentMethod.upsert({
      where: { name: 'Bank Transfer - BPI' },
      update: {},
      create: {
        name: 'Bank Transfer - BPI',
        accountNumber: '0987654321',
        accountName: 'Glan Credible and Capital Inc.',
        isActive: true
      }
    }),
    prisma.paymentMethod.upsert({
      where: { name: 'Cash' },
      update: {},
      create: {
        name: 'Cash',
        accountNumber: 'N/A',
        accountName: 'Glan Credible and Capital Inc. - Main Office',
        isActive: true
      }
    }),
  ])

  // Create loan terms for each loan
  console.log('Creating loan terms...')
  
  // Loan 1: 3 months, total 25750, already paid 10000
  const loan1Terms = []
  const loan1MonthlyAmount = 25750 / 3
  const loan1StartDate = new Date(loan1.createdAt)
  for (let i = 1; i <= 3; i++) {
    const termDueDate = new Date(loan1StartDate)
    termDueDate.setMonth(termDueDate.getMonth() + i)
    const termAmount = i === 3 ? 25750 - (loan1MonthlyAmount * 2) : loan1MonthlyAmount
    
    let termStatus = 'PENDING'
    let amountPaid = 0
    let paidAt = null
    
    // First term is partially paid (5000 + 5000 = 10000, but term amount is ~8583)
    if (i === 1) {
      amountPaid = Math.min(10000, termAmount)
      termStatus = amountPaid >= termAmount ? 'PAID' : 'PENDING'
      if (termStatus === 'PAID') paidAt = new Date()
    }
    
    loan1Terms.push({
      loanId: loan1.id,
      termNumber: i,
      amount: Math.round(termAmount * 100) / 100,
      dueDate: termDueDate,
      amountPaid: Math.round(amountPaid * 100) / 100,
      status: termStatus,
      paidAt: paidAt
    })
  }
  
  // Loan 2: 6 months, fully paid
  const loan2Terms = []
  const loan2MonthlyAmount = 63000 / 6
  const loan2StartDate = new Date(loan2.createdAt)
  for (let i = 1; i <= 6; i++) {
    const termDueDate = new Date(loan2StartDate)
    termDueDate.setMonth(termDueDate.getMonth() + i)
    const termAmount = i === 6 ? 63000 - (loan2MonthlyAmount * 5) : loan2MonthlyAmount
    
    loan2Terms.push({
      loanId: loan2.id,
      termNumber: i,
      amount: Math.round(termAmount * 100) / 100,
      dueDate: termDueDate,
      amountPaid: Math.round(termAmount * 100) / 100,
      status: 'PAID',
      paidAt: new Date(loan2.createdAt.getTime() + i * 24 * 60 * 60 * 1000) // Staggered payment dates
    })
  }
  
  // Loan 4: 6 months, active, partially paid
  const loan4Terms = []
  const loan4MonthlyAmount = 73500 / 6
  const loan4StartDate = new Date(loan4.createdAt)
  for (let i = 1; i <= 6; i++) {
    const termDueDate = new Date(loan4StartDate)
    termDueDate.setMonth(termDueDate.getMonth() + i)
    const termAmount = i === 6 ? 73500 - (loan4MonthlyAmount * 5) : loan4MonthlyAmount
    
    let termStatus = 'PENDING'
    let amountPaid = 0
    let paidAt = null
    
    // First term is partially paid (24500)
    if (i === 1) {
      amountPaid = Math.min(24500, termAmount)
      termStatus = amountPaid >= termAmount ? 'PAID' : 'PENDING'
      if (termStatus === 'PAID') paidAt = new Date()
    }
    
    loan4Terms.push({
      loanId: loan4.id,
      termNumber: i,
      amount: Math.round(termAmount * 100) / 100,
      dueDate: termDueDate,
      amountPaid: Math.round(amountPaid * 100) / 100,
      status: termStatus,
      paidAt: paidAt
    })
  }

  // Loan 3: 12 months, overdue, partially paid
  const loan3Terms = []
  const loan3MonthlyAmount = 86800 / 12
  const loan3StartDate = new Date(loan3.createdAt)
  for (let i = 1; i <= 12; i++) {
    const termDueDate = new Date(loan3StartDate)
    termDueDate.setMonth(termDueDate.getMonth() + i)
    const termAmount = i === 12 ? 86800 - (loan3MonthlyAmount * 11) : loan3MonthlyAmount
    
    let termStatus = 'PENDING'
    let amountPaid = 0
    let paidAt = null
    let daysLate = 0
    let penaltyAmount = 0
    
    // First term is partially paid (20000)
    if (i === 1) {
      amountPaid = Math.min(20000, termAmount)
      // Check if overdue
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDateCheck = new Date(termDueDate)
      dueDateCheck.setHours(0, 0, 0, 0)
      if (dueDateCheck < today && amountPaid < termAmount) {
        termStatus = 'OVERDUE'
        daysLate = Math.ceil((today.getTime() - dueDateCheck.getTime()) / (1000 * 60 * 60 * 24))
        const penaltyPerDay = (loanTypes[3] as any)?.latePaymentPenaltyPerDay || 0
        penaltyAmount = daysLate * penaltyPerDay
      }
    } else {
      // Check if other terms are overdue
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDateCheck = new Date(termDueDate)
      dueDateCheck.setHours(0, 0, 0, 0)
      if (dueDateCheck < today) {
        termStatus = 'OVERDUE'
        daysLate = Math.ceil((today.getTime() - dueDateCheck.getTime()) / (1000 * 60 * 60 * 24))
        const penaltyPerDay = (loanTypes[3] as any)?.latePaymentPenaltyPerDay || 0
        penaltyAmount = daysLate * penaltyPerDay
      }
    }
    
    loan3Terms.push({
      loanId: loan3.id,
      termNumber: i,
      amount: Math.round(termAmount * 100) / 100,
      dueDate: termDueDate,
      amountPaid: Math.round(amountPaid * 100) / 100,
      status: termStatus,
      paidAt: paidAt,
      daysLate: daysLate,
      penaltyAmount: Math.round(penaltyAmount * 100) / 100
    })
  }
  
  // Delete existing terms for these loans
  await (prisma as any).loanTerm.deleteMany({
    where: {
      loanId: {
        in: [loan1.id, loan2.id, loan3.id, loan4.id]
      }
    }
  })
  
  // Create all terms
  await (prisma as any).loanTerm.createMany({
    data: [...loan1Terms, ...loan2Terms, ...loan3Terms, ...loan4Terms]
  })

  // Create payments
  console.log('Creating payments...')
  const loan1Term1 = await (prisma as any).loanTerm.findFirst({
    where: { loanId: loan1.id, termNumber: 1 }
  })
  
  const payment1 = await prisma.payment.create({
    data: {
      loanId: loan1.id,
      userId: borrower1.id,
      amount: 5000,
      paymentType: 'PARTIAL',
      paymentMethod: 'GCash',
      paymentMethodId: paymentMethods[0].id,
      termId: loan1Term1?.id,
      receiptUrl: '/uploads/placeholder-receipt.jpg',
      status: 'COMPLETED',
      approvedBy: loanOfficer.id,
      approvedAt: new Date()
    }
  })

  const payment2 = await prisma.payment.create({
    data: {
      loanId: loan1.id,
      userId: borrower1.id,
      amount: 5000,
      paymentType: 'PARTIAL',
      paymentMethod: 'Bank Transfer',
      paymentMethodId: paymentMethods[2].id,
      termId: loan1Term1?.id,
      receiptUrl: '/uploads/placeholder-receipt2.jpg',
      status: 'COMPLETED',
      approvedBy: loanOfficer.id,
      approvedAt: new Date()
    }
  })

  const loan1Term2 = await (prisma as any).loanTerm.findFirst({
    where: { loanId: loan1.id, termNumber: 2 }
  })

  const payment3 = await prisma.payment.create({
    data: {
      loanId: loan1.id,
      userId: borrower1.id,
      amount: 5000,
      paymentType: 'PARTIAL',
      paymentMethod: 'PayMaya',
      paymentMethodId: paymentMethods[1].id,
      termId: loan1Term2?.id,
      status: 'PENDING'
    }
  })

  const loan2Term1 = await (prisma as any).loanTerm.findFirst({
    where: { loanId: loan2.id, termNumber: 1 }
  })

  const payment4 = await prisma.payment.create({
    data: {
      loanId: loan2.id,
      userId: borrower2.id,
      amount: 63000,
      paymentType: 'FULL',
      paymentMethod: 'Bank Transfer',
      paymentMethodId: paymentMethods[2].id,
      termId: loan2Term1?.id,
      receiptUrl: '/uploads/placeholder-receipt3.jpg',
      status: 'COMPLETED',
      approvedBy: loanOfficer.id,
      approvedAt: new Date()
    }
  })

  const loan3Term1 = await (prisma as any).loanTerm.findFirst({
    where: { loanId: loan3.id, termNumber: 1 }
  })

  const payment5 = await prisma.payment.create({
    data: {
      loanId: loan3.id,
      userId: borrower4.id,
      amount: 20000,
      paymentType: 'PARTIAL',
      paymentMethod: 'GCash',
      paymentMethodId: paymentMethods[0].id,
      termId: loan3Term1?.id,
      receiptUrl: '/uploads/placeholder-receipt4.jpg',
      status: 'COMPLETED',
      approvedBy: loanOfficer.id,
      approvedAt: new Date()
    }
  })

  const loan4Term1 = await (prisma as any).loanTerm.findFirst({
    where: { loanId: loan4.id, termNumber: 1 }
  })

  const payment6 = await prisma.payment.create({
    data: {
      loanId: loan4.id,
      userId: borrower6.id,
      amount: 12250,
      paymentType: 'PARTIAL',
      paymentMethod: 'PayMaya',
      paymentMethodId: paymentMethods[1].id,
      termId: loan4Term1?.id,
      receiptUrl: '/uploads/placeholder-receipt5.jpg',
      status: 'COMPLETED',
      approvedBy: loanOfficer.id,
      approvedAt: new Date()
    }
  })

  const payment7 = await prisma.payment.create({
    data: {
      loanId: loan4.id,
      userId: borrower6.id,
      amount: 12250,
      paymentType: 'PARTIAL',
      paymentMethod: 'Bank Transfer - BPI',
      paymentMethodId: paymentMethods[3].id,
      termId: loan4Term1?.id,
      receiptUrl: '/uploads/placeholder-receipt6.jpg',
      status: 'COMPLETED',
      approvedBy: loanOfficer.id,
      approvedAt: new Date()
    }
  })

  // Create SMS settings
  console.log('Creating SMS settings...')
  // Delete existing SMS settings and create new one
  await prisma.sMSSettings.deleteMany({})
  await prisma.sMSSettings.create({
    data: {
      mode: 'cloud',
      cloudServerUrl: 'https://api.sms-gate.app/3rdparty/v1',
      localServerUrl: null,
      username: 'demo_user',
      password: 'demo_password',
      isActive: false // Set to false by default, user needs to configure
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

  // Create activity logs
  console.log('Creating activity logs...')
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: admin.id,
        description: 'Admin user logged in',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: loanOfficer.id,
        action: 'APPROVE_APPLICATION',
        entityType: 'LOAN_APPLICATION',
        entityId: application1.id,
        description: `Approved loan application for ${borrower1.name}`,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: loanOfficer.id,
        action: 'APPROVE_PAYMENT',
        entityType: 'PAYMENT',
        entityId: payment1.id,
        description: `Approved payment of ₱${payment1.amount.toLocaleString()} for loan ${loan1.id}`,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: borrower1.id,
        action: 'CREATE_PAYMENT',
        entityType: 'PAYMENT',
        entityId: payment1.id,
        description: `Created payment of ₱${payment1.amount.toLocaleString()} for loan ${loan1.id}`,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: borrower2.id,
        action: 'CREATE_APPLICATION',
        entityType: 'LOAN_APPLICATION',
        entityId: application2.id,
        description: `Created loan application for ₱${application2.requestedAmount.toLocaleString()}`,
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (Android; Mobile; rv:68.0)'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: loanOfficer.id,
        action: 'REJECT_APPLICATION',
        entityType: 'LOAN_APPLICATION',
        entityId: application5.id,
        description: `Rejected loan application for ${borrower5.name}`,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }),
  ])

  // Count records
  const contactPersonCount = await prisma.contactPerson.count()
  const loanTermCount = await (prisma as any).loanTerm.count()
  const activityLogCount = await prisma.activityLog.count()

  console.log('✅ Seed data created successfully!')
  console.log('\n📋 Summary:')
  console.log(`- ${purposes.length} loan purposes`)
  console.log(`- ${durations.length} payment durations`)
  console.log(`- ${loanTypes.length} loan types`)
  console.log(`- ${paymentMethods.length} payment methods`)
  console.log('- 1 Admin user (admin@loan.com / admin123)')
  console.log('- 1 Loan Officer (officer@loan.com / password123)')
  console.log('- 5 Borrower users (borrower1-5@example.com / password123)')
  console.log(`- ${contactPersonCount} Contact persons`)
  console.log('- 7 Loan applications (4 approved, 2 pending, 1 rejected)')
  console.log('- 4 Loans (2 active, 1 paid, 1 overdue)')
  console.log(`- ${loanTermCount} Loan terms (with various statuses)`)
  console.log('- 7 Payments (6 completed, 1 pending)')
  console.log('- 1 SMS Settings (default configuration)')
  console.log('- 3 SMS logs')
  console.log(`- ${activityLogCount} Activity logs`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

