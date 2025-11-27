import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"
import { sendSMS } from "@/lib/sms"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins and loan officers can approve payments
    if (session.user.role !== "ADMIN" && session.user.role !== "LOAN_OFFICER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Fetch payment with related data
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            terms: {
              orderBy: {
                termNumber: "asc"
              }
            },
            user: true,
            loanType: true
          }
        },
        term: true // Include term to get payment month
      }
    })
    
    // Get termId from payment record (if available) or find by matching amount
    const termId = (payment as any).termId

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment is already ${payment.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Update payment status to COMPLETED
    await prisma.payment.update({
      where: { id },
      data: {
        status: "COMPLETED",
        approvedBy: session.user.id,
        approvedAt: new Date()
      }
    })

    // Update term if termId exists
    let updatedTerm = null
    if (termId) {
      // Find the term by termId (exact match)
      const term = payment.loan.terms?.find((t: any) => t.id === termId)
      
      if (term) {
        const newTermAmountPaid = (term.amountPaid || 0) + payment.amount
        const termFullyPaid = newTermAmountPaid >= term.amount

        updatedTerm = await (prisma as any).loanTerm.update({
          where: { id: term.id },
          data: {
            amountPaid: newTermAmountPaid,
            status: termFullyPaid ? "PAID" : "PENDING",
            paidAt: termFullyPaid ? new Date() : term.paidAt
          }
        })
      }
    } else if (payment.loan.terms) {
      // Fallback: Find the term that matches the payment amount (for backward compatibility)
      const term = payment.loan.terms.find((t: any) => {
        const amountDue = t.amount - (t.amountPaid || 0)
        return Math.abs(amountDue - payment.amount) < 0.01 // Allow small floating point differences
      })
      
      if (term) {
        const newTermAmountPaid = (term.amountPaid || 0) + payment.amount
        const termFullyPaid = newTermAmountPaid >= term.amount

        updatedTerm = await (prisma as any).loanTerm.update({
          where: { id: term.id },
          data: {
            amountPaid: newTermAmountPaid,
            status: termFullyPaid ? "PAID" : "PENDING",
            paidAt: termFullyPaid ? new Date() : term.paidAt
          }
        })
      }
    }

    // Fetch updated terms to recalculate loan amounts accurately
    const updatedTerms = await (prisma as any).loanTerm.findMany({
      where: { loanId: payment.loanId },
      orderBy: { termNumber: "asc" }
    })
    
    // Recalculate amountPaid and remainingAmount based on actual term payments
    const totalPaidFromTerms = updatedTerms.reduce((sum: number, term: any) => {
      return sum + (term.amountPaid || 0)
    }, 0)
    
    const loan = payment.loan
    // Round to 2 decimal places to avoid floating point issues
    const newAmountPaid = Math.round(totalPaidFromTerms * 100) / 100
    const newRemainingAmount = Math.max(0, Math.round((loan.totalAmount - totalPaidFromTerms) * 100) / 100)
    
    // Check if all terms are paid to determine loan status
    const allTermsPaid = updatedTerms.length > 0 && updatedTerms.every((t: any) => t.status === "PAID")
    
    // Set status: PAID if all terms are paid AND remaining amount is 0, otherwise ACTIVE
    let newStatus: string
    if (allTermsPaid && newRemainingAmount <= 0.01) { // Allow small floating point differences
      newStatus = "PAID"
    } else {
      // If not all terms are paid, status should be ACTIVE (unless overdue)
      // Check if loan is overdue
      const isOverdue = new Date() > new Date(loan.dueDate)
      newStatus = isOverdue ? "OVERDUE" : "ACTIVE"
    }
    
    // Store user info before update for SMS
    const borrowerPhone = loan.user?.phone
    const borrowerName = loan.user?.name

    const updatedLoan = await prisma.loan.update({
      where: { id: payment.loanId },
      data: {
        amountPaid: newAmountPaid,
        remainingAmount: newRemainingAmount,
        status: newStatus as any
      },
      include: {
        user: true
      }
    })

    // If fully paid, increase credit score and loan limit based on loan type settings
    if (newStatus === "PAID") {
      const user = loan.user
      const loanType = loan.loanType
      
      if (user && loanType) {
        // Increase credit score by the amount set in loan type (max 100)
        let newCreditScore = user.creditScore
        const creditScoreIncrease = (loanType as any).creditScoreOnCompletion || 5
        if (user.creditScore < 100) {
          newCreditScore = Math.min(user.creditScore + creditScoreIncrease, 100)
        }
        
        // Increase loan limit by restoring this loan's principal plus any configured bonus
        const limitIncrease = (loanType as any).limitIncreaseOnCompletion || 0
        const principalRestore = loan.principalAmount || 0
        const newLoanLimit = user.loanLimit + principalRestore + limitIncrease

        await prisma.user.update({
          where: { id: user.id },
          data: {
            creditScore: newCreditScore,
            loanLimit: newLoanLimit
          }
        })
      }
    }

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "APPROVE_PAYMENT",
      entityType: "PAYMENT",
      entityId: id,
      description: `Approved payment of ₱${payment.amount.toLocaleString()} for loan ${payment.loanId}`,
      metadata: { 
        amount: payment.amount, 
        loanId: payment.loanId,
        termId: payment.termId 
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    // Send approval SMS to borrower
    if (borrowerPhone && borrowerName) {
      const paymentType = (payment as any).paymentType || "FULL"
      
      // Get payment month from term dueDate
      let monthText = ""
      if (payment.term && payment.term.dueDate) {
        const dueDate = new Date(payment.term.dueDate)
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"]
        const monthName = monthNames[dueDate.getMonth()]
        const year = dueDate.getFullYear()
        monthText = ` for the month of ${monthName} ${year}`
      }
      
      const approvalMessage = `Dear ${borrowerName},\n\nWe are pleased to inform you that your ${paymentType.toLowerCase()} payment of ₱${payment.amount.toLocaleString()}${monthText} has been APPROVED.\n\nLoan ID: ${payment.loanId}\nRemaining Balance: ₱${newRemainingAmount.toLocaleString()}\n\nThank you for your timely payment. We appreciate your continued trust in our services.\n\nBest regards,\nGlan Credible and Capital Inc.`
      
      await sendSMS(borrowerPhone, approvalMessage, payment.userId).catch((error) => {
        console.error("Failed to send payment approval SMS:", error)
      })
    }

    return NextResponse.json({ 
      message: "Payment approved successfully",
      payment: {
        ...payment,
        status: "COMPLETED"
      }
    })
  } catch (error) {
    console.error("Error approving payment:", error)
    return NextResponse.json(
      { error: "Failed to approve payment" },
      { status: 500 }
    )
  }
}

