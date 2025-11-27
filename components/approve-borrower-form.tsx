"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface ApproveBorrowerFormProps {
  borrowerId: string
  borrowerName: string
  onSuccess?: () => void
}

export function ApproveBorrowerForm({
  borrowerId,
  borrowerName,
  onSuccess,
}: ApproveBorrowerFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [creditScore, setCreditScore] = useState("")
  const [loanLimit, setLoanLimit] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    const score = Number(creditScore)
    const limit = Number(loanLimit)

    if (Number.isNaN(score) || score < 0 || score > 100) {
      toast({
        title: "Invalid Credit Score",
        description: "Credit score must be between 0 and 100.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (Number.isNaN(limit) || limit <= 0) {
      toast({
        title: "Invalid Loan Limit",
        description: "Loan limit must be greater than zero.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/borrowers/${borrowerId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditScore: score,
          loanLimit: limit,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve borrower.")
      }

      toast({
        title: "Borrower Approved",
        description: `${borrowerName} has been approved successfully.`,
      })
      onSuccess?.()
    } catch (error: any) {
      console.error("Approve borrower error:", error)
      toast({
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Credit Score *</label>
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          value={creditScore}
          onChange={(event) => setCreditScore(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Enter a value between 0 and 100.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Initial Loan Limit (₱) *</label>
        <Input
          type="number"
          min={0}
          step={500}
          value={loanLimit}
          onChange={(event) => setLoanLimit(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Set the borrower's starting loan limit.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Approving..." : "Approve Borrower"}
        </Button>
      </div>
    </form>
  )
}




