"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

interface LoanType {
  id: string
  name: string
  description: string | null
  interestRate: number
  minAmount: number
  maxAmount: number
  creditScoreRequired: number
}

interface BorrowerCredit {
  loanLimit: number
  usedCredit: number
  availableCredit: number
  hasPendingApplication: boolean
  hasActiveLoan: boolean
  canApply: boolean
}

export default function ApplyPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([])
  const [loading, setLoading] = useState(true)
  const [randomImageId, setRandomImageId] = useState<number>(0)
  const [borrowerCredit, setBorrowerCredit] = useState<BorrowerCredit | null>(null)

  // Generate random image ID on mount
  useEffect(() => {
    setRandomImageId(Math.floor(Math.random() * 1000))
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
    
    if (status === "authenticated" && session?.user?.role !== "BORROWER") {
      redirect("/dashboard")
    }
  }, [status, session])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "BORROWER") {
      Promise.all([
        fetch("/api/loans/types").then((res) => res.json()),
        fetch("/api/borrowers/credit").then((res) => res.json()),
      ])
        .then(([loanTypesData, creditData]) => {
          setLoanTypes(loanTypesData.loanTypes || [])
          setBorrowerCredit(creditData)
          setLoading(false)
        })
        .catch((error) => {
          console.error("Error fetching data:", error)
          setLoading(false)
        })
    }
  }, [status, session])

  const handleSelectLoanType = (loanTypeId: string) => {
    router.push(`/dashboard/apply/form?loanTypeId=${loanTypeId}`)
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading loan types...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Check if borrower can apply
  const cannotApply = borrowerCredit && !borrowerCredit.canApply
  const restrictionReason = borrowerCredit?.hasPendingApplication
    ? "You have a pending loan application. Please wait for it to be processed."
    : borrowerCredit?.hasActiveLoan
    ? "You have an active loan. Please complete your current loan before applying for a new one."
    : ""

  if (loanTypes.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Apply for a Loan</h1>
            <p className="text-muted-foreground">
              Select a loan type to get started
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No loan types available at the moment. Please check back later.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (cannotApply) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header with Random Image */}
          <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden border">
            <img
              src={`https://picsum.photos/seed/loan-${randomImageId}/1200/400`}
              alt="Loan Application Header"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.className = "relative w-full h-64 md:h-80 rounded-lg overflow-hidden border bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/90 via-blue-500/50 to-transparent flex items-end">
              <div className="p-6 w-full">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Apply for a Loan</h1>
                <p className="text-white/90 text-lg">
                  Select a loan type to get started
                </p>
              </div>
            </div>
          </div>

          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Application Restricted
                  </h3>
                  <p className="text-orange-800 dark:text-orange-200">
                    {restrictionReason}
                  </p>
                  {borrowerCredit?.hasPendingApplication && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/applications/my")}
                        className="border-orange-300 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-100 dark:hover:bg-orange-900"
                      >
                        View My Applications
                      </Button>
                    </div>
                  )}
                  {borrowerCredit?.hasActiveLoan && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/loans")}
                        className="border-orange-300 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-100 dark:hover:bg-orange-900"
                      >
                        View My Loans
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Random Image */}
        <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden border">
          <img
            src={`https://picsum.photos/seed/loan-${randomImageId}/1200/400`}
            alt="Loan Application Header"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to gradient if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.className = "relative w-full h-64 md:h-80 rounded-lg overflow-hidden border bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/90 via-blue-500/50 to-transparent flex items-end">
            <div className="p-6 w-full">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Apply for a Loan</h1>
              <p className="text-white/90 text-lg">
                Select a loan type to get started
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loanTypes.map((loanType) => (
            <Card key={loanType.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{loanType.name}</CardTitle>
                {loanType.description && (
                  <CardDescription>{loanType.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest Rate:</span>
                    <span className="font-medium">{loanType.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Range:</span>
                    <span className="font-medium">
                      ₱{loanType.minAmount.toLocaleString()} - ₱{loanType.maxAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credit Score Required:</span>
                    <span className="font-medium">{loanType.creditScoreRequired}%</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleSelectLoanType(loanType.id)}
                  disabled={
                    borrowerCredit 
                      ? !borrowerCredit.canApply || borrowerCredit.availableCredit < loanType.minAmount
                      : false
                  }
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    borrowerCredit && !borrowerCredit.canApply
                      ? restrictionReason
                      : borrowerCredit && borrowerCredit.availableCredit < loanType.minAmount
                      ? `Insufficient credit. Available: ₱${borrowerCredit.availableCredit.toLocaleString()}, Required: ₱${loanType.minAmount.toLocaleString()}`
                      : undefined
                  }
                >
                  {borrowerCredit && !borrowerCredit.canApply
                    ? "Cannot Apply"
                    : borrowerCredit && borrowerCredit.availableCredit < loanType.minAmount
                    ? "Insufficient Credit"
                    : "Select This Loan Type"}
                </Button>
                {borrowerCredit && borrowerCredit.availableCredit < loanType.minAmount && (
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Available credit: ₱{borrowerCredit.availableCredit.toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
