import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotificationForAdmins } from "@/lib/notifications"
import { formatCurrencyPlain } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "BORROWER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      loanTypeId,
      purposeId,
      paymentDurationId,
      requestedAmount,
      purposeDescription,
    } = body

    // Validate required fields (loan details only)
    if (!loanTypeId || !purposeId || !paymentDurationId || !requestedAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate requested amount against loan type limits
    const loanType = await prisma.loanType.findUnique({
      where: { id: loanTypeId }
    })

    if (!loanType) {
      return NextResponse.json(
        { error: "Loan type not found" },
        { status: 400 }
      )
    }

    if (requestedAmount < loanType.minAmount) {
      return NextResponse.json(
        { error: `Requested amount must be at least ₱${loanType.minAmount.toLocaleString()} for this loan type` },
        { status: 400 }
      )
    }

    if (requestedAmount > loanType.maxAmount) {
      return NextResponse.json(
        { error: `Requested amount cannot exceed ₱${loanType.maxAmount.toLocaleString()} for this loan type` },
        { status: 400 }
      )
    }

    // Get user's loan limit and calculate available credit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        loanLimit: true,
        primaryIdUrl: true,
        secondaryIdUrl: true,
        selfieWithPrimaryIdUrl: true,
        selfieWithSecondaryIdUrl: true,
        payslipUrl: true,
        billingReceiptUrl: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get active loans to calculate used credit
    const activeLoans = await prisma.loan.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "OVERDUE"] }
      },
      select: {
        remainingAmount: true
      }
    })

    // Calculate total used credit
    const usedCredit = activeLoans.reduce((sum, loan) => sum + loan.remainingAmount, 0)

    // Calculate available credit
    const availableCredit = user.loanLimit - usedCredit

    // Validate requested amount against available credit
    if (requestedAmount > availableCredit) {
      return NextResponse.json(
        { error: `Requested amount (₱${requestedAmount.toLocaleString()}) exceeds your available credit (₱${availableCredit.toLocaleString()}). Your loan limit is ₱${user.loanLimit.toLocaleString()} and you have ₱${usedCredit.toLocaleString()} in active loans.` },
        { status: 400 }
      )
    }

    // Handle virtual payment duration (created dynamically from months)
    let finalPaymentDurationId = paymentDurationId
    if (paymentDurationId.startsWith('virtual-')) {
      const months = parseInt(paymentDurationId.replace('virtual-', ''))
      // Find or create payment duration for this number of months
      const label = `${months} ${months === 1 ? 'month' : 'months'}`
      let paymentDuration = await prisma.paymentDuration.findUnique({
        where: { label }
      })
      
      if (!paymentDuration) {
        // Create payment duration if it doesn't exist
        paymentDuration = await prisma.paymentDuration.create({
          data: {
            label,
            days: months * 30 // Approximate days
          }
        })
      }
      
      finalPaymentDurationId = paymentDuration.id
    }

    // Look up most recent application to reuse employment and document info
    const lastApplication = await prisma.loanApplication.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    // Fallbacks: prefer last application data, then user registration documents
    const salaryToUse = lastApplication?.salary ?? 0
    const sourceOfIncomeToUse = lastApplication?.sourceOfIncome ?? "Employment"
    const maritalStatusToUse = lastApplication?.maritalStatus ?? "SINGLE"

    const primaryIdUrlToUse =
      lastApplication?.primaryIdUrl ??
      lastApplication?.secondaryId1Url ??
      user.primaryIdUrl ??
      user.secondaryIdUrl
    const secondaryId1UrlToUse =
      lastApplication?.secondaryId1Url ?? user.secondaryIdUrl
    const secondaryId2UrlToUse = lastApplication?.secondaryId2Url ?? null
    const selfieWithIdUrlToUse =
      lastApplication?.selfieWithIdUrl ??
      user.selfieWithPrimaryIdUrl ??
      user.selfieWithSecondaryIdUrl

    if (!primaryIdUrlToUse || !selfieWithIdUrlToUse) {
      return NextResponse.json(
        {
          error:
            "Your identity documents are incomplete. Please update your registration/profile details before applying for a loan.",
        },
        { status: 400 }
      )
    }

    // Create application using stored borrower information
    const application = await prisma.loanApplication.create({
      data: {
        userId: session.user.id,
        loanTypeId,
        purposeId,
        paymentDurationId: finalPaymentDurationId,
        salary: salaryToUse,
        sourceOfIncome: sourceOfIncomeToUse,
        maritalStatus: maritalStatusToUse,
        primaryIdUrl: primaryIdUrlToUse,
        secondaryId1Url: secondaryId1UrlToUse,
        secondaryId2Url: secondaryId2UrlToUse,
        selfieWithIdUrl: selfieWithIdUrlToUse,
        payslipUrl: lastApplication?.payslipUrl ?? user.payslipUrl ?? null,
        billingReceiptUrl: lastApplication?.billingReceiptUrl ?? user.billingReceiptUrl ?? null,
        requestedAmount,
        purposeDescription,
        status: "PENDING"
      },
      include: {
        user: true,
        loanType: true
      }
    })

    // Create notification for admins/loan officers
    try {
      await createNotificationForAdmins({
        type: "APPLICATION_PENDING",
        title: "New Loan Application Submitted",
        message: `${application.user.name} submitted a new loan application for ₱${formatCurrencyPlain(requestedAmount)} (${application.loanType.name})`,
        link: `/dashboard/applications/${application.id}`,
        entityType: "APPLICATION",
        entityId: application.id
      })
      console.log(`[Application] Created notification for admins about application ${application.id}`)
    } catch (notifError) {
      console.error(`[Application] Failed to create notification for application ${application.id}:`, notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ application }, { status: 201 })
  } catch (error) {
    console.error("Application creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const applications = await prisma.loanApplication.findMany({
      where: {
        ...(session.user.role === "BORROWER" 
          ? { userId: session.user.id }
          : {})
      },
      include: {
        user: true,
        loanType: true,
        purpose: true,
        paymentDuration: true,
        loan: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

