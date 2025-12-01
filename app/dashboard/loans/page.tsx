"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { formatCurrency } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getDiceBearAvatar } from "@/lib/avatar"

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
  const [activeTab, setActiveTab] = useState<"all" | "active" | "overdue" | "paid">("all")

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

  // Helper function to calculate loan status (same logic as in Status column)
  const calculateLoanStatus = (loan: Loan): string => {
    let displayStatus = loan.status
    if (loan.terms && loan.terms.length > 0) {
      const allTermsPaid = loan.terms.every(t => t.status === "PAID")
      const hasRemainingAmount = loan.remainingAmount > 0
      
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
      const hasOverdueTerms = loan.terms.some((t: any) => {
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
        (new Date(loan.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntilDue < 0 && displayStatus === "ACTIVE") {
        displayStatus = "OVERDUE"
      }
    }
    return displayStatus
  }

  // Filter loans based on active tab
  const filteredLoans = loans.filter((loan) => {
    const loanStatus = calculateLoanStatus(loan)
    if (activeTab === "active") {
      return loanStatus === "ACTIVE"
    }
    if (activeTab === "overdue") {
      return loanStatus === "OVERDUE"
    }
    if (activeTab === "paid") {
      return loanStatus === "PAID"
    }
    return true // "all" tab shows everything
  })

  // Calculate counts for each tab
  const activeCount = loans.filter(l => calculateLoanStatus(l) === "ACTIVE").length
  const overdueCount = loans.filter(l => calculateLoanStatus(l) === "OVERDUE").length
  const paidCount = loans.filter(l => calculateLoanStatus(l) === "PAID").length

  const columns = [
    ...(session?.user?.role !== "BORROWER" ? [
      {
        header: "Avatar",
        accessor: (row: Loan) => (
          <Avatar className="h-10 w-10">
            <AvatarImage src={getDiceBearAvatar(row.user?.email || row.user?.name || row.id)} alt={row.user?.name || 'User'} />
            <AvatarFallback>
              {row.user?.name ? row.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
        ),
      },
      {
        header: "Borrower",
        accessor: (row: Loan) => (
          <div>
            <div className="font-medium">{row.user?.name}</div>
            <div className="text-sm text-muted-foreground">{row.user?.email}</div>
          </div>
        ),
      },
    ] : []),
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
      accessor: (row: Loan) => formatCurrency(row.totalAmount),
    },
    {
      header: "Term Amount",
      accessor: (row: Loan) => {
        if (row.terms && row.terms.length > 0) {
          // Calculate average term amount (or show first term amount)
          const termAmount = row.terms[0]?.amount || 0
          return formatCurrency(termAmount)
        }
        // Fallback: calculate from payment duration
        if (row.paymentDuration) {
          const match = row.paymentDuration.label.match(/(\d+)/)
          const numberOfMonths = match ? parseInt(match[1]) : 1
          const termAmount = row.totalAmount / numberOfMonths
          return formatCurrency(termAmount)
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
        
        return formatCurrency(remaining)
      },
    },
    {
      header: "Status",
      accessor: (row: Loan) => {
        const displayStatus = calculateLoanStatus(row)
        const isOverdue = displayStatus === "OVERDUE"
        
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            displayStatus === "PAID" ? "bg-gradient-to-r from-green-400 to-green-600 text-white" :
            isOverdue ? "bg-gradient-to-r from-red-400 to-red-600 text-white" :
            displayStatus === "OVERDUE" ? "bg-gradient-to-r from-red-400 to-red-600 text-white" :
            "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {session?.user?.role === "BORROWER" ? "My Loans" : "All Loans"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {session?.user?.role === "BORROWER" 
                ? "View and manage your loans"
                : "Manage all loans"}
            </p>
          </div>
          {session?.user?.role === "BORROWER" && (
            <Link href="/dashboard/apply">
              <Button className="w-full sm:w-auto">Apply for Loan</Button>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "active"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "overdue"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overdue ({overdueCount})
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "paid"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Paid ({paidCount})
          </button>
        </div>

        <DataTable
          data={filteredLoans}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search loans..."
          pageSize={10}
        />
      </div>
    </DashboardLayout>
  )
}
