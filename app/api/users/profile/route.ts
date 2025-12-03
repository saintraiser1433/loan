import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validatePhilippinePhone } from "@/lib/phone-validation"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        contactPersons: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        address: user.address,
        block: user.block,
        lot: user.lot,
        barangay: user.barangay,
        city: user.city,
        province: user.province,
        zipCode: user.zipCode,
        dateOfBirth: user.dateOfBirth,
        placeOfBirth: user.placeOfBirth,
        nationality: user.nationality,
        fathersName: user.fathersName,
        mothersName: user.mothersName,
        position: user.position,
        companyName: user.companyName,
        monthlySalaryMin: user.monthlySalaryMin,
        monthlySalaryMax: user.monthlySalaryMax,
        yearsOfEmployment: user.yearsOfEmployment,
        primaryIdUrl: user.primaryIdUrl,
        secondaryIdUrl: user.secondaryIdUrl,
        selfieWithPrimaryIdUrl: user.selfieWithPrimaryIdUrl,
        selfieWithSecondaryIdUrl: user.selfieWithSecondaryIdUrl,
        payslipUrl: user.payslipUrl,
        billingReceiptUrl: user.billingReceiptUrl,
        contactPersons: user.contactPersons,
      },
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      firstName,
      lastName,
      middleName,
      phone,
      address,
      block,
      lot,
      barangay,
      city,
      province,
      zipCode,
      dateOfBirth,
      placeOfBirth,
      nationality,
      fathersName,
      mothersName,
      position,
      companyName,
      monthlySalaryMin,
      monthlySalaryMax,
      yearsOfEmployment,
      primaryIdUrl,
      secondaryIdUrl,
      selfieWithPrimaryIdUrl,
      selfieWithSecondaryIdUrl,
      payslipUrl,
      billingReceiptUrl,
      contactPersons,
    } = body

    // Validate phone number if provided
    let formattedPhone = phone
    if (phone) {
      const phoneValidation = validatePhilippinePhone(phone)
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { error: phoneValidation.error || "Invalid Philippine phone number format" },
          { status: 400 }
        )
      }
      formattedPhone = phoneValidation.formatted
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (firstName !== undefined) updateData.firstName = firstName || null
    if (lastName !== undefined) updateData.lastName = lastName || null
    if (middleName !== undefined) updateData.middleName = middleName || null
    if (phone !== undefined) updateData.phone = formattedPhone || null
    if (address !== undefined) updateData.address = address || null
    if (block !== undefined) updateData.block = block || null
    if (lot !== undefined) updateData.lot = lot || null
    if (barangay !== undefined) updateData.barangay = barangay || null
    if (city !== undefined) updateData.city = city || null
    if (province !== undefined) updateData.province = province || null
    if (zipCode !== undefined) updateData.zipCode = zipCode || null
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (placeOfBirth !== undefined) updateData.placeOfBirth = placeOfBirth || null
    if (nationality !== undefined) updateData.nationality = nationality || null
    if (fathersName !== undefined) updateData.fathersName = fathersName || null
    if (mothersName !== undefined) updateData.mothersName = mothersName || null
    if (position !== undefined) updateData.position = position || null
    if (companyName !== undefined) updateData.companyName = companyName || null
    if (monthlySalaryMin !== undefined) updateData.monthlySalaryMin = monthlySalaryMin ? parseFloat(monthlySalaryMin) : null
    if (monthlySalaryMax !== undefined) updateData.monthlySalaryMax = monthlySalaryMax ? parseFloat(monthlySalaryMax) : null
    if (yearsOfEmployment !== undefined)
      updateData.yearsOfEmployment = yearsOfEmployment ? parseFloat(yearsOfEmployment) : null
    if (primaryIdUrl !== undefined) updateData.primaryIdUrl = primaryIdUrl || null
    if (secondaryIdUrl !== undefined) updateData.secondaryIdUrl = secondaryIdUrl || null
    if (selfieWithPrimaryIdUrl !== undefined)
      updateData.selfieWithPrimaryIdUrl = selfieWithPrimaryIdUrl || null
    if (selfieWithSecondaryIdUrl !== undefined)
      updateData.selfieWithSecondaryIdUrl = selfieWithSecondaryIdUrl || null
    if (payslipUrl !== undefined) updateData.payslipUrl = payslipUrl || null
    if (billingReceiptUrl !== undefined) updateData.billingReceiptUrl = billingReceiptUrl || null

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: {
        contactPersons: true,
      },
    })

    // Update contact persons if provided (replace all for this user)
    if (Array.isArray(contactPersons)) {
      try {
        await prisma.contactPerson.deleteMany({
          where: { userId: session.user.id },
        })
        const filtered = contactPersons.filter(
          (cp: any) => cp && (cp.name || cp.relationship || cp.phone)
        )
        if (filtered.length > 0) {
          await prisma.contactPerson.createMany({
            data: filtered.map((cp: any) => ({
              userId: session.user.id,
              name: cp.name || "",
              relationship: cp.relationship || "",
              phone: cp.phone || "",
            })),
          })
        }
      } catch (cpError) {
        console.error("Failed to update contact persons from profile:", cpError)
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        address: user.address,
        block: user.block,
        lot: user.lot,
        barangay: user.barangay,
        city: user.city,
        province: user.province,
        zipCode: user.zipCode,
        dateOfBirth: user.dateOfBirth,
        placeOfBirth: user.placeOfBirth,
        nationality: user.nationality,
        fathersName: user.fathersName,
        mothersName: user.mothersName,
        position: user.position,
        companyName: user.companyName,
        monthlySalaryMin: user.monthlySalaryMin,
        monthlySalaryMax: user.monthlySalaryMax,
        yearsOfEmployment: user.yearsOfEmployment,
        primaryIdUrl: user.primaryIdUrl,
        secondaryIdUrl: user.secondaryIdUrl,
        selfieWithPrimaryIdUrl: user.selfieWithPrimaryIdUrl,
        selfieWithSecondaryIdUrl: user.selfieWithSecondaryIdUrl,
        payslipUrl: user.payslipUrl,
        billingReceiptUrl: user.billingReceiptUrl,
        contactPersons: user.contactPersons,
      },
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

