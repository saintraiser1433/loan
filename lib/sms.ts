import { prisma } from "./prisma"

export async function sendSMS(phone: string, message: string, userId?: string): Promise<boolean> {
  try {
    // Get SMS settings
    const settings = await prisma.sMSSettings.findFirst({
      orderBy: { createdAt: "desc" }
    })

    if (!settings || !settings.isActive) {
      console.log("SMS settings not configured or inactive, skipping SMS")
      
      // Log as skipped
      await prisma.sMSLog.create({
        data: {
          userId: userId || "",
          phone,
          message,
          status: "skipped",
          error: "SMS settings not configured or inactive",
        },
      })
      
      return false
    }

    // Determine API URL based on mode
    const apiUrl = settings.mode === "local"
      ? `${settings.localServerUrl}/message`
      : `${settings.cloudServerUrl}/message`

    // Prepare request body
    const requestBody = JSON.stringify({
      textMessage: { text: message },
      phoneNumbers: [phone],
    })

    // In Node.js environment, handle SSL certificate issues
    // For development/testing: allow self-signed or expired certificates
    // Set NODE_TLS_REJECT_UNAUTHORIZED=0 in environment to bypass SSL verification
    // WARNING: Only use in development, not in production!
    if (typeof process !== "undefined" && process.versions?.node) {
      // Temporarily disable SSL verification if environment variable is set
      const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
      if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
        // Already set, fetch will respect it
      }
    }

    // Send SMS via Android SMS Gateway
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`,
      },
      body: requestBody,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SMS Gateway error:", errorText)
      
      // Log failed SMS
      await prisma.sMSLog.create({
        data: {
          userId: userId || "",
          phone,
          message,
          status: "failed",
          error: `HTTP ${response.status}: ${errorText}`,
        },
      })

      return false
    }

    const result = await response.json()
    console.log("SMS sent successfully:", result)

    // Log successful SMS
    await prisma.sMSLog.create({
      data: {
        userId: userId || "",
        phone,
        message,
        status: "sent",
      },
    })

    return true
  } catch (error) {
    console.error("SMS sending error:", error)
    
    // Log failed SMS
    try {
      await prisma.sMSLog.create({
        data: {
          userId: userId || "",
          phone,
          message,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      })
    } catch (logError) {
      console.error("Error logging SMS:", logError)
    }

    return false
  }
}
