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

    const purposes = await prisma.loanPurpose.findMany({
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json({ purposes })
  } catch (error) {
    console.error("Error fetching purposes:", error)
    return NextResponse.json(
      { error: "Failed to fetch purposes" },
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

    // Only admins can create purposes
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const purpose = await prisma.loanPurpose.create({
      data: {
        name,
        description
      }
    })

    return NextResponse.json(purpose, { status: 201 })
  } catch (error) {
    console.error("Error creating purpose:", error)
    return NextResponse.json(
      { error: "Failed to create purpose" },
      { status: 500 }
    )
  }
}

