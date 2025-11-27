import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PaymentForm } from "@/components/payment-form"
import { DataTable } from "@/components/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PaymentModal } from "@/components/payment-modal"

export default async function PaymentPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "BORROWER") {
    redirect("/dashboard")
  }

  const loan = await prisma.loan.findUnique({
    where: { id: params.id },
    include: {
      loanType: true,
      payments: {
        orderBy: { createdAt: "desc" }
      }
    }
  })

  if (!loan || loan.userId !== session.user.id) {
    redirect("/dashboard/loans")
  }

  if (loan.status === "PAID") {
    redirect("/dashboard/loans")
  }

  const paymentColumns = [
    {
      header: "Amount",
      accessor: (row: typeof loan.payments[0]) => `₱${row.amount.toLocaleString()}`,
    },
    {
      header: "Type",
      accessor: (row: typeof loan.payments[0]) => row.paymentType,
    },
    {
      header: "Method",
      accessor: (row: typeof loan.payments[0]) => row.paymentMethod || "N/A",
    },
    {
      header: "Date",
      accessor: (row: typeof loan.payments[0]) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Status",
      accessor: (row: typeof loan.payments[0]) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.status === "COMPLETED" ? "bg-green-100 text-green-800" :
          row.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
          "bg-red-100 text-red-800"
        }`}>
          {row.status}
        </span>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Make Payment</h1>
            <p className="text-muted-foreground">
              Pay for your {loan.loanType.name}
            </p>
          </div>
          <Link href="/dashboard/loans">
            <Button variant="outline">Back to Loans</Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Loan Details */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Loan Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal Amount:</span>
                <span className="font-medium">₱{loan.principalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium">₱{loan.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">₱{loan.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Remaining Amount:</span>
                <span className="font-medium text-lg">₱{loan.remainingAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">{new Date(loan.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Form in Modal */}
          <div className="rounded-lg border bg-card p-6">
            <PaymentModal loanId={loan.id} remainingAmount={loan.remainingAmount} />
          </div>
        </div>

        {/* Payment History */}
        {loan.payments.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Payment History</h2>
            <DataTable
              data={loan.payments}
              columns={paymentColumns}
              searchable={true}
              searchPlaceholder="Search payments..."
              pageSize={10}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
