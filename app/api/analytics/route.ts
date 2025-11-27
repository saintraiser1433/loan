import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const sessionUser = session.user as { id: string }
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (user.role === "BORROWER") {
      // Borrower analytics
      const totalLoans = await prisma.loan.count({
        where: { userId: user.id }
      })

      const totalPaid = await prisma.loan.count({
        where: {
          userId: user.id,
          status: "PAID"
        }
      })

      const totalApplications = await prisma.loanApplication.count({
        where: { userId: user.id }
      })

      const totalApproved = await prisma.loanApplication.count({
        where: {
          userId: user.id,
          status: "APPROVED"
        }
      })

      const totalRejected = await prisma.loanApplication.count({
        where: {
          userId: user.id,
          status: "REJECTED"
        }
      })

      const totalAmountBorrowed = await prisma.loan.aggregate({
        where: { userId: user.id },
        _sum: { principalAmount: true }
      })

      const totalAmountPaid = await prisma.payment.aggregate({
        where: {
          userId: user.id,
          status: "COMPLETED"
        },
        _sum: { amount: true }
      })

      const totalRemaining = await prisma.loan.aggregate({
        where: {
          userId: user.id,
          status: { in: ["ACTIVE", "OVERDUE"] }
        },
        _sum: { remainingAmount: true }
      })

      // Monthly loan applications (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const monthlyApplications = await prisma.loanApplication.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          createdAt: true,
          status: true,
          requestedAmount: true
        }
      })

      // Group by month
      const monthlyData = monthlyApplications.reduce((acc: any, app) => {
        const month = new Date(app.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
        if (!acc[month]) {
          acc[month] = { total: 0, approved: 0, rejected: 0, pending: 0 }
        }
        acc[month].total++
        if (app.status === "APPROVED") acc[month].approved++
        if (app.status === "REJECTED") acc[month].rejected++
        if (app.status === "PENDING") acc[month].pending++
        return acc
      }, {})

      return NextResponse.json({
        totalLoans,
        totalPaid,
        totalApplications,
        totalApproved,
        totalRejected,
        totalAmountBorrowed: totalAmountBorrowed._sum.principalAmount || 0,
        totalAmountPaid: totalAmountPaid._sum.amount || 0,
        totalRemaining: totalRemaining._sum.remainingAmount || 0,
        monthlyData: Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
          month,
          ...data
        }))
      })
    } else {
      // Admin/Loan Officer analytics
      const totalUsers = await prisma.user.count()
      const totalBorrowers = await prisma.user.count({
        where: { role: "BORROWER" }
      })
      const pendingBorrowers = await prisma.user.count({
        where: {
          role: "BORROWER",
          status: "PENDING"
        }
      })
      const approvedBorrowers = await prisma.user.count({
        where: {
          role: "BORROWER",
          status: "APPROVED"
        }
      })

      const totalApplications = await prisma.loanApplication.count()
      const pendingApplications = await prisma.loanApplication.count({
        where: { status: "PENDING" }
      })
      const approvedApplications = await prisma.loanApplication.count({
        where: { status: "APPROVED" }
      })
      const rejectedApplications = await prisma.loanApplication.count({
        where: { status: "REJECTED" }
      })

      const totalLoans = await prisma.loan.count()
      const activeLoans = await prisma.loan.count({
        where: { status: "ACTIVE" }
      })
      const paidLoans = await prisma.loan.count({
        where: { status: "PAID" }
      })
      const overdueLoans = await prisma.loan.count({
        where: { status: "OVERDUE" }
      })
      const defaultedLoans = await prisma.loan.count({
        where: { status: "DEFAULTED" }
      })

      const totalLoanAmount = await prisma.loan.aggregate({
        _sum: { principalAmount: true }
      })

      const totalPaidAmount = await prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true }
      })

      const totalRemainingAmount = await prisma.loan.aggregate({
        where: { status: { in: ["ACTIVE", "OVERDUE"] } },
        _sum: { remainingAmount: true }
      })

      // Monthly statistics (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const monthlyApplications = await prisma.loanApplication.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          createdAt: true,
          status: true,
          requestedAmount: true,
          approvedAmount: true
        }
      })

      const monthlyLoans = await prisma.loan.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          createdAt: true,
          principalAmount: true,
          status: true
        }
      })

      const monthlyPayments = await prisma.payment.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          status: "COMPLETED"
        },
        select: {
          createdAt: true,
          amount: true
        }
      })

      // Group by month
      const monthlyData = monthlyApplications.reduce((acc: any, app) => {
        const month = new Date(app.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
        if (!acc[month]) {
          acc[month] = {
            applications: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            loans: 0,
            loanAmount: 0,
            payments: 0,
            paymentAmount: 0
          }
        }
        acc[month].applications++
        if (app.status === "APPROVED") acc[month].approved++
        if (app.status === "REJECTED") acc[month].rejected++
        if (app.status === "PENDING") acc[month].pending++
        return acc
      }, {})

      monthlyLoans.forEach(loan => {
        const month = new Date(loan.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
        if (!monthlyData[month]) {
          monthlyData[month] = {
            applications: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            loans: 0,
            loanAmount: 0,
            payments: 0,
            paymentAmount: 0
          }
        }
        monthlyData[month].loans++
        monthlyData[month].loanAmount += loan.principalAmount
      })

      monthlyPayments.forEach(payment => {
        const month = new Date(payment.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
        if (!monthlyData[month]) {
          monthlyData[month] = {
            applications: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            loans: 0,
            loanAmount: 0,
            payments: 0,
            paymentAmount: 0
          }
        }
        monthlyData[month].payments++
        monthlyData[month].paymentAmount += payment.amount
      })

      // Loan type distribution
      const loanTypeStats = await prisma.loan.groupBy({
        by: ['loanTypeId'],
        _count: { id: true },
        _sum: { principalAmount: true }
      })

      const loanTypes = await prisma.loanType.findMany({
        where: {
          id: { in: loanTypeStats.map(s => s.loanTypeId) }
        }
      })

      const loanTypeDistribution = loanTypeStats.map(stat => {
        const loanType = loanTypes.find(lt => lt.id === stat.loanTypeId)
        return {
          name: loanType?.name || "Unknown",
          count: stat._count.id,
          totalAmount: stat._sum.principalAmount || 0
        }
      })

      // Application status distribution
      const applicationStatusDistribution = [
        { status: "PENDING", count: pendingApplications },
        { status: "APPROVED", count: approvedApplications },
        { status: "REJECTED", count: rejectedApplications }
      ]

      // Loan status distribution
      const loanStatusDistribution = [
        { status: "ACTIVE", count: activeLoans },
        { status: "PAID", count: paidLoans },
        { status: "OVERDUE", count: overdueLoans },
        { status: "DEFAULTED", count: defaultedLoans }
      ]

      return NextResponse.json({
        users: {
          total: totalUsers,
          borrowers: totalBorrowers,
          pending: pendingBorrowers,
          approved: approvedBorrowers
        },
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications
        },
        loans: {
          total: totalLoans,
          active: activeLoans,
          paid: paidLoans,
          overdue: overdueLoans,
          defaulted: defaultedLoans
        },
        amounts: {
          totalLoanAmount: totalLoanAmount._sum.principalAmount || 0,
          totalPaidAmount: totalPaidAmount._sum.amount || 0,
          totalRemainingAmount: totalRemainingAmount._sum.remainingAmount || 0
        },
        monthlyData: Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
          month,
          ...data
        })),
        loanTypeDistribution,
        applicationStatusDistribution,
        loanStatusDistribution
      })
    }
  } catch (error: any) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}


