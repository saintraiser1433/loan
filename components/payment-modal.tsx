"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PaymentForm } from "@/components/payment-form"

interface PaymentModalProps {
  loanId: string
  remainingAmount: number
}

export function PaymentModal({ loanId, remainingAmount }: PaymentModalProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Pay</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Pay for the next term of your loan. Remaining balance: ₱{remainingAmount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          loanId={loanId}
          remainingAmount={remainingAmount}
          onSuccess={() => {
            setOpen(false)
            router.refresh()
            // Reload to ensure fresh data
            setTimeout(() => {
              window.location.reload()
            }, 500)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
