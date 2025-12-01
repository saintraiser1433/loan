"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { ApproveBorrowerForm } from "@/components/approve-borrower-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, XCircle, Eye, MoreHorizontal, Pencil, Ban, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditBorrowerForm } from "@/components/edit-borrower-form"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getDiceBearAvatar } from "@/lib/avatar"

interface Borrower {
  id: string
  name: string
  email: string
  phone: string | null
  status: string | null
  creditScore: number
  loanLimit: number
  rejectionReason: string | null
  isActive: boolean
  blockReason: string | null
  createdAt: Date
}

export default function BorrowersPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loading, setLoading] = useState(true)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null)
  const [borrowerDetails, setBorrowerDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [blockReason, setBlockReason] = useState("")
  const [blocking, setBlocking] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "pending" | "blocked">("all")

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
      fetchBorrowers()
    }
  }, [status, session])

  const fetchBorrowers = async () => {
    try {
      const response = await fetch("/api/borrowers")
      if (response.ok) {
        const data = await response.json()
        setBorrowers(data)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch borrowers" }))
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.error || "Failed to fetch borrowers",
        })
        console.error("Error fetching borrowers:", errorData)
      }
    } catch (error) {
      console.error("Error fetching borrowers:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while fetching borrowers",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (borrower: Borrower) => {
    setSelectedBorrower(borrower)
    setApproveDialogOpen(true)
  }

  const handleReject = (borrower: Borrower) => {
    setSelectedBorrower(borrower)
    setRejectDialogOpen(true)
  }

  const handleViewDetails = async (borrower: Borrower) => {
    setSelectedBorrower(borrower)
    setDetailsDialogOpen(true)
    setLoadingDetails(true)
    setBorrowerDetails(null)
    
    try {
      const response = await fetch(`/api/borrowers/${borrower.id}`)
      if (response.ok) {
        const data = await response.json()
        setBorrowerDetails(data)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch borrower details" }))
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.error || "Failed to fetch borrower details",
        })
        setDetailsDialogOpen(false)
      }
    } catch (error) {
      console.error("Error fetching borrower details:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while fetching borrower details",
      })
      setDetailsDialogOpen(false)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (!selectedBorrower || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a rejection reason",
      })
      return
    }

    try {
      const response = await fetch(`/api/borrowers/${selectedBorrower.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Borrower rejected successfully",
        })
        setRejectDialogOpen(false)
        setRejectionReason("")
        setSelectedBorrower(null)
        fetchBorrowers()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to reject borrower",
        })
      }
    } catch (error) {
      console.error("Error rejecting borrower:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred",
      })
    }
  }

  const handleEdit = (borrower: Borrower) => {
    setSelectedBorrower(borrower)
    setEditDialogOpen(true)
  }

  const handleToggleBlock = (borrower: Borrower) => {
    setSelectedBorrower(borrower)
    setBlockReason("")
    setBlockDialogOpen(true)
  }

  const handleBlockConfirm = async () => {
    if (!selectedBorrower) return

    // Require reason when blocking (not when activating)
    if (selectedBorrower.isActive && !blockReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for blocking the borrower",
      })
      return
    }

    setBlocking(true)
    try {
      const response = await fetch(`/api/borrowers/${selectedBorrower.id}/toggle-active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockReason: selectedBorrower.isActive ? blockReason : null
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        toast({
          title: "Success",
          description: updated.isActive 
            ? "Borrower activated successfully" 
            : "Borrower blocked successfully",
        })
        setBlockDialogOpen(false)
        setBlockReason("")
        setSelectedBorrower(null)
        fetchBorrowers()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to update borrower status",
        })
      }
    } catch (error) {
      console.error("Error toggling borrower status:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred",
      })
    } finally {
      setBlocking(false)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  // Filter borrowers based on active tab
  const filteredBorrowers = borrowers.filter((borrower) => {
    if (activeTab === "approved") {
      return borrower.status === "APPROVED" && borrower.isActive
    }
    if (activeTab === "pending") {
      return borrower.status === "PENDING" || borrower.status === null
    }
    if (activeTab === "blocked") {
      return !borrower.isActive
    }
    return true // "all" tab shows everything
  })

  const columns = [
    {
      header: "#",
      accessor: (row: Borrower, index?: number) => {
        // Use the index passed from DataTable (accounts for pagination and filtering)
        // index is 0-based, so add 1 for display
        const rowNumber = typeof index === 'number' ? index + 1 : (filteredBorrowers.findIndex(b => b.id === row.id) + 1 || 1)
        return (
          <div className="text-center font-medium text-muted-foreground">
            {rowNumber}
          </div>
        )
      },
    },
    {
      header: "Avatar",
      accessor: (row: Borrower) => (
        <Avatar className="h-10 w-10">
          <AvatarImage src={getDiceBearAvatar(row.email || row.name || row.id)} alt={row.name} />
          <AvatarFallback>
            {row.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      header: "Name",
      accessor: (row: Borrower) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      header: "Phone",
      accessor: (row: Borrower) => row.phone || "-",
    },
    {
      header: "Status",
      accessor: (row: Borrower) => {
        const status = row.status || "PENDING"
        const isBlocked = !row.isActive
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              status === "APPROVED" ? "bg-gradient-to-r from-green-400 to-green-600 text-white dark:from-green-500 dark:to-green-700" :
              status === "REJECTED" ? "bg-gradient-to-r from-red-400 to-red-600 text-white dark:from-red-500 dark:to-red-700" :
              "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white dark:from-yellow-500 dark:to-yellow-700"
            }`}>
              {status}
            </span>
            {isBlocked && (
              <div className="flex flex-col gap-1">
                <span className="px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-gray-500 to-gray-700 text-white dark:from-gray-600 dark:to-gray-800">
                  BLOCKED
                </span>
                {row.blockReason && (
                  <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.blockReason}>
                    {row.blockReason}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: "Credit Score",
      accessor: (row: Borrower) => row.creditScore > 0 ? `${row.creditScore}` : "-",
    },
    {
      header: "Loan Limit",
      accessor: (row: Borrower) => row.loanLimit > 0 ? `₱${row.loanLimit.toLocaleString()}` : "-",
    },
    {
      header: "Registered",
      accessor: (row: Borrower) => new Date(row.createdAt).toLocaleDateString(),
      className: "text-sm text-muted-foreground",
    },
    {
      header: "Actions",
      accessor: (row: Borrower) => {
        const status = row.status || "PENDING"
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(row)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {status === "PENDING" && (
                <>
                  <DropdownMenuItem onClick={() => handleApprove(row)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleReject(row)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {status === "APPROVED" && (
                <>
                  <DropdownMenuItem onClick={() => handleEdit(row)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Credit Score & Loan Limit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleToggleBlock(row)}
                    className={row.isActive ? "text-destructive" : ""}
                  >
                    {row.isActive ? (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        Block Borrower
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate Borrower
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Borrowers</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage and approve borrower registrations
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
            All ({borrowers.length})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "approved"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Approved ({borrowers.filter(b => b.status === "APPROVED" && b.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "pending"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending ({borrowers.filter(b => b.status === "PENDING" || b.status === null).length})
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "blocked"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Blocked ({borrowers.filter(b => !b.isActive).length})
          </button>
        </div>

        <DataTable
          data={filteredBorrowers}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search borrowers..."
          pageSize={10}
        />

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Approve Borrower</DialogTitle>
              <DialogDescription>
                Set the initial credit score and loan limit for {selectedBorrower?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedBorrower && (
              <ApproveBorrowerForm
                borrowerId={selectedBorrower.id}
                borrowerName={selectedBorrower.name}
                onSuccess={() => {
                  setApproveDialogOpen(false)
                  setSelectedBorrower(null)
                  fetchBorrowers()
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reject Borrower</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting {selectedBorrower?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectDialogOpen(false)
                    setRejectionReason("")
                    setSelectedBorrower(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleRejectSubmit}>
                  Reject Borrower
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Credit Score & Loan Limit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Borrower Information</DialogTitle>
              <DialogDescription>
                Update credit score and loan limit for {selectedBorrower?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedBorrower && (
              <EditBorrowerForm
                borrowerId={selectedBorrower.id}
                borrowerName={selectedBorrower.name}
                currentCreditScore={selectedBorrower.creditScore}
                currentLoanLimit={selectedBorrower.loanLimit}
                onSuccess={() => {
                  setEditDialogOpen(false)
                  setSelectedBorrower(null)
                  fetchBorrowers()
                }}
                onCancel={() => {
                  setEditDialogOpen(false)
                  setSelectedBorrower(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Block/Unblock Dialog */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedBorrower?.isActive ? "Block Borrower" : "Activate Borrower"}
              </DialogTitle>
              <DialogDescription>
                {selectedBorrower?.isActive 
                  ? `Please provide a reason for blocking ${selectedBorrower?.name}. Blocked borrowers cannot access the system.`
                  : `Are you sure you want to activate ${selectedBorrower?.name}? This will restore their access to the system.`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedBorrower?.isActive && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Block Reason *
                  </label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Enter reason for blocking this borrower..."
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBlockDialogOpen(false)
                    setBlockReason("")
                    setSelectedBorrower(null)
                  }}
                  disabled={blocking}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBlockConfirm}
                  disabled={blocking}
                  variant={selectedBorrower?.isActive ? "destructive" : "default"}
                >
                  {blocking 
                    ? "Processing..." 
                    : selectedBorrower?.isActive 
                      ? "Block Borrower" 
                      : "Activate Borrower"
                  }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Borrower Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedBorrower?.name}
              </DialogDescription>
            </DialogHeader>
            {loadingDetails ? (
              <div className="py-8 text-center">Loading details...</div>
            ) : borrowerDetails ? (
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Full Name</div>
                      <div className="font-medium">{borrowerDetails.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium">{borrowerDetails.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium">{borrowerDetails.phone || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Date of Birth</div>
                      <div className="font-medium">
                        {borrowerDetails.dateOfBirth 
                          ? new Date(borrowerDetails.dateOfBirth).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Place of Birth</div>
                      <div className="font-medium">{borrowerDetails.placeOfBirth || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Nationality</div>
                      <div className="font-medium">{borrowerDetails.nationality || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Father's Name</div>
                      <div className="font-medium">{borrowerDetails.fathersName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Mother's Name</div>
                      <div className="font-medium">{borrowerDetails.mothersName || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Address</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Street Address</div>
                      <div className="font-medium">{borrowerDetails.address || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Block</div>
                      <div className="font-medium">{borrowerDetails.block || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Lot</div>
                      <div className="font-medium">{borrowerDetails.lot || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Barangay</div>
                      <div className="font-medium">{borrowerDetails.barangay || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">City</div>
                      <div className="font-medium">{borrowerDetails.city || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Province</div>
                      <div className="font-medium">{borrowerDetails.province || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">ZIP Code</div>
                      <div className="font-medium">{borrowerDetails.zipCode || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Occupational Information */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Occupational Information</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Position/Role</div>
                      <div className="font-medium">{borrowerDetails.position || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Company Name</div>
                      <div className="font-medium">{borrowerDetails.companyName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Monthly Salary Range</div>
                      <div className="font-medium">
                        {borrowerDetails.monthlySalaryMin && borrowerDetails.monthlySalaryMax
                          ? `₱${borrowerDetails.monthlySalaryMin.toLocaleString()} - ₱${borrowerDetails.monthlySalaryMax.toLocaleString()}`
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Years of Employment</div>
                      <div className="font-medium">
                        {borrowerDetails.yearsOfEmployment ? `${borrowerDetails.yearsOfEmployment} years` : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Account Status</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          borrowerDetails.status === "APPROVED" ? "bg-gradient-to-r from-green-400 to-green-600 text-white dark:from-green-500 dark:to-green-700" :
                          borrowerDetails.status === "REJECTED" ? "bg-gradient-to-r from-red-400 to-red-600 text-white dark:from-red-500 dark:to-red-700" :
                          "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white dark:from-yellow-500 dark:to-yellow-700"
                        }`}>
                          {borrowerDetails.status || "PENDING"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Credit Score</div>
                      <div className="font-medium">{borrowerDetails.creditScore}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Loan Limit</div>
                      <div className="font-medium">₱{borrowerDetails.loanLimit.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Registered Date</div>
                      <div className="font-medium">
                        {new Date(borrowerDetails.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {borrowerDetails.approvedAt && (
                      <div>
                        <div className="text-sm text-muted-foreground">Approved Date</div>
                        <div className="font-medium">
                          {new Date(borrowerDetails.approvedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {borrowerDetails.rejectionReason && (
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">Rejection Reason</div>
                        <div className="font-medium text-red-600">{borrowerDetails.rejectionReason}</div>
                      </div>
                    )}
                    {!borrowerDetails.isActive && borrowerDetails.blockReason && (
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">Block Reason</div>
                        <div className="font-medium text-orange-600">{borrowerDetails.blockReason}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ID Documents */}
                {(borrowerDetails.primaryIdUrl || borrowerDetails.secondaryIdUrl || borrowerDetails.selfieWithPrimaryIdUrl || borrowerDetails.selfieWithSecondaryIdUrl) && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-lg font-semibold">Identity Documents</h3>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      {borrowerDetails.primaryIdUrl && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Primary ID</div>
                          <div className="relative group">
                            <a
                              href={borrowerDetails.primaryIdUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={borrowerDetails.primaryIdUrl}
                                alt="Primary ID"
                                className="w-full h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `<a href="${borrowerDetails.primaryIdUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">View Document</a>`
                                  }
                                }}
                              />
                            </a>
                          </div>
                        </div>
                      )}
                      {borrowerDetails.secondaryIdUrl && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Secondary ID</div>
                          <div className="relative group">
                            <a
                              href={borrowerDetails.secondaryIdUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={borrowerDetails.secondaryIdUrl}
                                alt="Secondary ID"
                                className="w-full h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `<a href="${borrowerDetails.secondaryIdUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">View Document</a>`
                                  }
                                }}
                              />
                            </a>
                          </div>
                        </div>
                      )}
                      {borrowerDetails.selfieWithPrimaryIdUrl && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Selfie with Primary ID</div>
                          <div className="relative group">
                            <a
                              href={borrowerDetails.selfieWithPrimaryIdUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={borrowerDetails.selfieWithPrimaryIdUrl}
                                alt="Selfie with Primary ID"
                                className="w-full h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `<a href="${borrowerDetails.selfieWithPrimaryIdUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">View Document</a>`
                                  }
                                }}
                              />
                            </a>
                          </div>
                        </div>
                      )}
                      {borrowerDetails.selfieWithSecondaryIdUrl && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Selfie with Secondary ID</div>
                          <div className="relative group">
                            <a
                              href={borrowerDetails.selfieWithSecondaryIdUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={borrowerDetails.selfieWithSecondaryIdUrl}
                                alt="Selfie with Secondary ID"
                                className="w-full h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `<a href="${borrowerDetails.selfieWithSecondaryIdUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">View Document</a>`
                                  }
                                }}
                              />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Persons */}
                {borrowerDetails.contactPersons && borrowerDetails.contactPersons.length > 0 && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-lg font-semibold">Contact Persons</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {borrowerDetails.contactPersons.map((contact: any) => (
                        <div key={contact.id} className="p-3 rounded border">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                          <div className="text-sm text-muted-foreground">{contact.phone}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Applications */}
                {borrowerDetails.applications && borrowerDetails.applications.length > 0 && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-lg font-semibold">Recent Applications</h3>
                    <div className="space-y-2">
                      {borrowerDetails.applications.map((app: any) => (
                        <div key={app.id} className="p-3 rounded border flex justify-between items-center">
                          <div>
                            <div className="font-medium">₱{app.requestedAmount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">{app.status}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Loans */}
                {borrowerDetails.loans && borrowerDetails.loans.length > 0 && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-lg font-semibold">Recent Loans</h3>
                    <div className="space-y-2">
                      {borrowerDetails.loans.map((loan: any) => (
                        <div key={loan.id} className="p-3 rounded border flex justify-between items-center">
                          <div>
                            <div className="font-medium">₱{loan.principalAmount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">{loan.status}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(loan.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No details available
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
