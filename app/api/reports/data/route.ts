import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "LOAN_OFFICER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get("type")
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate") as string) : null
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate") as string) : null

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: new Date(endDate.getTime() + 86400000) }), // Include end date
    }

    switch (reportType) {
      case "summary":
        return NextResponse.json(await getSummaryData(dateFilter))
      case "loans":
        return NextResponse.json(await getLoansData(dateFilter))
      case "applications":
        return NextResponse.json(await getApplicationsData(dateFilter))
      case "payments":
        return NextResponse.json(await getPaymentsData(dateFilter))
      case "borrowers":
        return NextResponse.json(await getBorrowersData(dateFilter))
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error fetching report data:", error)
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 })
  }
}

async function getSummaryData(dateFilter: any) {
  const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  const [
    activeLoans,
    paidLoans,
    overdueLoans,
    totalApplications,
    pendingApplications,
    totalBorrowers,
    disbursedResult,
    collectedResult,
    outstandingResult,
  ] = await Promise.all([
    prisma.loan.count({ where: { ...whereClause, status: "ACTIVE" } }),
    prisma.loan.count({ where: { ...whereClause, status: "PAID" } }),
    prisma.loan.count({ where: { ...whereClause, status: "OVERDUE" } }),
    prisma.loanApplication.count({ where: whereClause }),
    prisma.loanApplication.count({ where: { ...whereClause, status: "PENDING" } }),
    prisma.user.count({ where: { ...whereClause, role: "BORROWER" } }),
    prisma.loan.aggregate({ _sum: { principalAmount: true }, where: whereClause }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { ...whereClause, status: "COMPLETED" } }),
    prisma.loan.aggregate({ _sum: { remainingAmount: true }, where: { ...whereClause, status: { in: ["ACTIVE", "OVERDUE"] } } }),
  ])

  return {
    activeLoans,
    paidLoans,
    overdueLoans,
    totalApplications,
    pendingApplications,
    totalBorrowers,
    totalDisbursed: disbursedResult._sum.principalAmount || 0,
    totalCollected: collectedResult._sum.amount || 0,
    outstandingBalance: outstandingResult._sum.remainingAmount || 0,
  }
}

async function getLoansData(dateFilter: any) {
  const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  const loans = await prisma.loan.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      loanType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return { loans }
}

async function getApplicationsData(dateFilter: any) {
  const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  const applications = await prisma.loanApplication.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      loanType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return { applications }
}

async function getPaymentsData(dateFilter: any) {
  const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  const payments = await prisma.payment.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      loan: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return { payments }
}

async function getBorrowersData(dateFilter: any) {
  const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  const borrowers = await prisma.user.findMany({
    where: { ...whereClause, role: "BORROWER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      creditScore: true,
      loanLimit: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return { borrowers }
}



