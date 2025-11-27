"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { LoanTypeForm } from "@/components/loan-type-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface LoanType {
  id: string
  name: string
  description: string | null
  minAmount: number
  maxAmount: number
  creditScoreRequired: number
  creditScoreOnCompletion?: number
  limitIncreaseOnCompletion?: number
  latePaymentPenaltyPerDay?: number
  allowedMonthsToPay: string | null // JSON array string
  interestRatesByMonth: string | null // JSON object string
  createdAt: Date
  updatedAt: Date
}

export default function LoanTypesPage() {
  const { data: session, status } = useSession()
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingLoanType, setEditingLoanType] = useState<LoanType | null>(null)
  const [deletingLoanType, setDeletingLoanType] = useState<LoanType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
    if (status === "authenticated" && session?.user?.role === "BORROWER") {
      redirect("/dashboard")
    }
    if (status === "authenticated") {
      fetchLoanTypes()
    }
  }, [status, session])

  const fetchLoanTypes = async () => {
    try {
      const response = await fetch("/api/loans/types")
      if (response.ok) {
        const data = await response.json()
        setLoanTypes(data.loanTypes || [])
      } else {
        console.error("Failed to fetch loan types:", response.status)
      }
    } catch (error) {
      console.error("Error fetching loan types:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (loanType: LoanType) => {
    setDeletingLoanType(loanType)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingLoanType) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/loans/types/${deletingLoanType.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Loan type deleted successfully",
        })
        setDeletingLoanType(null)
        fetchLoanTypes()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete loan type",
        })
      }
    } catch (error) {
      console.error("Error deleting loan type:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while deleting the loan type",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  const columns = [
    {
      header: "Name",
      accessor: (row: LoanType) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      header: "Amount Range",
      accessor: (row: LoanType) => 
        `₱${row.minAmount.toLocaleString()} - ₱${row.maxAmount.toLocaleString()}`,
    },
    {
      header: "Credit Score Required",
      accessor: (row: LoanType) => `${row.creditScoreRequired}%`,
    },
    {
      header: "Created",
      accessor: (row: LoanType) => new Date(row.createdAt).toLocaleDateString(),
      className: "text-sm text-muted-foreground",
    },
    {
      header: "Actions",
      accessor: (row: LoanType) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingLoanType(row)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Loan Types</h1>
            <p className="text-muted-foreground">
              Manage loan types and interest rates
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Add Loan Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Loan Type</DialogTitle>
                <DialogDescription>
                  Create a new loan type with interest rate and amount range
                </DialogDescription>
              </DialogHeader>
              <LoanTypeForm 
                loanType={editingLoanType}
                onSuccess={() => { 
                  setOpen(false)
                  setEditingLoanType(null)
                  fetchLoanTypes()
                }} 
              />
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingLoanType} onOpenChange={(open) => !open && setEditingLoanType(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Loan Type</DialogTitle>
                <DialogDescription>
                  Update the loan type information
                </DialogDescription>
              </DialogHeader>
              <LoanTypeForm 
                loanType={editingLoanType}
                onSuccess={() => { 
                  setEditingLoanType(null)
                  fetchLoanTypes()
                }} 
              />
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deletingLoanType} onOpenChange={(open) => !open && !deleting && setDeletingLoanType(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Loan Type</DialogTitle>
                <DialogDescription asChild>
                  <div>
                    <p>
                      Are you sure you want to delete <strong>&quot;{deletingLoanType?.name}&quot;</strong>? This action cannot be undone.
                    </p>
                    {deletingLoanType && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        This will permanently remove the loan type from the system.
                      </p>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeletingLoanType(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          data={loanTypes}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search loan types..."
          pageSize={10}
        />
      </div>
    </DashboardLayout>
  )
}
