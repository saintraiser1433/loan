import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LoanDetailsView } from "@/components/loan-details-view"

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const { id } = await params

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      user: true,
      loanType: true,
      paymentDuration: true,
      application: true,
      terms: {
        orderBy: {
          termNumber: "asc"
        }
      },
      payments: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  })

  if (!loan) {
    redirect("/dashboard/loans")
  }

  // If borrower, ensure they can only view their own loans
  if (session.user.role === "BORROWER" && loan.userId !== session.user.id) {
    redirect("/dashboard/loans")
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
      // Check if there are any unpaid terms that are overdue
      // Only PENDING or OVERDUE terms that are past due should make loan overdue
      // PAID terms should never be considered overdue
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const hasOverdueTerms = loan.terms.some((t: any) => {
        // Only check terms that are not PAID
        if (t.status === "PAID") return false
        
        const termDueDate = new Date(t.dueDate)
        termDueDate.setHours(0, 0, 0, 0)
        // Term is overdue if it's unpaid (PENDING or OVERDUE) and past due date
        return termDueDate < today
      })
      recalculatedStatus = hasOverdueTerms ? "OVERDUE" : "ACTIVE"
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

  // Match payments to terms based on termId only
  // This ensures each payment appears only in the term it was submitted for
  const termsWithPayments = recalculatedLoan.terms.map((term: any) => {
    // Only match payments that have this term's ID
    const termPayments = recalculatedLoan.payments.filter((payment: any) => {
      // Payment must have termId matching this term's id
      return (payment as any).termId && (payment as any).termId === term.id
    })
    
    return {
      ...term,
      payments: termPayments
    }
  })
  
  // Update loan with terms that have payments
  const loanWithPayments = {
    ...recalculatedLoan,
    terms: termsWithPayments
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Loan Details</h1>
            <p className="text-muted-foreground">
              {session.user.role === "BORROWER" 
                ? "View your loan payment terms and status"
                : "View and manage loan payments by term"}
            </p>
          </div>
          <Link href="/dashboard/loans">
            <Button variant="outline">Back to Loans</Button>
          </Link>
        </div>

        <LoanDetailsView loan={loanWithPayments as any} />
      </div>
    </DashboardLayout>
  )
}
