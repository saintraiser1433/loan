"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, GripVertical } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  className?: string
  selectable?: boolean
  draggable?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  className = "",
  selectable = false,
  draggable = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)

  const safeData = Array.isArray(data) ? data : []

  useEffect(() => {
    setCurrentPage(1)
  }, [data])

  const filteredData = useMemo(() => {
    if (!search) return safeData
    return safeData.filter((row) =>
      columns.some((col) => {
        try {
          const value =
            typeof col.accessor === "function"
              ? String(col.accessor(row))
              : String(row[col.accessor])
          return value.toLowerCase().includes(search.toLowerCase())
        } catch {
          return false
        }
      })
    )
  }, [safeData, search, columns])

  const safeFilteredData = Array.isArray(filteredData) ? filteredData : []
  const totalPages = Math.max(1, Math.ceil(safeFilteredData.length / rowsPerPage))
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = safeFilteredData.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const toggleRowSelection = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleAllSelection = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => startIndex + i)))
    }
  }

  const isAllSelected = selectedRows.size === paginatedData.length && paginatedData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < paginatedData.length

  return (
    <div className={`space-y-3 ${className}`}>
      {searchable && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setCurrentPage(1)
            }}
            className="h-9 max-w-sm"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                {selectable && (
                  <th className="w-10 px-1.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate
                      }}
                      onChange={toggleAllSelection}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                {draggable && (
                  <th className="w-8 px-1.5 py-1.5">
                    <span className="sr-only">Drag</span>
                  </th>
                )}
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.className ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => {
                  const globalIndex = startIndex + rowIndex
                  const isSelected = selectedRows.has(globalIndex)
                  return (
                    <tr
                      key={rowIndex}
                      className={`border-b transition-colors hover:bg-muted/30 ${
                        isSelected ? "bg-muted/50" : ""
                      }`}
                    >
                      {selectable && (
                        <td className="px-1.5 py-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(globalIndex)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      {draggable && (
                        <td className="px-1.5 py-1.5">
                          <GripVertical className="h-4 w-4 cursor-move text-muted-foreground" />
                        </td>
                      )}
                      {columns.map((col, colIndex) => (
                        <td key={colIndex} className={`px-2 py-1.5 text-sm ${col.className ?? ""}`}>
                          {typeof col.accessor === "function"
                            ? col.accessor(row)
                            : String(row[col.accessor] ?? "")}
                        </td>
                      ))}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (draggable ? 1 : 0)}
                    className="p-6 text-center text-sm text-muted-foreground"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {safeFilteredData.length > 0 && (
          <div className="flex items-center justify-between gap-4 border-t bg-muted/20 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {selectable ? (
                <span>{selectedRows.size} of {safeFilteredData.length} selected</span>
              ) : (
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, safeFilteredData.length)} of{" "}
                  {safeFilteredData.length} entries
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page:</span>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((value) => (
                      <SelectItem key={value} value={value.toString()}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <div className="mr-2 text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

