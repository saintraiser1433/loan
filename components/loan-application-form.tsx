"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LoanType {
  id: string
  name: string
  interestRate: number
  minAmount: number
  maxAmount: number
  creditScoreRequired: number
  allowedMonthsToPay: string | null
  interestRatesByMonth: string | null
}

interface Purpose {
  id: string
  name: string
}

interface PaymentDuration {
  id: string
  label: string
  days: number
}

interface LoanApplicationFormProps {
  initialLoanTypeId?: string
}

export function LoanApplicationForm({ initialLoanTypeId }: LoanApplicationFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Loan-specific fields only
  const [loanTypeId, setLoanTypeId] = useState(initialLoanTypeId || "")
  const [purposeId, setPurposeId] = useState("")
  const [paymentDurationId, setPaymentDurationId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [purposeDescription, setPurposeDescription] = useState("")

  const [loanTypes, setLoanTypes] = useState<LoanType[]>([])
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [paymentDurations, setPaymentDurations] = useState<PaymentDuration[]>([])
  const [availableCredit, setAvailableCredit] = useState<number | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedLoanType = loanTypes.find((type) => type.id === loanTypeId)

  const allowedMonths = selectedLoanType?.allowedMonthsToPay
    ? (() => {
        try {
          return JSON.parse(selectedLoanType.allowedMonthsToPay) as number[]
        } catch {
          return []
        }
      })()
    : []

  const interestRatesByMonth = selectedLoanType?.interestRatesByMonth
    ? (() => {
        try {
          return JSON.parse(selectedLoanType.interestRatesByMonth) as Record<number, number>
        } catch {
          return {}
        }
      })()
    : {}

  const getInterestRateForMonth = (months: number): number => {
    if (interestRatesByMonth[months] !== undefined) {
      return interestRatesByMonth[months]
    }
    return selectedLoanType?.interestRate ?? 0
  }

  const availablePaymentDurations =
    selectedLoanType && allowedMonths.length > 0
      ? allowedMonths
          .map((months) => {
            const existing = paymentDurations.find((duration) => {
              const match = duration.label.match(/(\d+)/)
              return match && parseInt(match[1], 10) === months
            })
            if (existing) return existing
            return {
              id: `virtual-${months}`,
              label: `${months} ${months === 1 ? "month" : "months"}`,
              days: months * 30,
            }
          })
          .sort((a, b) => {
            const monthsA = parseInt(a.label.match(/(\d+)/)?.[1] ?? "0", 10)
            const monthsB = parseInt(b.label.match(/(\d+)/)?.[1] ?? "0", 10)
            return monthsB - monthsA
          })
      : paymentDurations

  useEffect(() => {
    Promise.all([
      fetch("/api/loans/types").then((res) => res.json()),
      fetch("/api/purposes").then((res) => res.json()),
      fetch("/api/payment-durations").then((res) => res.json()),
      fetch("/api/borrowers/credit").then((res) => res.json()),
    ]).then(([loanTypeRes, purposeRes, durationRes, creditRes]) => {
      setLoanTypes(loanTypeRes.loanTypes ?? [])
      setPurposes(purposeRes.purposes ?? [])
      setPaymentDurations(durationRes.durations ?? [])
      setAvailableCredit(creditRes.availableCredit ?? null)
      if (initialLoanTypeId && !loanTypeId) {
        setLoanTypeId(initialLoanTypeId)
      }
    })
  }, [initialLoanTypeId, loanTypeId])

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!loanTypeId) nextErrors.loanTypeId = "Loan type is required."
    if (!purposeId) nextErrors.purposeId = "Purpose is required."
    if (!paymentDurationId) nextErrors.paymentDurationId = "Payment term is required."

    const amount = Number(requestedAmount)
    if (!requestedAmount || Number.isNaN(amount) || amount <= 0) {
      nextErrors.requestedAmount = "Enter a valid amount."
    } else {
      if (selectedLoanType) {
        if (amount < selectedLoanType.minAmount) {
          nextErrors.requestedAmount = `Minimum amount is ₱${selectedLoanType.minAmount.toLocaleString()}`
        }
        if (amount > selectedLoanType.maxAmount) {
          nextErrors.requestedAmount = `Maximum amount is ₱${selectedLoanType.maxAmount.toLocaleString()}`
        }
      }
      if (availableCredit !== null && amount > availableCredit) {
        nextErrors.requestedAmount = `Amount exceeds available credit (₱${availableCredit.toLocaleString()})`
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Please fix the errors",
        description: "Some fields need your attention.",
      })
      return
    }
    setShowConfirmDialog(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmDialog(false)
    setLoading(true)
    try {
      const response = await fetch("/api/loans/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanTypeId,
          purposeId,
          paymentDurationId,
          requestedAmount: Number(requestedAmount),
          purposeDescription: purposeDescription || null,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit application.")
      }
      toast({
        title: "Application submitted",
        description: "We will review your application shortly.",
      })
      router.push("/dashboard/applications/my")
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error?.message || "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6">
      {/* Loan Details */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Loan Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Loan Type *</label>
            <select
              className={`w-full rounded-md border bg-background text-foreground px-3 py-2 ${
                errors.loanTypeId ? "border-destructive" : ""
              }`}
              value={loanTypeId}
              onChange={(event) => setLoanTypeId(event.target.value)}
              disabled={!!initialLoanTypeId}
            >
              <option value="">Select loan type</option>
              {loanTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {errors.loanTypeId && (
              <p className="mt-1 text-xs text-destructive">{errors.loanTypeId}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Purpose *</label>
            <select
              className={`w-full rounded-md border bg-background text-foreground px-3 py-2 ${
                errors.purposeId ? "border-destructive" : ""
              }`}
              value={purposeId}
              onChange={(event) => setPurposeId(event.target.value)}
            >
              <option value="">Select purpose</option>
              {purposes.map((purpose) => (
                <option key={purpose.id} value={purpose.id}>
                  {purpose.name}
                </option>
              ))}
            </select>
            {errors.purposeId && (
              <p className="mt-1 text-xs text-destructive">{errors.purposeId}</p>
            )}
          </div>

          {selectedLoanType && allowedMonths.length > 0 && parseFloat(requestedAmount) > 0 ? (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Select Payment Term *
              </label>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {availablePaymentDurations.map((duration) => {
                  const months = parseInt(duration.label.match(/(\d+)/)?.[1] ?? "0", 10)
                  const amount = parseFloat(requestedAmount) || 0
                  const rate = getInterestRateForMonth(months)
                  const interestAmount = amount * (rate / 100)
                  const totalAmount = amount + interestAmount
                  const monthlyPayment = months > 0 ? totalAmount / months : 0
                  const selected = paymentDurationId === duration.id

                  return (
                    <Card
                      key={duration.id}
                      className={`cursor-pointer transition ${
                        selected ? "border-primary ring-2 ring-primary" : "hover:border-primary"
                      }`}
                      onClick={() => setPaymentDurationId(duration.id)}
                    >
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{duration.label}</h3>
                          {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div className="text-sm text-muted-foreground">Interest rate: {rate}%</div>
                        <div className="text-sm text-muted-foreground">
                          Total Amount: ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-base font-bold text-primary">
                          Monthly: ₱{monthlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              {errors.paymentDurationId && (
                <p className="mt-1 text-xs text-destructive">{errors.paymentDurationId}</p>
              )}
            </div>
          ) : (
            <div className="md:col-span-2 text-sm text-muted-foreground">
              Select a loan type and enter amount to view payment terms.
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Requested Amount (₱) *</label>
            <Input
              type="number"
              step="1000"
              value={requestedAmount}
              onChange={(event) => setRequestedAmount(event.target.value)}
              className={errors.requestedAmount ? "border-destructive" : ""}
            />
            {errors.requestedAmount && (
              <p className="mt-1 text-xs text-destructive">{errors.requestedAmount}</p>
            )}
            {availableCredit !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Available credit: ₱{availableCredit.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Purpose Description</label>
            <textarea
              className="w-full rounded-md border bg-background text-foreground px-3 py-2"
              rows={3}
              value={purposeDescription}
              onChange={(event) => setPurposeDescription(event.target.value)}
              placeholder="Describe how you plan to use the loan..."
            />
          </div>
        </div>
      </div>

      {/* Employment, documents, and contact persons are now taken from registration/profile
          and most recent application; no need to show them on this form. */}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit Application"}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Loan Application</DialogTitle>
            <DialogDescription>
              Please review the information before submitting your application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loan Type</span>
              <span className="font-medium">{selectedLoanType?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                ₱{(parseFloat(requestedAmount) || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Term</span>
              <span className="font-medium">
                {availablePaymentDurations.find((duration) => duration.id === paymentDurationId)
                  ?.label ?? "Not selected"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button disabled={loading} onClick={confirmSubmit}>
              {loading ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}



