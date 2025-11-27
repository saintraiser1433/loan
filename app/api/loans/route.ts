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

    const loans = await prisma.loan.findMany({
      where: session.user.role === "BORROWER" 
        ? { userId: session.user.id }
        : {},
      include: {
        user: true,
        loanType: true,
        application: true,
        paymentDuration: true,
        terms: {
          orderBy: {
            termNumber: "asc"
          }
        },
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error("Error fetching loans:", error)
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 }
    )
  }
}


