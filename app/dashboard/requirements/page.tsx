"use client"

import { useEffect, useState } from "react"
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
import { useToast } from "@/hooks/use-toast"

interface Requirement {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  parentId?: string | null
  children?: Requirement[]
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
  const [parentId, setParentId] = useState<string | null>(null)

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
    setParentId(null)
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
    setParentId(req.parentId || null)
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
        parentId: parentId || null,
      }
      const url = editing ? `/api/requirements/${editing.id}` : "/api/requirements"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to save requirement")
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
      setRequirements((prev) => prev.filter((r) => r.id !== id))
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete requirement",
      })
    }
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  const topLevel = requirements.filter((r) => !r.parentId)

  const renderRows = (items: Requirement[], depth = 0) =>
    items.map((req) => (
      <tr key={req.id} className="border-b last:border-b-0">
        <td className="px-4 py-3 font-medium">
          <span className={depth > 0 ? "pl-4 text-sm" : ""}>
            {depth > 0 ? "— " : ""}
            {req.name}
          </span>
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
          <div className="flex justify-end gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(req)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setParentId(req.id)
                setEditing(null)
                setName("")
                setDescription("")
                setIsActive(true)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Child
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
    )).flatMap((row, idx, arr) => {
      const children = (items[idx].children || []).map((c) => ({ ...c, children: c.children || [] }))
      return [row, ...(children.length ? renderRows(children, depth + 1) : [])]
    })

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
                  renderRows(topLevel)
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
                  : "Create a requirement that will be shown as part of the required documents/information list."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Primary ID, Proof of Billing"
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
              <div>
                <label className="mb-1 block text-sm font-medium">Parent (optional)</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={parentId || ""}
                  onChange={(e) => setParentId(e.target.value || null)}
                >
                  <option value="">No parent (top-level)</option>
                  {requirements
                    .filter((r) => !r.parentId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
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

