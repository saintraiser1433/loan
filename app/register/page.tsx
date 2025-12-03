"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { validatePhilippinePhone, formatPhoneInput } from "@/lib/phone-validation"

export default function RegisterPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [placeOfBirth, setPlaceOfBirth] = useState("")
  const [nationality, setNationality] = useState("Filipino")
  const [fathersName, setFathersName] = useState("")
  const [mothersName, setMothersName] = useState("")
  
  // Complete Address
  const [address, setAddress] = useState("")
  const [block, setBlock] = useState("")
  const [lot, setLot] = useState("")
  const [barangay, setBarangay] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("")
  const [zipCode, setZipCode] = useState("")
  
  // Occupational Information
  const [position, setPosition] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [monthlySalaryMin, setMonthlySalaryMin] = useState("")
  const [monthlySalaryMax, setMonthlySalaryMax] = useState("")
  const [sourceOfIncome, setSourceOfIncome] = useState("")
  const [yearsOfEmployment, setYearsOfEmployment] = useState("")
  const [maritalStatus, setMaritalStatus] = useState<"SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED">("SINGLE")
  
  // Documents
  const [idCategory, setIdCategory] = useState<"PRIMARY" | "SECONDARY">("PRIMARY")
  const [primaryIdType, setPrimaryIdType] = useState("")
  const [secondaryIdType, setSecondaryIdType] = useState("")
  const [primaryIdUrl, setPrimaryIdUrl] = useState("")
  const [secondaryIdUrl, setSecondaryIdUrl] = useState("")
  const [selfieWithPrimaryIdUrl, setSelfieWithPrimaryIdUrl] = useState("")
  const [selfieWithSecondaryIdUrl, setSelfieWithSecondaryIdUrl] = useState("")
  const [payslipUrl, setPayslipUrl] = useState("")
  const [billingReceiptUrl, setBillingReceiptUrl] = useState("")

  // Contact Persons
  const [contactPersons, setContactPersons] = useState([
    { name: "", relationship: "", phone: "" },
    { name: "", relationship: "", phone: "" },
    { name: "", relationship: "", phone: "" },
  ])
  
  const [error, setError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { toast } = useToast()

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value)
    setPhone(formatted)
    
    // Validate on change
    if (formatted) {
      const validation = validatePhilippinePhone(formatted)
      if (!validation.isValid) {
        setPhoneError(validation.error || "Invalid phone number")
      } else {
        setPhoneError("")
        // Auto-format to standard format
        if (validation.formatted !== formatted) {
          setPhone(validation.formatted)
        }
      }
    } else {
      setPhoneError("")
    }
  }

  const handleContactPersonChange = (index: number, field: "name" | "relationship" | "phone", value: string) => {
    setContactPersons((prev) => {
      const next = [...prev]

      if (field === "phone") {
        const formatted = formatPhoneInput(value)
        next[index] = { ...next[index], phone: formatted }

        if (formatted) {
          const validation = validatePhilippinePhone(formatted)
          if (!validation.isValid) {
            // Just show error toast; keep inline validation minimal for registration
            setPhoneError(validation.error || "Invalid contact phone number")
          } else {
            setPhoneError("")
            if (validation.formatted !== formatted) {
              next[index] = { ...next[index], phone: validation.formatted }
            }
          }
        } else {
          setPhoneError("")
        }
      } else {
        next[index] = { ...next[index], [field]: value }
      }

      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setPhoneError("")

    // Validate phone number
    if (phone) {
      const phoneValidation = validatePhilippinePhone(phone)
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || "Invalid phone number")
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: phoneValidation.error || "Please enter a valid Philippine phone number",
        })
        return
      }
      // Update phone to formatted version
      setPhone(phoneValidation.formatted)
    }

    // Validate required fields
    // Require basic info, one ID (based on chosen category), matching selfie, payslip, and bill
    const hasPrimaryPair = !!primaryIdUrl && !!selfieWithPrimaryIdUrl
    const hasSecondaryPair = !!secondaryIdUrl && !!selfieWithSecondaryIdUrl

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !phone ||
      !idCategory ||
      (!primaryIdType && idCategory === "PRIMARY") ||
      (!secondaryIdType && idCategory === "SECONDARY") ||
      (!hasPrimaryPair && !hasSecondaryPair) ||
      !payslipUrl ||
      !billingReceiptUrl
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields, upload your chosen ID and selfie, payslip, and electric/water bill.",
      })
      return
    }

    // Validate contact persons (3 required)
    for (let i = 0; i < contactPersons.length; i++) {
      const cp = contactPersons[i]
      if (!cp.name || !cp.relationship || !cp.phone) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please provide name, relationship, and phone for all 3 contact persons.",
        })
        return
      }
      const validation = validatePhilippinePhone(cp.phone)
      if (!validation.isValid) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Contact person ${i + 1} has invalid phone number: ${validation.error || "Invalid format"}`,
        })
        return
      }
      // Normalize phone
      contactPersons[i].phone = validation.formatted
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  const confirmRegistration = async () => {
    setShowConfirmDialog(false)
    setLoading(true)
    setError("")

    // Construct full name
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ")

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          firstName,
          lastName,
          middleName,
          phone,
          // Complete Address
          address,
          block,
          lot,
          barangay,
          city,
          province,
          zipCode,
          // Personal Information
          dateOfBirth: dateOfBirth || null,
          placeOfBirth,
          nationality,
          fathersName,
          mothersName,
          // Occupational Information
          position,
          companyName,
          monthlySalaryMin: monthlySalaryMin ? parseFloat(monthlySalaryMin) : null,
          monthlySalaryMax: monthlySalaryMax ? parseFloat(monthlySalaryMax) : null,
          yearsOfEmployment: yearsOfEmployment ? parseFloat(yearsOfEmployment) : null,
          maritalStatus,
          contactPersons,
          payslipUrl,
          billingReceiptUrl,
          // Always send all ID fields; backend will accept whichever pair is filled
          primaryIdUrl,
          secondaryIdUrl,
          selfieWithPrimaryIdUrl,
          selfieWithSecondaryIdUrl,
          role: "BORROWER",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Registration Successful!",
          description: "Your account has been created. Please wait for admin approval before logging in.",
        })
        setTimeout(() => {
          router.push("/login?registered=true")
        }, 2000)
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: data.error || "An error occurred during registration. Please try again.",
        })
        setError(data.error || "Registration failed")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
      })
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Create Borrower Account</CardTitle>
            <CardDescription>
              Enter your information to register. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name *
                    </label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="middleName" className="text-sm font-medium">
                      Middle Name
                    </label>
                    <Input
                      id="middleName"
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name *
                    </label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="text-sm font-medium">
                      Email *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone Number * <span className="text-xs text-muted-foreground">(Philippine format)</span>
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const validation = validatePhilippinePhone(e.target.value)
                          if (validation.isValid) {
                            setPhone(validation.formatted)
                            setPhoneError("")
                          } else {
                            setPhoneError(validation.error || "Invalid phone number")
                          }
                        }
                      }}
                      required
                      placeholder="+639123456789 or 09123456789"
                      className={`mt-1 ${phoneError ? "border-destructive" : ""}`}
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive mt-1">{phoneError}</p>
                    )}
                    {!phoneError && phone && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: +639XXXXXXXXX (mobile) or +63XXYYYYYYYY (landline)
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="dateOfBirth" className="text-sm font-medium">
                      Date of Birth
                    </label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="placeOfBirth" className="text-sm font-medium">
                      Place of Birth
                    </label>
                    <Input
                      id="placeOfBirth"
                      type="text"
                      value={placeOfBirth}
                      onChange={(e) => setPlaceOfBirth(e.target.value)}
                      placeholder="City, Province"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="nationality" className="text-sm font-medium">
                      Nationality
                    </label>
                    <Input
                      id="nationality"
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="fathersName" className="text-sm font-medium">
                      Father&apos;s Name
                    </label>
                    <Input
                      id="fathersName"
                      type="text"
                      value={fathersName}
                      onChange={(e) => setFathersName(e.target.value)}
                      placeholder="Full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="mothersName" className="text-sm font-medium">
                      Mother&apos;s Name
                    </label>
                    <Input
                      id="mothersName"
                      type="text"
                      value={mothersName}
                      onChange={(e) => setMothersName(e.target.value)}
                      placeholder="Full name"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="maritalStatus" className="text-sm font-medium">
                    Marital Status
                  </label>
                  <select
                    id="maritalStatus"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as any)}
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="WIDOWED">Widowed</option>
                    <option value="DIVORCED">Divorced</option>
                  </select>
                </div>
              </div>

              {/* Complete Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Complete Address</h3>
                <div>
                  <label htmlFor="address" className="text-sm font-medium">
                    Street Address
                  </label>
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street name and number"
                    className="mt-1"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="block" className="text-sm font-medium">
                      Block
                    </label>
                    <Input
                      id="block"
                      type="text"
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      placeholder="Block number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="lot" className="text-sm font-medium">
                      Lot
                    </label>
                    <Input
                      id="lot"
                      type="text"
                      value={lot}
                      onChange={(e) => setLot(e.target.value)}
                      placeholder="Lot number"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="barangay" className="text-sm font-medium">
                    Barangay
                  </label>
                  <Input
                    id="barangay"
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    placeholder="Barangay name"
                    className="mt-1"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="text-sm font-medium">
                      City/Municipality *
                    </label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City or Municipality"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="province" className="text-sm font-medium">
                      Province *
                    </label>
                    <Input
                      id="province"
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Province"
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="zipCode" className="text-sm font-medium">
                    ZIP Code
                  </label>
                  <Input
                    id="zipCode"
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="e.g., 1000"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Occupational Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Occupational Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="position" className="text-sm font-medium">
                      Position/Role
                    </label>
                    <Input
                      id="position"
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g., Software Engineer, Manager"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="companyName" className="text-sm font-medium">
                      Company Name
                    </label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company or employer name"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="sourceOfIncome" className="text-sm font-medium">
                    Source of Income
                  </label>
                  <select
                    id="sourceOfIncome"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={sourceOfIncome}
                    onChange={(e) => setSourceOfIncome(e.target.value)}
                  >
                    <option value="">Select source</option>
                    <option value="Employment">Employment</option>
                    <option value="Business">Business</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="monthlySalaryMin" className="text-sm font-medium">
                      Monthly Salary Range (Minimum) (₱)
                    </label>
                    <Input
                      id="monthlySalaryMin"
                      type="number"
                      step="1"
                      min="0"
                      value={monthlySalaryMin}
                      onChange={(e) => setMonthlySalaryMin(e.target.value)}
                      placeholder="e.g., 20000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="monthlySalaryMax" className="text-sm font-medium">
                      Monthly Salary Range (Maximum) (₱)
                    </label>
                    <Input
                      id="monthlySalaryMax"
                      type="number"
                      step="1"
                      min="0"
                      value={monthlySalaryMax}
                      onChange={(e) => setMonthlySalaryMax(e.target.value)}
                      placeholder="e.g., 50000"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="yearsOfEmployment" className="text-sm font-medium">
                    Years of Employment
                  </label>
                  <Input
                    id="yearsOfEmployment"
                    type="number"
                    step="0.5"
                    min="0"
                    value={yearsOfEmployment}
                    onChange={(e) => setYearsOfEmployment(e.target.value)}
                    placeholder="e.g., 2.5"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Contact Persons */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Persons (3 required)</h3>
                {contactPersons.map((contact, index) => (
                  <div key={index} className="grid gap-4 rounded border p-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name *</label>
                      <Input
                        value={contact.name}
                        onChange={(e) => handleContactPersonChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Relationship *</label>
                      <select
                        value={contact.relationship}
                        onChange={(e) =>
                          handleContactPersonChange(index, "relationship", e.target.value)
                        }
                        className="w-full rounded-md border bg-background text-foreground px-3 py-2"
                      >
                        <option value="">Select relationship</option>
                        <option value="Parent">Parent</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                        <option value="Relative">Relative</option>
                        <option value="Friend">Friend</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Employer">Employer</option>
                        <option value="Neighbor">Neighbor</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Phone * <span className="text-xs text-muted-foreground">(Philippine format)</span>
                      </label>
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleContactPersonChange(index, "phone", e.target.value)}
                        placeholder="+639123456789 or 09123456789"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* ID Documents */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Identity & Income Documents</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Choose ID category */}
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">ID Category *</label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={idCategory}
                      onChange={(e) => setIdCategory(e.target.value as "PRIMARY" | "SECONDARY")}
                    >
                      <option value="PRIMARY">Primary Government ID</option>
                      <option value="SECONDARY">Secondary ID</option>
                    </select>
                  </div>

                  {/* ID Type + upload (depends on category) */}
                  {idCategory === "PRIMARY" ? (
                    <>
                      {/* Primary ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            Primary Government ID *
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-semibold mb-1">Acceptable Primary IDs (Philippines):</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                  <li>Driver&apos;s License</li>
                                  <li>Passport</li>
                                  <li>SSS ID</li>
                                  <li>PhilHealth ID</li>
                                  <li>TIN ID</li>
                                  <li>Postal ID</li>
                                  <li>National ID (PhilID)</li>
                                  <li>PRC ID</li>
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <select
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                          value={primaryIdType}
                          onChange={(e) => setPrimaryIdType(e.target.value)}
                        >
                          <option value="">Select primary ID type</option>
                          <option value="DRIVERS_LICENSE">Driver's License</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="SSS">SSS ID</option>
                          <option value="PHILHEALTH">PhilHealth ID</option>
                          <option value="TIN">TIN ID</option>
                          <option value="POSTAL">Postal ID</option>
                          <option value="NATIONAL_ID">National ID (PhilID)</option>
                          <option value="PRC">PRC ID</option>
                        </select>
                        <FileUpload
                          value={primaryIdUrl}
                          onChange={setPrimaryIdUrl}
                          accept="image/*,.pdf"
                          required
                        />
                      </div>

                      {/* Selfie with Primary ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            Selfie with Primary ID *
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Please upload a photo of yourself holding your Primary ID clearly visible.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FileUpload
                          value={selfieWithPrimaryIdUrl}
                          onChange={setSelfieWithPrimaryIdUrl}
                          accept="image/*"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Secondary ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            Secondary ID *
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-semibold mb-1">Acceptable Secondary IDs (Philippines):</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                  <li>Barangay Certificate</li>
                                  <li>Voter&apos;s ID</li>
                                  <li>School ID</li>
                                  <li>Company ID</li>
                                  <li>Senior Citizen ID</li>
                                  <li>PWD ID</li>
                                  <li>NBI Clearance</li>
                                  <li>Police Clearance</li>
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <select
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                          value={secondaryIdType}
                          onChange={(e) => setSecondaryIdType(e.target.value)}
                        >
                          <option value="">Select secondary ID type</option>
                          <option value="BARANGAY_CERT">Barangay Certificate</option>
                          <option value="VOTERS_ID">Voter's ID</option>
                          <option value="SCHOOL_ID">School ID</option>
                          <option value="COMPANY_ID">Company ID</option>
                          <option value="SENIOR_ID">Senior Citizen ID</option>
                          <option value="PWD_ID">PWD ID</option>
                          <option value="NBI">NBI Clearance</option>
                          <option value="POLICE_CLEARANCE">Police Clearance</option>
                        </select>
                        <FileUpload
                          value={secondaryIdUrl}
                          onChange={setSecondaryIdUrl}
                          accept="image/*,.pdf"
                          required
                        />
                      </div>

                      {/* Selfie with Secondary ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            Selfie with Secondary ID *
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Please upload a photo of yourself holding your Secondary ID clearly visible.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FileUpload
                          value={selfieWithSecondaryIdUrl}
                          onChange={setSelfieWithSecondaryIdUrl}
                          accept="image/*"
                          required
                        />
                      </div>
                    </>
                  )}
                  {/* Payslip */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">
                        Payslip *
                      </label>
                    </div>
                    <FileUpload
                      value={payslipUrl}
                      onChange={setPayslipUrl}
                      accept="image/*,.pdf"
                      required
                    />
                  </div>

                  {/* Electric/Water Bill */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">
                        Electric/Water Bill *
                      </label>
                    </div>
                    <FileUpload
                      value={billingReceiptUrl}
                      onChange={setBillingReceiptUrl}
                      accept="image/*,.pdf"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Account Information</h3>
                <div>
                  <label htmlFor="password" className="text-sm font-medium">
                    Password *
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>
            <div className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Registration</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your registration? Please review your information before proceeding.
                Your account will be pending admin approval after registration.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={confirmRegistration} disabled={loading}>
                {loading ? "Registering..." : "Confirm & Register"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
