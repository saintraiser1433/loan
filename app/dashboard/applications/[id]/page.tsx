import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ApplicationActionButtons } from "@/components/application-action-buttons"
import Link from "next/link"

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role === "BORROWER") {
    redirect("/dashboard")
  }

  const { id } = await params

  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: {
      user: true,
      loanType: true,
      purpose: true,
      paymentDuration: true,
    }
  })

  if (!application) {
    redirect("/dashboard/applications")
  }

  // Get contact persons separately
  const contactPersons = await prisma.contactPerson.findMany({
    where: {
      userId: application.userId
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Application Details</h1>
            <p className="text-muted-foreground">
              Review application and make evaluation
            </p>
          </div>
          <Link href="/dashboard/applications">
            <Button variant="outline">Back to Applications</Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Applicant Information */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Applicant Information</h2>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{application.user.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{application.user.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{application.user.phone || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Credit Score</div>
                <div className="font-medium">{application.user.creditScore}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Loan Limit</div>
                <div className="font-medium">₱{application.user.loanLimit.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Loan Details</h2>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Loan Type</div>
                <div className="font-medium">{application.loanType.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Purpose</div>
                <div className="font-medium">{application.purpose.name}</div>
              </div>
              {application.purposeDescription && (
                <div>
                  <div className="text-sm text-muted-foreground">Purpose Description</div>
                  <div className="font-medium">{application.purposeDescription}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">Requested Amount</div>
                <div className="font-medium">₱{application.requestedAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment Duration</div>
                <div className="font-medium">{application.paymentDuration.label}</div>
              </div>
            </div>
          </div>

          {/* Occupational Information */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Occupational Information</h2>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Salary</div>
                <div className="font-medium">₱{application.salary.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Source of Income</div>
                <div className="font-medium">{application.sourceOfIncome}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Marital Status</div>
                <div className="font-medium">{application.maritalStatus}</div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Documents</h2>
            <div className="space-y-2">
              {application.primaryIdUrl && (
                <div>
                  <div className="text-sm text-muted-foreground">Primary ID</div>
                  <a href={application.primaryIdUrl} target="_blank" className="text-primary hover:underline">
                    View Document
                  </a>
                </div>
              )}
              {application.secondaryId1Url && (
                <div>
                  <div className="text-sm text-muted-foreground">Secondary ID 1</div>
                  <a href={application.secondaryId1Url} target="_blank" className="text-primary hover:underline">
                    View Document
                  </a>
                </div>
              )}
              {application.secondaryId2Url && (
                <div>
                  <div className="text-sm text-muted-foreground">Secondary ID 2</div>
                  <a href={application.secondaryId2Url} target="_blank" className="text-primary hover:underline">
                    View Document
                  </a>
                </div>
              )}
              {application.selfieWithIdUrl && (
                <div>
                  <div className="text-sm text-muted-foreground">Selfie with ID</div>
                  <a href={application.selfieWithIdUrl} target="_blank" className="text-primary hover:underline">
                    View Document
                  </a>
                </div>
              )}
              {application.payslipUrl && (
                <div>
                  <div className="text-sm text-muted-foreground">Payslip</div>
                  <a href={application.payslipUrl} target="_blank" className="text-primary hover:underline">
                    View Document
                  </a>
                </div>
              )}
              {application.billingReceiptUrl && (
                <div>
                  <div className="text-sm text-muted-foreground">Billing Receipt</div>
                  <a href={application.billingReceiptUrl} target="_blank" className="text-primary hover:underline">
                    View Document
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Persons */}
          {contactPersons.length > 0 && (
            <div className="rounded-lg border bg-card p-6 space-y-4 md:col-span-2">
              <h2 className="text-xl font-semibold">Contact Persons</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {contactPersons.map((contact) => (
                  <div key={contact.id} className="p-4 rounded border">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                    <div className="text-sm text-muted-foreground">{contact.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {application.status === "PENDING" && (
          <div className="rounded-lg border bg-card p-6">
            <ApplicationActionButtons applicationId={application.id} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
