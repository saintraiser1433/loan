import { prisma } from "../lib/prisma"
import { sendSMS } from "../lib/sms"

async function checkAndSendNotifications() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calculate 7 days from now
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    console.log(`[${new Date().toISOString()}] Checking for notifications...`)

    // 1. Send reminders for payment terms due in 7 days
    const termsDueSoon = await (prisma as any).loanTerm.findMany({
      where: {
        status: { in: ["PENDING"] },
        reminderSmsSent: 0, // Only check terms that haven't received reminder SMS
        dueDate: {
          gte: today,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        loan: {
          include: {
            user: true,
            loanType: true,
          },
        },
      },
    })

    for (const term of termsDueSoon) {
      if (!term.loan || !term.loan.user) continue

      const termDueDate = new Date(term.dueDate)
      const daysUntilDue = Math.ceil(
        (termDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only send reminder if exactly 7 days or less before due date
      if (daysUntilDue <= 7 && daysUntilDue >= 0 && term.loan.user.phone) {
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"]
        const monthName = monthNames[termDueDate.getMonth()]
        const year = termDueDate.getFullYear()

        const amountDue = term.amount - (term.amountPaid || 0)
        
        const reminderMessage = `Dear ${term.loan.user.name},\n\nREMINDER: Your payment for Term ${term.termNumber} (${monthName} ${year}) is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.\n\nPayment Details:\n- Loan ID: ${term.loanId}\n- Term Number: ${term.termNumber}\n- Amount Due: ₱${amountDue.toLocaleString()}\n- Due Date: ${termDueDate.toLocaleDateString()}\n\nPlease make your payment before the due date to avoid late fees.\n\nBest regards,\nGlan Credible and Capital Inc.`

      try {
        const smsSent = await sendSMS(term.loan.user.phone, reminderMessage, term.loan.userId)
        
        // Only update status to 1 if SMS was actually sent successfully
        if (smsSent) {
          await (prisma as any).loanTerm.update({
            where: { id: term.id },
            data: { reminderSmsSent: 1 }
          })
          console.log(`✓ Sent reminder SMS for Term ${term.termNumber} (Loan ${term.loanId})`)
        } else {
          console.error(`✗ Failed to send reminder for term ${term.id}: SMS sending returned false`)
        }
      } catch (error: any) {
        console.error(`✗ Failed to send reminder for term ${term.id}:`, error.message)
        // Don't update status if there was an error
      }
      }
    }

    // 2. Update loan status to OVERDUE for loans past due date
    await prisma.loan.updateMany({
      where: {
        status: { in: ["ACTIVE"] },
        dueDate: {
          lt: today, // Past due date
        },
      },
      data: {
        status: "OVERDUE",
      },
    })

    // 3. Send notifications for overdue payment terms
    const overdueTerms = await (prisma as any).loanTerm.findMany({
      where: {
        status: { in: ["PENDING"] },
        overdueSmsSent: 0, // Only check terms that haven't received overdue SMS
        dueDate: {
          lt: today, // Past due date
        },
      },
      include: {
        loan: {
          include: {
            user: true,
            loanType: true,
          },
        },
      },
    })

    for (const term of overdueTerms) {
      if (!term.loan || !term.loan.user || !term.loan.user.phone) continue

      const termDueDate = new Date(term.dueDate)
      const daysOverdue = Math.ceil(
        (today.getTime() - termDueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      const monthNames = ["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"]
      const monthName = monthNames[termDueDate.getMonth()]
      const year = termDueDate.getFullYear()

      const amountDue = term.amount - (term.amountPaid || 0)
      const penaltyPerDay = (term.loan.loanType as any)?.latePaymentPenaltyPerDay || 0
      const estimatedPenalty = daysOverdue * penaltyPerDay
      const totalAmountDue = amountDue + (term.penaltyAmount || estimatedPenalty)

      const overdueMessage = `Dear ${term.loan.user.name},\n\n⚠️ URGENT: Your payment for Term ${term.termNumber} (${monthName} ${year}) is OVERDUE!\n\nPayment Details:\n- Loan ID: ${term.loanId}\n- Term Number: ${term.termNumber}\n- Amount Due: ₱${amountDue.toLocaleString()}\n- Days Overdue: ${daysOverdue}\n${penaltyPerDay > 0 ? `- Late Fee: ₱${(term.penaltyAmount || estimatedPenalty).toLocaleString()}\n- Total Amount Due: ₱${totalAmountDue.toLocaleString()}\n` : ''}- Due Date: ${termDueDate.toLocaleDateString()}\n\nPlease make your payment immediately to avoid additional penalties.\n\nBest regards,\nGlan Credible and Capital Inc.`

      try {
        const smsSent = await sendSMS(term.loan.user.phone, overdueMessage, term.loan.userId)
        
        // Only update status to 1 if SMS was actually sent successfully
        if (smsSent) {
          await (prisma as any).loanTerm.update({
            where: { id: term.id },
            data: { overdueSmsSent: 1 }
          })
          console.log(`✓ Sent overdue SMS for Term ${term.termNumber} (Loan ${term.loanId})`)
        } else {
          console.error(`✗ Failed to send overdue notification for term ${term.id}: SMS sending returned false`)
        }
      } catch (error: any) {
        console.error(`✗ Failed to send overdue notification for term ${term.id}:`, error.message)
        // Don't update status if there was an error
      }
    }

  } catch (error: any) {
    console.error("Error in SMS worker:", error)
  }
}

// Run the check function every 5 seconds
async function startWorker() {
  console.log("SMS Worker started - Checking every 5 seconds...")
  
  // Run immediately on start
  await checkAndSendNotifications()
  
  // Then run every 5 seconds
  setInterval(async () => {
    await checkAndSendNotifications()
  }, 5000) // 5000 milliseconds = 5 seconds
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down SMS worker...")
  await prisma.$disconnect()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("\nShutting down SMS worker...")
  await prisma.$disconnect()
  process.exit(0)
})

// Start the worker
startWorker().catch((error) => {
  console.error("Failed to start SMS worker:", error)
  process.exit(1)
})

