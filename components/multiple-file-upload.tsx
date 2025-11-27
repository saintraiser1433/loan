"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, File, Image as ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadItem {
  id: string
  label: string
  url: string
  uploading: boolean
  error?: string
}

interface MultipleFileUploadProps {
  items: Array<{
    id: string
    label: string
    accept?: string
    required?: boolean
  }>
  values: Record<string, string>
  onChange: (id: string, url: string) => void
}

export function MultipleFileUpload({
  items,
  values,
  onChange,
}: MultipleFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Upload files one by one
    for (const file of files) {
      // Find the first item that doesn't have a file yet
      const availableItem = items.find(item => !values[item.id] && !uploadingFiles.has(item.id))
      
      if (!availableItem) {
        toast({
          variant: "destructive",
          title: "All files uploaded",
          description: "All document slots are already filled. Remove a file first to upload a new one.",
        })
        break
      }

      // Check if file type matches
      if (availableItem.accept) {
        const acceptTypes = availableItem.accept.split(",").map(t => t.trim())
        const fileType = file.type
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
        
        const isAccepted = acceptTypes.some(accept => {
          if (accept === "image/*") return fileType.startsWith("image/")
          if (accept === ".pdf" || accept === "application/pdf") return fileType === "application/pdf" || fileExtension === ".pdf"
          return fileType === accept || fileExtension === accept
        })

        if (!isAccepted) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `${file.name} is not a valid file type for ${availableItem.label}`,
          })
          continue
        }
      }

      // Upload the file
      setUploadingFiles(prev => new Set(prev).add(availableItem.id))
      
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
        onChange(availableItem.id, data.url)
        
        toast({
          title: "Upload successful",
          description: `${file.name} uploaded to ${availableItem.label}`,
        })
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: err instanceof Error ? err.message : `Failed to upload ${file.name}`,
        })
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev)
          next.delete(availableItem.id)
          return next
        })
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemove = (id: string) => {
    onChange(id, "")
  }

  const getFileStatus = (itemId: string) => {
    if (uploadingFiles.has(itemId)) {
      return { status: "uploading" as const }
    }
    if (values[itemId]) {
      return { status: "uploaded" as const, url: values[itemId] }
    }
    return { status: "empty" as const }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={items.map(item => item.accept || "image/*,.pdf").join(",")}
          onChange={handleFileSelect}
          className="hidden"
          id="multiple-file-upload"
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFiles.size > 0}
        >
          <Upload className="size-4 mr-2" />
          {uploadingFiles.size > 0 
            ? `Uploading ${uploadingFiles.size} file(s)...` 
            : "Upload Multiple Files"}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          Select multiple files to upload. They will be automatically assigned to available document slots.
        </p>
      </div>

      {/* File List */}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const fileStatus = getFileStatus(item.id)
          const hasFile = fileStatus.status === "uploaded"
          const isUploading = fileStatus.status === "uploading"
          const fileUrl = fileStatus.url || ""

          return (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    {item.label}
                    {item.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                </div>
                {hasFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemove(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Uploading...
                </div>
              )}

              {hasFile && (
                <div className="space-y-2">
                  {isImage(fileUrl) ? (
                    <div className="relative w-full h-32 rounded-md border overflow-hidden bg-muted">
                      <img
                        src={fileUrl}
                        alt={item.label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"
                        title="Click to view full size"
                      >
                        <span className="text-white text-xs font-medium">View</span>
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded border bg-muted">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex-1 truncate"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!hasFile && !isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded border border-dashed">
                  <ImageIcon className="h-4 w-4" />
                  <span>No file uploaded</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}






