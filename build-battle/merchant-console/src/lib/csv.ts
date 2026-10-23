import { merchantById } from "@/data/merchants"
import { Payment, PaymentFilters } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops choose the columns and the scope (NWP-101). Both arrive from the client,
 * so they are parsed against the allowlists below before anything is queried
 * or written into a filename. Card last four is off unless asked for.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** What ships when no columns are named: everything but the card last four. */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

export const EXPORT_SCOPES = ["filtered", "all"] as const

export type ExportScope = (typeof EXPORT_SCOPES)[number]

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string }

const isExportColumn = (value: string): value is ExportColumn =>
  (EXPORT_COLUMNS as readonly string[]).includes(value)

/**
 * Parses the comma-separated `columns` param. Missing means the default set;
 * present but empty, or naming anything off the allowlist, is rejected.
 * Order is kept as requested and repeats are dropped.
 */
export function parseExportColumns(raw: string | null): Parsed<ExportColumn[]> {
  if (raw === null) return { ok: true, value: [...DEFAULT_EXPORT_COLUMNS] }

  const requested = raw
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
  if (requested.length === 0) {
    return { ok: false, message: "Choose at least one column to export." }
  }
  if (!requested.every(isExportColumn)) {
    return { ok: false, message: "One or more columns can't be exported." }
  }
  return { ok: true, value: [...new Set(requested)] }
}

/** Parses the `scope` param. Missing means the current filter. */
export function parseExportScope(raw: string | null): Parsed<ExportScope> {
  if (raw === null) return { ok: true, value: "filtered" }
  if ((EXPORT_SCOPES as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as ExportScope }
  }
  return { ok: false, message: "Scope must be the current filter or all payments." }
}

/**
 * The scope word in the filename. Only allowlisted values reach it: the scope
 * itself, or a status already checked by parseFilters. Never merchant ids or
 * search text.
 */
export function exportScopeLabel(
  scope: ExportScope,
  status: PaymentFilters["status"],
): string {
  if (scope === "all") return "all"
  return status && status !== "all" ? status : "filtered"
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

export function exportFilename(date = new Date(), scopeLabel?: string): string {
  const day = date.toISOString().slice(0, 10)
  return scopeLabel ? `payments-${scopeLabel}-${day}.csv` : `payments-${day}.csv`
}
