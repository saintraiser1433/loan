"use client"

import { useEffect } from "react"

export function SmsNotificationWorker() {
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const response = await fetch("/api/sms/notifications", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.results) {
            const { dueDateReminders, overdueNotifications } = data.results
            if (dueDateReminders > 0 || overdueNotifications > 0) {
              console.log(`[SMS Worker] Sent ${dueDateReminders} reminders and ${overdueNotifications} overdue notifications`)
            }
          }
        } else {
          console.warn("[SMS Worker] Notification check returned:", response.status, response.statusText)
        }
      } catch (error) {
        // Silently fail - notifications will be retried on next interval
        console.error("[SMS Worker] Notification check failed:", error)
      }
    }

    // Run immediately on mount
    checkNotifications()

    // Then run every 5 seconds
    const interval = setInterval(checkNotifications, 5000)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }, [])

  // This component doesn't render anything
  return null
}

