import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardTermsWrapper } from "@/components/dashboard-terms-wrapper"
import { prisma } from "@/lib/prisma"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      applications: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          loanType: true,
          purpose: true,
        }
      },
      loans: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          loanType: true,
        }
      }
    }
  })

  if (!user) {
    redirect("/login")
  }

  // Get stats based on role
  let stats: {
    activeLoans?: number
    pendingApplications?: number
    creditScore?: number
    loanLimit?: number
    overdueLoans?: number
  } = {}
  
  if (user.role === "BORROWER") {
    const activeLoans = await prisma.loan.count({
      where: {
        userId: user.id,
        status: "ACTIVE"
      }
    })
    
    const pendingApplications = await prisma.loanApplication.count({
      where: {
        userId: user.id,
        status: "PENDING"
      }
    })

    stats = {
      activeLoans,
      pendingApplications,
      creditScore: user.creditScore,
      loanLimit: user.loanLimit
    }
  } else {
    // Loan Officer/Admin stats
    const pendingApplications = await prisma.loanApplication.count({
      where: { status: "PENDING" }
    })
    
    const activeLoans = await prisma.loan.count({
      where: { status: "ACTIVE" }
    })
    
    const overdueLoans = await prisma.loan.count({
      where: { status: "OVERDUE" }
    })

    stats = {
      pendingApplications,
      activeLoans,
      overdueLoans
    }
  }

  return (
    <DashboardTermsWrapper>
      <DashboardLayout>
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground">
            {user.role === "BORROWER" 
              ? "Manage your loans and applications"
              : "Review applications and manage loans"}
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {user.role === "BORROWER" ? (
            <>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Credit Score</div>
                <div className="text-2xl font-bold">{stats.creditScore}</div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Loan Limit</div>
                <div className="text-2xl font-bold">₱{(stats.loanLimit || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Active Loans</div>
                <div className="text-2xl font-bold">{stats.activeLoans}</div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Pending Applications</div>
                <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Pending Applications</div>
                <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Active Loans</div>
                <div className="text-2xl font-bold">{stats.activeLoans}</div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Overdue Loans</div>
                <div className="text-2xl font-bold text-destructive">{stats.overdueLoans}</div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="text-sm font-medium text-muted-foreground">Total Users</div>
                <div className="text-2xl font-bold">
                  {await prisma.user.count()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Analytics Dashboard */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Analytics</h2>
          <AnalyticsDashboard role={user.role} />
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          {user.role === "BORROWER" ? (
            <>
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Applications</h2>
                {user.applications.length > 0 ? (
                  <div className="space-y-2">
                    {user.applications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <div className="font-medium">{app.loanType.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ₱{app.requestedAmount.toLocaleString()} • {app.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No applications yet</p>
                )}
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Active Loans</h2>
                {user.loans.length > 0 ? (
                  <div className="space-y-2">
                    {user.loans.map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <div className="font-medium">{loan.loanType.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ₱{loan.remainingAmount.toLocaleString()} remaining
                          </div>
                        </div>
                        <div className="text-sm font-medium">{loan.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active loans</p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-card p-6 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid gap-2 md:grid-cols-2">
                <a
                  href="/dashboard/applications"
                  className="p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Review Applications</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.pendingApplications} pending
                  </div>
                </a>
                <a
                  href="/dashboard/loans"
                  className="p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Manage Loans</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.activeLoans} active
                  </div>
                </a>
                <a
                  href="/dashboard/loan-types"
                  className="p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Loan Types</div>
                  <div className="text-sm text-muted-foreground">Manage loan types</div>
                </a>
                <a
                  href="/dashboard/reports"
                  className="p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Reports</div>
                  <div className="text-sm text-muted-foreground">View reports</div>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
    </DashboardTermsWrapper>
  )
}
