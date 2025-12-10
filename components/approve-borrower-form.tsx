"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
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

  const handleApprove = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/borrowers/${borrowerId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve borrower.")
      }

      toast({
        title: "Borrower Approved",
        description: `${borrowerName} has been approved successfully with default credit score (0) and loan limit (₱5,000).`,
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
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to approve <strong>{borrowerName}</strong>?
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The borrower will be approved with default values:
        </p>
        <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Credit Score: <strong>0</strong></li>
          <li>Loan Limit: <strong>₱5,000</strong></li>
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onSuccess}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button onClick={handleApprove} disabled={loading}>
          {loading ? "Approving..." : "Approve Borrower"}
        </Button>
      </div>
    </div>
  )
}




