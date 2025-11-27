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
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        middleName: true,
        address: true,
        block: true,
        lot: true,
        barangay: true,
        city: true,
        province: true,
        zipCode: true,
        dateOfBirth: true,
        placeOfBirth: true,
        nationality: true,
        fathersName: true,
        mothersName: true,
        position: true,
        companyName: true,
        monthlySalaryMin: true,
        monthlySalaryMax: true,
        yearsOfEmployment: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
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
    if (yearsOfEmployment !== undefined) updateData.yearsOfEmployment = yearsOfEmployment ? parseFloat(yearsOfEmployment) : null

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        middleName: true,
        address: true,
        block: true,
        lot: true,
        barangay: true,
        city: true,
        province: true,
        zipCode: true,
        dateOfBirth: true,
        placeOfBirth: true,
        nationality: true,
        fathersName: true,
        mothersName: true,
        position: true,
        companyName: true,
        monthlySalaryMin: true,
        monthlySalaryMax: true,
        yearsOfEmployment: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

