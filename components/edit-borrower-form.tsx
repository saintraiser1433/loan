"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface EditBorrowerFormProps {
  borrowerId: string
  borrowerName: string
  currentCreditScore: number
  currentLoanLimit: number
  onSuccess: () => void
  onCancel: () => void
}

export function EditBorrowerForm({
  borrowerId,
  borrowerName,
  currentCreditScore,
  currentLoanLimit,
  onSuccess,
  onCancel,
}: EditBorrowerFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [creditScore, setCreditScore] = useState(currentCreditScore.toString())
  const [loanLimit, setLoanLimit] = useState(currentLoanLimit.toString())

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/borrowers/${borrowerId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditScore: Number(creditScore),
          loanLimit: Number(loanLimit),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update borrower.")
      }

      toast({
        title: "Borrower updated",
        description: `${borrowerName}'s information has been saved.`,
      })
      onSuccess()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error?.message || "Something went wrong.",
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
        <label className="mb-1 block text-sm font-medium">Loan Limit (₱) *</label>
        <Input
          type="number"
          min={0}
          step={500}
          value={loanLimit}
          onChange={(event) => setLoanLimit(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Maximum amount this borrower can request.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  )
}





