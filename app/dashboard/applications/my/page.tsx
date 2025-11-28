"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, Trash2 } from "lucide-react"

interface Application {
  id: string
  requestedAmount: number
  status: string
  createdAt: Date
  loanLimit: number | null
  rejectionReason: string | null
  loan: { id: string } | null
  loanType: {
    name: string
  }
  purpose: {
    name: string
  }
  paymentDuration: {
    label: string
  }
}

export default function MyApplicationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "BORROWER") {
      redirect("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchApplications()
    }
  }, [status, session])

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/loans/applications")
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      }
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (applicationId: string) => {
    setDeletingApplicationId(applicationId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deletingApplicationId) return

    try {
      const response = await fetch(`/api/loans/applications/${deletingApplicationId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Application deleted successfully",
        })
        setShowDeleteDialog(false)
        setDeletingApplicationId(null)
        fetchApplications() // Refresh the list
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete application",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting application:", error)
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      })
    } finally {
      setDeletingApplicationId(null)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  const columns = [
    {
      header: "Loan Type",
      accessor: (row: Application) => row.loanType.name,
    },
    {
      header: "Amount",
      accessor: (row: Application) => `₱${row.requestedAmount.toLocaleString()}`,
    },
    {
      header: "Purpose",
      accessor: (row: Application) => row.purpose.name,
    },
    {
      header: "Duration",
      accessor: (row: Application) => row.paymentDuration.label,
    },
    {
      header: "Status",
      accessor: (row: Application) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.status === "APPROVED" ? "bg-gradient-to-r from-green-400 to-green-600 text-white" :
          row.status === "REJECTED" ? "bg-gradient-to-r from-red-400 to-red-600 text-white" :
          "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      header: "Applied Date",
      accessor: (row: Application) => new Date(row.createdAt).toLocaleDateString(),
      className: "text-sm text-muted-foreground",
    },
    {
      header: "Actions",
      accessor: (row: Application) => (
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/applications/my/${row.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {row.status === "PENDING" && (
                <DropdownMenuItem
                  onClick={() => handleDelete(row.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Applications</h1>
            <p className="text-muted-foreground">
              View your loan application status
            </p>
          </div>
          <Link href="/dashboard/apply">
            <Button>New Application</Button>
          </Link>
        </div>

        <DataTable
          data={applications}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search applications..."
          pageSize={10}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Application</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this application? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletingApplicationId(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={!deletingApplicationId}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
