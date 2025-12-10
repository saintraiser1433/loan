import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role === "BORROWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { name, description, isActive } = body

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const requirement = await prisma.requirement.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    })

    return NextResponse.json(requirement)
  } catch (error: any) {
    console.error("Error updating requirement:", error)
    const message =
      error?.code === "P2002"
        ? "A requirement with this name already exists"
        : error?.code === "P2025"
          ? "Requirement not found"
          : "Failed to update requirement"
    return NextResponse.json({ error: message }, { status: message === "Requirement not found" ? 404 : 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role === "BORROWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    await prisma.requirement.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Requirement deleted" })
  } catch (error: any) {
    console.error("Error deleting requirement:", error)
    const message = error?.code === "P2025" ? "Requirement not found" : "Failed to delete requirement"
    return NextResponse.json({ error: message }, { status: message === "Requirement not found" ? 404 : 500 })
  }
}

