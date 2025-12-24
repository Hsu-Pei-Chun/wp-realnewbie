"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TableData } from "@/lib/table-utils"

interface ResponsiveTableProps {
  tableHtml: string
  tableData: TableData
  className?: string
}

function TableRow({
  row,
  headers,
  rowIndex,
}: {
  row: string[]
  headers: string[]
  rowIndex: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const firstCell = row[0] || ""
  const restCells = row.slice(1)
  const restHeaders = headers.slice(1)

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden",
        "bg-card text-card-foreground",
        "shadow-sm"
      )}
    >
      {/* Header row - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between",
          "px-4 py-3",
          "text-left font-medium",
          "hover:bg-muted/50 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        )}
        aria-expanded={isExpanded}
        aria-controls={`row-content-${rowIndex}`}
      >
        <span>{firstCell}</span>
        {restCells.length > 0 && (
          <span className="text-muted-foreground ml-2 shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </button>

      {/* Expandable content */}
      {restCells.length > 0 && (
        <div
          id={`row-content-${rowIndex}`}
          className={cn(
            "grid transition-all duration-200 ease-in-out",
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 border-t bg-muted/30 divide-y divide-border">
              {restCells.map((cell, cellIndex) => (
                <div key={cellIndex} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  {restHeaders[cellIndex] && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {restHeaders[cellIndex]}
                    </span>
                  )}
                  <span className="text-sm">{cell}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ResponsiveTable({
  tableHtml,
  tableData,
  className,
}: ResponsiveTableProps) {
  const { headers, rows } = tableData

  return (
    <div className={cn("my-4", className)}>
      {/* Desktop: Original table */}
      <div
        className="hidden sm:block"
        dangerouslySetInnerHTML={{ __html: tableHtml }}
      />

      {/* Mobile: Card layout */}
      <div className="sm:hidden space-y-2">
        {rows.map((row, rowIndex) => (
          <TableRow
            key={rowIndex}
            row={row}
            headers={headers}
            rowIndex={rowIndex}
          />
        ))}
      </div>
    </div>
  )
}
