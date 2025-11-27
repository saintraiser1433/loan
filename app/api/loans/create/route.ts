import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { applicationId, principalAmount } = body

    if (!applicationId || !principalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: applicationId },
      include: { loanType: true, paymentDuration: true }
    })

    if (!application || application.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Application not found or not approved" },
        { status: 400 }
      )
    }

    if (principalAmount > (application.loanLimit || 0)) {
      return NextResponse.json(
        { error: "Principal amount exceeds loan limit" },
        { status: 400 }
      )
    }

    // Get interest rate from interestRatesByMonth
    let interestRate = 0
    if (application.loanType.interestRatesByMonth) {
      try {
        const interestRatesByMonth = JSON.parse(application.loanType.interestRatesByMonth) as Record<number, number>
        const match = application.paymentDuration.label.match(/(\d+)/)
        const months = match ? parseInt(match[1]) : null
        
        if (months && interestRatesByMonth[months] !== undefined) {
          interestRate = interestRatesByMonth[months]
        } else {
          // Fallback: use first available rate
          const rates = Object.values(interestRatesByMonth)
          if (rates.length > 0) {
            interestRate = rates[0]
          }
        }
      } catch (error) {
        console.error("Error parsing interest rates by month:", error)
      }
    }
    
    if (interestRate === 0) {
      return NextResponse.json(
        { error: "Interest rate not found for the selected payment duration" },
        { status: 400 }
      )
    }

    // Calculate interest and total
    const interestRateDecimal = interestRate / 100
    const days = application.paymentDuration.days
    const interest = principalAmount * interestRateDecimal * (days / 365)
    const totalAmount = principalAmount + interest

    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + days)

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        applicationId,
        userId: application.userId,
        loanTypeId: application.loanTypeId,
        paymentDurationId: application.paymentDurationId,
        principalAmount,
        interestRate: interestRate, // Store the calculated rate
        totalAmount,
        remainingAmount: totalAmount,
        dueDate,
        status: "ACTIVE"
      }
    })

    // TODO: Send SMS notification
    // await sendSMS(user.phone, `Your loan of ${principalAmount} has been created. Due date: ${dueDate}`)

    return NextResponse.json({ loan }, { status: 201 })
  } catch (error) {
    console.error("Loan creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



