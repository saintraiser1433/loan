"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function EvaluateApplicationForm({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [creditScore, setCreditScore] = React.useState("")
  const [loanLimit, setLoanLimit] = React.useState("")
  const [status, setStatus] = React.useState<"APPROVED" | "REJECTED">("APPROVED")
  const [rejectionReason, setRejectionReason] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/loans/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          creditScore: status === "APPROVED" ? parseFloat(creditScore) : null,
          loanLimit: status === "APPROVED" ? parseFloat(loanLimit) : null,
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to evaluate application")
      }

      router.push("/dashboard/applications")
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to evaluate application")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Decision</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="APPROVED"
                checked={status === "APPROVED"}
                onChange={(e) => setStatus(e.target.value as "APPROVED" | "REJECTED")}
                className="mr-2"
              />
              Approve
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="REJECTED"
                checked={status === "REJECTED"}
                onChange={(e) => setStatus(e.target.value as "APPROVED" | "REJECTED")}
                className="mr-2"
              />
              Reject
            </label>
          </div>
        </div>

        {status === "APPROVED" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Credit Score (0-100)</label>
              <Input
                type="number"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                min="0"
                max="100"
                required
                placeholder="Enter credit score"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Loan Limit (₱)</label>
              <Input
                type="number"
                value={loanLimit}
                onChange={(e) => setLoanLimit(e.target.value)}
                min="0"
                required
                placeholder="Enter loan limit"
              />
            </div>
          </>
        )}

        {status === "REJECTED" && (
          <div>
            <label className="block text-sm font-medium mb-2">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-2 border rounded-md"
              rows={4}
              required
              placeholder="Enter the reason for rejection..."
            />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Processing..." : status === "APPROVED" ? "Approve Application" : "Reject Application"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
