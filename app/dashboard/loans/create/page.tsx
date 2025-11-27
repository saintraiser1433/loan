import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { prisma } from "@/lib/prisma"
import { CreateLoanForm } from "@/components/create-loan-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CreateLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "BORROWER") {
    redirect("/dashboard")
  }

  const params = await searchParams

  if (!params.applicationId) {
    redirect("/dashboard/applications/my")
  }

  const application = await prisma.loanApplication.findUnique({
    where: { id: params.applicationId },
    include: {
      loanType: true,
      paymentDuration: true,
      loan: true,
    }
  })

  if (!application || application.userId !== session.user.id) {
    redirect("/dashboard/applications/my")
  }

  if (application.status !== "APPROVED") {
    redirect("/dashboard/applications/my")
  }

  if (application.loan) {
    redirect("/dashboard/loans")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Loan</h1>
            <p className="text-muted-foreground">
              Create a loan from your approved application
            </p>
          </div>
          <Link href="/dashboard/applications/my">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 space-y-2">
            <div className="text-sm text-muted-foreground">Approved Loan Limit</div>
            <div className="text-2xl font-bold">₱{application.loanLimit?.toLocaleString() || 0}</div>
            <div className="text-sm text-muted-foreground">Requested Amount: ₱{application.requestedAmount.toLocaleString()}</div>
          </div>
          <CreateLoanForm 
            applicationId={application.id}
            maxAmount={application.loanLimit || application.requestedAmount}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
