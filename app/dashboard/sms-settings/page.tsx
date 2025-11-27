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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, Send, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { validatePhilippinePhone, formatPhoneInput } from "@/lib/phone-validation"

export default function SMSSettingsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [testPhoneError, setTestPhoneError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    mode: "cloud",
    localServerUrl: "",
    cloudServerUrl: "https://api.sms-gate.app/3rdparty/v1",
    username: "",
    password: "",
    isActive: false,
  })
  const [hasExistingSettings, setHasExistingSettings] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      redirect("/dashboard")
    }
    if (status === "authenticated") {
      fetchSettings()
    }
  }, [status, session])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/sms/settings")
      if (response.ok) {
        const data = await response.json()
        setHasExistingSettings(!!data.id) // Check if settings already exist
        setFormData({
          mode: data.mode || "cloud",
          localServerUrl: data.localServerUrl || "",
          cloudServerUrl: data.cloudServerUrl || "https://api.sms-gate.app/3rdparty/v1",
          username: data.username || "",
          password: "", // Password is never returned
          isActive: data.isActive !== undefined ? data.isActive : false,
        })
      }
    } catch (error) {
      console.error("Error fetching SMS settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.username) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username is required",
      })
      return
    }

    // Password is only required when creating new settings
    if (!hasExistingSettings && !formData.password) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Password is required when creating new settings",
      })
      return
    }

    if (formData.mode === "local" && !formData.localServerUrl) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Local server URL is required for local mode",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/sms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save settings")
      }

      toast({
        title: "Settings Saved",
        description: "SMS settings have been saved successfully",
      })

      // Reload settings to get updated data
      await fetchSettings()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save SMS settings",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestPhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value)
    setTestPhone(formatted)
    
    // Validate if there's input
    if (formatted.trim()) {
      const validation = validatePhilippinePhone(formatted)
      if (validation.isValid) {
        setTestPhoneError(null)
      } else {
        setTestPhoneError(validation.error || "Invalid phone number")
      }
    } else {
      setTestPhoneError(null)
    }
  }

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast({
        variant: "destructive",
        title: "Phone Number Required",
        description: "Please enter a phone number to test",
      })
      return
    }

    // Validate phone number before sending
    const validation = validatePhilippinePhone(testPhone)
    if (!validation.isValid) {
      setTestPhoneError(validation.error || "Invalid phone number")
      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: validation.error || "Please enter a valid Philippine phone number",
      })
      return
    }

    setTesting(true)
    try {
      const response = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: validation.formatted }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send test SMS")
      }

      toast({
        title: "Test SMS Sent",
        description: `Test SMS has been sent to ${validation.formatted}`,
      })

      setShowTestDialog(false)
      setTestPhone("")
      setTestPhoneError(null)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: error.message || "Failed to send test SMS",
      })
    } finally {
      setTesting(false)
    }
  }

  if (status === "loading" || loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SMS Settings</h1>
            <p className="text-muted-foreground">
              Configure Android SMS Gateway settings
            </p>
          </div>
          <Button onClick={() => setShowTestDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            Test SMS
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Gateway Configuration
            </CardTitle>
            <CardDescription>
              Configure your Android SMS Gateway connection. You can use either local server or cloud server mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label>Server Mode *</Label>
              <Select
                value={formData.mode}
                onValueChange={(value) => setFormData({ ...formData, mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud">Cloud Server</SelectItem>
                  <SelectItem value="local">Local Server</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.mode === "cloud"
                  ? "Use cloud server when device IP is dynamic or shared"
                  : "Use local server for direct device access on local network"}
              </p>
            </div>

            {/* Local Server URL */}
            {formData.mode === "local" && (
              <div className="space-y-2">
                <Label>Local Server URL *</Label>
                <Input
                  value={formData.localServerUrl}
                  onChange={(e) => setFormData({ ...formData, localServerUrl: e.target.value })}
                  placeholder="http://192.168.1.100:8080"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your device's local IP address and port (e.g., http://192.168.1.100:8080)
                </p>
              </div>
            )}

            {/* Cloud Server URL */}
            {formData.mode === "cloud" && (
              <div className="space-y-2">
                <Label>Cloud Server URL</Label>
                <Input
                  value={formData.cloudServerUrl}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="https://api.sms-gate.app/3rdparty/v1"
                />
                <p className="text-xs text-muted-foreground">
                  Cloud server URL is fixed and cannot be changed
                </p>
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username from SMS Gateway app"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label>Password {!hasExistingSettings && "*"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={hasExistingSettings ? "Leave blank to keep current password" : "Enter password from SMS Gateway app"}
              />
              <p className="text-xs text-muted-foreground">
                {hasExistingSettings 
                  ? "Leave blank to keep current password, or enter new password to update"
                  : "Get credentials from the SMS Gateway app on your Android device"}
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Enable SMS sending
              </Label>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Setup Instructions
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-xs">
                    <li>Install the SMS Gateway app on your Android device</li>
                    <li>Enable Local Server or Cloud Server in the app</li>
                    <li>Copy the username and password from the app</li>
                    <li>For local mode: Use your device's local IP address</li>
                    <li>For cloud mode: Use the default cloud server URL</li>
                    <li>Test the connection before enabling SMS sending</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Test SMS Dialog */}
        <Dialog 
          open={showTestDialog} 
          onOpenChange={(open) => {
            setShowTestDialog(open)
            if (!open) {
              setTestPhone("")
              setTestPhoneError(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test SMS</DialogTitle>
              <DialogDescription>
                Send a test SMS to verify your SMS Gateway configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => handleTestPhoneChange(e.target.value)}
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  className={testPhoneError ? "border-destructive" : ""}
                />
                {testPhoneError ? (
                  <p className="text-xs text-destructive">{testPhoneError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Enter Philippine phone number (e.g., 09123456789 or +639123456789)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTestSMS} disabled={testing || !testPhone || !!testPhoneError}>
                <Send className="h-4 w-4 mr-2" />
                {testing ? "Sending..." : "Send Test SMS"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

