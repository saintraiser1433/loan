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

    if (session.user.role !== "BORROWER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        loanLimit: true,
        creditScore: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get active loans to calculate used credit
    const activeLoans = await prisma.loan.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "OVERDUE"] }
      },
      select: {
        remainingAmount: true
      }
    })

    // Check for pending applications
    const pendingApplications = await prisma.loanApplication.count({
      where: {
        userId: session.user.id,
        status: "PENDING"
      }
    })

    // Calculate total used credit
    const usedCredit = activeLoans.reduce((sum, loan) => sum + loan.remainingAmount, 0)

    // Calculate available credit
    const availableCredit = user.loanLimit - usedCredit

    return NextResponse.json({
      loanLimit: user.loanLimit,
      creditScore: user.creditScore,
      usedCredit,
      availableCredit: Math.max(0, availableCredit), // Ensure it's not negative
      hasPendingApplication: pendingApplications > 0,
      hasActiveLoan: activeLoans.length > 0,
      canApply: pendingApplications === 0 && activeLoans.length === 0,
    })
  } catch (error) {
    console.error("Error fetching borrower credit:", error)
    return NextResponse.json(
      { error: "Failed to fetch borrower credit" },
      { status: 500 }
    )
  }
}

