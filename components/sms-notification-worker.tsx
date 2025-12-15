"use client"

import { useEffect } from "react"

export function SmsNotificationWorker() {
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        await fetch("/api/sms/notifications", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
      } catch (error) {
        // Silently fail - notifications will be retried on next interval
        console.error("SMS notification check failed:", error)
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

