import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validatePhilippinePhone } from "@/lib/phone-validation"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Validate Philippine phone number
    const validation = validatePhilippinePhone(phoneNumber)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: validation.error || "Invalid Philippine phone number format" 
      }, { status: 400 })
    }

    // Use formatted phone number
    const formattedPhone = validation.formatted

    // Get SMS settings
    const settings = await prisma.sMSSettings.findFirst({
      orderBy: { createdAt: "desc" }
    })

    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: "SMS settings not configured or inactive" }, { status: 400 })
    }

    // Determine API URL
    const apiUrl = settings.mode === "local"
      ? `${settings.localServerUrl}/message`
      : `${settings.cloudServerUrl}/message`

    // Prepare message
    const testMessage = `Test SMS from GCCI Lending System - ${new Date().toLocaleString()}`

    // Send SMS via Android SMS Gateway
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`,
      },
      body: JSON.stringify({
        textMessage: { text: testMessage },
        phoneNumbers: [formattedPhone],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SMS Gateway error:", errorText)
      
      // Log failed SMS
      await prisma.sMSLog.create({
        data: {
          userId: session.user.id,
          phone: formattedPhone,
          message: testMessage,
          status: "failed",
          error: `HTTP ${response.status}: ${errorText}`,
        },
      })

      return NextResponse.json(
        { error: `Failed to send SMS: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()

    // Log successful SMS
    await prisma.sMSLog.create({
      data: {
        userId: session.user.id,
        phone: formattedPhone,
        message: testMessage,
        status: "sent",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Test SMS sent successfully",
      result,
    })
  } catch (error: any) {
    console.error("Error sending test SMS:", error)
    
    // Log failed SMS
    try {
      const session = await getServerSession(authOptions)
      if (session) {
        await prisma.sMSLog.create({
          data: {
            userId: session.user.id,
            phone: "",
            message: "",
            status: "failed",
            error: error.message || "Unknown error",
          },
        })
      }
    } catch (logError) {
      console.error("Error logging SMS:", logError)
    }

    return NextResponse.json(
      { error: error.message || "Failed to send test SMS" },
      { status: 500 }
    )
  }
}

