"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table"
import { useToast } from "@/hooks/use-toast"

interface Requirement {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function RequirementsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Requirement | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)

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
      fetchRequirements()
    }
  }, [status, session])

  const fetchRequirements = async () => {
    try {
      const res = await fetch("/api/requirements")
      if (res.ok) {
        const data = await res.json()
        // Flatten the requirements list (remove hierarchical structure)
        const flattenedRequirements: Requirement[] = []
        const flatten = (reqs: any[]) => {
          reqs.forEach((req: any) => {
            flattenedRequirements.push({
              id: req.id,
              name: req.name,
              description: req.description,
              isActive: req.isActive,
              createdAt: req.createdAt,
              updatedAt: req.updatedAt,
            })
            if (req.children && req.children.length > 0) {
              flatten(req.children)
            }
          })
        }
        flatten(data)
        setRequirements(flattenedRequirements)
      }
    } catch (error) {
      console.error("Failed to load requirements", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load requirements",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setName("")
    setDescription("")
    setIsActive(true)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (req: Requirement) => {
    setEditing(req)
    setName(req.name)
    setDescription(req.description || "")
    setIsActive(req.isActive)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
      }
      
      const url = editing ? `/api/requirements/${editing.id}` : "/api/requirements"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      let data: any = {}
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error("Failed to parse response:", parseError)
        data = { error: "Invalid response from server" }
      }
      
      if (!res.ok) {
        const errorMessage = data?.error || data?.details || data?.message || `Failed to save requirement (${res.status})`
        throw new Error(errorMessage)
      }
      toast({ title: editing ? "Requirement updated" : "Requirement added" })
      setDialogOpen(false)
      resetForm()
      fetchRequirements()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to save requirement",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Delete this requirement?")
    if (!confirmDelete) return
    try {
      const res = await fetch(`/api/requirements/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete requirement")
      }
      toast({ title: "Requirement deleted" })
      fetchRequirements()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete requirement",
      })
    }
  }

  const columns = [
    {
      header: "Name",
      accessor: (row: Requirement) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      header: "Description",
      accessor: (row: Requirement) => (
        <span className="text-muted-foreground">{row.description || "-"}</span>
      ),
    },
    {
      header: "Status",
      accessor: (row: Requirement) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (row: Requirement) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(row)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Requirements</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage the list of required documents/information.
            </p>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        </div>

        <DataTable
          data={requirements}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search requirements..."
          pageSize={10}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the requirement details."
                  : "Create a new requirement for loan applications."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Primary Valid ID, SSS ID Card, Payslip"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or instructions"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="isActive" className="text-sm">
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    resetForm()
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
