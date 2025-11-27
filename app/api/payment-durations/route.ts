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

    const paymentDurations = await prisma.paymentDuration.findMany({
      orderBy: {
        days: "asc"
      }
    })

    return NextResponse.json({ durations: paymentDurations })
  } catch (error) {
    console.error("Error fetching payment durations:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment durations" },
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

    // Only admins can create payment durations
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { label, days } = body

    if (!label || !days) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const paymentDuration = await prisma.paymentDuration.create({
      data: {
        label,
        days
      }
    })

    return NextResponse.json(paymentDuration, { status: 201 })
  } catch (error) {
    console.error("Error creating payment duration:", error)
    return NextResponse.json(
      { error: "Failed to create payment duration" },
      { status: 500 }
    )
  }
}


