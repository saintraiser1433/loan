"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Star, Wallet } from "lucide-react"

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const [creditInfo, setCreditInfo] = React.useState<{
    creditScore: number
    loanLimit: number
  } | null>(null)

  React.useEffect(() => {
    if (session?.user?.role === "BORROWER") {
      fetch("/api/borrowers/credit")
        .then((res) => res.json())
        .then((data) => {
          if (data.loanLimit !== undefined) {
            setCreditInfo({
              creditScore: data.creditScore || 0,
              loanLimit: data.loanLimit || 0,
            })
          }
        })
        .catch(() => {
          // Silently fail
        })
    }
  }, [session])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.role === "BORROWER" && creditInfo && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">
                    <span className="text-muted-foreground">Score:</span>{" "}
                    <span className="font-semibold">{creditInfo.creditScore}</span>
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    <span className="text-muted-foreground">Limit:</span>{" "}
                    <span className="font-semibold">₱{creditInfo.loanLimit.toLocaleString()}</span>
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
              </>
            )}
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

