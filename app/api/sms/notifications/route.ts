import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/sms"
import { createNotification } from "@/lib/notifications"
import { formatCurrencyPlain } from "@/lib/utils"

// This endpoint should be called by a cron job (e.g., every hour or daily)
// You can set it up with Vercel Cron, GitHub Actions, or any cron service
export async function GET(request: Request) {
  try {
    // Verify request is from authorized source (optional but recommended)
    // Allow client-side requests (from browser) but require auth for external cron jobs
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const referer = request.headers.get("referer")
    const isClientRequest = referer && referer.includes(request.headers.get("host") || "")
    
    // Only require auth if CRON_SECRET is set AND it's not a client request
    if (cronSecret && !isClientRequest && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = {
      dueDateReminders: 0,
      overdueNotifications: 0,
      errors: [] as string[],
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log(`[SMS Notifications] Checking notifications for date: ${today.toISOString()}`)
    
    // Calculate 7 days from now
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    // 1. Send reminders for payment terms due in 7 days
    // Check terms that are due within 7 days and either haven't received reminder OR
    // the due date has changed (reminder was sent for a different date)
    const termsDueSoon = await (prisma as any).loanTerm.findMany({
      where: {
        status: { in: ["PENDING"] },
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

    console.log(`[SMS Notifications] Found ${termsDueSoon.length} terms due within 7 days`)
    
    for (const term of termsDueSoon) {
      if (!term.loan || !term.loan.user) continue

      const termDueDate = new Date(term.dueDate)
      termDueDate.setHours(0, 0, 0, 0)
      const daysUntilDue = Math.ceil(
        (termDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only send reminder if exactly 7 days or less before due date AND not overdue
      // Don't send "due soon" notifications if term is already overdue (overdue notifications will handle that)
      // Also check if term is already overdue - if so, skip "due soon" notification
      const isOverdue = daysUntilDue < 0
      const shouldSendReminder = daysUntilDue <= 7 && daysUntilDue >= 0 && !isOverdue && term.loan.user.phone
      
      console.log(`[SMS Notifications] Term ${term.id}: daysUntilDue=${daysUntilDue}, shouldSend=${shouldSendReminder}, reminderSmsSent=${term.reminderSmsSent}`)
      
      if (shouldSendReminder) {
        // Always send reminder if:
        // 1. Never sent before (reminderSmsSent === 0), OR
        // 2. It's a new day (check if we sent today by comparing dates)
        // We'll send once per day for terms due within 7 days
        let shouldSendToday = true
        
        // If we already sent, check if it was today
        if (term.reminderSmsSent === 1) {
          // Check if we sent today by looking at updatedAt
          // But updatedAt can be updated for other reasons, so we'll be more lenient
          // If updatedAt is from today, assume we already sent
          if (term.updatedAt) {
            const lastUpdated = new Date(term.updatedAt)
            lastUpdated.setHours(0, 0, 0, 0)
            const todayCheck = new Date(today)
            // If updated today, don't send again (to avoid duplicates)
            if (lastUpdated.getTime() === todayCheck.getTime()) {
              shouldSendToday = false
              console.log(`[SMS Notifications] Term ${term.id}: Already sent reminder today, skipping`)
            }
          }
        }
        
        if (shouldSendToday) {
          const monthNames = ["January", "February", "March", "April", "May", "June", 
                             "July", "August", "September", "October", "November", "December"]
          const monthName = monthNames[termDueDate.getMonth()]
          const year = termDueDate.getFullYear()

          const amountDue = term.amount - (term.amountPaid || 0)
          
          // Check if notification already exists for this term today
          const todayStart = new Date(today)
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date(today)
          todayEnd.setHours(23, 59, 59, 999)
          
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: term.loan.userId,
              type: "PAYMENT_DUE_SOON",
              entityType: "LOAN_TERM",
              entityId: term.id,
              createdAt: {
                gte: todayStart,
                lte: todayEnd
              }
            }
          })

          // Only create notification if one doesn't exist for today
          if (!existingNotification) {
            const reminderMessage = `Dear ${term.loan.user.name},\n\nREMINDER: Your payment for Term ${term.termNumber} (${monthName} ${year}) is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.\n\nPayment Details:\n- Loan ID: ${term.loanId}\n- Term Number: ${term.termNumber}\n- Amount Due: ₱${formatCurrencyPlain(amountDue)}\n- Due Date: ${termDueDate.toLocaleDateString()}\n\nPlease make your payment before the due date to avoid late fees.\n\nBest regards,\nGlan Credible and Capital Inc.`

            try {
              // Create in-app notification for borrower (only once per day)
              console.log(`[SMS Notifications] Creating notification for term ${term.id}, user ${term.loan.userId}`)
              const notification = await createNotification({
                userId: term.loan.userId,
                type: "PAYMENT_DUE_SOON",
                title: `Payment Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}`,
                message: `Your payment for Term ${term.termNumber} (${monthName} ${year}) is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Amount due: ₱${formatCurrencyPlain(amountDue)}`,
                link: `/dashboard/loans/${term.loanId}`,
                entityType: "LOAN_TERM",
                entityId: term.id
              })

              if (notification) {
                console.log(`[SMS Notifications] ✅ Created notification ${notification.id} for term ${term.id}`)
              } else {
                console.error(`[SMS Notifications] ❌ Failed to create notification for term ${term.id} - createNotification returned null`)
              }

              // Try to send SMS
              const smsSent = await sendSMS(term.loan.user.phone, reminderMessage, term.loan.userId)
              
              if (smsSent) {
                // Only update flag if SMS was actually sent (not skipped)
                // Update status to 1 (sent) and update timestamp
                await (prisma as any).loanTerm.update({
                  where: { id: term.id },
                  data: { 
                    reminderSmsSent: 1,
                    updatedAt: new Date() // Update timestamp to track when reminder was sent
                  }
                })
                
                console.log(`[SMS Notifications] ✅ Sent reminder for term ${term.id} (${daysUntilDue} days until due)`)
                results.dueDateReminders++
              } else {
                console.log(`[SMS Notifications] ⚠️ SMS skipped for term ${term.id} (SMS not configured or inactive), but notification created`)
                results.errors.push(`SMS skipped for term ${term.id}: SMS settings not configured or inactive`)
              }
            } catch (error: any) {
              console.error(`[SMS Notifications] ❌ Failed to send reminder for term ${term.id}:`, error)
              results.errors.push(`Failed to send reminder for term ${term.id}: ${error.message}`)
            }
          } else {
            console.log(`[SMS Notifications] ⏭️ Skipping notification for term ${term.id} - already sent today`)
          }
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
    // Check all overdue terms, not just those that haven't received SMS
    // We'll send once per day for overdue terms
    const overdueTerms = await (prisma as any).loanTerm.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] }, // Include both PENDING and OVERDUE
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

    console.log(`[SMS Notifications] Found ${overdueTerms.length} overdue terms`)
    
    for (const term of overdueTerms) {
      if (!term.loan || !term.loan.user || !term.loan.user.phone) continue

      const termDueDate = new Date(term.dueDate)
      termDueDate.setHours(0, 0, 0, 0)
      const daysOverdue = Math.ceil(
        (today.getTime() - termDueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Send overdue notification if it hasn't been sent, or send daily for overdue terms
      // Check if we already sent today by comparing updatedAt date
      let shouldSendToday = true
      
      // If we already sent, check if it was today
      if (term.overdueSmsSent === 1) {
        // Check if we sent today by looking at updatedAt
        if (term.updatedAt) {
          const lastUpdated = new Date(term.updatedAt)
          lastUpdated.setHours(0, 0, 0, 0)
          const todayCheck = new Date(today)
          // If updated today, don't send again (to avoid duplicates)
          if (lastUpdated.getTime() === todayCheck.getTime()) {
            shouldSendToday = false
            console.log(`[SMS Notifications] Overdue Term ${term.id}: Already sent overdue notification today, skipping`)
          }
        }
      }
      
      console.log(`[SMS Notifications] Overdue Term ${term.id}: daysOverdue=${daysOverdue}, shouldSend=${shouldSendToday}, overdueSmsSent=${term.overdueSmsSent}`)
      
      if (shouldSendToday && daysOverdue > 0) {
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"]
        const monthName = monthNames[termDueDate.getMonth()]
        const year = termDueDate.getFullYear()

        const amountDue = term.amount - (term.amountPaid || 0)
        const penaltyPerDay = (term.loan.loanType as any)?.latePaymentPenaltyPerDay || 0
        const estimatedPenalty = daysOverdue * penaltyPerDay
        const totalAmountDue = amountDue + (term.penaltyAmount || estimatedPenalty)

        // Check if notification already exists for this term today
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: term.loan.userId,
            type: "PAYMENT_OVERDUE",
            entityType: "LOAN_TERM",
            entityId: term.id,
            createdAt: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        })

        // Only create notification if one doesn't exist for today
        if (!existingNotification) {
          const overdueMessage = `Dear ${term.loan.user.name},\n\n⚠️ URGENT: Your payment for Term ${term.termNumber} (${monthName} ${year}) is OVERDUE!\n\nPayment Details:\n- Loan ID: ${term.loanId}\n- Term Number: ${term.termNumber}\n- Amount Due: ₱${formatCurrencyPlain(amountDue)}\n- Days Overdue: ${daysOverdue}\n${penaltyPerDay > 0 ? `- Late Fee: ₱${formatCurrencyPlain(term.penaltyAmount || estimatedPenalty)}\n- Total Amount Due: ₱${formatCurrencyPlain(totalAmountDue)}\n` : ''}- Due Date: ${termDueDate.toLocaleDateString()}\n\nPlease make your payment immediately to avoid additional penalties.\n\nBest regards,\nGlan Credible and Capital Inc.`

          try {
            // Create in-app notification for borrower (only once per day)
            console.log(`[SMS Notifications] Creating overdue notification for term ${term.id}, user ${term.loan.userId}`)
            const notification = await createNotification({
              userId: term.loan.userId,
              type: "PAYMENT_OVERDUE",
              title: `⚠️ Payment Overdue - ${daysOverdue} Day${daysOverdue !== 1 ? 's' : ''}`,
              message: `Your payment for Term ${term.termNumber} (${monthName} ${year}) is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Amount due: ₱${formatCurrencyPlain(amountDue)}${penaltyPerDay > 0 ? ` + Late fee: ₱${formatCurrencyPlain(term.penaltyAmount || estimatedPenalty)}` : ''}`,
              link: `/dashboard/loans/${term.loanId}`,
              entityType: "LOAN_TERM",
              entityId: term.id
            })

            if (notification) {
              console.log(`[SMS Notifications] ✅ Created overdue notification ${notification.id} for term ${term.id}`)
            } else {
              console.error(`[SMS Notifications] ❌ Failed to create overdue notification for term ${term.id} - createNotification returned null`)
            }

            // Try to send SMS
            const smsSent = await sendSMS(term.loan.user.phone, overdueMessage, term.loan.userId)
            
            if (smsSent) {
              // Only update flag if SMS was actually sent (not skipped)
              // Update status to 1 (sent) and update timestamp
              await (prisma as any).loanTerm.update({
                where: { id: term.id },
                data: { 
                  overdueSmsSent: 1,
                  status: "OVERDUE", // Also update term status to OVERDUE
                  updatedAt: new Date() // Update timestamp to track when notification was sent
                }
              })
              
              console.log(`[SMS Notifications] ✅ Sent overdue notification for term ${term.id} (${daysOverdue} days overdue)`)
              results.overdueNotifications++
            } else {
              console.log(`[SMS Notifications] ⚠️ SMS skipped for overdue term ${term.id} (SMS not configured or inactive), but notification created`)
              results.errors.push(`SMS skipped for overdue term ${term.id}: SMS settings not configured or inactive`)
            }
          } catch (error: any) {
            console.error(`[SMS Notifications] ❌ Failed to send overdue notification for term ${term.id}:`, error)
            results.errors.push(`Failed to send overdue notification for term ${term.id}: ${error.message}`)
          }
        } else {
          console.log(`[SMS Notifications] ⏭️ Skipping overdue notification for term ${term.id} - already sent today`)
        }
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

