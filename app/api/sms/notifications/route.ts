import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/sms"

// This endpoint should be called by a cron job (e.g., every hour or daily)
// You can set it up with Vercel Cron, GitHub Actions, or any cron service
export async function GET(request: Request) {
  try {
    // Verify request is from authorized source (optional but recommended)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = {
      dueDateReminders: 0,
      overdueNotifications: 0,
      errors: [] as string[],
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calculate 7 days from now
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

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
          await sendSMS(term.loan.user.phone, reminderMessage, term.loan.userId)
          
          // Update status to 1 (sent)
          await (prisma as any).loanTerm.update({
            where: { id: term.id },
            data: { reminderSmsSent: 1 }
          })
          
          results.dueDateReminders++
        } catch (error: any) {
          results.errors.push(`Failed to send reminder for term ${term.id}: ${error.message}`)
        }
      }
    }

    // 2. Update loan status to OVERDUE for loans with unpaid terms past due date
    // First, find all loans with unpaid terms (PENDING or OVERDUE) that are overdue
    // PAID terms should never make a loan overdue
    const loansWithOverdueTerms = await prisma.loan.findMany({
      where: {
        status: { in: ["ACTIVE"] },
        terms: {
          some: {
            status: { in: ["PENDING", "OVERDUE"] }, // Only check unpaid terms
            dueDate: {
              lt: today, // Past due date
            },
          },
        },
      },
      select: {
        id: true,
      },
    })

    // Update only loans that have unpaid overdue terms
    if (loansWithOverdueTerms.length > 0) {
      await prisma.loan.updateMany({
        where: {
          id: {
            in: loansWithOverdueTerms.map((l) => l.id),
          },
        },
        data: {
          status: "OVERDUE",
        },
      })
    }

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
        await sendSMS(term.loan.user.phone, overdueMessage, term.loan.userId)
        
        // Update status to 1 (sent)
        await (prisma as any).loanTerm.update({
          where: { id: term.id },
          data: { overdueSmsSent: 1 }
        })
        
        results.overdueNotifications++
      } catch (error: any) {
        results.errors.push(`Failed to send overdue notification for term ${term.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "SMS notifications processed",
      results,
    })
  } catch (error: any) {
    console.error("Error processing SMS notifications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process notifications" },
      { status: 500 }
    )
  }
}

