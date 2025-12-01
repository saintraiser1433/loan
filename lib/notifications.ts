import { prisma } from "@/lib/prisma"

export interface CreateNotificationParams {
  userId: string
  type: "PAYMENT_PENDING" | "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "PAYMENT_DUE_SOON" | "PAYMENT_OVERDUE" | "APPLICATION_PENDING" | "BORROWER_PENDING" | "LOAN_APPROVED" | "LOAN_REJECTED" | "LOAN_COMPLETED"
  title: string
  message: string
  link?: string | null
  entityType?: string | null
  entityId?: string | null
  icon?: string | null
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    console.log(`[Notifications] Creating notification for user ${params.userId}, type: ${params.type}`)
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        icon: params.icon || null,
      }
    })
    console.log(`[Notifications] ✅ Successfully created notification ${notification.id}`)
    return notification
  } catch (error: any) {
    console.error(`[Notifications] ❌ Error creating notification for user ${params.userId}:`, error)
    console.error(`[Notifications] Error details:`, {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    // Don't throw - notifications are not critical
    return null
  }
}

// Helper to create notifications for all admins and loan officers
export async function createNotificationForAdmins(params: Omit<CreateNotificationParams, "userId">) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "LOAN_OFFICER"]
        }
      },
      select: {
        id: true
      }
    })

    console.log(`[Notifications] Found ${admins.length} admins/loan officers to notify`)

    if (admins.length === 0) {
      console.warn("[Notifications] No admins or loan officers found to notify")
      return
    }

    const results = await Promise.all(
      admins.map(admin =>
        createNotification({
          ...params,
          userId: admin.id
        })
      )
    )

    const successCount = results.filter(r => r !== null).length
    console.log(`[Notifications] Created ${successCount}/${admins.length} notifications for admins`)
  } catch (error) {
    console.error("Error creating notifications for admins:", error)
    throw error // Re-throw to allow caller to handle
  }
}

