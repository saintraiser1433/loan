import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"
import { sendSMS } from "@/lib/sms"

export async function POST(
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

    if (session.user.role === "BORROWER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { creditScore, loanLimit } = body

    // Use default values if not provided
    const defaultCreditScore = 0
    const defaultLoanLimit = 5000
    const finalCreditScore = creditScore !== undefined ? parseFloat(creditScore) : defaultCreditScore
    const finalLoanLimit = loanLimit !== undefined ? parseFloat(loanLimit) : defaultLoanLimit

    // Validate credit score if provided
    if (creditScore !== undefined && (finalCreditScore < 0 || finalCreditScore > 100)) {
      return NextResponse.json(
        { error: "Credit score must be between 0 and 100" },
        { status: 400 }
      )
    }

    // Validate loan limit if provided
    if (loanLimit !== undefined && finalLoanLimit < 0) {
      return NextResponse.json(
        { error: "Loan limit must be greater than or equal to 0" },
        { status: 400 }
      )
    }

    const borrower = await prisma.user.findUnique({
      where: { id: id }
    })

    if (!borrower || borrower.role !== "BORROWER") {
      return NextResponse.json(
        { error: "Borrower not found" },
        { status: 404 }
      )
    }

    const updatedBorrower = await prisma.user.update({
      where: { id: id },
      data: {
        status: "APPROVED",
        creditScore: finalCreditScore,
        loanLimit: finalLoanLimit,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason: null,
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "APPROVE_BORROWER",
      entityType: "BORROWER",
      entityId: id,
      description: `Approved borrower ${borrower.name} with credit score ${finalCreditScore}% and loan limit ₱${finalLoanLimit.toLocaleString()}`,
      metadata: {
        borrowerName: borrower.name,
        borrowerEmail: borrower.email,
        creditScore: finalCreditScore,
        loanLimit: finalLoanLimit,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    // Send approval SMS
    if (borrower.phone) {
      const approvalMessage = `Dear ${borrower.name},\n\nWe are pleased to inform you that your borrower account has been APPROVED!\n\nYour Account Details:\n- Credit Score: ${finalCreditScore}%\n- Initial Loan Limit: ₱${finalLoanLimit.toLocaleString()}\n\nYou can now apply for loans within your approved limit. We look forward to serving your financial needs.\n\nThank you for choosing Glan Credible and Capital Inc.\n\nBest regards,\nGlan Credible and Capital Inc.`
      await sendSMS(borrower.phone, approvalMessage, borrower.id).catch((error) => {
        console.error("Failed to send borrower approval SMS:", error)
        // Don't fail the request if SMS fails
      })
    }

    return NextResponse.json({
      message: "Borrower approved successfully",
      borrower: updatedBorrower
    })
  } catch (error) {
    console.error("Error approving borrower:", error)
    return NextResponse.json(
      { error: "Failed to approve borrower" },
      { status: 500 }
    )
  }
}

