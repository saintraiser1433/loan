import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"

export async function DELETE(
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

    const { id } = await params

    // Find the application
    const application = await prisma.loanApplication.findUnique({
      where: { id },
      include: {
        user: true,
        loanType: true,
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      )
    }

    // Only borrowers can delete their own applications
    // Only pending applications can be deleted
    if (session.user.role === "BORROWER") {
      if (application.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only delete your own applications" },
          { status: 403 }
        )
      }

      if (application.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only pending applications can be deleted" },
          { status: 400 }
        )
      }
    } else {
      // Admins and loan officers can delete any pending application
      if (application.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only pending applications can be deleted" },
          { status: 400 }
        )
      }
    }

    // Delete the application
    await prisma.loanApplication.delete({
      where: { id }
    })

    // Log activity (only for admins/loan officers, borrowers don't need activity logs for their own deletions)
    if (session.user.role !== "BORROWER") {
      await logActivity({
        userId: session.user.id,
        action: "DELETE",
        entityType: "LoanApplication",
        entityId: id,
        description: `Deleted loan application for ${application.user.name}`,
        metadata: {
          loanType: application.loanType.name,
          requestedAmount: application.requestedAmount,
        },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
    }

    return NextResponse.json({ message: "Application deleted successfully" })
  } catch (error) {
    console.error("Error deleting application:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


