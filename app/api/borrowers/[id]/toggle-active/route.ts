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
    const body = await request.json().catch(() => ({}))
    const { blockReason } = body

    // Check if borrower exists
    let borrower: any
    try {
      borrower = await prisma.user.findUnique({
        where: { id },
        select: { role: true, isActive: true, status: true }
      })
    } catch (error: any) {
      // If isActive field doesn't exist in Prisma client yet, query without it
      if (error.message?.includes("isActive") || error.code === "P2009") {
        borrower = await prisma.user.findUnique({
          where: { id },
          select: { role: true, status: true }
        })
        if (borrower) {
          (borrower as any).isActive = true // Default to true
        }
      } else {
        throw error
      }
    }

    if (!borrower || borrower.role !== "BORROWER") {
      return NextResponse.json(
        { error: "Borrower not found" },
        { status: 404 }
      )
    }

    // Prevent blocking pending borrowers
    if ((borrower.status === "PENDING" || borrower.status === null) && (borrower as any).isActive === true) {
      return NextResponse.json(
        { error: "Cannot block pending borrowers. Please approve or reject the borrower first." },
        { status: 400 }
      )
    }

    const currentIsActive = (borrower as any).isActive ?? true
    const willBeBlocked = currentIsActive === true // If currently active, will be blocked

    // Validate block reason if blocking
    if (willBeBlocked && (!blockReason || !blockReason.trim())) {
      return NextResponse.json(
        { error: "Block reason is required when blocking a borrower" },
        { status: 400 }
      )
    }

    // Get borrower name for logging
    const borrowerInfo = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true }
    })

    // Toggle isActive status
    let updatedBorrower: any
    try {
      updatedBorrower = await prisma.user.update({
        where: { id },
        data: {
          isActive: !currentIsActive,
          blockReason: willBeBlocked ? blockReason : null, // Set reason when blocking, clear when activating
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          blockReason: true,
        }
      })
    } catch (error: any) {
      // If isActive field doesn't exist in Prisma client yet, return error
      if (error.message?.includes("isActive") || error.code === "P2009") {
        return NextResponse.json(
          { 
            error: "isActive field not available. Please restart the dev server to regenerate Prisma client." 
          },
          { status: 500 }
        )
      }
      throw error
    }

    // Log activity (don't await to avoid blocking the response)
    logActivity({
      userId: session.user.id,
      action: willBeBlocked ? "BLOCK_BORROWER" : "ACTIVATE_BORROWER",
      entityType: "BORROWER",
      entityId: id,
      description: willBeBlocked 
        ? `Blocked borrower ${borrowerInfo?.name}. Reason: ${blockReason}`
        : `Activated borrower ${borrowerInfo?.name}`,
      metadata: {
        borrowerName: borrowerInfo?.name,
        borrowerEmail: borrowerInfo?.email,
        blockReason: willBeBlocked ? blockReason : null,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    }).catch((error) => {
      console.error("Error logging activity (non-blocking):", error)
    })

    return NextResponse.json(updatedBorrower)
  } catch (error) {
    console.error("Error toggling borrower active status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

