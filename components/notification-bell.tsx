"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Bell, Check, CheckCheck, CreditCard, FileX, FileCheck, FileText, XCircle, CircleCheck, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  icon: string | null
  isRead: boolean
  link: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "PAYMENT_PENDING":
      return <CreditCard className="h-5 w-5 text-blue-500" />
    case "PAYMENT_APPROVED":
      return <CircleCheck className="h-5 w-5 text-green-500" />
    case "PAYMENT_REJECTED":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "PAYMENT_DUE_SOON":
      return <CreditCard className="h-5 w-5 text-amber-500" />
    case "PAYMENT_OVERDUE":
      return <XCircle className="h-5 w-5 text-red-600" />
    case "APPLICATION_PENDING":
      return <FileText className="h-5 w-5 text-blue-600" />
    case "BORROWER_PENDING":
      return <FileText className="h-5 w-5 text-purple-600" />
    case "LOAN_APPROVED":
      return <FileCheck className="h-5 w-5 text-green-500" />
    case "LOAN_REJECTED":
      return <FileX className="h-5 w-5 text-red-500" />
    case "LOAN_COMPLETED":
      return <Check className="h-5 w-5 text-emerald-500" />
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />
  }
}

export function NotificationBell() {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)

  const fetchNotifications = React.useCallback(async () => {
    if (!session?.user) return

    try {
      const response = await fetch("/api/notifications?unreadOnly=false&limit=50")
      if (response.ok) {
        const data = await response.json()
        const unreadInList = (data.notifications || []).filter((n: Notification) => !n.isRead).length
        console.log(`[NotificationBell] Fetched ${data.notifications?.length || 0} notifications (${unreadInList} unread in list), ${data.unreadCount || 0} total unread`)
        
        // Log if there's a mismatch
        if (data.unreadCount > 0 && unreadInList === 0) {
          console.warn(`[NotificationBell] ⚠️ Mismatch: ${data.unreadCount} unread notifications exist but none in fetched list!`)
        }
        
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } else {
        console.error(`[NotificationBell] Failed to fetch notifications: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("[NotificationBell] Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [session])

  React.useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 5 seconds (more frequent for better UX)
    const interval = setInterval(fetchNotifications, 5000)
    
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Also refresh when dropdown opens
  React.useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST"
      })
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, isRead: true }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST"
      })
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // Close dropdown
    setOpen(false)

    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString()
  }

  if (!session?.user) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.icon ? (
                        <div dangerouslySetInnerHTML={{ __html: notification.icon }} />
                      ) : (
                        getNotificationIcon(notification.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium",
                          !notification.isRead && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

