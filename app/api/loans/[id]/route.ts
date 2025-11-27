import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        loanType: true,
        paymentDuration: true,
        payments: {
          orderBy: { createdAt: "desc" }
        },
        terms: {
          orderBy: {
            termNumber: "asc"
          }
        }
      }
    })

    if (!loan) {
      return NextResponse.json(
        { error: "Loan not found" },
        { status: 404 }
      )
    }

    // If no terms exist, create them automatically
    if (!loan.terms || loan.terms.length === 0) {
      try {
        // Extract number of months from payment duration label (e.g., "6 months" -> 6)
        const match = loan.paymentDuration?.label.match(/(\d+)/)
        const numberOfMonths = match ? parseInt(match[1]) : Math.ceil(loan.paymentDuration?.days / 30) || 1
        
        // Calculate monthly payment
        const monthlyPayment = loan.totalAmount / numberOfMonths
        
        // Create terms
        const terms = []
        const startDate = new Date(loan.createdAt)
        
        for (let i = 1; i <= numberOfMonths; i++) {
          const termDueDate = new Date(startDate)
          termDueDate.setMonth(termDueDate.getMonth() + i)
          
          // Last term gets any remainder to ensure total matches
          const termAmount = i === numberOfMonths 
            ? loan.totalAmount - (monthlyPayment * (numberOfMonths - 1))
            : monthlyPayment

          terms.push({
            loanId: loan.id,
            termNumber: i,
            amount: Math.round(termAmount * 100) / 100,
            dueDate: termDueDate,
            status: "PENDING"
          })
        }

        // Create terms
        try {
          await (prisma as any).loanTerm.createMany({
            data: terms
          })
          
          // Refetch loan with terms
          const updatedLoan = await prisma.loan.findUnique({
            where: { id },
            include: {
              loanType: true,
              paymentDuration: true,
              payments: {
                orderBy: { createdAt: "desc" }
              },
              terms: {
                orderBy: {
                  termNumber: "asc"
                }
              }
            }
          })
          
          if (updatedLoan) {
            return NextResponse.json({
              ...updatedLoan,
              userId: updatedLoan.userId,
            })
          }
        } catch (termError: any) {
          console.error("Error creating loan terms:", termError)
          // Continue with loan without terms
        }
      } catch (error) {
        console.error("Error processing terms:", error)
        // Continue with loan without terms
      }
    }

    // Check if user has access
    if (session.user.role === "BORROWER" && loan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Recalculate loan amounts based on actual term payments (more accurate)
    let recalculatedLoan = { ...loan }
    
    if (loan.terms && loan.terms.length > 0) {
      // Calculate total paid from terms
      const totalPaidFromTerms = loan.terms.reduce((sum: number, term: any) => {
        return sum + (term.amountPaid || 0)
      }, 0)
      
      // Recalculate amountPaid and remainingAmount
      const recalculatedAmountPaid = Math.round(totalPaidFromTerms * 100) / 100
      const recalculatedRemainingAmount = Math.max(0, Math.round((loan.totalAmount - totalPaidFromTerms) * 100) / 100)
      
      // Check if all terms are paid to determine loan status
      const allTermsPaid = loan.terms.every((t: any) => t.status === "PAID")
      
      // Set status: PAID if all terms are paid AND remaining amount is 0, otherwise ACTIVE
      let recalculatedStatus: string
      if (allTermsPaid && recalculatedRemainingAmount <= 0.01) {
        recalculatedStatus = "PAID"
      } else {
        // Check if loan is overdue
        const isOverdue = new Date() > new Date(loan.dueDate)
        recalculatedStatus = isOverdue ? "OVERDUE" : "ACTIVE"
      }
      
      // Update loan with recalculated values
      recalculatedLoan = {
        ...loan,
        amountPaid: recalculatedAmountPaid,
        remainingAmount: recalculatedRemainingAmount,
        status: recalculatedStatus as any,
      }
      
      // Update the database with correct values (async, don't wait)
      prisma.loan.update({
        where: { id },
        data: {
          amountPaid: recalculatedAmountPaid,
          remainingAmount: recalculatedRemainingAmount,
          status: recalculatedStatus as any,
        }
      }).catch((error) => {
        console.error("Error updating loan with recalculated values:", error)
      })
    }

    return NextResponse.json({
      ...recalculatedLoan,
      userId: recalculatedLoan.userId,
    })
  } catch (error) {
    console.error("Error fetching loan:", error)
    return NextResponse.json(
      { error: "Failed to fetch loan" },
      { status: 500 }
    )
  }
}



