import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function MyApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "BORROWER") {
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
    redirect("/dashboard/applications/my")
  }

  // Ensure the borrower can only view their own application
  if (application.userId !== session.user.id) {
    redirect("/dashboard/applications/my")
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
              View your submitted loan application
            </p>
          </div>
          <Link href="/dashboard/applications/my">
            <Button variant="outline">Back to My Applications</Button>
          </Link>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            application.status === "APPROVED" ? "bg-gradient-to-r from-green-400 to-green-600 text-white dark:from-green-500 dark:to-green-700" :
            application.status === "REJECTED" ? "bg-gradient-to-r from-red-400 to-red-600 text-white dark:from-red-500 dark:to-red-700" :
            "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white dark:from-yellow-500 dark:to-yellow-700"
          }`}>
            {application.status}
          </span>
          {application.status === "REJECTED" && application.rejectionReason && (
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Rejection Reason: </span>
                {application.rejectionReason}
              </p>
            </div>
          )}
          {application.status === "APPROVED" && application.loanLimit && (
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Approved Limit: </span>
                ₱{application.loanLimit.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Loan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="font-medium text-lg">₱{application.requestedAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment Duration</div>
                <div className="font-medium">{application.paymentDuration.label}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Applied Date</div>
                <div className="font-medium">{new Date(application.createdAt).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>

          {/* Occupational Information */}
          <Card>
            <CardHeader>
              <CardTitle>Occupational Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.primaryIdUrl && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Primary ID</div>
                  <a 
                    href={application.primaryIdUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Document →
                  </a>
                </div>
              )}
              {application.secondaryId1Url && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Secondary ID 1</div>
                  <a 
                    href={application.secondaryId1Url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Document →
                  </a>
                </div>
              )}
              {application.secondaryId2Url && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Secondary ID 2</div>
                  <a 
                    href={application.secondaryId2Url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Document →
                  </a>
                </div>
              )}
              {application.selfieWithIdUrl && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Selfie with ID</div>
                  <a 
                    href={application.selfieWithIdUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Document →
                  </a>
                </div>
              )}
              {application.payslipUrl && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Payslip</div>
                  <a 
                    href={application.payslipUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Document →
                  </a>
                </div>
              )}
              {application.billingReceiptUrl && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Latest Billing Receipt</div>
                  <a 
                    href={application.billingReceiptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Document →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Persons */}
          {contactPersons.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Contact Persons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {contactPersons.map((contact) => (
                    <div key={contact.id} className="p-4 rounded-lg border">
                      <div className="font-medium mb-1">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                      <div className="text-sm text-muted-foreground">{contact.phone}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}




