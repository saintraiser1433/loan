import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Borrowers can only see active payment methods, admins/loan officers see all
    const whereClause = session.user.role === "BORROWER" 
      ? { isActive: true }
      : {}

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({ paymentMethods })
  } catch (error: any) {
    console.error("Error fetching payment methods:", error)
    
    // Check if it's a model not found error
    if (error.message?.includes("paymentMethod") || 
        error.message?.includes("Unknown model") ||
        error.message?.includes("does not exist")) {
      return NextResponse.json(
        { 
          error: "PaymentMethod model not found. Please stop the dev server, run 'npx prisma db push' and 'npx prisma generate', then restart the server." 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment methods" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can create payment methods
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, accountNumber, accountName, isActive } = body

    if (!name || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Name, account number, and account name are required" },
        { status: 400 }
      )
    }

    // Check if payment method with same name already exists
    const existing = await prisma.paymentMethod.findUnique({
      where: { name }
    })

    if (existing) {
      return NextResponse.json(
        { error: `A payment method with the name "${name}" already exists` },
        { status: 400 }
      )
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name: name.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        isActive: isActive !== undefined ? isActive : true
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "CREATE_PAYMENT_METHOD",
      entityType: "PAYMENT_METHOD",
      entityId: paymentMethod.id,
      description: `Created payment method: ${name}`,
      metadata: { name, accountNumber, accountName },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ paymentMethod }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating payment method:", error)
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A payment method with this name already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    )
  }
}


