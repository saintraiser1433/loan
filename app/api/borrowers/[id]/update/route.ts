import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "LOAN_OFFICER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { creditScore, loanLimit } = body

    // Validate inputs
    if (creditScore !== undefined) {
      const score = parseFloat(creditScore)
      if (isNaN(score) || score < 0 || score > 100) {
        return NextResponse.json(
          { error: "Credit score must be a number between 0 and 100" },
          { status: 400 }
        )
      }
    }

    if (loanLimit !== undefined) {
      const limit = parseFloat(loanLimit)
      if (isNaN(limit) || limit < 0) {
        return NextResponse.json(
          { error: "Loan limit must be a positive number" },
          { status: 400 }
        )
      }
    }

    // Check if borrower exists and get current values
    const borrower = await prisma.user.findUnique({
      where: { id },
      select: { 
        role: true,
        name: true,
        email: true,
        creditScore: true,
        loanLimit: true,
      }
    })

    if (!borrower || borrower.role !== "BORROWER") {
      return NextResponse.json(
        { error: "Borrower not found" },
        { status: 404 }
      )
    }

    // Update borrower
    const updatedBorrower = await prisma.user.update({
      where: { id },
      data: {
        ...(creditScore !== undefined && { creditScore: parseFloat(creditScore) }),
        ...(loanLimit !== undefined && { loanLimit: parseFloat(loanLimit) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        creditScore: true,
        loanLimit: true,
      }
    })

    // Log activity
    const changes: string[] = []
    if (creditScore !== undefined && creditScore !== borrower.creditScore) {
      changes.push(`credit score from ${borrower.creditScore} to ${creditScore}`)
    }
    if (loanLimit !== undefined && loanLimit !== borrower.loanLimit) {
      changes.push(`loan limit from ₱${borrower.loanLimit.toLocaleString()} to ₱${parseFloat(loanLimit).toLocaleString()}`)
    }

    if (changes.length > 0) {
      await logActivity({
        userId: session.user.id,
        action: "UPDATE_BORROWER",
        entityType: "BORROWER",
        entityId: id,
        description: `Updated ${borrower.name}: ${changes.join(", ")}`,
        metadata: {
          borrowerName: borrower.name,
          borrowerEmail: borrower.email,
          oldCreditScore: borrower.creditScore,
          newCreditScore: creditScore !== undefined ? parseFloat(creditScore) : borrower.creditScore,
          oldLoanLimit: borrower.loanLimit,
          newLoanLimit: loanLimit !== undefined ? parseFloat(loanLimit) : borrower.loanLimit,
        },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    return NextResponse.json(updatedBorrower)
  } catch (error) {
    console.error("Error updating borrower:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

