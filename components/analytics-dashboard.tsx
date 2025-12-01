"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertCircle, 
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon
} from "lucide-react"

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

type Role = "BORROWER" | "LOAN_OFFICER" | "ADMIN" | string

interface BorrowerAnalytics {
  totalLoans: number
  totalPaid: number
  totalApplications: number
  totalApproved: number
  totalRejected: number
  totalAmountBorrowed: number
  totalAmountPaid: number
  totalRemaining: number
  monthlyData: Array<{
    month: string
    total: number
    approved: number
    rejected: number
    pending: number
  }>
}

interface AdminAnalytics {
  users: {
    total: number
    borrowers: number
    pending: number
    approved: number
  }
  applications: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  loans: {
    total: number
    active: number
    paid: number
    overdue: number
    defaulted: number
  }
  amounts: {
    totalLoanAmount: number
    totalPaidAmount: number
    totalRemainingAmount: number
  }
  monthlyData: Array<{
    month: string
    applications: number
    approved: number
    rejected: number
    pending: number
    loans: number
    loanAmount: number
    payments: number
    paymentAmount: number
  }>
  loanTypeDistribution: Array<{
    name: string
    count: number
    totalAmount: number
  }>
  applicationStatusDistribution: Array<{
    status: string
    count: number
  }>
  loanStatusDistribution: Array<{
    status: string
    count: number
  }>
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  ACTIVE: '#3b82f6',
  PAID: '#10b981',
  OVERDUE: '#f59e0b',
  DEFAULTED: '#ef4444'
}

