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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getDiceBearAvatar } from "@/lib/avatar"

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
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all")

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

  // Filter applications based on active tab
  const filteredApplications = applications.filter((app) => {
    if (activeTab === "pending") {
      return app.status === "PENDING"
    }
    if (activeTab === "approved") {
      return app.status === "APPROVED"
    }
    if (activeTab === "rejected") {
      return app.status === "REJECTED"
    }
    return true // "all" tab shows everything
  })

  // Calculate counts for each tab
  const pendingCount = applications.filter(a => a.status === "PENDING").length
  const approvedCount = applications.filter(a => a.status === "APPROVED").length
  const rejectedCount = applications.filter(a => a.status === "REJECTED").length

  const columns = [
    {
      header: "Avatar",
      accessor: (row: Application) => (
        <Avatar className="h-10 w-10">
          <AvatarImage src={getDiceBearAvatar(row.user.email || row.user.name || row.id)} alt={row.user.name} />
          <AvatarFallback>
            {row.user.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      ),
    },
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

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "pending"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "approved"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "rejected"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        <DataTable
          data={filteredApplications}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search applications..."
          pageSize={10}
        />
      </div>
    </DashboardLayout>
  )
}
