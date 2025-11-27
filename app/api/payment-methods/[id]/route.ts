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

    // Only admins can update payment methods
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, accountNumber, accountName, isActive } = body

    if (!name || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Name, account number, and account name are required" },
        { status: 400 }
      )
    }

    // Check if payment method exists
    const existing = await prisma.paymentMethod.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      )
    }

    // Check if another payment method with same name exists (excluding current one)
    const duplicate = await prisma.paymentMethod.findFirst({
      where: {
        name,
        id: { not: id }
      }
    })

    if (duplicate) {
      return NextResponse.json(
        { error: `A payment method with the name "${name}" already exists` },
        { status: 400 }
      )
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name: name.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        isActive: isActive !== undefined ? isActive : existing.isActive
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "UPDATE_PAYMENT_METHOD",
      entityType: "PAYMENT_METHOD",
      entityId: id,
      description: `Updated payment method: ${name}`,
      metadata: { name, accountNumber, accountName, isActive },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ paymentMethod })
  } catch (error: any) {
    console.error("Error updating payment method:", error)
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A payment method with this name already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    )
  }
}

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

    // Only admins can delete payment methods
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        payments: true
      }
    })

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      )
    }

    // Check if payment method has associated payments
    if (paymentMethod.payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete payment method with associated payments" },
        { status: 400 }
      )
    }

    await prisma.paymentMethod.delete({
      where: { id }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "DELETE_PAYMENT_METHOD",
      entityType: "PAYMENT_METHOD",
      entityId: id,
      description: `Deleted payment method: ${paymentMethod.name}`,
      metadata: { name: paymentMethod.name },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ message: "Payment method deleted successfully" })
  } catch (error) {
    console.error("Error deleting payment method:", error)
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    )
  }
}


