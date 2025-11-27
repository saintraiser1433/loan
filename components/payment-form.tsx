"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileUpload } from "@/components/file-upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle } from "lucide-react"

type PaymentMethod = {
  id: string
  name: string
  accountNumber: string
  accountName: string
  isActive: boolean
}

type LoanTerm = {
  id: string
  termNumber: number
  amount: number
  amountPaid: number
  penaltyAmount: number
  daysLate: number
  dueDate: string
  status: string
}

type LoanData = {
  id: string
  terms: LoanTerm[]
  loanType: {
    latePaymentPenaltyPerDay: number
  }
}

type PaymentFormProps = {
  loanId: string
  remainingAmount: number
  termId?: string
  onSuccess?: () => void
}

export function PaymentForm({
  loanId,
  remainingAmount,
  termId,
  onSuccess,
}: PaymentFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethodId, setPaymentMethodId] = useState("")
  const [receiptUrl, setReceiptUrl] = useState("")
  const [nextTerm, setNextTerm] = useState<LoanTerm | null>(null)
  const [loanData, setLoanData] = useState<LoanData | null>(null)
  const [paymentType, setPaymentType] = useState<"PARTIAL" | "FULL">("FULL")
  const [partialAmount, setPartialAmount] = useState("")

  const [loadingMethods, setLoadingMethods] = useState(true)
  const [loadingTerm, setLoadingTerm] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Calculate late fee based on days overdue
  const calculateLateFee = (term: LoanTerm, penaltyPerDay: number) => {
    const dueDate = new Date(term.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    const diffTime = today.getTime() - dueDate.getTime()
    const daysLate = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    
    return {
      daysLate,
      penaltyAmount: daysLate * penaltyPerDay
    }
  }

  useEffect(() => {
    void loadPaymentMethods()
    void loadTerm()
  }, [loanId, termId])

  useEffect(() => {
    if (nextTerm && loanData && paymentType === "FULL") {
      const penaltyPerDay = loanData.loanType?.latePaymentPenaltyPerDay || 0
      const { penaltyAmount } = calculateLateFee(nextTerm, penaltyPerDay)
      const baseBalance = Math.max(nextTerm.amount - nextTerm.amountPaid, 0)
      const totalWithPenalty = baseBalance + penaltyAmount
      setPartialAmount(totalWithPenalty.toString())
    } else if (paymentType === "PARTIAL") {
      setPartialAmount("")
    }
  }, [paymentType, nextTerm, loanData])

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch("/api/payment-methods")
      if (!response.ok) return
      const data = await response.json()
      const active = (data.paymentMethods ?? []).filter(
        (method: PaymentMethod) => method.isActive
      )
      setPaymentMethods(active)
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    } finally {
      setLoadingMethods(false)
    }
  }

  const loadTerm = async () => {
    try {
      const response = await fetch(`/api/loans/${loanId}`)
      if (!response.ok) return
      const loan = await response.json()
      setLoanData(loan)
      const terms: LoanTerm[] = loan.terms ?? []

      if (termId) {
        const specificTerm = terms.find((t) => t.id === termId)
        setNextTerm(specificTerm ?? null)
        return
      }

      const pending = terms
        .filter((t) => t.status === "PENDING")
        .sort((a, b) => a.termNumber - b.termNumber)

      setNextTerm(pending[0] ?? null)
    } catch (error) {
      console.error("Error fetching loan terms:", error)
    } finally {
      setLoadingTerm(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!nextTerm) {
      toast({
        variant: "destructive",
        title: "No pending term",
        description: "There are no pending terms available to pay.",
      })
      return
    }

    if (!paymentMethodId) {
      toast({
        variant: "destructive",
        title: "Payment method required",
        description: "Please select a payment method.",
      })
      return
    }

    const penaltyPerDay = loanData?.loanType?.latePaymentPenaltyPerDay || 0
    const { penaltyAmount } = calculateLateFee(nextTerm, penaltyPerDay)
    const baseBalance = Math.max(nextTerm.amount - nextTerm.amountPaid, 0)
    const totalWithPenalty = baseBalance + penaltyAmount
    
    const amountToPay = paymentType === "FULL" 
      ? totalWithPenalty 
      : parseFloat(partialAmount)

    if (isNaN(amountToPay) || amountToPay <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid payment amount.",
      })
      return
    }

    if (amountToPay > totalWithPenalty) {
      toast({
        variant: "destructive",
        title: "Amount exceeds balance",
        description: `Maximum payment for this term is ₱${totalWithPenalty.toLocaleString()}.`,
      })
      return
    }

    setShowConfirm(true)
  }

  const handleConfirmPayment = async () => {
    if (!nextTerm) return
    setShowConfirm(false)
    setLoading(true)

    try {
      const penaltyPerDay = loanData?.loanType?.latePaymentPenaltyPerDay || 0
      const { daysLate, penaltyAmount } = calculateLateFee(nextTerm, penaltyPerDay)
      const baseBalance = Math.max(nextTerm.amount - nextTerm.amountPaid, 0)
      const totalWithPenalty = baseBalance + penaltyAmount
      
      const amountToPay = paymentType === "FULL" 
        ? totalWithPenalty 
        : parseFloat(partialAmount)

      const body = {
        loanId,
        amount: amountToPay,
        paymentType: paymentType,
        paymentMethodId,
        receiptUrl: receiptUrl || null,
        termId: nextTerm.id,
        daysLate,
        penaltyAmount,
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit payment.")
      }

      toast({
        title: "Payment submitted",
        description: `Your ${paymentType.toLowerCase()} payment is pending admin approval.`,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/dashboard/loans")
        router.refresh()
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error?.message || "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingTerm) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading term information...</p>
      </div>
    )
  }

  if (!nextTerm) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        {remainingAmount <= 0
          ? "All terms have been paid! This loan is complete."
          : "No pending terms found. This loan may be using the old payment format."}
      </div>
    )
  }

  const termDueDate = new Date(nextTerm.dueDate)
  const monthName = termDueDate.toLocaleDateString("en-US", { month: "long" })
  const year = termDueDate.getFullYear()
  const baseBalance = Math.max(nextTerm.amount - nextTerm.amountPaid, 0)
  const hasPartialPayment = nextTerm.amountPaid > 0 && nextTerm.status === "PENDING"
  
  // Calculate late fee
  const penaltyPerDay = loanData?.loanType?.latePaymentPenaltyPerDay || 0
  const { daysLate, penaltyAmount } = calculateLateFee(nextTerm, penaltyPerDay)
  const totalWithPenalty = baseBalance + penaltyAmount
  const isOverdue = daysLate > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <header className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground tracking-wide">
            Month to pay
          </span>
          <span className="text-xl font-semibold">
            Month {nextTerm.termNumber} · {monthName} {year}
          </span>
        </header>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Original amount</span>
          <span className="text-lg font-semibold">
            ₱{nextTerm.amount.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Already paid</span>
          <span className="text-sm font-medium">
            ₱{nextTerm.amountPaid.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Base balance</span>
          <span className="text-sm font-medium">
            ₱{baseBalance.toLocaleString()}
          </span>
        </div>

        {/* Late Payment Warning */}
        {isOverdue && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold text-sm">OVERDUE - {daysLate} day{daysLate !== 1 ? 's' : ''} late</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Late fee (₱{penaltyPerDay.toLocaleString()}/day × {daysLate} days)</span>
              <span className="font-semibold text-destructive">+₱{penaltyAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-base font-semibold">Total amount due</span>
          <span className="text-xl font-bold text-primary">
            ₱{totalWithPenalty.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Remaining loan balance</span>
          <span className="text-sm font-medium">
            ₱{Math.max(remainingAmount + penaltyAmount, 0).toLocaleString()}
          </span>
        </div>
      </section>

      {/* Payment Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Payment Type *</Label>
        <div className="flex gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="PARTIAL"
              checked={paymentType === "PARTIAL"}
              onChange={(e) => setPaymentType(e.target.value as "PARTIAL" | "FULL")}
              className="h-4 w-4"
            />
            <span className="text-sm">Partial Payment</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="FULL"
              checked={paymentType === "FULL"}
              onChange={(e) => setPaymentType(e.target.value as "PARTIAL" | "FULL")}
              className="h-4 w-4"
            />
            <span className="text-sm">Full Payment</span>
          </label>
        </div>
        {hasPartialPayment && paymentType === "FULL" && (
          <p className="text-xs text-muted-foreground">
            You have a partial payment. Full payment will complete the remaining balance.
          </p>
        )}
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium">
          Payment Amount *
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={totalWithPenalty}
          value={partialAmount}
          onChange={(e) => {
            if (paymentType === "PARTIAL") {
              setPartialAmount(e.target.value)
            }
          }}
          disabled={paymentType === "FULL"}
          placeholder={paymentType === "FULL" ? "Auto-filled" : "Enter amount"}
          className="text-lg font-semibold"
        />
        <p className="text-xs text-muted-foreground">
          {paymentType === "FULL" 
            ? `Full payment: ₱${totalWithPenalty.toLocaleString()}${isOverdue ? ' (includes late fee)' : ''}`
            : `Maximum: ₱${totalWithPenalty.toLocaleString()}`}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Payment method *</label>
        {loadingMethods ? (
          <Input disabled value="Loading payment methods..." />
        ) : (
          <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.length === 0 ? (
                <SelectItem value="none" disabled>
                  No payment methods available
                </SelectItem>
              ) : (
                paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} · {method.accountNumber} ({method.accountName})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <FileUpload
          value={receiptUrl}
          onChange={setReceiptUrl}
          label="Payment receipt (optional)"
          accept="image/*,.pdf"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Processing..." : `Submit ${paymentType === "FULL" ? "Full" : "Partial"} Payment`}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Please review the payment details before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Month to pay</span>
              <span>Month {nextTerm.termNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Type</span>
              <span className="font-semibold">{paymentType}</span>
            </div>
            {isOverdue && (
              <>
                <div className="flex justify-between text-destructive">
                  <span>Days late</span>
                  <span className="font-semibold">{daysLate} day{daysLate !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Late fee</span>
                  <span className="font-semibold">₱{penaltyAmount.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-semibold">
                ₱{(paymentType === "FULL" ? totalWithPenalty : parseFloat(partialAmount || "0")).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment method</span>
              <span>
                {paymentMethods.find((method) => method.id === paymentMethodId)?.name ||
                  "N/A"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={loading} onClick={handleConfirmPayment}>
              {loading ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
