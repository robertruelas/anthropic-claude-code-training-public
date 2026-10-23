"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import type { ExportColumn, ExportScope } from "@/lib/csv"
import { Download } from "lucide-react"
import { useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

/**
 * Options for the payments export (NWP-101). The choices only build the
 * request; the route handler validates columns and scope itself.
 */
export function ExportDialog({
  query,
  columns,
  defaultColumns,
  counts,
  filenames,
}: {
  /** The page's current filters, as a query string. */
  query: string
  columns: readonly ExportColumn[]
  defaultColumns: readonly ExportColumn[]
  counts: Record<ExportScope, number>
  filenames: Record<ExportScope, string>
}) {
  const [selected, setSelected] = useState<Set<ExportColumn>>(
    () => new Set(defaultColumns),
  )
  const [scope, setScope] = useState<ExportScope>("filtered")

  const toggle = (column: ExportColumn) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })

  // Keep the canonical column order, whatever order they were ticked in.
  const chosen = columns.filter((column) => selected.has(column))
  const params = new URLSearchParams(query)
  params.delete("page")
  params.set("scope", scope)
  params.set("columns", chosen.join(","))
  const href = `/api/payments/export?${params.toString()}`
  const rowCount = counts[scope]

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose what goes in the CSV before you download it.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-6">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              <ScopeOption
                value="filtered"
                label="Current filter"
                count={counts.filtered}
                checked={scope === "filtered"}
                onSelect={setScope}
              />
              <ScopeOption
                value="all"
                label="All payments"
                count={counts.all}
                checked={scope === "all"}
                onSelect={setScope}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <p className="mt-1 text-sm text-gray-500">
              Card last four is off by default. Leave it off for anything going
              to a merchant.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {columns.map((column) => (
                <label
                  key={column}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-gray-800 dark:text-gray-50 has-[:checked]:dark:bg-blue-500/10"
                >
                  <input
                    type="checkbox"
                    name="columns"
                    value={column}
                    checked={selected.has(column)}
                    onChange={() => toggle(column)}
                    className="size-4 accent-blue-600"
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
          </fieldset>
        </DrawerBody>
        <DrawerFooter className="items-center gap-2">
          <p
            id="export-summary"
            aria-live="polite"
            className="mr-auto text-sm text-gray-500 max-sm:mt-2"
          >
            {chosen.length === 0
              ? "Choose at least one column to download."
              : `${rowCount.toLocaleString()} ${rowCount === 1 ? "row" : "rows"} · ${filenames[scope]}`}
          </p>
          <DrawerClose asChild>
            <Button variant="secondary" className="w-full sm:w-fit">
              Cancel
            </Button>
          </DrawerClose>
          {chosen.length === 0 ? (
            <Button
              className="w-full sm:w-fit"
              disabled
              aria-describedby="export-summary"
            >
              Download
            </Button>
          ) : (
            <Button className="w-full sm:w-fit" asChild>
              <a href={href} download aria-describedby="export-summary">
                Download
              </a>
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ScopeOption({
  value,
  label,
  count,
  checked,
  onSelect,
}: {
  value: ExportScope
  label: string
  count: number
  checked: boolean
  onSelect: (scope: ExportScope) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-gray-800 dark:text-gray-50 has-[:checked]:dark:bg-blue-500/10">
      <span className="flex items-center gap-2">
        <input
          type="radio"
          name="scope"
          value={value}
          checked={checked}
          onChange={() => onSelect(value)}
          className="size-4 accent-blue-600"
        />
        {label}
      </span>
      <span className="tabular-nums text-gray-500">
        {count.toLocaleString()} {count === 1 ? "row" : "rows"}
      </span>
    </label>
  )
}
