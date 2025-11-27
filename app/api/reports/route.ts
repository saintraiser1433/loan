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

    if (session.user.role === "BORROWER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Get reports data
    const loanTypes = await prisma.loanType.findMany({
      include: {
        loans: true,
        applications: true,
      }
    })

    const unpaidLoans = await prisma.loan.findMany({
      where: {
        status: { in: ["ACTIVE", "OVERDUE"] }
      },
      include: {
        user: true,
        loanType: true,
      }
    })

    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: "OVERDUE"
      },
      include: {
        user: true,
        loanType: true,
      }
    })

    const totalActiveLoans = await prisma.loan.count({
      where: { status: "ACTIVE" }
    })

    const totalPaidLoans = await prisma.loan.count({
      where: { status: "PAID" }
    })

    return NextResponse.json({
      loanTypes,
      overdueLoans,
      stats: {
        totalActiveLoans,
        totalPaidLoans,
        unpaidLoans: unpaidLoans.length,
        overdueLoans: overdueLoans.length,
      }
    })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}






