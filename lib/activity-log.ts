import { prisma } from "@/lib/prisma"

export interface ActivityLogData {
  userId: string
  action: string
  entityType: string
  entityId?: string
  description?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logActivity(data: ActivityLogData) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })
    console.log("Activity logged successfully:", data.action, data.entityType)
  } catch (error: any) {
    // Don't throw error, just log it to avoid breaking the main operation
    console.error("Failed to log activity:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })
  }
}

export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }
  return undefined
}

export function getUserAgent(request: Request): string | undefined {
  return request.headers.get("user-agent") || undefined
}
