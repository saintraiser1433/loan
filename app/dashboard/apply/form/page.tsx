import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { LoanApplicationForm } from "@/components/loan-application-form"
import { prisma } from "@/lib/prisma"

export default async function ApplyFormPage({
  searchParams,
}: {
  searchParams: Promise<{ loanTypeId?: string }>
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "BORROWER") {
    redirect("/dashboard")
  }

  const params = await searchParams

  if (!params.loanTypeId) {
    redirect("/dashboard/apply")
  }

  // Check for pending applications and active loans
  const [pendingApplications, activeLoans] = await Promise.all([
    prisma.loanApplication.count({
      where: {
        userId: session.user.id,
        status: "PENDING"
      }
    }),
    prisma.loan.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "OVERDUE"] }
      }
    })
  ])

  // Redirect if they have pending applications or active loans
  if (pendingApplications > 0 || activeLoans.length > 0) {
    redirect("/dashboard/apply")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Apply for a Loan</h1>
          <p className="text-muted-foreground">
            Fill out the form below to apply for a loan
          </p>
        </div>
        <LoanApplicationForm initialLoanTypeId={params.loanTypeId} />
      </div>
    </DashboardLayout>
  )
}
