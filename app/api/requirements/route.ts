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
      orderBy: { createdAt: "asc" },
      include: {
        children: {
          orderBy: { createdAt: "asc" },
        },
      },
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

    const body = await request.json().catch(() => ({}))
    const { name, description, isActive = true, parentId } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // If parentId provided, ensure it exists
    if (parentId) {
      const parent = await prisma.requirement.findUnique({ where: { id: parentId } })
      if (!parent) {
        return NextResponse.json({ error: "Parent requirement not found" }, { status: 404 })
      }
    }

    const requirement = await prisma.requirement.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: Boolean(isActive),
        parentId: parentId || null,
      },
    })

    return NextResponse.json(requirement, { status: 201 })
  } catch (error: any) {
    console.error("Error creating requirement:", error)
    const message =
      error?.code === "P2002"
        ? "A requirement with this name already exists"
        : "Failed to create requirement"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

