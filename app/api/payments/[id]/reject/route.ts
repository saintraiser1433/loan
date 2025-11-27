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

    // Only admins and loan officers can reject payments
    if (session.user.role !== "ADMIN" && session.user.role !== "LOAN_OFFICER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { rejectionReason } = body

    if (!rejectionReason || rejectionReason.trim() === "") {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    // Fetch payment with loan and user info
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            user: true
          }
        },
        term: true // Include term to get payment month
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment is already ${payment.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Update payment status to FAILED
    await prisma.payment.update({
      where: { id },
      data: {
        status: "FAILED",
        rejectedBy: session.user.id,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim()
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "REJECT_PAYMENT",
      entityType: "PAYMENT",
      entityId: id,
      description: `Rejected payment of ₱${payment.amount.toLocaleString()} for loan ${payment.loanId}`,
      metadata: { 
        amount: payment.amount, 
        loanId: payment.loanId,
        rejectionReason: rejectionReason.trim()
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    // Send rejection SMS to borrower
    if (payment.loan.user?.phone) {
      // Get payment month from term dueDate
      let monthText = ""
      if (payment.term && payment.term.dueDate) {
        const dueDate = new Date(payment.term.dueDate)
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"]
        const monthName = monthNames[dueDate.getMonth()]
        const year = dueDate.getFullYear()
        monthText = ` for the month of ${monthName} ${year}`
      }
      
      const rejectionMessage = `Dear ${payment.loan.user.name},\n\nWe regret to inform you that your payment of ₱${payment.amount.toLocaleString()}${monthText} has been REJECTED.\n\nReason: ${rejectionReason.trim()}\n\nLoan ID: ${payment.loanId}\n\nPlease contact us at your earliest convenience for assistance in resolving this matter.\n\nBest regards,\nGlan Credible and Capital Inc.`
      
      await sendSMS(payment.loan.user.phone, rejectionMessage, payment.userId).catch((error) => {
        console.error("Failed to send payment rejection SMS:", error)
      })
    }

    return NextResponse.json({ 
      message: "Payment rejected successfully"
    })
  } catch (error) {
    console.error("Error rejecting payment:", error)
    return NextResponse.json(
      { error: "Failed to reject payment" },
      { status: 500 }
    )
  }
}

