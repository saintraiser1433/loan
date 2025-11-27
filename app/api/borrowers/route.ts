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

    if (session.user.role === "BORROWER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    try {
      const borrowers = await prisma.user.findMany({
        where: {
          role: "BORROWER"
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          creditScore: true,
          loanLimit: true,
          rejectionReason: true,
          approvedBy: true,
          approvedAt: true,
          isActive: true,
          blockReason: true,
          createdAt: true,
          updatedAt: true,
        }
      })

      return NextResponse.json(borrowers)
    } catch (prismaError: any) {
      // If isActive field doesn't exist in Prisma client yet, query without it
      if (prismaError.message?.includes("isActive") || prismaError.code === "P2009") {
        console.warn("isActive field not available in Prisma client yet, querying without it")
        const borrowers = await prisma.user.findMany({
          where: {
            role: "BORROWER"
          },
          orderBy: {
            createdAt: "desc"
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            creditScore: true,
            loanLimit: true,
            rejectionReason: true,
            approvedBy: true,
            approvedAt: true,
            createdAt: true,
            updatedAt: true,
          }
        })

        // Add default isActive value
        const borrowersWithActive = borrowers.map(borrower => ({
          ...borrower,
          isActive: true
        }))

        return NextResponse.json(borrowersWithActive)
      }
      throw prismaError
    }
  } catch (error) {
    console.error("Error fetching borrowers:", error)
    return NextResponse.json(
      { error: "Failed to fetch borrowers" },
      { status: 500 }
    )
  }
}


