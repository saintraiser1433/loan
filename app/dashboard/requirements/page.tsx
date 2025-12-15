"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Requirement {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  parentId?: string | null
  parent?: Requirement | null
  children?: Requirement[]
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
  const [parentId, setParentId] = useState<string>("")
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

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
        setRequirements(data)
        // Auto-expand all parents
        const parentIds = data.filter((r: Requirement) => r.children && r.children.length > 0).map((r: Requirement) => r.id)
        setExpandedParents(new Set(parentIds))
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
    setParentId("")
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
    setParentId(req.parentId || "")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" })
      return
    }
    setSaving(true)
    try {
      // Normalize parentId: empty string, "__none__", or falsy should be null
      const normalizedParentId = parentId && parentId !== "__none__" && parentId.trim() !== "" 
        ? parentId.trim() 
        : null

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
        parentId: normalizedParentId,
      }
      
      console.log("Sending payload:", payload) // Debug log
      
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
        console.error("API Error:", data) // Debug log
        const errorMessage = data?.error || data?.details || data?.message || `Failed to save requirement (${res.status})`
        throw new Error(errorMessage)
      }
      toast({ title: editing ? "Requirement updated" : "Requirement added" })
      setDialogOpen(false)
      resetForm()
      fetchRequirements()
    } catch (error: any) {
      console.error("Save error:", error) // Debug log
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

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Get parent requirements (requirements without a parent)
  const parentRequirements = requirements.filter((r) => !r.parentId)
  // Get all requirements that can be parents (exclude the one being edited and its children)
  const getAvailableParents = () => {
    if (!editing) return parentRequirements
    // Exclude the requirement being edited and all its descendants
    const excludeIds = new Set([editing.id])
    const collectDescendants = (reqId: string) => {
      requirements.forEach((r) => {
        if (r.parentId === reqId) {
          excludeIds.add(r.id)
          collectDescendants(r.id)
        }
      })
    }
    collectDescendants(editing.id)
    return parentRequirements.filter((r) => !excludeIds.has(r.id))
  }

  const renderRequirementRow = (req: Requirement, level: number = 0): React.ReactNode[] => {
    const hasChildren = req.children && req.children.length > 0
    const isExpanded = expandedParents.has(req.id)
    const indent = level * 24

    const rows: React.ReactNode[] = [
      <tr key={req.id} className="border-b last:border-b-0">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(req.id)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-medium">{req.name}</span>
            {hasChildren && (
              <Badge variant="outline" className="ml-2 text-xs">
                {req.children.length} {req.children.length === 1 ? "child" : "children"}
              </Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {req.description || "-"}
        </td>
        <td className="px-4 py-3">
          <Badge variant={req.isActive ? "default" : "secondary"}>
            {req.isActive ? "Active" : "Inactive"}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(req)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(req.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </td>
      </tr>
    ]

    // Add children rows if expanded
    if (hasChildren && isExpanded && req.children) {
      req.children.forEach((child) => {
        rows.push(...renderRequirementRow(child, level + 1))
      })
    }

    return rows
  }

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
              Manage the list of required documents/information. Create parent requirements with child requirements.
            </p>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>
                      No requirements yet.
                    </td>
                  </tr>
                ) : (
                  parentRequirements.flatMap((req) => renderRequirementRow(req, 0))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the requirement details."
                  : "Create a requirement. Leave 'Parent' empty to create a parent requirement, or select a parent to create a child requirement."}
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
                <label className="mb-1 block text-sm font-medium">Parent (Optional)</label>
                <Select 
                  value={parentId || "__none__"} 
                  onValueChange={(value) => setParentId(value === "__none__" ? "" : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None (Create as parent requirement)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (Create as parent requirement)</SelectItem>
                    {getAvailableParents().map((req) => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parentId
                    ? "This will be created as a child requirement."
                    : "This will be created as a parent requirement (can have children)."}
                </p>
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
