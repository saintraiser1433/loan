import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = session.user as { role: string }
    if (user.role !== "ADMIN" && user.role !== "LOAN_OFFICER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get("type") || "summary"
    const format = searchParams.get("format") || "csv"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    let data: any[] = []
    let headers: string[] = []
    let filename = ""

    switch (reportType) {
      case "loans":
        const loans = await prisma.loan.findMany({
          where: startDate || endDate ? { createdAt: dateFilter } : {},
          include: {
            user: {
              select: { name: true, email: true }
            },
            loanType: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        })

        headers = [
          "Loan ID",
          "Borrower Name",
          "Borrower Email",
          "Loan Type",
          "Principal Amount",
          "Interest Rate",
          "Total Amount",
          "Amount Paid",
          "Remaining",
          "Status",
          "Due Date",
          "Created Date"
        ]

        data = loans.map(loan => [
          loan.id,
          loan.user?.name || "N/A",
          loan.user?.email || "N/A",
          loan.loanType?.name || "N/A",
          `₱${loan.principalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `${loan.interestRate}%`,
          `₱${loan.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `₱${loan.amountPaid.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `₱${loan.remainingAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          loan.status,
          new Date(loan.dueDate).toLocaleDateString(),
          new Date(loan.createdAt).toLocaleDateString()
        ])

        filename = `loans_report_${new Date().toISOString().split('T')[0]}`
        break

      case "applications":
        const applications = await prisma.loanApplication.findMany({
          where: startDate || endDate ? { createdAt: dateFilter } : {},
          include: {
            user: {
              select: { name: true, email: true }
            },
            loanType: {
              select: { name: true }
            },
            purpose: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        })

        headers = [
          "Application ID",
          "Borrower Name",
          "Borrower Email",
          "Loan Type",
          "Purpose",
          "Requested Amount",
          "Approved Amount",
          "Status",
          "Salary",
          "Source of Income",
          "Applied Date"
        ]

        data = applications.map(app => [
          app.id,
          app.user?.name || "N/A",
          app.user?.email || "N/A",
          app.loanType?.name || "N/A",
          app.purpose?.name || "N/A",
          `₱${app.requestedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          app.approvedAmount ? `₱${app.approvedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
          app.status,
          `₱${app.salary.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          app.sourceOfIncome,
          new Date(app.createdAt).toLocaleDateString()
        ])

        filename = `applications_report_${new Date().toISOString().split('T')[0]}`
        break

      case "payments":
        const payments = await prisma.payment.findMany({
          where: startDate || endDate ? { createdAt: dateFilter } : {},
          include: {
            user: {
              select: { name: true, email: true }
            },
            loan: {
              select: { id: true }
            }
          },
          orderBy: { createdAt: "desc" }
        })

        headers = [
          "Payment ID",
          "Borrower Name",
          "Borrower Email",
          "Loan ID",
          "Amount",
          "Payment Type",
          "Payment Method",
          "Status",
          "Payment Date"
        ]

        data = payments.map(payment => [
          payment.id,
          payment.user?.name || "N/A",
          payment.user?.email || "N/A",
          payment.loan?.id || "N/A",
          `₱${payment.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          payment.paymentType,
          payment.paymentMethod || "N/A",
          payment.status,
          new Date(payment.createdAt).toLocaleDateString()
        ])

        filename = `payments_report_${new Date().toISOString().split('T')[0]}`
        break

      case "borrowers":
        const borrowers = await prisma.user.findMany({
          where: {
            role: "BORROWER",
            ...(startDate || endDate ? { createdAt: dateFilter } : {})
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            creditScore: true,
            loanLimit: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                loans: true,
                applications: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        })

        headers = [
          "Borrower ID",
          "Name",
          "Email",
          "Phone",
          "Credit Score",
          "Loan Limit",
          "Status",
          "Total Loans",
          "Total Applications",
          "Registered Date"
        ]

        data = borrowers.map(borrower => [
          borrower.id,
          borrower.name || "N/A",
          borrower.email,
          borrower.phone || "N/A",
          borrower.creditScore,
          `₱${borrower.loanLimit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          borrower.status,
          borrower._count.loans,
          borrower._count.applications,
          new Date(borrower.createdAt).toLocaleDateString()
        ])

        filename = `borrowers_report_${new Date().toISOString().split('T')[0]}`
        break

      case "summary":
      default:
        const totalLoans = await prisma.loan.count()
        const activeLoans = await prisma.loan.count({ where: { status: "ACTIVE" } })
        const paidLoans = await prisma.loan.count({ where: { status: "PAID" } })
        const overdueLoans = await prisma.loan.count({ where: { status: "OVERDUE" } })

        const totalApplications = await prisma.loanApplication.count()
        const pendingApplications = await prisma.loanApplication.count({ where: { status: "PENDING" } })
        const approvedApplications = await prisma.loanApplication.count({ where: { status: "APPROVED" } })
        const rejectedApplications = await prisma.loanApplication.count({ where: { status: "REJECTED" } })

        const totalBorrowers = await prisma.user.count({ where: { role: "BORROWER" } })
        const activeBorrowers = await prisma.user.count({ where: { role: "BORROWER", status: "APPROVED" } })

        const totalDisbursed = await prisma.loan.aggregate({ _sum: { principalAmount: true } })
        const totalCollected = await prisma.payment.aggregate({ 
          where: { status: "COMPLETED" },
          _sum: { amount: true } 
        })
        const totalOutstanding = await prisma.loan.aggregate({
          where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          _sum: { remainingAmount: true }
        })

        headers = ["Metric", "Value"]
        data = [
          ["Report Generated", new Date().toLocaleString()],
          ["", ""],
          ["=== LOANS ===", ""],
          ["Total Loans", totalLoans],
          ["Active Loans", activeLoans],
          ["Paid Loans", paidLoans],
          ["Overdue Loans", overdueLoans],
          ["", ""],
          ["=== APPLICATIONS ===", ""],
          ["Total Applications", totalApplications],
          ["Pending Applications", pendingApplications],
          ["Approved Applications", approvedApplications],
          ["Rejected Applications", rejectedApplications],
          ["", ""],
          ["=== BORROWERS ===", ""],
          ["Total Borrowers", totalBorrowers],
          ["Active Borrowers", activeBorrowers],
          ["", ""],
          ["=== FINANCIAL ===", ""],
          ["Total Disbursed", `₱${(totalDisbursed._sum.principalAmount || 0).toLocaleString()}`],
          ["Total Collected", `₱${(totalCollected._sum.amount || 0).toLocaleString()}`],
          ["Total Outstanding", `₱${(totalOutstanding._sum.remainingAmount || 0).toLocaleString()}`],
        ]

        filename = `summary_report_${new Date().toISOString().split('T')[0]}`
        break
    }

    if (format === "csv") {
      // Generate CSV
      const csvContent = [
        headers.join(","),
        ...data.map(row => 
          row.map((cell: any) => {
            const cellStr = String(cell ?? "")
            // Escape quotes and wrap in quotes if contains comma or quote
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          }).join(",")
        )
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`
        }
      })
    } else {
      // Return JSON
      return NextResponse.json({
        headers,
        data,
        filename
      })
    }
  } catch (error: any) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export report" },
      { status: 500 }
    )
  }
}



