import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validatePhilippinePhone } from "@/lib/phone-validation"
import { createNotificationForAdmins } from "@/lib/notifications"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    let { 
      email, 
      password, 
      name, 
      firstName,
      lastName,
      middleName,
      phone, 
      // Complete Address
      address,
      block,
      lot,
      barangay,
      city,
      province,
      zipCode,
      // Personal Information
      dateOfBirth,
      placeOfBirth,
      nationality,
      fathersName,
      mothersName,
      // Occupational Information
      position,
      companyName,
      monthlySalaryMin,
      monthlySalaryMax,
      yearsOfEmployment,
      // Contacts & documents
      contactPersons,
      payslipUrl,
      billingReceiptUrl,
      primaryIdUrl,
      secondaryIdUrl,
      selfieWithPrimaryIdUrl,
      selfieWithSecondaryIdUrl,
      role 
    } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate Philippine phone number
    if (phone) {
      const phoneValidation = validatePhilippinePhone(phone)
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { error: phoneValidation.error || "Invalid Philippine phone number format" },
          { status: 400 }
        )
      }
      // Use formatted phone number
      phone = phoneValidation.formatted
    }

    const hasPrimaryPair = primaryIdUrl && selfieWithPrimaryIdUrl
    const hasSecondaryPair = secondaryIdUrl && selfieWithSecondaryIdUrl

    if (
      role === "BORROWER" &&
      (
        (!hasPrimaryPair && !hasSecondaryPair) ||
        !payslipUrl ||
        !billingReceiptUrl
      )
    ) {
      return NextResponse.json(
        { error: "At least one valid ID with selfie plus payslip and electric/water bill are required for borrower registration" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        firstName: firstName || null,
        lastName: lastName || null,
        middleName: middleName || null,
        phone,
        // Complete Address
        address: address || null,
        block: block || null,
        lot: lot || null,
        barangay: barangay || null,
        city: city || null,
        province: province || null,
        zipCode: zipCode || null,
        // Personal Information
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        placeOfBirth: placeOfBirth || null,
        nationality: nationality || "Filipino",
        fathersName: fathersName || null,
        mothersName: mothersName || null,
        // Occupational Information
        position: position || null,
        companyName: companyName || null,
        monthlySalaryMin: monthlySalaryMin ? parseFloat(monthlySalaryMin) : null,
        monthlySalaryMax: monthlySalaryMax ? parseFloat(monthlySalaryMax) : null,
        yearsOfEmployment: yearsOfEmployment ? parseFloat(yearsOfEmployment) : null,
        role: role || "BORROWER",
        status: role === "BORROWER" ? "PENDING" : null, // New borrowers need approval
        primaryIdUrl: primaryIdUrl || null,
        secondaryIdUrl: secondaryIdUrl || null,
        selfieWithPrimaryIdUrl: selfieWithPrimaryIdUrl || null,
        selfieWithSecondaryIdUrl: selfieWithSecondaryIdUrl || null,
        payslipUrl: payslipUrl || null,
        billingReceiptUrl: billingReceiptUrl || null,
      }
    })

    // Create initial contact persons for borrowers
    if (role === "BORROWER" && Array.isArray(contactPersons) && contactPersons.length === 3) {
      try {
        await prisma.contactPerson.createMany({
          data: contactPersons.map((cp: { name: string; relationship: string; phone: string }) => ({
            userId: user.id,
            name: cp.name,
            relationship: cp.relationship,
            phone: cp.phone,
          })),
        })
      } catch (cpError) {
        console.error("Failed to create contact persons during registration:", cpError)
        // Do not fail the whole registration if contact person creation fails
      }
    }

    // Notify admins when a new borrower registers (needs approval)
    if (role === "BORROWER" && user.status === "PENDING") {
      try {
        await createNotificationForAdmins({
          type: "BORROWER_PENDING",
          title: "New Borrower Registration",
          message: `${user.name} (${user.email}) has registered and is waiting for approval`,
          link: `/dashboard/borrowers`,
          entityType: "BORROWER",
          entityId: user.id
        })
        console.log(`[Registration] Created notification for admins about new borrower ${user.id}`)
      } catch (notifError) {
        console.error(`[Registration] Failed to create notification for borrower ${user.id}:`, notifError)
        // Don't fail the registration if notification fails
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error("Registration error:", error)
    
    // Handle Prisma errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }
    
    // Return more specific error message
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

