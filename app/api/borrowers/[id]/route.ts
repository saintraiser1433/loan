import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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

    const borrower = await prisma.user.findUnique({
      where: {
        id: id
      },
      include: {
        applications: {
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        },
        loans: {
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        },
        contactPersons: true
      }
    })

    if (!borrower) {
      return NextResponse.json(
        { error: "Borrower not found" },
        { status: 404 }
      )
    }

    if (borrower.role !== "BORROWER") {
      return NextResponse.json(
        { error: "User is not a borrower" },
        { status: 400 }
      )
    }

    return NextResponse.json(borrower)
  } catch (error) {
    console.error("Error fetching borrower details:", error)
    return NextResponse.json(
      { error: "Failed to fetch borrower details" },
      { status: 500 }
    )
  }
}

