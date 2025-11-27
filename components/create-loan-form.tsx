"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CreateLoanForm({
  applicationId,
  maxAmount,
}: {
  applicationId: string
  maxAmount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [principalAmount, setPrincipalAmount] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const amount = Number(principalAmount)

    if (Number.isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than zero.")
      return
    }

    if (amount > maxAmount) {
      alert(`Amount cannot exceed ₱${maxAmount.toLocaleString()}.`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/loans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          principalAmount: amount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create loan.")
      }

      router.push("/dashboard/loans")
      router.refresh()
    } catch (error: any) {
      console.error("Create loan error:", error)
      alert(error?.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Principal Amount (₱) *</label>
        <Input
          type="number"
          step="1000"
          min={0}
          max={maxAmount}
          value={principalAmount}
          onChange={(event) => setPrincipalAmount(event.target.value)}
          required
          placeholder={`Up to ₱${maxAmount.toLocaleString()}`}
        />
        <p className="text-xs text-muted-foreground">
          You can borrow up to ₱{maxAmount.toLocaleString()} based on the approved limit.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Loan"}
      </Button>
    </form>
  )
}





