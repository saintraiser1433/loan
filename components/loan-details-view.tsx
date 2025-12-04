"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { TermPaymentModal } from "@/components/term-payment-modal"
import { Calendar, CheckCircle2, CreditCard, DollarSign, Eye, XCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getDiceBearAvatar } from "@/lib/avatar"

interface Payment {
  id: string
  amount: number
  status: string
  paymentType?: string
  paymentMethod: string | null
  receiptUrl: string | null
  rejectionReason: string | null
  createdAt: string
}

interface LoanTerm {
  id: string
  termNumber: number
  amount: number
  dueDate: string
  amountPaid: number
  penaltyAmount: number
  daysLate: number
  status: string
  payments: Payment[]
}

interface Loan {
  id: string
  principalAmount: number
  totalAmount: number
  amountPaid: number
  remainingAmount: number
  status: string
  user: {
    name: string
    email: string
  }
  loanType: {
    name: string
    latePaymentPenaltyPerDay?: number
  }
  paymentDuration: {
    label: string
  }
  terms: LoanTerm[]
}

interface LoanDetailsViewProps {
  loan: Loan
}

export function LoanDetailsView({ loan }: LoanDetailsViewProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [selectedPayment, setSelectedPayment] = useState<{ paymentId: string; termId: string } | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  const isAdminOrOfficer = session?.user?.role !== "BORROWER"

  // Find the first term that needs payment (not fully paid and no pending payments)
  const firstPendingTerm = loan.terms && loan.terms.length > 0
    ? loan.terms
        .filter((term) => {
          const amountDue = term.amount - (term.amountPaid || 0)
          const hasPendingPayments = term.payments.some((p: Payment) => p.status === "PENDING")
          // Show pay button only if term is not fully paid AND has no pending payments
          return amountDue > 0 && !hasPendingPayments
        })
        .sort((a, b) => a.termNumber - b.termNumber)[0]
    : null

  const firstPendingTermId = firstPendingTerm?.id ?? null

  const handleApprove = async () => {
    if (!selectedPayment) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/payments/${selectedPayment.paymentId}/approve`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve payment.")
      }
      toast({ title: "Payment approved" })
      setShowApproveDialog(false)
      setSelectedPayment(null)
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: error?.message || "Something went wrong.",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please provide a reason for rejection.",
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/payments/${selectedPayment.paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reject payment.")
      }
      toast({ title: "Payment rejected" })
      setShowRejectDialog(false)
      setSelectedPayment(null)
      setRejectionReason("")
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: error?.message || "Something went wrong.",
      })
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: "Pending",
        className: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white dark:from-yellow-500 dark:to-yellow-700",
      },
      PAID: {
        label: "Paid",
        className: "bg-gradient-to-r from-green-400 to-green-600 text-white dark:from-green-500 dark:to-green-700",
      },
      OVERDUE: {
        label: "Overdue",
        className: "bg-gradient-to-r from-red-400 to-red-600 text-white dark:from-red-500 dark:to-red-700",
      },
      ACTIVE: {
        label: "Active",
        className: "bg-gradient-to-r from-blue-400 to-blue-600 text-white dark:from-blue-500 dark:to-blue-700",
      },
    }
    const config = map[status] ?? { label: status, className: "bg-gradient-to-r from-gray-400 to-gray-600 text-white" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getPaymentStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: "Pending approval",
        className: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white dark:from-yellow-500 dark:to-yellow-700",
      },
      COMPLETED: {
        label: "Approved",
        className: "bg-gradient-to-r from-green-400 to-green-600 text-white dark:from-green-500 dark:to-green-700",
      },
      FAILED: {
        label: "Rejected",
        className: "bg-gradient-to-r from-red-400 to-red-600 text-white dark:from-red-500 dark:to-red-700",
      },
    }
    const config = map[status] ?? { label: status, className: "bg-gradient-to-r from-gray-400 to-gray-600 text-white" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loan Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b">
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage src={getDiceBearAvatar(loan.user.email || loan.user.name || loan.id)} alt={loan.user.name} />
                <AvatarFallback className="text-2xl sm:text-3xl">
                  {loan.user.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">Borrower</div>
              <div className="text-xl sm:text-2xl font-semibold mb-1">{loan.user.name}</div>
              <div className="text-sm text-muted-foreground">{loan.user.email}</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Loan Type</div>
              <div className="font-medium">{loan.loanType.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Principal Amount</div>
              <div className="font-medium">{formatCurrency(loan.principalAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="font-medium">{formatCurrency(loan.totalAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Amount Paid</div>
              <div className="font-medium">{formatCurrency(loan.amountPaid)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Remaining Amount</div>
              <div className="font-medium">{formatCurrency(loan.remainingAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Payment Duration</div>
              <div className="font-medium">{loan.paymentDuration.label}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div>{getStatusBadge(loan.status)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Terms</CardTitle>
          <CardDescription>Manage payments for each term/month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loan.terms && loan.terms.length > 0 ? (
              loan.terms.map((term) => {
                const termDueDate = new Date(term.dueDate)
                termDueDate.setHours(0, 0, 0, 0)
                const monthName = termDueDate.toLocaleDateString("en-US", { month: "long" })
                const year = termDueDate.getFullYear()
                const daysUntilDue = Math.ceil(
                  (termDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )
                // Only show as overdue if term is not PAID and past due date
                const isOverdue = term.status !== "PAID" && daysUntilDue < 0
                const amountDue = term.amount - term.amountPaid
                
                // Calculate if paid term was paid late
                let wasPaidLate = false
                let daysLateWhenPaid = 0
                if (term.status === "PAID" && term.paidAt) {
                  const paidDate = new Date(term.paidAt)
                  paidDate.setHours(0, 0, 0, 0)
                  if (paidDate > termDueDate) {
                    wasPaidLate = true
                    daysLateWhenPaid = Math.ceil((paidDate.getTime() - termDueDate.getTime()) / (1000 * 60 * 60 * 24))
                  }
                }
                const pendingPayments = term.payments.filter((payment) => payment.status === "PENDING")
                const completedPayments = term.payments.filter((payment) => payment.status === "COMPLETED")
                const rejectedPayments = term.payments.filter((payment) => payment.status === "FAILED")
                // Show pay button only for borrowers, on the first unpaid term, with no pending payments
                const isFirstPendingTerm =
                  !isAdminOrOfficer &&
                  term.id === firstPendingTermId &&
                  amountDue > 0 &&
                  pendingPayments.length === 0

                return (
                  <Card key={term.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Month {term.termNumber} - {monthName} {year}
                          </CardTitle>
                          <CardDescription>
                            Due: {termDueDate.toLocaleDateString()}
                            {term.status === "PAID" ? (
                              wasPaidLate ? (
                                <span className="ml-2 text-orange-600 font-medium">
                                  (Paid - {daysLateWhenPaid} day{daysLateWhenPaid !== 1 ? 's' : ''} late)
                                </span>
                              ) : (
                                <span className="ml-2 text-green-600 font-medium">
                                  (Paid on time)
                                </span>
                              )
                            ) : isOverdue ? (
                              <span className="ml-2 text-destructive">
                                ({Math.abs(daysUntilDue)} days overdue)
                              </span>
                            ) : (
                              <span className="ml-2 text-muted-foreground">
                                ({daysUntilDue} days left)
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div>{getStatusBadge(term.status)}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 rounded-lg bg-muted p-4 md:grid-cols-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Term Amount</div>
                          <div className="font-semibold">{formatCurrency(term.amount)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Amount Paid</div>
                          <div className="font-semibold">{formatCurrency(term.amountPaid)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Amount Due</div>
                          <div className="font-semibold text-primary">
                            ₱{amountDue.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Late Fee Display - Show for overdue terms or paid terms that were paid late */}
                      {((term.status !== "PAID" && (term.penaltyAmount > 0 || isOverdue)) || 
                        (term.status === "PAID" && wasPaidLate && (term.penaltyAmount > 0 || term.daysLate > 0))) && (
                        <div className={`rounded-lg border p-3 space-y-2 ${
                          term.status === "PAID" 
                            ? "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20" 
                            : "border-destructive/50 bg-destructive/10"
                        }`}>
                          <div className={`flex items-center gap-2 ${
                            term.status === "PAID" ? "text-orange-600" : "text-destructive"
                          }`}>
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold text-sm">
                              {term.status === "PAID" && wasPaidLate ? (
                                `PAID LATE - ${daysLateWhenPaid} day${daysLateWhenPaid !== 1 ? 's' : ''} overdue`
                              ) : term.daysLate > 0 ? (
                                `LATE PAYMENT - ${term.daysLate} day${term.daysLate !== 1 ? 's' : ''} overdue`
                              ) : (
                                `OVERDUE - ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} late`
                              )}
                            </span>
                          </div>
                          {(term.penaltyAmount > 0 || (term.status === "PAID" && wasPaidLate)) && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Late fee (₱{(loan.loanType.latePaymentPenaltyPerDay || 0).toLocaleString()}/day × {term.status === "PAID" ? daysLateWhenPaid : term.daysLate} days)
                              </span>
                              <span className={`font-semibold ${
                                term.status === "PAID" ? "text-orange-600" : "text-destructive"
                              }`}>
                                +₱{(term.penaltyAmount || 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {term.status !== "PAID" && term.penaltyAmount > 0 && (
                            <div className="flex items-center justify-between text-sm border-t pt-2">
                              <span className="font-semibold">Total with penalty</span>
                              <span className="font-bold text-destructive">
                                ₱{(amountDue + term.penaltyAmount).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {pendingPayments.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                            Pending Payments ({pendingPayments.length})
                          </div>
                          {pendingPayments.map((payment) => {
                            const paymentType = (payment as any).paymentType || "FULL"
                            const remainingAfterPayment = amountDue - payment.amount
                            const willCompleteTerm = remainingAfterPayment <= 0.01
                            
                          return (
                            <div
                              key={payment.id}
                              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-yellow-50 p-3 dark:bg-yellow-900/20"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">
                                      ₱{payment.amount.toLocaleString()}
                                    </span>
                                    <Badge variant={paymentType === "PARTIAL" ? "secondary" : "default"}>
                                      {paymentType}
                                    </Badge>
                                    {getPaymentStatusBadge(payment.status)}
                                    {payment.paymentMethod && (
                                      <span className="text-sm text-muted-foreground">
                                        via {payment.paymentMethod}
                                      </span>
                                    )}
                                    {isAdminOrOfficer && paymentType === "PARTIAL" && (
                                      <span className="text-xs text-muted-foreground">
                                        (Remaining: ₱{remainingAfterPayment.toLocaleString()})
                                      </span>
                                    )}
                                    {isAdminOrOfficer && willCompleteTerm && (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        Will complete term
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Submitted: {new Date(payment.createdAt).toLocaleString()}
                                  </div>
                                  {payment.receiptUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => window.open(payment.receiptUrl!, "_blank")}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Receipt
                                    </Button>
                                  )}
                                </div>
                                {isAdminOrOfficer && (
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPayment({ paymentId: payment.id, termId: term.id })
                                        setShowApproveDialog(true)
                                      }}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedPayment({ paymentId: payment.id, termId: term.id })
                                        setShowRejectDialog(true)
                                      }}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {completedPayments.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Approved Payments ({completedPayments.length})
                          </div>
                          {completedPayments.map((payment) => {
                            const paymentType = (payment as any).paymentType || "FULL"
                            return (
                              <div
                                key={payment.id}
                                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-green-50 p-3 dark:bg-green-900/20"
                              >
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">
                                      ₱{payment.amount.toLocaleString()}
                                    </span>
                                    <Badge variant={paymentType === "PARTIAL" ? "secondary" : "default"}>
                                      {paymentType}
                                    </Badge>
                                    {getPaymentStatusBadge(payment.status)}
                                    {payment.paymentMethod && (
                                      <span className="text-sm text-muted-foreground">
                                        via {payment.paymentMethod}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Approved: {new Date(payment.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                {payment.receiptUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(payment.receiptUrl!, "_blank")}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Receipt
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {rejectedPayments.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                            Rejected Payments ({rejectedPayments.length})
                          </div>
                          {rejectedPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="rounded-lg border bg-red-50 p-3 dark:bg-red-900/20"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  ₱{payment.amount.toLocaleString()}
                                </span>
                                {getPaymentStatusBadge(payment.status)}
                                {payment.paymentMethod && (
                                  <span className="text-sm text-muted-foreground">
                                    via {payment.paymentMethod}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Submitted: {new Date(payment.createdAt).toLocaleString()}
                              </div>
                              {payment.rejectionReason && (
                                <div className="mt-2 rounded bg-red-100 p-2 text-sm dark:bg-red-900/30">
                                  <div className="font-semibold text-red-700 dark:text-red-200">
                                    Rejection Reason
                                  </div>
                                  <div className="text-red-600 dark:text-red-100">
                                    {payment.rejectionReason}
                                  </div>
                                </div>
                              )}
                              {payment.receiptUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => window.open(payment.receiptUrl!, "_blank")}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Receipt
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isFirstPendingTerm && (
                        <div className="flex justify-end">
                          <TermPaymentModal
                            loanId={loan.id}
                            term={term}
                            remainingAmount={loan.remainingAmount}
                          />
                        </div>
                      )}

                      {term.payments.length === 0 && term.status !== "PENDING" && (
                        <div className="py-4 text-center text-muted-foreground">
                          No payments recorded for this term.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No payment terms found for this loan.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Approving this payment will update the term’s amount paid and the loan’s remaining
              balance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={processing}
              onClick={() => {
                setShowApproveDialog(false)
                setSelectedPayment(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection reason *</Label>
              <Textarea
                id="rejection-reason"
                rows={4}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={processing}
              onClick={() => {
                setShowRejectDialog(false)
                setSelectedPayment(null)
                setRejectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={processing || !rejectionReason.trim()}
              onClick={handleReject}
            >
              {processing ? "Processing..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



