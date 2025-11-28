"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { User, Save } from "lucide-react"
import { validatePhilippinePhone, formatPhoneInput } from "@/lib/phone-validation"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phoneError, setPhoneError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    middleName: "",
    phone: "",
    email: "",
    address: "",
    block: "",
    lot: "",
    barangay: "",
    city: "",
    province: "",
    zipCode: "",
    dateOfBirth: "",
    placeOfBirth: "",
    nationality: "Filipino",
    fathersName: "",
    mothersName: "",
    position: "",
    companyName: "",
    monthlySalaryMin: "",
    monthlySalaryMax: "",
    yearsOfEmployment: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
    if (status === "authenticated") {
      fetchProfile()
    }
  }, [status, session])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/users/profile")
      if (response.ok) {
        const data = await response.json()
        const user = data.user
        setFormData({
          name: user.name || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          middleName: user.middleName || "",
          phone: user.phone || "",
          email: user.email || "",
          address: user.address || "",
          block: user.block || "",
          lot: user.lot || "",
          barangay: user.barangay || "",
          city: user.city || "",
          province: user.province || "",
          zipCode: user.zipCode || "",
          dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
          placeOfBirth: user.placeOfBirth || "",
          nationality: user.nationality || "Filipino",
          fathersName: user.fathersName || "",
          mothersName: user.mothersName || "",
          position: user.position || "",
          companyName: user.companyName || "",
          monthlySalaryMin: user.monthlySalaryMin?.toString() || "",
          monthlySalaryMax: user.monthlySalaryMax?.toString() || "",
          yearsOfEmployment: user.yearsOfEmployment?.toString() || "",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile information",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value)
    setFormData({ ...formData, phone: formatted })
    
    if (formatted) {
      const validation = validatePhilippinePhone(formatted)
      if (!validation.isValid) {
        setPhoneError(validation.error || "Invalid phone number")
      } else {
        setPhoneError("")
        if (validation.formatted !== formatted) {
          setFormData({ ...formData, phone: validation.formatted })
        }
      }
    } else {
      setPhoneError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError("")

    // Validate phone number
    if (formData.phone) {
      const phoneValidation = validatePhilippinePhone(formData.phone)
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || "Invalid phone number")
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: phoneValidation.error || "Please enter a valid Philippine phone number",
        })
        return
      }
      setFormData({ ...formData, phone: phoneValidation.formatted })
    }

    setSaving(true)
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      })

      // Reload profile to get updated data
      await fetchProfile()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update profile",
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Update your personal information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Number <span className="text-xs text-muted-foreground">(Philippine format)</span></Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onBlur={(e) => {
                    if (e.target.value) {
                      const validation = validatePhilippinePhone(e.target.value)
                      if (validation.isValid) {
                        setFormData({ ...formData, phone: validation.formatted })
                        setPhoneError("")
                      } else {
                        setPhoneError(validation.error || "Invalid phone number")
                      }
                    }
                  }}
                  placeholder="+639123456789 or 09123456789"
                  className={phoneError ? "border-destructive" : ""}
                />
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
                {!phoneError && formData.phone && (
                  <p className="text-xs text-muted-foreground">
                    Format: +639XXXXXXXXX (mobile) or +63XXYYYYYYYY (landline)
                  </p>
                )}
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Place of Birth</Label>
                  <Input
                    value={formData.placeOfBirth}
                    onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Father's Name</Label>
                  <Input
                    value={formData.fathersName}
                    onChange={(e) => setFormData({ ...formData, fathersName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Name</Label>
                  <Input
                    value={formData.mothersName}
                    onChange={(e) => setFormData({ ...formData, mothersName: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Your complete address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Block</Label>
                  <Input
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lot</Label>
                  <Input
                    value={formData.lot}
                    onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Barangay</Label>
                  <Input
                    value={formData.barangay}
                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zip Code</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Occupational Information */}
          <Card>
            <CardHeader>
              <CardTitle>Occupational Information</CardTitle>
              <CardDescription>Your employment and income details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Monthly Salary (Min)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlySalaryMin}
                    onChange={(e) => setFormData({ ...formData, monthlySalaryMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Salary (Max)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlySalaryMax}
                    onChange={(e) => setFormData({ ...formData, monthlySalaryMax: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years of Employment</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.yearsOfEmployment}
                    onChange={(e) => setFormData({ ...formData, yearsOfEmployment: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={fetchProfile}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

