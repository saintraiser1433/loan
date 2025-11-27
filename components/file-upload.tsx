"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface FileUploadProps {
  value?: string
  onChange: (url: string) => void
  accept?: string
  label?: string
  required?: boolean
}

export function FileUpload({
  value,
  onChange,
  accept = "image/*,.pdf",
  label,
  required = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isImage = value && /\.(jpg|jpeg|png|gif|webp)$/i.test(value)

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={`file-upload-${label || "default"}`}
        disabled={uploading}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          className="flex items-center gap-2 flex-1"
          onClick={() => {
            fileInputRef.current?.click()
          }}
        >
          <Upload className="size-4" />
          {uploading 
            ? "Uploading..." 
            : value 
              ? `Change ${label || "File"}` 
              : `Upload ${label || "File"}`}
          {required && !value && <span className="text-destructive ml-1">*</span>}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {value && (
        <div className="space-y-2">
          {isImage ? (
            <div className="relative w-full h-48 rounded-lg border-2 border-border overflow-hidden bg-muted">
              <img
                src={value}
                alt={label || "Preview"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"
                title="Click to view full size"
              >
                <span className="text-white text-sm font-medium">View Full Size</span>
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex-1"
              >
                View Document
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


