"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  description: string | null
  metadata: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ActivityLogsPage() {
  const { data: session, status } = useSession()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role === "BORROWER") {
      redirect("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchLogs()
    }
  }, [status, session, pagination.page, filters.entityType, filters.action])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (filters.entityType) params.append("entityType", filters.entityType)
      if (filters.action) params.append("action", filters.action)

      const response = await fetch(`/api/activity-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || pagination)
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVE") || action.includes("ACTIVATE")) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
    if (action.includes("REJECT") || action.includes("BLOCK") || action.includes("DELETE")) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    }
    if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("CREATE")) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  const columns = [
    {
      header: "Date & Time",
      accessor: (row: ActivityLog) => (
        <div className="text-sm">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      header: "User",
      accessor: (row: ActivityLog) => (
        <div>
          <div className="font-medium">{row.user.name}</div>
          <div className="text-xs text-muted-foreground">{row.user.email}</div>
          <div className="text-xs text-muted-foreground">{row.user.role}</div>
        </div>
      ),
    },
    {
      header: "Action",
      accessor: (row: ActivityLog) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(row.action)}`}>
          {row.action.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Entity",
      accessor: (row: ActivityLog) => (
        <div>
          <div className="font-medium">{row.entityType}</div>
          {row.entityId && (
            <div className="text-xs text-muted-foreground">ID: {row.entityId}</div>
          )}
        </div>
      ),
    },
    {
      header: "Description",
      accessor: (row: ActivityLog) => (
        <div className="max-w-md">
          <div className="text-sm">{row.description || "-"}</div>
          {row.metadata && (
            <details className="mt-1">
              <summary className="text-xs text-muted-foreground cursor-pointer">View details</summary>
              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
                {JSON.stringify(JSON.parse(row.metadata), null, 2)}
              </pre>
            </details>
          )}
        </div>
      ),
    },
    {
      header: "IP Address",
      accessor: (row: ActivityLog) => row.ipAddress || "-",
      className: "text-sm text-muted-foreground",
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activity Logs</h1>
            <p className="text-muted-foreground">
              Track all administrative actions and system activities
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <Select
              value={filters.entityType || undefined}
              onValueChange={(value) => {
                setFilters({ ...filters, entityType: value })
                setPagination({ ...pagination, page: 1 })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All entity types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BORROWER">Borrower</SelectItem>
                <SelectItem value="LOAN_TYPE">Loan Type</SelectItem>
                <SelectItem value="LOAN_APPLICATION">Loan Application</SelectItem>
                <SelectItem value="LOAN">Loan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Action</label>
            <Select
              value={filters.action || undefined}
              onValueChange={(value) => {
                setFilters({ ...filters, action: value })
                setPagination({ ...pagination, page: 1 })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE_BORROWER">Approve Borrower</SelectItem>
                <SelectItem value="REJECT_BORROWER">Reject Borrower</SelectItem>
                <SelectItem value="BLOCK_BORROWER">Block Borrower</SelectItem>
                <SelectItem value="ACTIVATE_BORROWER">Activate Borrower</SelectItem>
                <SelectItem value="UPDATE_BORROWER">Update Borrower</SelectItem>
                <SelectItem value="CREATE_LOAN_TYPE">Create Loan Type</SelectItem>
                <SelectItem value="UPDATE_LOAN_TYPE">Update Loan Type</SelectItem>
                <SelectItem value="DELETE_LOAN_TYPE">Delete Loan Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(filters.entityType || filters.action) && (
            <Button
              onClick={() => {
                setFilters({ entityType: "", action: "" })
                setPagination({ ...pagination, page: 1 })
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          )}
          <Button onClick={fetchLogs} variant="outline">
            Refresh
          </Button>
        </div>

        <DataTable
          data={logs}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search activity logs..."
          pageSize={pagination.limit}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

