import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity, getClientIp, getUserAgent } from "@/lib/activity-log"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user.role !== "LOAN_OFFICER" && session.user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, minAmount, maxAmount, creditScoreRequired, creditScoreOnCompletion, limitIncreaseOnCompletion, latePaymentPenaltyPerDay, allowedMonthsToPay, interestRatesByMonth } = body

    if (!name || !maxAmount || creditScoreRequired === undefined || creditScoreRequired === null || creditScoreRequired === "") {
      return NextResponse.json(
        { error: "Missing required fields: name, maxAmount, and creditScoreRequired are required" },
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

    // Check if loan type exists
    const existingLoanType = await prisma.loanType.findUnique({
      where: { id }
    })

    if (!existingLoanType) {
      return NextResponse.json(
        { error: "Loan type not found" },
        { status: 404 }
      )
    }

    // Check if another loan type with same name exists (excluding current one)
    const duplicateLoanType = await prisma.loanType.findFirst({
      where: {
        name,
        id: { not: id }
      }
    })

    if (duplicateLoanType) {
      return NextResponse.json(
        { error: `A loan type with the name "${name}" already exists. Please use a different name.` },
        { status: 400 }
      )
    }

    // Calculate average interest rate for backward compatibility
    const averageRate = ratesByMonth && Object.keys(JSON.parse(ratesByMonth)).length > 0
      ? (Object.values(JSON.parse(ratesByMonth)) as number[]).reduce((a: number, b: number) => a + b, 0) / Object.keys(JSON.parse(ratesByMonth)).length
      : 0

    // Validate new fields
    const creditScoreOnCompletionValue = creditScoreOnCompletion !== undefined && creditScoreOnCompletion !== null && creditScoreOnCompletion !== ""
      ? parseFloat(creditScoreOnCompletion)
      : existingLoanType.creditScoreOnCompletion || 5
    const limitIncreaseOnCompletionValue = limitIncreaseOnCompletion !== undefined && limitIncreaseOnCompletion !== null && limitIncreaseOnCompletion !== ""
      ? parseFloat(limitIncreaseOnCompletion)
      : existingLoanType.limitIncreaseOnCompletion || 0
    const latePaymentPenaltyValue = latePaymentPenaltyPerDay !== undefined && latePaymentPenaltyPerDay !== null && latePaymentPenaltyPerDay !== ""
      ? parseFloat(latePaymentPenaltyPerDay)
      : existingLoanType.latePaymentPenaltyPerDay || 0

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

    const loanType = await prisma.loanType.update({
      where: { id },
      data: {
        name,
        description,
        minAmount: minAmount || 0,
        maxAmount,
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
      action: "UPDATE_LOAN_TYPE",
      entityType: "LOAN_TYPE",
      entityId: id,
      description: `Updated loan type "${name}"`,
      metadata: {
        loanTypeName: name,
        oldName: existingLoanType.name,
        minAmount: minAmount || 0,
        maxAmount,
        creditScoreRequired: creditScore,
        allowedMonthsToPay: monthsToPay,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ loanType })
  } catch (error: any) {
    console.error("Error updating loan type:", error)
    
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user.role !== "LOAN_OFFICER" && session.user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if loan type exists
    const existingLoanType = await prisma.loanType.findUnique({
      where: { id },
      include: {
        applications: true,
        loans: true
      }
    })

    if (!existingLoanType) {
      return NextResponse.json(
        { error: "Loan type not found" },
        { status: 404 }
      )
    }

    // Check if loan type is being used
    if (existingLoanType.applications.length > 0 || existingLoanType.loans.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete loan type. It is being used by existing applications or loans." },
        { status: 400 }
      )
    }

    await prisma.loanType.delete({
      where: { id }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "DELETE_LOAN_TYPE",
      entityType: "LOAN_TYPE",
      entityId: id,
      description: `Deleted loan type "${existingLoanType.name}"`,
      metadata: {
        loanTypeName: existingLoanType.name,
        minAmount: existingLoanType.minAmount,
        maxAmount: existingLoanType.maxAmount,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ message: "Loan type deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting loan type:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

