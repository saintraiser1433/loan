import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {
      userId: session.user.id
    }

    if (unreadOnly) {
      where.isRead = false
    }

    // First, get unread notifications (prioritize them)
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        isRead: false
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Then get read notifications to fill up to the limit
    const remainingLimit = limit - unreadNotifications.length
    let readNotifications: any[] = []
    
    if (remainingLimit > 0 && !unreadOnly) {
      readNotifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          isRead: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: remainingLimit
      })
    }

    // Combine: unread first, then read
    const notifications = [...unreadNotifications, ...readNotifications]

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false
      }
    })

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error: any) {
    console.error("Error fetching notifications:", error)
    
    // Check if it's a Prisma client issue
    if (error?.message?.includes("Cannot read properties of undefined") || !prisma.notification) {
      console.error("Prisma client not regenerated! Please run: npx prisma generate")
      return NextResponse.json(
        { 
          error: "Prisma client needs to be regenerated. Please stop the server and run: npx prisma generate",
          details: error?.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

