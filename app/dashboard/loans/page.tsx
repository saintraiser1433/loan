"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"

interface LoanTerm {
  id: string
  termNumber: number
  amount: number
  dueDate: Date
  amountPaid: number
  status: string
}

interface Loan {
  id: string
  principalAmount: number
  totalAmount: number
  remainingAmount: number
  dueDate: Date
  status: string
  user?: {
    name: string
    email: string
  }
  loanType: {
    name: string
  }
  paymentDuration?: {
    label: string
  }
  terms?: LoanTerm[]
}

export default function LoansPage() {
  const { data: session, status } = useSession()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
      return
    }
    if (status === "authenticated") {
      fetchLoans()
    }
  }, [status])

  const fetchLoans = async () => {
    try {
      const response = await fetch("/api/loans")
      if (response.ok) {
        const data = await response.json()
        setLoans(data)
      }
    } catch (error) {
      console.error("Error fetching loans:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  const columns = [
    ...(session?.user?.role !== "BORROWER" ? [{
      header: "Borrower",
      accessor: (row: Loan) => (
        <div>
          <div className="font-medium">{row.user?.name}</div>
          <div className="text-sm text-muted-foreground">{row.user?.email}</div>
        </div>
      ),
    }] : []),
    {
      header: "Loan Type",
      accessor: (row: Loan) => row.loanType.name,
    },
    {
      header: "Principal",
      accessor: (row: Loan) => `₱${row.principalAmount.toLocaleString()}`,
    },
    {
      header: "Total Amount",
      accessor: (row: Loan) => `₱${row.totalAmount.toLocaleString()}`,
    },
    {
      header: "Term Amount",
      accessor: (row: Loan) => {
        if (row.terms && row.terms.length > 0) {
          // Calculate average term amount (or show first term amount)
          const termAmount = row.terms[0]?.amount || 0
          return `₱${termAmount.toLocaleString()}`
        }
        // Fallback: calculate from payment duration
        if (row.paymentDuration) {
          const match = row.paymentDuration.label.match(/(\d+)/)
          const numberOfMonths = match ? parseInt(match[1]) : 1
          const termAmount = row.totalAmount / numberOfMonths
          return `₱${termAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        return "-"
      },
    },
    {
      header: "Remaining",
      accessor: (row: Loan) => {
        // Recalculate remaining amount based on actual payments
        let remaining = row.remainingAmount
        
        // If we have terms, calculate remaining from total - amount paid
        if (row.terms && row.terms.length > 0) {
          const totalPaid = row.terms.reduce((sum, term) => sum + (term.amountPaid || 0), 0)
          remaining = Math.max(0, row.totalAmount - totalPaid)
        } else {
          // Fallback to stored remaining amount, but ensure it's not negative
          remaining = Math.max(0, row.remainingAmount)
        }
        
        return `₱${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      },
    },
    {
      header: "Status",
      accessor: (row: Loan) => {
        // Check if status should be PAID based on terms
        let displayStatus = row.status
        if (row.terms && row.terms.length > 0) {
          const allTermsPaid = row.terms.every(t => t.status === "PAID")
          const hasRemainingAmount = row.remainingAmount > 0
          
          // If all terms are paid but status is not PAID, or if status is PAID but not all terms are paid
          if (allTermsPaid && !hasRemainingAmount) {
            displayStatus = "PAID"
          } else if (displayStatus === "PAID" && (!allTermsPaid || hasRemainingAmount)) {
            // Status says PAID but terms don't match - show ACTIVE instead
            displayStatus = "ACTIVE"
          }
          
          // Check if there are any unpaid terms that are overdue
          // Only PENDING or OVERDUE terms that are past due should make loan overdue
          // PAID terms should never be considered overdue
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const hasOverdueTerms = row.terms.some((t: any) => {
            // Only check terms that are not PAID
            if (t.status === "PAID") return false
            
            const termDueDate = new Date(t.dueDate)
            termDueDate.setHours(0, 0, 0, 0)
            // Term is overdue if it's unpaid (PENDING or OVERDUE) and past due date
            return termDueDate < today
          })
          
          if (hasOverdueTerms && displayStatus === "ACTIVE") {
            displayStatus = "OVERDUE"
          }
        } else {
          // Fallback to loan dueDate if no terms available
          const daysUntilDue = Math.ceil(
          (new Date(row.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
          if (daysUntilDue < 0 && displayStatus === "ACTIVE") {
            displayStatus = "OVERDUE"
          }
        }
        
        const isOverdue = displayStatus === "OVERDUE"
        
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            displayStatus === "PAID" ? "bg-green-100 text-green-800" :
            isOverdue ? "bg-red-100 text-red-800" :
            displayStatus === "OVERDUE" ? "bg-red-100 text-red-800" :
            "bg-blue-100 text-blue-800"
          }`}>
            {displayStatus}
          </span>
        )
      },
    },
    {
      header: "Terms / Due Date",
      accessor: (row: Loan) => {
        // If terms exist, show term information
        if (row.terms && row.terms.length > 0) {
          const totalTerms = row.terms.length
          const paidTerms = row.terms.filter(t => t.status === "PAID").length
          const pendingTerms = row.terms.filter(t => t.status === "PENDING")
          const nextTerm = pendingTerms.length > 0 ? pendingTerms[0] : null
          
          if (nextTerm) {
            const daysUntilDue = Math.ceil(
              (new Date(nextTerm.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
            const isOverdue = daysUntilDue < 0
            
            return (
              <div className={isOverdue ? "text-destructive" : ""}>
                <div className="font-medium">
                  {paidTerms}/{totalTerms} terms paid
                </div>
                <div className="text-sm">
                  Next: {new Date(nextTerm.dueDate).toLocaleDateString()}
                </div>
                {isOverdue && (
                  <div className="text-xs text-destructive">({Math.abs(daysUntilDue)} days overdue)</div>
                )}
                {!isOverdue && daysUntilDue >= 0 && (
                  <div className="text-xs text-muted-foreground">({daysUntilDue} days left)</div>
                )}
              </div>
            )
          } else {
            // All terms paid
            return (
              <div>
                <div className="font-medium text-green-600">
                  {totalTerms}/{totalTerms} terms paid
                </div>
                <div className="text-sm text-muted-foreground">Loan completed</div>
              </div>
            )
          }
        }
        
        // Calculate first term due date from payment duration if terms don't exist yet
        if (row.paymentDuration) {
          const match = row.paymentDuration.label.match(/(\d+)/)
          const numberOfMonths = match ? parseInt(match[1]) : null
          
          if (numberOfMonths) {
            // Calculate first term due date (1 month from now)
            const firstTermDate = new Date()
            firstTermDate.setMonth(firstTermDate.getMonth() + 1)
            
            const daysUntilDue = Math.ceil(
              (firstTermDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
            
            return (
              <div>
                <div className="font-medium">
                  0/{numberOfMonths} terms paid
                </div>
                <div className="text-sm">
                  Next: {firstTermDate.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">({daysUntilDue} days left)</div>
              </div>
            )
          }
        }
        
        // Fallback to old due date if no terms and no payment duration info
        const daysUntilDue = Math.ceil(
          (new Date(row.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        const isOverdue = daysUntilDue < 0 && row.status === "ACTIVE"
        
        return (
          <div className={isOverdue ? "text-destructive" : ""}>
            {new Date(row.dueDate).toLocaleDateString()}
            {isOverdue && (
              <div className="text-xs">({Math.abs(daysUntilDue)} days overdue)</div>
            )}
            {!isOverdue && daysUntilDue >= 0 && (
              <div className="text-xs">({daysUntilDue} days left)</div>
            )}
          </div>
        )
      },
    },
    {
      header: "Actions",
      accessor: (row: Loan) => {
        if (session?.user?.role === "BORROWER") {
          return (
            <Link href={`/dashboard/loans/${row.id}`}>
              <Button size="sm" variant="outline">View Details</Button>
            </Link>
          )
        } else {
          // Admin/Loan Officer: Show View Details button
          return (
            <Link href={`/dashboard/loans/${row.id}`}>
              <Button size="sm" variant="outline">View Details</Button>
            </Link>
          )
        }
      },
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {session?.user?.role === "BORROWER" ? "My Loans" : "All Loans"}
            </h1>
            <p className="text-muted-foreground">
              {session?.user?.role === "BORROWER" 
                ? "View and manage your loans"
                : "Manage all loans"}
            </p>
          </div>
          {session?.user?.role === "BORROWER" && (
            <Link href="/dashboard/apply">
              <Button>Apply for Loan</Button>
            </Link>
          )}
        </div>

        <DataTable
          data={loans}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search loans..."
          pageSize={10}
        />
      </div>
    </DashboardLayout>
  )
}
