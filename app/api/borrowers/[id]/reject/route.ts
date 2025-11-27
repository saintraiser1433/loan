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
    const body = await request.json()
    const { rejectionReason } = body

    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
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
        status: "REJECTED",
        rejectionReason,
        approvedBy: null,
        approvedAt: null,
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "REJECT_BORROWER",
      entityType: "BORROWER",
      entityId: id,
      description: `Rejected borrower ${borrower.name}. Reason: ${rejectionReason}`,
      metadata: {
        borrowerName: borrower.name,
        borrowerEmail: borrower.email,
        rejectionReason,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    // Send rejection SMS
    if (borrower.phone) {
      const rejectionMessage = `Dear ${borrower.name},\n\nYour borrower account registration has been REJECTED.\n\nReason: ${rejectionReason}\n\nIf you have questions, please contact us.\n\nGlan Credible and Capital Inc.`
      await sendSMS(borrower.phone, rejectionMessage, borrower.id).catch((error) => {
        console.error("Failed to send borrower rejection SMS:", error)
        // Don't fail the request if SMS fails
      })
    }

    return NextResponse.json({
      message: "Borrower rejected successfully",
      borrower: updatedBorrower
    })
  } catch (error) {
    console.error("Error rejecting borrower:", error)
    return NextResponse.json(
      { error: "Failed to reject borrower" },
      { status: 500 }
    )
  }
}

