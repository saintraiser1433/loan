import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/sms"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user.role !== "LOAN_OFFICER" && session.user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { applicationId, creditScore, loanLimit, status, rejectionReason } = body

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: applicationId },
      include: { 
        user: true,
        loanType: true,
        paymentDuration: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      )
    }

    // Check if loan already exists for this application
    const existingLoan = await prisma.loan.findUnique({
      where: { applicationId: applicationId }
    })

    if (existingLoan) {
      return NextResponse.json(
        { error: "Loan already exists for this application" },
        { status: 400 }
      )
    }

    // Update application
    const updatedApplication = await prisma.loanApplication.update({
      where: { id: applicationId },
      data: {
        creditScore,
        loanLimit,
        status,
        rejectionReason,
        evaluatedBy: session.user.id,
        evaluatedAt: new Date()
      }
    })

    // If approved, automatically create a loan
    if (status === "APPROVED") {
      // Get interest rate for the selected payment duration from interestRatesByMonth
      let interestRate = 0
      
      if (application.loanType.interestRatesByMonth) {
        try {
          const interestRatesByMonth = JSON.parse(application.loanType.interestRatesByMonth) as Record<number, number>
          // Extract months from payment duration label (e.g., "6 months" -> 6)
          const match = application.paymentDuration.label.match(/(\d+)/)
          const months = match ? parseInt(match[1]) : null
          
          if (months && interestRatesByMonth[months] !== undefined) {
            interestRate = interestRatesByMonth[months]
          } else {
            // Fallback: use first available rate if exact match not found
            const rates = Object.values(interestRatesByMonth)
            if (rates.length > 0) {
              interestRate = rates[0]
            }
          }
        } catch (error) {
          console.error("Error parsing interest rates by month:", error)
        }
      }
      
      if (interestRate === 0) {
        return NextResponse.json(
          { error: "Interest rate not found for the selected payment duration" },
          { status: 400 }
        )
      }

      // Calculate interest and total
      const principalAmount = application.requestedAmount
      const interestRateDecimal = interestRate / 100
      const days = application.paymentDuration.days
      const interest = principalAmount * interestRateDecimal * (days / 365)
      const totalAmount = principalAmount + interest

      // Extract number of months from payment duration label (e.g., "6 months" -> 6)
      const match = application.paymentDuration.label.match(/(\d+)/)
      const numberOfMonths = match ? parseInt(match[1]) : Math.ceil(days / 30) // Fallback to days/30 if no match
      
      // Calculate monthly payment amount
      const monthlyPayment = totalAmount / numberOfMonths

      // Calculate final due date (for backward compatibility)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + days)

      // Create loan automatically
      const loan = await prisma.loan.create({
        data: {
          applicationId: application.id,
          userId: application.userId,
          loanTypeId: application.loanTypeId,
          paymentDurationId: application.paymentDurationId,
          principalAmount,
          interestRate: interestRate,
          totalAmount,
          remainingAmount: totalAmount,
          dueDate,
          status: "ACTIVE"
        }
      })

      // Create payment terms (installments)
      const terms = []
      const startDate = new Date()
      
      for (let i = 1; i <= numberOfMonths; i++) {
        const termDueDate = new Date(startDate)
        termDueDate.setMonth(termDueDate.getMonth() + i)
        
        // Last term gets any remainder to ensure total matches
        const termAmount = i === numberOfMonths 
          ? totalAmount - (monthlyPayment * (numberOfMonths - 1))
          : monthlyPayment

        terms.push({
          loanId: loan.id,
          termNumber: i,
          amount: Math.round(termAmount * 100) / 100, // Round to 2 decimal places
          dueDate: termDueDate,
          status: "PENDING"
        })
      }

      // Create all terms (if LoanTerm model exists)
      try {
        // Try to create terms - will fail if Prisma client not regenerated
        await (prisma as any).loanTerm.createMany({
          data: terms
        })
        console.log(`Created ${terms.length} payment terms for loan ${loan.id}`)
      } catch (error: any) {
        // If loanTerm model doesn't exist yet, log error but continue
        console.error("Error creating loan terms (Prisma client may need regeneration):", error.message || error)
        console.warn("Loan terms not created. Please run 'npx prisma generate' and restart the server.")
        // Continue without terms - they can be added later
      }

      // Reduce borrower's loan limit by the requested amount
      const currentLoanLimit = application.user.loanLimit || 0
      const newLoanLimit = Math.max(0, currentLoanLimit - principalAmount)
      
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          loanLimit: newLoanLimit
        }
      })

      // Send approval SMS
      if (application.user.phone) {
        const approvalMessage = `Dear ${application.user.name},\n\nYour loan application has been APPROVED!\n\nLoan Details:\n- Amount: ₱${principalAmount.toLocaleString()}\n- Total Amount: ₱${totalAmount.toLocaleString()}\n- Payment Duration: ${application.paymentDuration.label}\n- Due Date: ${dueDate.toLocaleDateString()}\n\nThank you for choosing GCCI Lending!\n\nGlan Credible and Capital Inc.`
        await sendSMS(application.user.phone, approvalMessage, application.userId).catch((error) => {
          console.error("Failed to send approval SMS:", error)
          // Don't fail the request if SMS fails
        })
      }
    }

    // If rejected, send SMS
    if (status === "REJECTED" && application.user.phone) {
      const rejectionMessage = rejectionReason
        ? `Dear ${application.user.name},\n\nYour loan application has been REJECTED.\n\nReason: ${rejectionReason}\n\nIf you have questions, please contact us.\n\nGlan Credible and Capital Inc.`
        : `Dear ${application.user.name},\n\nYour loan application has been REJECTED.\n\nIf you have questions, please contact us.\n\nGlan Credible and Capital Inc.`
      
      await sendSMS(application.user.phone, rejectionMessage, application.userId).catch((error) => {
        console.error("Failed to send rejection SMS:", error)
        // Don't fail the request if SMS fails
      })
    }

    return NextResponse.json({ application: updatedApplication })
  } catch (error: any) {
    console.error("Evaluation error:", error)
    console.error("Error details:", error.message, error.stack)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


