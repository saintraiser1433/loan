"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface ApplicationActionButtonsProps {
  applicationId: string
}

export function ApplicationActionButtons({ applicationId }: ApplicationActionButtonsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const evaluate = async (status: "APPROVED" | "REJECTED", reason?: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/loans/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          creditScore: null,
          loanLimit: null,
          status,
          rejectionReason: reason ?? null,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update application.")
      }
      toast({
        title: `Application ${status === "APPROVED" ? "approved" : "rejected"}`,
      })
      router.push("/dashboard/applications")
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error?.message || "Something went wrong.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => setShowApproveDialog(true)}>
          Approve Application
        </Button>
        <Button
          className="flex-1"
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
        >
          Reject Application
        </Button>
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Confirm that you want to approve this loan application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => setShowApproveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                setShowApproveDialog(false)
                evaluate("APPROVED")
              }}
            >
              {loading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="h-24 w-full rounded-md border px-3 py-2 text-sm"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loading || !rejectionReason.trim()}
              onClick={() => {
                setShowRejectDialog(false)
                evaluate("REJECTED", rejectionReason.trim())
                setRejectionReason("")
              }}
            >
              {loading ? "Processing..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}





