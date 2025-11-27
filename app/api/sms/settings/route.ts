import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "LOAN_OFFICER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the first (and only) SMS settings record
    const settings = await prisma.sMSSettings.findFirst({
      orderBy: { createdAt: "desc" }
    })

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        mode: "cloud",
        localServerUrl: "",
        cloudServerUrl: "https://api.sms-gate.app/3rdparty/v1",
        username: "",
        password: "",
        isActive: false,
      })
    }

    // Don't return password in response
    return NextResponse.json({
      id: settings.id,
      mode: settings.mode,
      localServerUrl: settings.localServerUrl,
      cloudServerUrl: settings.cloudServerUrl,
      username: settings.username,
      password: "", // Don't return password
      isActive: settings.isActive,
    })
  } catch (error) {
    console.error("Error fetching SMS settings:", error)
    return NextResponse.json({ error: "Failed to fetch SMS settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { mode, localServerUrl, cloudServerUrl, username, password, isActive } = body

    if (!mode || !username) {
      return NextResponse.json({ error: "Mode and username are required" }, { status: 400 })
    }

    if (mode === "local" && !localServerUrl) {
      return NextResponse.json({ error: "Local server URL is required for local mode" }, { status: 400 })
    }

    // Check if settings exist
    const existing = await prisma.sMSSettings.findFirst()

    let settings
    if (existing) {
      // Update existing - only update password if provided
      // Cloud server URL is fixed and cannot be changed
      const updateData: any = {
        mode,
        localServerUrl: mode === "local" ? localServerUrl : null,
        // Keep existing cloudServerUrl, don't allow changes
        cloudServerUrl: existing.cloudServerUrl || "https://api.sms-gate.app/3rdparty/v1",
        username,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      }
      
      // Only update password if a new one is provided
      if (password && password.trim() !== "") {
        updateData.password = password
      }

      settings = await prisma.sMSSettings.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      // Create new - password is required for new settings
      if (!password || password.trim() === "") {
        return NextResponse.json({ error: "Password is required when creating new settings" }, { status: 400 })
      }

      settings = await prisma.sMSSettings.create({
        data: {
          mode,
          localServerUrl: mode === "local" ? localServerUrl : null,
          cloudServerUrl: "https://api.sms-gate.app/3rdparty/v1", // Fixed default value
          username,
          password,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
    }

    return NextResponse.json({
      id: settings.id,
      mode: settings.mode,
      localServerUrl: settings.localServerUrl,
      cloudServerUrl: settings.cloudServerUrl,
      username: settings.username,
      password: "", // Don't return password
      isActive: settings.isActive,
    })
  } catch (error) {
    console.error("Error saving SMS settings:", error)
    return NextResponse.json({ error: "Failed to save SMS settings" }, { status: 500 })
  }
}

