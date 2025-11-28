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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, CheckCircle, XCircle } from "lucide-react"

interface Application {
  id: string
  requestedAmount: number
  status: string
  createdAt: Date
  loanLimit: number | null
  rejectionReason: string | null
  loan: { id: string } | null
  user: {
    name: string
    email: string
  }
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

export default function ApplicationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role === "BORROWER") {
      redirect("/dashboard/applications/my")
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

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  const columns = [
    {
      header: "Borrower",
      accessor: (row: Application) => (
        <div>
          <div className="font-medium">{row.user.name}</div>
          <div className="text-sm text-muted-foreground">{row.user.email}</div>
        </div>
      ),
    },
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/dashboard/applications/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
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
            <h1 className="text-3xl font-bold">Loan Applications</h1>
            <p className="text-muted-foreground">
              Review and manage all loan applications
            </p>
          </div>
        </div>

        <DataTable
          data={applications}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search applications..."
          pageSize={10}
        />
      </div>
    </DashboardLayout>
  )
}
