import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requirements = await prisma.requirement.findMany({
      include: {
        parent: true,
        children: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(requirements)
  } catch (error) {
    console.error("Error fetching requirements:", error)
    return NextResponse.json({ error: "Failed to fetch requirements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role === "BORROWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if Prisma client has the requirement model
    if (!prisma.requirement) {
      console.error("Prisma client missing 'requirement' model. Please restart the development server after running 'npx prisma generate'")
      return NextResponse.json({ 
        error: "Database model not available. Please restart the development server.",
        details: "The Prisma client needs to be regenerated. Stop the server, run 'npx prisma generate', then restart."
      }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const { name, description, isActive = true, parentId } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Normalize parentId: empty string, null, or undefined should be null
    const normalizedParentId = parentId && parentId.trim() !== "" ? parentId.trim() : null

    // Validate parentId if provided
    if (normalizedParentId) {
      const parent = await prisma.requirement.findUnique({
        where: { id: normalizedParentId },
      })
      if (!parent) {
        return NextResponse.json({ error: "Parent requirement not found" }, { status: 400 })
      }
    }

    const requirement = await prisma.requirement.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: Boolean(isActive),
        parentId: normalizedParentId,
      },
      include: {
        parent: true,
        children: true,
      },
    })

    return NextResponse.json(requirement, { status: 201 })
  } catch (error: any) {
    console.error("Error creating requirement:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    
    let message = "Failed to create requirement"
    if (error?.code === "P2002") {
      message = "A requirement with this name already exists under the same parent"
    } else if (error?.message) {
      message = error.message
    }
    
    return NextResponse.json({ 
      error: message,
      details: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, { status: 500 })
  }
}

