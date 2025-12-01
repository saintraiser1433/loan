import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // If borrower, filter by credit score
    if (session?.user?.role === "BORROWER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { creditScore: true }
      })

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      const loanTypes = await prisma.loanType.findMany({
        where: {
          creditScoreRequired: {
            lte: user.creditScore // Only show loan types where required score <= user's score
          }
        },
        orderBy: { name: "asc" }
      })

      return NextResponse.json({ loanTypes })
    }

    // For admins and loan officers, show all loan types
    const loanTypes = await prisma.loanType.findMany({
      orderBy: { name: "asc" }
    })

    return NextResponse.json({ loanTypes })
  } catch (error) {
    console.error("Error fetching loan types:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user.role !== "LOAN_OFFICER" && session.user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, minAmount, maxAmount, creditScoreRequired, creditScoreOnCompletion, limitIncreaseOnCompletion, latePaymentPenaltyPerDay, allowedMonthsToPay, interestRatesByMonth } = body

    // Check for required fields, allowing 0 values
    if (!name || maxAmount === undefined || maxAmount === null || maxAmount === "" || creditScoreRequired === undefined || creditScoreRequired === null || creditScoreRequired === "") {
      return NextResponse.json(
        { error: "Missing required fields: name, maxAmount, and creditScoreRequired are required" },
        { status: 400 }
      )
    }

    // Parse and validate minAmount (allow 0)
    const minAmountValue = minAmount !== undefined && minAmount !== null && minAmount !== ""
      ? parseFloat(minAmount)
      : 0
    
    if (isNaN(minAmountValue) || minAmountValue < 0) {
      return NextResponse.json(
        { error: "Minimum amount must be 0 or greater" },
        { status: 400 }
      )
    }

    // Parse and validate maxAmount (allow 0)
    const maxAmountValue = parseFloat(maxAmount)
    if (isNaN(maxAmountValue) || maxAmountValue < minAmountValue) {
      return NextResponse.json(
        { error: "Maximum amount must be greater than or equal to minimum amount" },
        { status: 400 }
      )
    }

    const creditScore = parseFloat(creditScoreRequired)
    if (isNaN(creditScore) || creditScore < 0 || creditScore > 100) {
      return NextResponse.json(
        { error: "Credit score required must be a number between 0 and 100" },
        { status: 400 }
      )
    }

    // Validate allowedMonthsToPay (should be a JSON array string)
    let monthsToPay = null
    if (allowedMonthsToPay !== undefined && allowedMonthsToPay !== null && allowedMonthsToPay !== "") {
      try {
        const monthsArray = typeof allowedMonthsToPay === 'string' ? JSON.parse(allowedMonthsToPay) : allowedMonthsToPay
        if (!Array.isArray(monthsArray) || monthsArray.length === 0) {
          return NextResponse.json(
            { error: "Allowed months to pay must be a non-empty array of months" },
            { status: 400 }
          )
        }
        // Validate each month is a positive integer
        for (const month of monthsArray) {
          if (!Number.isInteger(month) || month < 1 || month > 60) {
            return NextResponse.json(
              { error: "Each month must be a positive integer between 1 and 60" },
              { status: 400 }
            )
          }
        }
        monthsToPay = JSON.stringify(monthsArray.sort((a, b) => a - b))
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid format for allowed months to pay. Must be a JSON array." },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "At least one month option must be selected for payment duration" },
        { status: 400 }
      )
    }

    // Validate interestRatesByMonth
    let ratesByMonth = null
    if (interestRatesByMonth !== undefined && interestRatesByMonth !== null && interestRatesByMonth !== "") {
      try {
        const rates = typeof interestRatesByMonth === 'string' ? JSON.parse(interestRatesByMonth) : interestRatesByMonth
        if (typeof rates !== 'object' || Array.isArray(rates)) {
          return NextResponse.json(
            { error: "Interest rates by month must be a JSON object" },
            { status: 400 }
          )
        }
        // Validate each rate
        for (const [month, rate] of Object.entries(rates)) {
          const monthNum = parseInt(month)
          const rateNum = parseFloat(rate as string)
          if (isNaN(monthNum) || monthNum < 1 || monthNum > 60) {
            return NextResponse.json(
              { error: `Invalid month in interest rates: ${month}` },
              { status: 400 }
            )
          }
          if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
            return NextResponse.json(
              { error: `Interest rate for ${month} ${monthNum === 1 ? "month" : "months"} must be between 0 and 100` },
              { status: 400 }
            )
          }
        }
        ratesByMonth = JSON.stringify(rates)
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid format for interest rates by month. Must be a JSON object." },
          { status: 400 }
        )
      }
    }

    // Check if loan type with same name already exists
    const existingLoanType = await prisma.loanType.findUnique({
      where: { name }
    })

    if (existingLoanType) {
      return NextResponse.json(
        { error: `A loan type with the name "${name}" already exists. Please use a different name.` },
        { status: 400 }
      )
    }

    // Validate new fields
    const creditScoreOnCompletionValue = creditScoreOnCompletion !== undefined && creditScoreOnCompletion !== null && creditScoreOnCompletion !== ""
      ? parseFloat(creditScoreOnCompletion)
      : 5
    const limitIncreaseOnCompletionValue = limitIncreaseOnCompletion !== undefined && limitIncreaseOnCompletion !== null && limitIncreaseOnCompletion !== ""
      ? parseFloat(limitIncreaseOnCompletion)
      : 0
    const latePaymentPenaltyValue = latePaymentPenaltyPerDay !== undefined && latePaymentPenaltyPerDay !== null && latePaymentPenaltyPerDay !== ""
      ? parseFloat(latePaymentPenaltyPerDay)
      : 0

    if (isNaN(creditScoreOnCompletionValue) || creditScoreOnCompletionValue < 0 || creditScoreOnCompletionValue > 100) {
      return NextResponse.json(
        { error: "Credit score on completion must be a number between 0 and 100" },
        { status: 400 }
      )
    }

    if (isNaN(limitIncreaseOnCompletionValue) || limitIncreaseOnCompletionValue < 0) {
      return NextResponse.json(
        { error: "Limit increase on completion must be a non-negative number" },
        { status: 400 }
      )
    }

    if (isNaN(latePaymentPenaltyValue) || latePaymentPenaltyValue < 0) {
      return NextResponse.json(
        { error: "Late payment penalty per day must be a non-negative number" },
        { status: 400 }
      )
    }

    const loanType = await prisma.loanType.create({
      data: {
        name,
        description,
        minAmount: minAmountValue,
        maxAmount: maxAmountValue,
        creditScoreRequired: creditScore,
        creditScoreOnCompletion: creditScoreOnCompletionValue,
        limitIncreaseOnCompletion: limitIncreaseOnCompletionValue,
        latePaymentPenaltyPerDay: latePaymentPenaltyValue,
        allowedMonthsToPay: monthsToPay,
        interestRatesByMonth: ratesByMonth
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "CREATE_LOAN_TYPE",
      entityType: "LOAN_TYPE",
      entityId: loanType.id,
      description: `Created loan type "${name}"`,
      metadata: {
        loanTypeName: name,
        minAmount: minAmount || 0,
        maxAmount,
        creditScoreRequired: creditScore,
        allowedMonthsToPay: monthsToPay,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ loanType }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating loan type:", error)
    
    // Handle Prisma unique constraint error
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: `A loan type with this name already exists. Please use a different name.` },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


