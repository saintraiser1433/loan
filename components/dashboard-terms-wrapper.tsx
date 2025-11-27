"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

import { TermsAndConditionsModal } from "@/components/terms-and-conditions-modal"

export function DashboardTermsWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [showTerms, setShowTerms] = useState(false)

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "BORROWER") {
      return
    }

    const sessionKey = `terms_shown_${session.user.id}`
    if (sessionStorage.getItem(sessionKey)) {
      return
    }

    const timer = window.setTimeout(() => {
      setShowTerms(true)
      sessionStorage.setItem(sessionKey, "true")
    }, 500)

    return () => window.clearTimeout(timer)
  }, [session, status])

  return (
    <>
      {children}
      <TermsAndConditionsModal open={showTerms} onAccept={() => setShowTerms(false)} />
    </>
  )
}