export function AnalyticsDashboard({ role }: { role: Role }) {
  const [borrowerData, setBorrowerData] = useState<BorrowerAnalytics | null>(null)
  const [adminData, setAdminData] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/analytics")
        if (!response.ok) throw new Error("Failed to load analytics")
        const data = await response.json()
        
        if (mounted) {
          if (role === "BORROWER") {
            setBorrowerData(data)
          } else {
            setAdminData(data)
          }
        }
      } catch (error) {
        console.error("Analytics fetch error:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAnalytics()
    return () => { mounted = false }
  }, [role])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    )
  }

  // Borrower Analytics View
  if (role === "BORROWER" && borrowerData) {
    const successRate = borrowerData.totalApplications > 0 
      ? Math.round((borrowerData.totalApproved / borrowerData.totalApplications) * 100) 
      : 0

    const paymentProgress = borrowerData.totalAmountBorrowed > 0
      ? Math.round((borrowerData.totalAmountPaid / borrowerData.totalAmountBorrowed) * 100)
      : 0

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{borrowerData.totalAmountBorrowed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From {borrowerData.totalLoans} loans
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₱{borrowerData.totalAmountPaid.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                {paymentProgress}% of total
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₱{borrowerData.totalRemaining.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Outstanding amount
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {borrowerData.totalApproved} of {borrowerData.totalApplications} approved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
              <CardDescription>Your loan application statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <Chart
                  type="donut"
                  height={250}
                  series={(() => {
                    const data = [
                      { name: 'Approved', value: borrowerData.totalApproved, color: '#10b981' },
                      { name: 'Rejected', value: borrowerData.totalRejected, color: '#ef4444' },
                      { name: 'Pending', value: borrowerData.totalApplications - borrowerData.totalApproved - borrowerData.totalRejected, color: '#f59e0b' }
                    ].filter(d => d.value > 0)
                    return data.map(d => d.value)
                  })()}
                  options={{
                    chart: {
                      type: 'donut',
                    },
                    labels: (() => {
                      const data = [
                        { name: 'Approved', value: borrowerData.totalApproved, color: '#10b981' },
                        { name: 'Rejected', value: borrowerData.totalRejected, color: '#ef4444' },
                        { name: 'Pending', value: borrowerData.totalApplications - borrowerData.totalApproved - borrowerData.totalRejected, color: '#f59e0b' }
                      ].filter(d => d.value > 0)
                      return data.map(d => d.name)
                    })(),
                    colors: (() => {
                      const data = [
                        { name: 'Approved', value: borrowerData.totalApproved, color: '#10b981' },
                        { name: 'Rejected', value: borrowerData.totalRejected, color: '#ef4444' },
                        { name: 'Pending', value: borrowerData.totalApplications - borrowerData.totalApproved - borrowerData.totalRejected, color: '#f59e0b' }
                      ].filter(d => d.value > 0)
                      return data.map(d => d.color)
                    })(),
                    legend: {
                      position: 'bottom',
                    },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '60%',
                        },
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: function (val: number, opts: any) {
                        return opts.w.config.series[opts.seriesIndex]
                      },
                    },
                    tooltip: {
                      y: {
                        formatter: function (val: number) {
                          return val + ' applications'
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Progress</CardTitle>
              <CardDescription>Loan repayment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span className="font-medium">{paymentProgress}%</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <div className="text-2xl font-bold text-green-600">{borrowerData.totalPaid}</div>
                    <div className="text-sm text-muted-foreground">Loans Completed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="text-2xl font-bold text-blue-600">{borrowerData.totalLoans - borrowerData.totalPaid}</div>
                    <div className="text-sm text-muted-foreground">Active Loans</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Applications Trend */}
          {borrowerData.monthlyData && borrowerData.monthlyData.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Application Trend</CardTitle>
                <CardDescription>Your applications over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <Chart
                    type="bar"
                    height={250}
                    series={[
                      {
                        name: 'Approved',
                        data: borrowerData.monthlyData.map(d => d.approved),
                      },
                      {
                        name: 'Pending',
                        data: borrowerData.monthlyData.map(d => d.pending),
                      },
                      {
                        name: 'Rejected',
                        data: borrowerData.monthlyData.map(d => d.rejected),
                      },
                    ]}
                    options={{
                      chart: {
                        type: 'bar',
                        toolbar: {
                          show: false,
                        },
                      },
                      xaxis: {
                        categories: borrowerData.monthlyData.map(d => d.month),
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      yaxis: {
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      colors: ['#10b981', '#f59e0b', '#ef4444'],
                      plotOptions: {
                        bar: {
                          borderRadius: 4,
                          columnWidth: '60%',
                        },
                      },
                      dataLabels: {
                        enabled: false,
                      },
                      legend: {
                        position: 'top',
                      },
                      grid: {
                        strokeDashArray: 3,
                      },
                      tooltip: {
                        y: {
                          formatter: function (val: number) {
                            return val + ' applications'
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Admin/Loan Officer Analytics View
  if ((role === "ADMIN" || role === "LOAN_OFFICER") && adminData) {
    const collectionRate = adminData.amounts.totalLoanAmount > 0
      ? Math.round((adminData.amounts.totalPaidAmount / adminData.amounts.totalLoanAmount) * 100)
      : 0

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{adminData.amounts.totalLoanAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {adminData.loans.total} total loans
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₱{adminData.amounts.totalPaidAmount.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                {collectionRate}% collection rate
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₱{adminData.amounts.totalRemainingAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {adminData.loans.active + adminData.loans.overdue} active loans
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Borrowers</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminData.users.borrowers}</div>
              <p className="text-xs text-muted-foreground">
                {adminData.users.approved} active, {adminData.users.pending} pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Second Row Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <FileText className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{adminData.applications.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{adminData.loans.active}</div>
              <p className="text-xs text-muted-foreground">Currently repaying</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{adminData.loans.overdue}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Loans</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{adminData.loans.paid}</div>
              <p className="text-xs text-muted-foreground">Fully paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Loan Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Status Distribution</CardTitle>
              <CardDescription>Current loan portfolio breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <Chart
                  type="donut"
                  height={250}
                  series={adminData.loanStatusDistribution.filter(d => d.count > 0).map(d => d.count)}
                  options={{
                    chart: {
                      type: 'donut',
                    },
                    labels: adminData.loanStatusDistribution.filter(d => d.count > 0).map(d => d.status),
                    colors: adminData.loanStatusDistribution.filter(d => d.count > 0).map(d => STATUS_COLORS[d.status] || COLORS[0]),
                    legend: {
                      position: 'bottom',
                    },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '60%',
                        },
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: function (val: number, opts: any) {
                        return opts.w.config.series[opts.seriesIndex]
                      },
                    },
                    tooltip: {
                      y: {
                        formatter: function (val: number) {
                          return val + ' loans'
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Application Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>Application processing status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <Chart
                  type="donut"
                  height={250}
                  series={adminData.applicationStatusDistribution.filter(d => d.count > 0).map(d => d.count)}
                  options={{
                    chart: {
                      type: 'donut',
                    },
                    labels: adminData.applicationStatusDistribution.filter(d => d.count > 0).map(d => d.status),
                    colors: adminData.applicationStatusDistribution.filter(d => d.count > 0).map(d => STATUS_COLORS[d.status] || COLORS[0]),
                    legend: {
                      position: 'bottom',
                    },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '60%',
                        },
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: function (val: number, opts: any) {
                        return opts.w.config.series[opts.seriesIndex]
                      },
                    },
                    tooltip: {
                      y: {
                        formatter: function (val: number) {
                          return val + ' applications'
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Loan Type Distribution */}
          {adminData.loanTypeDistribution && adminData.loanTypeDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Loans by Type</CardTitle>
                <CardDescription>Distribution across loan types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <Chart
                    type="bar"
                    height={250}
                    series={[
                      {
                        name: 'Loans',
                        data: adminData.loanTypeDistribution.map(d => d.count),
                      },
                    ]}
                    options={{
                      chart: {
                        type: 'bar',
                        toolbar: {
                          show: false,
                        },
                        horizontal: true,
                      },
                      xaxis: {
                        categories: adminData.loanTypeDistribution.map(d => d.name),
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      yaxis: {
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      colors: ['#3b82f6'],
                      plotOptions: {
                        bar: {
                          borderRadius: 4,
                          horizontal: true,
                        },
                      },
                      dataLabels: {
                        enabled: false,
                      },
                      grid: {
                        strokeDashArray: 3,
                      },
                      tooltip: {
                        y: {
                          formatter: function (val: number) {
                            return val + ' loans'
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Trend */}
          {adminData.monthlyData && adminData.monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Collections</CardTitle>
                <CardDescription>Payment collections over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <Chart
                    type="area"
                    height={250}
                    series={[
                      {
                        name: 'Collections',
                        data: adminData.monthlyData.map(d => d.paymentAmount),
                      },
                    ]}
                    options={{
                      chart: {
                        type: 'area',
                        toolbar: {
                          show: false,
                        },
                      },
                      xaxis: {
                        categories: adminData.monthlyData.map(d => d.month),
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      yaxis: {
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                          formatter: function (val: number) {
                            return '₱' + (val / 1000).toFixed(0) + 'k'
                          },
                        },
                      },
                      colors: ['#10b981'],
                      fill: {
                        type: 'gradient',
                        gradient: {
                          shadeIntensity: 1,
                          opacityFrom: 0.3,
                          opacityTo: 0.1,
                          stops: [0, 90, 100],
                        },
                      },
                      stroke: {
                        curve: 'smooth',
                        width: 2,
                      },
                      dataLabels: {
                        enabled: false,
                      },
                      grid: {
                        strokeDashArray: 3,
                      },
                      tooltip: {
                        y: {
                          formatter: function (val: number) {
                            return '₱' + val.toLocaleString()
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Applications & Loans Trend */}
          {adminData.monthlyData && adminData.monthlyData.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Activity</CardTitle>
                <CardDescription>Applications and loans over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Chart
                    type="bar"
                    height={300}
                    series={[
                      {
                        name: 'Applications',
                        data: adminData.monthlyData.map(d => d.applications),
                      },
                      {
                        name: 'Approved',
                        data: adminData.monthlyData.map(d => d.approved),
                      },
                      {
                        name: 'Loans Created',
                        data: adminData.monthlyData.map(d => d.loans),
                      },
                    ]}
                    options={{
                      chart: {
                        type: 'bar',
                        toolbar: {
                          show: false,
                        },
                      },
                      xaxis: {
                        categories: adminData.monthlyData.map(d => d.month),
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      yaxis: {
                        labels: {
                          style: {
                            fontSize: '12px',
                          },
                        },
                      },
                      colors: ['#8b5cf6', '#10b981', '#3b82f6'],
                      plotOptions: {
                        bar: {
                          borderRadius: 4,
                          columnWidth: '60%',
                        },
                      },
                      dataLabels: {
                        enabled: false,
                      },
                      legend: {
                        position: 'top',
                      },
                      grid: {
                        strokeDashArray: 3,
                      },
                      tooltip: {
                        y: {
                          formatter: function (val: number) {
                            return val.toString()
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        No analytics data available
      </CardContent>
    </Card>
  )
}
