"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

interface PaymentMethod {
  id: string
  name: string
  accountNumber: string
  accountName: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export default function PaymentMethodsPage() {
  const { data: session, status } = useSession()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null)
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<PaymentMethod | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    accountNumber: "",
    accountName: "",
    isActive: true,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
    if (status === "authenticated" && session?.user?.role === "BORROWER") {
      redirect("/dashboard")
    }
    if (status === "authenticated" && (session?.user?.role === "ADMIN" || session?.user?.role === "LOAN_OFFICER")) {
      fetchPaymentMethods()
    }
  }, [status, session])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/payment-methods")
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data.paymentMethods || [])
      } else {
        console.error("Failed to fetch payment methods:", response.status)
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      setEditingPaymentMethod(null)
      setFormData({
        name: "",
        accountNumber: "",
        accountName: "",
        isActive: true,
      })
    }
  }

  const handleEditClick = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod)
    setFormData({
      name: paymentMethod.name,
      accountNumber: paymentMethod.accountNumber,
      accountName: paymentMethod.accountName,
      isActive: paymentMethod.isActive,
    })
    setOpen(true)
  }

  const handleDeleteClick = (paymentMethod: PaymentMethod) => {
    setDeletingPaymentMethod(paymentMethod)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPaymentMethod) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/payment-methods/${deletingPaymentMethod.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment method deleted successfully",
        })
        setDeletingPaymentMethod(null)
        fetchPaymentMethods()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete payment method",
        })
      }
    } catch (error) {
      console.error("Error deleting payment method:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while deleting the payment method",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingPaymentMethod
        ? `/api/payment-methods/${editingPaymentMethod.id}`
        : "/api/payment-methods"
      const method = editingPaymentMethod ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: editingPaymentMethod
            ? "Payment method updated successfully"
            : "Payment method created successfully",
        })
        setOpen(false)
        setEditingPaymentMethod(null)
        setFormData({
          name: "",
          accountNumber: "",
          accountName: "",
          isActive: true,
        })
        fetchPaymentMethods()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to save payment method",
        })
      }
    } catch (error) {
      console.error("Error saving payment method:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while saving the payment method",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      header: "Name",
      accessor: (row: PaymentMethod) => row.name,
    },
    {
      header: "Account Number",
      accessor: (row: PaymentMethod) => row.accountNumber,
    },
    {
      header: "Account Name",
      accessor: (row: PaymentMethod) => row.accountName,
    },
    {
      header: "Status",
      accessor: (row: PaymentMethod) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row: PaymentMethod) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditClick(row)}>
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground">
              Manage payment methods for loan payments
            </p>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPaymentMethod ? "Edit Payment Method" : "Add Payment Method"}
                </DialogTitle>
                <DialogDescription>
                  {editingPaymentMethod
                    ? "Update the payment method details"
                    : "Add a new payment method for loan payments"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Payment Method Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., GCash, PayMaya, Bank Transfer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, accountNumber: e.target.value })
                      }
                      placeholder="Enter account number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name *</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) =>
                        setFormData({ ...formData, accountName: e.target.value })
                      }
                      placeholder="Enter account holder name"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked === true })
                      }
                    />
                    <Label
                      htmlFor="isActive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Active
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? "Saving..."
                      : editingPaymentMethod
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable data={paymentMethods} columns={columns} />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deletingPaymentMethod !== null}
          onOpenChange={(open) => !open && setDeletingPaymentMethod(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Payment Method</DialogTitle>
              <DialogDescription asChild>
                <div>
                  <p>
                    Are you sure you want to delete the payment method{" "}
                    <strong>{deletingPaymentMethod?.name}</strong>?
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This action cannot be undone. The payment method will be
                    permanently deleted.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingPaymentMethod(null)}
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
