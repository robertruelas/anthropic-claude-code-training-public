import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { PaymentFilters } from "@/data/types"
import {
  exportFilename,
  exportScopeLabel,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

/**
 * Exports the payments table as CSV.
 *
 * Ops choose the columns (`columns=id,amount,…`) and the scope
 * (`scope=filtered|all`). Both are checked against allowlists before the query
 * builder runs, and anything off the list is a 400 rather than a quiet default.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseExportColumns(params.get("columns"))
  if (!columns.ok) return badRequest(columns.message)

  const scope = parseExportScope(params.get("scope"))
  if (!scope.ok) return badRequest(scope.message)

  const parsed = parseFilters(params)
  const filters: PaymentFilters =
    scope.value === "all"
      ? { sort: parsed.sort, direction: parsed.direction }
      : parsed
  const rows = sortPayments(
    filterPayments(filters),
    filters.sort,
    filters.direction,
  )
  const filename = exportFilename(
    new Date(),
    exportScopeLabel(scope.value, filters.status),
  )

  return new Response(toCsv(rows, columns.value), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}
