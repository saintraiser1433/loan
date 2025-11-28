import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { loanId, amount, paymentType, receiptUrl, paymentMethod, paymentMethodId, termId, daysLate, penaltyAmount } = body

    if (!loanId || !amount || !paymentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get payment method details if paymentMethodId is provided
    let paymentMethodName = paymentMethod || "Unknown"
    if (paymentMethodId) {
      try {
        const method = await prisma.paymentMethod.findUnique({
          where: { id: paymentMethodId }
        })
        if (method) {
          paymentMethodName = method.name
        }
      } catch (error) {
        console.error("Error fetching payment method:", error)
      }
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        terms: {
          orderBy: {
            termNumber: "asc"
          }
        },
        loanType: true
      }
    })

    if (!loan || loan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Loan not found or unauthorized" },
        { status: 404 }
      )
    }

    // If termId is provided, validate and update the term
    let termToUpdate = null
    if (termId) {
      termToUpdate = loan.terms?.find((t: any) => t.id === termId)
      if (!termToUpdate) {
        return NextResponse.json(
          { error: "Term not found" },
          { status: 404 }
        )
      }
      
      if (termToUpdate.status === "PAID") {
        return NextResponse.json(
          { error: "This term has already been paid" },
          { status: 400 }
        )
      }

      // Calculate late fee if applicable
      const termDueDate = new Date(termToUpdate.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      termDueDate.setHours(0, 0, 0, 0)
      
      const diffTime = today.getTime() - termDueDate.getTime()
      const calculatedDaysLate = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      const penaltyPerDay = (loan.loanType as any)?.latePaymentPenaltyPerDay || 0
      const calculatedPenalty = calculatedDaysLate * penaltyPerDay
      
      // Use the penalty from request or existing term penalty or calculated
      const effectivePenalty = penaltyAmount || (termToUpdate as any).penaltyAmount || calculatedPenalty
      
      const baseAmountDue = termToUpdate.amount - termToUpdate.amountPaid
      const totalAmountDue = baseAmountDue + effectivePenalty
      
      // Allow 1 peso tolerance for floating point differences
      if (amount > totalAmountDue + 1) {
        return NextResponse.json(
          { error: `Payment amount cannot exceed ₱${totalAmountDue.toLocaleString()} for this term (including late fees)` },
          { status: 400 }
        )
      }
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Payment amount must be greater than 0" },
          { status: 400 }
        )
      }
    } else {
      // Fallback: check if payment exceeds remaining amount
      if (amount > loan.remainingAmount) {
        return NextResponse.json(
          { error: "Payment amount exceeds remaining balance" },
          { status: 400 }
        )
      }
    }

    // Update term with penalty info if late (but keep status as PENDING until payment is approved)
    if (termId) {
      const termDueDate = new Date(termToUpdate.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      termDueDate.setHours(0, 0, 0, 0)
      
      const calculatedDaysLate = Math.max(0, Math.ceil((today.getTime() - termDueDate.getTime()) / (1000 * 60 * 60 * 24)))
      const penaltyPerDay = (loan.loanType as any)?.latePaymentPenaltyPerDay || 0
      const calculatedPenalty = calculatedDaysLate * penaltyPerDay
      
      // Use provided penalty or calculated penalty
      const effectivePenalty = penaltyAmount || calculatedPenalty
      
      // Only update penalty info if there's a penalty, but keep status as PENDING
      // The term status will be updated to PAID when payment is approved
      if (effectivePenalty > 0) {
      await (prisma as any).loanTerm.update({
        where: { id: termId },
        data: {
            daysLate: calculatedDaysLate,
            penaltyAmount: effectivePenalty,
            // Keep status as PENDING - it will be updated to PAID when payment is approved
        }
      })
      
      // Update loan total amount and remaining amount to include penalty
      await prisma.loan.update({
        where: { id: loanId },
        data: {
            totalAmount: loan.totalAmount + effectivePenalty,
            remainingAmount: loan.remainingAmount + effectivePenalty,
        }
      })
      }
      
      // Loan status will be recalculated based on unpaid terms when payment is approved
      // Don't mark as overdue here - let the approval logic handle it
    }

    // Create payment with PENDING status - requires admin approval
    const payment = await prisma.payment.create({
      data: {
        loanId,
        userId: session.user.id,
        amount,
        paymentType,
        receiptUrl,
        paymentMethod: paymentMethodName,
        paymentMethodId: paymentMethodId || null,
        termId: termId || null,
        status: "PENDING",
      }
    })
    
    console.log("Payment created successfully:", payment.id)
    
    // Store termId in a separate update if needed (after Prisma client is regenerated)
    // For now, we'll fetch it from the request body when approving

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error("Payment error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const loanId = searchParams.get("loanId")

    try {
      const payments = await prisma.payment.findMany({
        where: {
          ...(loanId ? { loanId } : {}),
          ...(session.user.role === "BORROWER" ? { userId: session.user.id } : {})
        },
        include: {
          loan: {
            include: {
              loanType: true
            }
          },
          user: true,
        },
        orderBy: {
          createdAt: "desc"
        }
      })

      console.log(`Found ${payments.length} payments`)
      
      // Try to include term and method if available
      const paymentsWithRelations = await Promise.all(
        payments.map(async (payment: any) => {
          try {
            if (payment.termId) {
              const term = await (prisma as any).loanTerm.findUnique({
                where: { id: payment.termId }
              }).catch(() => null)
              payment.term = term
            }
            
            if (payment.paymentMethodId) {
              const method = await prisma.paymentMethod.findUnique({
                where: { id: payment.paymentMethodId }
              }).catch(() => null)
              payment.method = method
            }
          } catch (e) {
            // Relations not available yet
          }
          return payment
        })
      )

      return NextResponse.json({ payments: paymentsWithRelations })
    } catch (error: any) {
      console.error("Error fetching payments:", error)
      
      // If the error is about missing relations, try without them
      if (error.message?.includes("term") || error.message?.includes("method")) {
        const payments = await prisma.payment.findMany({
          where: {
            ...(loanId ? { loanId } : {}),
            ...(session.user.role === "BORROWER" ? { userId: session.user.id } : {})
          },
          include: {
            loan: {
              include: {
                loanType: true
              }
            },
            user: true,
          },
          orderBy: {
            createdAt: "desc"
          }
        })
        return NextResponse.json({ payments })
      }
      
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


