"use client"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

interface LoanTypeFormProps {
  loanType?: {
    id: string
    name: string
    description: string | null
    minAmount: number
    maxAmount: number
    creditScoreRequired: number
    creditScoreOnCompletion?: number
    limitIncreaseOnCompletion?: number
    latePaymentPenaltyPerDay?: number
    allowedMonthsToPay: string | null
    interestRatesByMonth: string | null
  } | null
  onSuccess?: () => void
}

export function LoanTypeForm({ loanType, onSuccess }: LoanTypeFormProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(loanType?.name || "")
  const [description, setDescription] = useState(loanType?.description || "")
  const [minAmount, setMinAmount] = useState(loanType?.minAmount.toString() || "")
  const [maxAmount, setMaxAmount] = useState(loanType?.maxAmount.toString() || "")
  const [creditScoreRequired, setCreditScoreRequired] = useState(
    loanType?.creditScoreRequired.toString() || ""
  )
  const [creditScoreOnCompletion, setCreditScoreOnCompletion] = useState(
    loanType?.creditScoreOnCompletion?.toString() || "5"
  )
  const [limitIncreaseOnCompletion, setLimitIncreaseOnCompletion] = useState(
    loanType?.limitIncreaseOnCompletion?.toString() || "0"
  )
  const [latePaymentPenaltyPerDay, setLatePaymentPenaltyPerDay] = useState(
    loanType?.latePaymentPenaltyPerDay?.toString() || "0"
  )
  const [selectedMonths, setSelectedMonths] = useState<number[]>(() => {
    if (loanType?.allowedMonthsToPay) {
      try {
        return JSON.parse(loanType.allowedMonthsToPay)
      } catch {
        return []
      }
    }
    return []
  })
  const [interestRatesByMonth, setInterestRatesByMonth] = useState<Record<number, string>>(() => {
    if (loanType?.interestRatesByMonth) {
      try {
        return JSON.parse(loanType.interestRatesByMonth)
      } catch {
        return {}
      }
    }
    return {}
  })
  const { toast } = useToast()

  const monthOptions = Array.from({ length: 60 }, (_, index) => index + 1)

  const handleMonthToggle = (month: number) => {
    setSelectedMonths((prev) => {
      const exists = prev.includes(month)
      const updated = exists ? prev.filter((value) => value !== month) : [...prev, month]

      if (exists) {
        setInterestRatesByMonth((prevRates) => {
          const next = { ...prevRates }
          delete next[month]
          return next
        })
      }

      return updated.sort((a, b) => a - b)
    })
  }

  const handleInterestRateChange = (month: number, value: string) => {
    setInterestRatesByMonth((prev) => ({
      ...prev,
      [month]: value,
    }))
  }

  useEffect(() => {
    if (!loanType) {
      return
    }

    setName(loanType.name)
    setDescription(loanType.description || "")
    setMinAmount(loanType.minAmount.toString())
    setMaxAmount(loanType.maxAmount.toString())
    setCreditScoreRequired(loanType.creditScoreRequired.toString())
    setCreditScoreOnCompletion(loanType.creditScoreOnCompletion?.toString() || "5")
    setLimitIncreaseOnCompletion(loanType.limitIncreaseOnCompletion?.toString() || "0")
    setLatePaymentPenaltyPerDay(loanType.latePaymentPenaltyPerDay?.toString() || "0")

    if (loanType.allowedMonthsToPay) {
      try {
        setSelectedMonths(JSON.parse(loanType.allowedMonthsToPay))
      } catch {
        setSelectedMonths([])
      }
    } else {
      setSelectedMonths([])
    }

    if (loanType.interestRatesByMonth) {
      try {
        setInterestRatesByMonth(JSON.parse(loanType.interestRatesByMonth))
      } catch {
        setInterestRatesByMonth({})
      }
    } else {
      setInterestRatesByMonth({})
    }
  }, [loanType])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name || minAmount === undefined || minAmount === null || minAmount === "" || maxAmount === undefined || maxAmount === null || maxAmount === "" || creditScoreRequired === undefined || creditScoreRequired === null || creditScoreRequired === "") {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please fill in all required fields.",
      })
      return
    }

    const min = Number(minAmount)
    const max = Number(maxAmount)
    const creditScore = Number(creditScoreRequired)

    if (Number.isNaN(min) || min < 0) {
      toast({
        variant: "destructive",
        title: "Invalid minimum amount",
        description: "Minimum amount must be 0 or greater.",
      })
      return
    }

    if (Number.isNaN(max) || max < min) {
      toast({
        variant: "destructive",
        title: "Invalid maximum amount",
        description: "Maximum amount must be greater than or equal to minimum amount.",
      })
      return
    }

    if (Number.isNaN(creditScore) || creditScore < 0 || creditScore > 100) {
      toast({
        variant: "destructive",
        title: "Invalid credit score",
        description: "Credit score must be between 0 and 100.",
      })
      return
    }

    if (selectedMonths.length === 0) {
      toast({
        variant: "destructive",
        title: "Allowed months required",
        description: "Select at least one month option for payment duration.",
      })
      return
    }

    const missingRates = selectedMonths.filter((month) => {
      const value = interestRatesByMonth[month]
      return value === undefined || value === null || value === ""
    })
    if (missingRates.length > 0) {
      toast({
        variant: "destructive",
        title: "Interest rates required",
        description: `Provide interest rates for: ${missingRates.join(", ")}`,
      })
      return
    }

    for (const month of selectedMonths) {
      const rate = Number(interestRatesByMonth[month])
      if (Number.isNaN(rate) || rate < 0 || rate > 100) {
        toast({
          variant: "destructive",
          title: "Invalid interest rate",
          description: `Interest rate for ${month} month${month === 1 ? "" : "s"} must be between 0 and 100.`,
        })
        return
      }
    }

    try {
      setLoading(true)

      // Parse optional fields, allowing 0 values
      const creditScoreOnCompletionValue = creditScoreOnCompletion !== undefined && creditScoreOnCompletion !== null && creditScoreOnCompletion !== ""
        ? Number(creditScoreOnCompletion)
        : 5
      const limitIncreaseOnCompletionValue = limitIncreaseOnCompletion !== undefined && limitIncreaseOnCompletion !== null && limitIncreaseOnCompletion !== ""
        ? Number(limitIncreaseOnCompletion)
        : 0
      const latePaymentPenaltyValue = latePaymentPenaltyPerDay !== undefined && latePaymentPenaltyPerDay !== null && latePaymentPenaltyPerDay !== ""
        ? Number(latePaymentPenaltyPerDay)
        : 0

      // Validate optional fields
      if (Number.isNaN(creditScoreOnCompletionValue) || creditScoreOnCompletionValue < 0 || creditScoreOnCompletionValue > 100) {
        toast({
          variant: "destructive",
          title: "Invalid credit score increase",
          description: "Credit score increase must be between 0 and 100.",
        })
        return
      }

      if (Number.isNaN(limitIncreaseOnCompletionValue) || limitIncreaseOnCompletionValue < 0) {
        toast({
          variant: "destructive",
          title: "Invalid limit increase",
          description: "Limit increase must be 0 or greater.",
        })
        return
      }

      if (Number.isNaN(latePaymentPenaltyValue) || latePaymentPenaltyValue < 0) {
        toast({
          variant: "destructive",
          title: "Invalid late payment penalty",
          description: "Late payment penalty must be 0 or greater.",
        })
        return
      }

      const body = {
        name,
        description: description || null,
        minAmount: min,
        maxAmount: max,
        creditScoreRequired: creditScore,
        creditScoreOnCompletion: creditScoreOnCompletionValue,
        limitIncreaseOnCompletion: limitIncreaseOnCompletionValue,
        latePaymentPenaltyPerDay: latePaymentPenaltyValue,
        allowedMonthsToPay: JSON.stringify(selectedMonths),
        interestRatesByMonth: JSON.stringify(
          Object.fromEntries(
            selectedMonths.map((month) => [month, Number(interestRatesByMonth[month])])
          )
        ),
      }

      const response = await fetch(
        loanType ? `/api/loans/types/${loanType.id}` : "/api/loans/types",
        {
          method: loanType ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save loan type.")
      }

      toast({
        title: loanType ? "Loan type updated" : "Loan type created",
        description: loanType
          ? "Changes have been saved successfully."
          : "The loan type has been created.",
      })

      onSuccess?.()
    } catch (error: any) {
      console.error("Loan type form error:", error)
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error?.message || "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Loan type name *</label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Salary Loan"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          rows={3}
          placeholder="Describe this loan type..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum amount *</label>
          <Input
            type="number"
            min="0"
            step="100"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Maximum amount *</label>
          <Input
            type="number"
            min="0"
            step="100"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Credit score required *</label>
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={creditScoreRequired}
            onChange={(event) => setCreditScoreRequired(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Credit score increase on completion *</label>
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={creditScoreOnCompletion}
            onChange={(event) => setCreditScoreOnCompletion(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Loan limit increase on completion (₱)</label>
          <Input
            type="number"
            min="0"
            step="100"
            value={limitIncreaseOnCompletion}
            onChange={(event) => setLimitIncreaseOnCompletion(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Late payment penalty per day (₱)</label>
          <Input
            type="number"
            min="0"
            step="50"
            value={latePaymentPenaltyPerDay}
            onChange={(event) => setLatePaymentPenaltyPerDay(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Allowed months to pay *</label>
        <p className="text-xs text-muted-foreground">
          Select all durations borrowers can choose for this loan type.
        </p>
        <div className="grid max-h-60 grid-cols-4 gap-3 overflow-y-auto rounded-md border p-4 sm:grid-cols-6 md:grid-cols-8">
          {monthOptions.map((month) => (
            <label key={month} className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={selectedMonths.includes(month)}
                onCheckedChange={() => handleMonthToggle(month)}
              />
              <span>{month}</span>
            </label>
          ))}
        </div>
        {selectedMonths.length > 0 && (
          <div className="space-y-4 rounded-md border bg-muted/40 p-4">
            <p className="text-sm font-medium">Interest rate per term (%)</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {selectedMonths.map((month) => (
                <div key={month} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {month} month{month > 1 ? "s" : ""} interest rate
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={interestRatesByMonth[month] || ""}
                    onChange={(event) => handleInterestRateChange(month, event.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? (loanType ? "Saving..." : "Creating...") : loanType ? "Save changes" : "Create loan type"}
      </Button>
    </form>
  )
}





