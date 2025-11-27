import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "BORROWER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Update user to mark terms as accepted
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      }
    })

    return NextResponse.json({ message: "Terms accepted successfully" })
  } catch (error) {
    console.error("Error accepting terms:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}





