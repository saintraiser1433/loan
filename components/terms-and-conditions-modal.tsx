"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface TermsAndConditionsModalProps {
  open: boolean
  onAccept: () => void
}

export function TermsAndConditionsModal({ open, onAccept }: TermsAndConditionsModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users/accept-terms", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Terms Accepted",
          description: "Thank you for accepting our terms and conditions.",
        })
        // Still record the acceptance for tracking purposes
        onAccept()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to accept terms. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error accepting terms:", error)
      toast({
        title: "Error",
        description: "Failed to accept terms. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept our terms and conditions to continue using our services.
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[500px] overflow-y-auto pr-4">
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-base mb-2">1. Loan Agreement</h3>
              <p className="text-muted-foreground">
                By applying for a loan through this platform, you agree to be bound by these terms and conditions. 
                The loan agreement will be subject to approval by our loan officers and administrators.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">2. Eligibility Requirements</h3>
              <p className="text-muted-foreground">
                To be eligible for a loan, you must:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Be at least 18 years of age</li>
                <li>Have a valid government-issued ID</li>
                <li>Provide accurate and complete information in your application</li>
                <li>Meet the minimum credit score requirements for the selected loan type</li>
                <li>Have available credit within your approved loan limit</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">3. Loan Application Process</h3>
              <p className="text-muted-foreground">
                All loan applications are subject to review and approval. We reserve the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Request additional documentation or information</li>
                <li>Approve or reject any application at our sole discretion</li>
                <li>Modify the loan amount, interest rate, or terms based on your creditworthiness</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4. Interest Rates and Fees</h3>
              <p className="text-muted-foreground">
                Interest rates are determined based on the loan type and your credit score. 
                All applicable fees and charges will be disclosed to you before loan approval. 
                You are responsible for paying all interest, fees, and principal amounts according to the agreed payment schedule.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">5. Repayment Obligations</h3>
              <p className="text-muted-foreground">
                You agree to repay the loan amount, plus interest and fees, according to the payment schedule 
                agreed upon at the time of loan approval. Failure to make timely payments may result in:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Late payment fees</li>
                <li>Negative impact on your credit score</li>
                <li>Legal action to recover the outstanding amount</li>
                <li>Restriction from applying for future loans</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">6. Credit Limit</h3>
              <p className="text-muted-foreground">
                Your loan limit is determined based on your creditworthiness and financial evaluation. 
                You cannot apply for a loan amount that exceeds your available credit limit. 
                Your credit limit may be reviewed and adjusted periodically.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">7. Data Privacy and Security</h3>
              <p className="text-muted-foreground">
                We are committed to protecting your personal information. All data collected will be used 
                solely for the purpose of processing your loan application and managing your account. 
                We implement security measures to protect your information from unauthorized access.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">8. Account Responsibility</h3>
              <p className="text-muted-foreground">
                You are responsible for maintaining the security of your account credentials. 
                You must notify us immediately of any unauthorized access to your account. 
                You are responsible for all activities that occur under your account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">9. Prohibited Activities</h3>
              <p className="text-muted-foreground">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Provide false or misleading information</li>
                <li>Use the platform for any illegal purposes</li>
                <li>Attempt to circumvent security measures</li>
                <li>Apply for multiple loans simultaneously without approval</li>
                <li>Transfer or sell your account to another party</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">10. Account Suspension and Termination</h3>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate your account if you violate these terms, 
                fail to make payments, or engage in fraudulent activities. 
                You may also be blocked from applying for future loans.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">11. Changes to Terms</h3>
              <p className="text-muted-foreground">
                We may update these terms and conditions from time to time. 
                You will be notified of significant changes. Continued use of the platform after changes 
                constitutes acceptance of the updated terms.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">12. Contact Information</h3>
              <p className="text-muted-foreground">
                For questions or concerns regarding these terms and conditions or your loan, 
                please contact our customer service team through the platform or contact your loan officer.
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                By clicking "I Accept", you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Processing..." : "I Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

