"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { generatePDFReport, formatCurrency, formatCurrencyForPDF, formatDate } from "@/lib/pdf-generator"
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  CreditCard, 
  DollarSign,
  AlertTriangle,
  Calendar,
  FileDown
} from "lucide-react"

interface LoanType {
  id: string
  name: string
  loans: Array<{ status: string }>
  applications: Array<unknown>
}

interface OverdueLoan {
  id: string
  remainingAmount: number
  dueDate: Date
  user: {
    name: string
    email: string
  }
  loanType: {
    name: string
  }
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([])
  const [overdueLoans, setOverdueLoans] = useState<OverdueLoan[]>([])
  const [stats, setStats] = useState({
    totalActiveLoans: 0,
    totalPaidLoans: 0,
    unpaidLoans: 0,
    overdueLoans: 0,
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role === "BORROWER") {
      redirect("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchReports()
    }
  }, [status, session])

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/reports")
      if (response.ok) {
        const data = await response.json()
        setLoanTypes(data.loanTypes || [])
        setOverdueLoans(data.overdueLoans || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async (reportType: string) => {
    setExporting(reportType + "-csv")
    try {
      let url = `/api/reports/export?type=${reportType}&format=csv`
      if (startDate) url += `&startDate=${startDate}`
      if (endDate) url += `&endDate=${endDate}`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error("Failed to export report")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast({
        title: "Export Successful",
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report has been downloaded.`
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export the report. Please try again."
      })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async (reportType: string) => {
    setExporting(reportType + "-pdf")
    try {
      // Fetch data for PDF
      let url = `/api/reports/data?type=${reportType}`
      if (startDate) url += `&startDate=${startDate}`
      if (endDate) url += `&endDate=${endDate}`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error("Failed to fetch report data")
      }

      const data = await response.json()
      
      const dateRange = startDate || endDate 
        ? `${startDate || "Start"} to ${endDate || "Present"}`
        : "All Time"

      let pdfData: any = {
        title: "",
        dateRange,
        summary: [],
        tableHeaders: [],
        tableData: [],
      }

      switch (reportType) {
        case "summary":
          pdfData.title = "Summary Report"
          pdfData.summary = [
            { label: "Active Loans", value: data.activeLoans || 0 },
            { label: "Paid Loans", value: data.paidLoans || 0 },
            { label: "Overdue Loans", value: data.overdueLoans || 0 },
            { label: "Total Disbursed", value: formatCurrencyForPDF(data.totalDisbursed || 0) },
          ]
          pdfData.tableHeaders = ["Metric", "Value"]
          pdfData.tableData = [
            ["Total Applications", data.totalApplications || 0],
            ["Pending Applications", data.pendingApplications || 0],
            ["Total Borrowers", data.totalBorrowers || 0],
            ["Total Amount Disbursed", formatCurrencyForPDF(data.totalDisbursed || 0)],
            ["Total Amount Collected", formatCurrencyForPDF(data.totalCollected || 0)],
            ["Outstanding Balance", formatCurrencyForPDF(data.outstandingBalance || 0)],
          ]
          break

        case "loans":
          pdfData.title = "Loans Report"
          pdfData.summary = [
            { label: "Total Loans", value: data.loans?.length || 0 },
            { label: "Active", value: data.loans?.filter((l: any) => l.status === "ACTIVE").length || 0 },
            { label: "Paid", value: data.loans?.filter((l: any) => l.status === "PAID").length || 0 },
            { label: "Overdue", value: data.loans?.filter((l: any) => l.status === "OVERDUE").length || 0 },
          ]
          pdfData.tableHeaders = ["Borrower", "Loan Type", "Principal", "Total", "Remaining", "Status", "Due Date"]
          pdfData.tableData = (data.loans || []).map((loan: any) => [
            loan.user?.name || "N/A",
            loan.loanType?.name || "N/A",
            formatCurrencyForPDF(loan.principalAmount),
            formatCurrencyForPDF(loan.totalAmount),
            formatCurrencyForPDF(loan.remainingAmount),
            loan.status,
            formatDate(loan.dueDate),
          ])
          break

        case "applications":
          pdfData.title = "Applications Report"
          pdfData.summary = [
            { label: "Total", value: data.applications?.length || 0 },
            { label: "Pending", value: data.applications?.filter((a: any) => a.status === "PENDING").length || 0 },
            { label: "Approved", value: data.applications?.filter((a: any) => a.status === "APPROVED").length || 0 },
            { label: "Rejected", value: data.applications?.filter((a: any) => a.status === "REJECTED").length || 0 },
          ]
          pdfData.tableHeaders = ["Applicant", "Loan Type", "Requested", "Status", "Date"]
          pdfData.tableData = (data.applications || []).map((app: any) => [
            app.user?.name || "N/A",
            app.loanType?.name || "N/A",
            formatCurrencyForPDF(app.requestedAmount),
            app.status,
            formatDate(app.createdAt),
          ])
          break

        case "payments":
          pdfData.title = "Payments Report"
          const totalAmount = (data.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0)
          const completedAmount = (data.payments || [])
            .filter((p: any) => p.status === "COMPLETED")
            .reduce((sum: number, p: any) => sum + p.amount, 0)
          pdfData.summary = [
            { label: "Total Payments", value: data.payments?.length || 0 },
            { label: "Completed", value: data.payments?.filter((p: any) => p.status === "COMPLETED").length || 0 },
            { label: "Pending", value: data.payments?.filter((p: any) => p.status === "PENDING").length || 0 },
            { label: "Total Collected", value: formatCurrencyForPDF(completedAmount) },
          ]
          pdfData.tableHeaders = ["Borrower", "Amount", "Type", "Method", "Status", "Date"]
          pdfData.tableData = (data.payments || []).map((payment: any) => [
            payment.user?.name || "N/A",
            formatCurrencyForPDF(payment.amount),
            payment.paymentType,
            payment.paymentMethod || "N/A",
            payment.status,
            formatDate(payment.createdAt),
          ])
          break

        case "borrowers":
          pdfData.title = "Borrowers Report"
          pdfData.summary = [
            { label: "Total Borrowers", value: data.borrowers?.length || 0 },
            { label: "Active", value: data.borrowers?.filter((b: any) => b.isActive).length || 0 },
            { label: "Approved", value: data.borrowers?.filter((b: any) => b.status === "APPROVED").length || 0 },
            { label: "Pending", value: data.borrowers?.filter((b: any) => b.status === "PENDING").length || 0 },
          ]
          pdfData.tableHeaders = ["Name", "Email", "Phone", "Credit Score", "Loan Limit", "Status"]
          pdfData.tableData = (data.borrowers || []).map((borrower: any) => [
            borrower.name || "N/A",
            borrower.email || "N/A",
            borrower.phone || "N/A",
            borrower.creditScore || 0,
            formatCurrencyForPDF(borrower.loanLimit || 0),
            borrower.status || "PENDING",
          ])
          break
      }

      const doc = generatePDFReport(pdfData)
      doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`)

      toast({
        title: "PDF Generated",
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report has been downloaded.`
      })
    } catch (error) {
      console.error("PDF export error:", error)
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again."
      })
    } finally {
      setExporting(null)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  const loanTypeColumns = [
    {
      header: "Loan Type",
      accessor: (row: LoanType) => row.name,
    },
    {
      header: "Total Applications",
      accessor: (row: LoanType) => row.applications.length,
    },
    {
      header: "Active Loans",
      accessor: (row: LoanType) => row.loans.filter(l => l.status === "ACTIVE").length,
    },
    {
      header: "Paid Loans",
      accessor: (row: LoanType) => row.loans.filter(l => l.status === "PAID").length,
    },
    {
      header: "Overdue Loans",
      accessor: (row: LoanType) => (
        <span className={row.loans.filter(l => l.status === "OVERDUE").length > 0 ? "text-destructive font-semibold" : ""}>
          {row.loans.filter(l => l.status === "OVERDUE").length}
        </span>
      ),
    },
  ]

  const overdueColumns = [
    {
      header: "Borrower",
      accessor: (row: OverdueLoan) => (
        <div>
          <div className="font-medium">{row.user.name}</div>
          <div className="text-sm text-muted-foreground">{row.user.email}</div>
        </div>
      ),
    },
    {
      header: "Loan Type",
      accessor: (row: OverdueLoan) => row.loanType.name,
    },
    {
      header: "Remaining Amount",
      accessor: (row: OverdueLoan) => `₱${row.remainingAmount.toLocaleString()}`,
    },
    {
      header: "Due Date",
      accessor: (row: OverdueLoan) => (
        <span className="text-destructive">
          {new Date(row.dueDate).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const exportReports = [
    {
      id: "summary",
      title: "Summary Report",
      description: "Overview of all loans, applications, and financial metrics",
      icon: FileText
    },
    {
      id: "loans",
      title: "Loans Report",
      description: "Detailed list of all loans with status and amounts",
      icon: CreditCard
    },
    {
      id: "applications",
      title: "Applications Report",
      description: "All loan applications with approval status",
      icon: FileSpreadsheet
    },
    {
      id: "payments",
      title: "Payments Report",
      description: "All payment transactions and collections",
      icon: DollarSign
    },
    {
      id: "borrowers",
      title: "Borrowers Report",
      description: "List of all registered borrowers and their stats",
      icon: Users
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Export</h1>
            <p className="text-muted-foreground">
              View statistics and export reports
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActiveLoans}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Loans</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalPaidLoans}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid Loans</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unpaidLoans}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueLoans}</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Reports
            </CardTitle>
            <CardDescription>
              Download reports in CSV or PDF format for further analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Filter */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Date (Optional):</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From:</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To:</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              {(startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Export Buttons */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exportReports.map((report) => (
                <Card key={report.id} className="hover:border-blue-500 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <report.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{report.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportCSV(report.id)}
                        disabled={exporting === report.id + "-csv"}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        {exporting === report.id + "-csv" ? "..." : "CSV"}
                      </Button>
                      <Button 
                        className="flex-1"
                        variant="default"
                        size="sm"
                        onClick={() => handleExportPDF(report.id)}
                        disabled={exporting === report.id + "-pdf"}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        {exporting === report.id + "-pdf" ? "..." : "PDF"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports by Loan Type */}
        <Card>
          <CardHeader>
            <CardTitle>Loans by Type</CardTitle>
            <CardDescription>Breakdown of loans across different types</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={loanTypes}
              columns={loanTypeColumns}
              searchable={true}
              searchPlaceholder="Search loan types..."
              pageSize={10}
            />
          </CardContent>
        </Card>

        {/* Overdue Loans */}
        {overdueLoans.length > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Overdue Loans
              </CardTitle>
              <CardDescription>Loans that have passed their due date</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={overdueLoans}
                columns={overdueColumns}
                searchable={true}
                searchPlaceholder="Search overdue loans..."
                pageSize={10}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
