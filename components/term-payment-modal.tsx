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

interface LoanTerm {
  id: string
  termNumber: number
  amount: number
  dueDate: string
  amountPaid: number
  status: string
}

interface TermPaymentModalProps {
  loanId: string
  term: LoanTerm
  remainingAmount: number
}

export function TermPaymentModal({ loanId, term, remainingAmount }: TermPaymentModalProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  
  const termDueDate = new Date(term.dueDate)
  const monthName = termDueDate.toLocaleDateString('en-US', { month: 'long' })
  const year = termDueDate.getFullYear()
  const amountDue = term.amount - term.amountPaid

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          Pay Month {term.termNumber}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Month {term.termNumber} - {monthName} {year}</DialogTitle>
          <DialogDescription>
            Pay for Month {term.termNumber} ({monthName} {year}). Amount due: ₱{amountDue.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          loanId={loanId}
          remainingAmount={remainingAmount}
          termId={term.id}
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

