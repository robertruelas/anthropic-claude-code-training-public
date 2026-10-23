import { StatusBadge } from "@/components/ui/payments/StatusBadge"
import { merchantById } from "@/data/merchants"
import { dailyVolume, headlineMetrics } from "@/data/metrics"
import { store } from "@/data/store"
import { formatDate } from "@/lib/dates"
import { formatMoney, formatMoneyCompact } from "@/lib/money"
import {
  RiAlarmWarningLine,
  RiBankCardLine,
  RiMoneyDollarCircleLine,
  type RemixiconComponentType,
} from "@remixicon/react"
import Link from "next/link"
import { VolumeChart } from "./volume-chart"

export default function OverviewPage() {
  const metrics = headlineMetrics()
  const volume = dailyVolume(30)

  const chartData = volume.map((day) => ({
    date: day.date.slice(5),
    Captured: day.captured / 100,
    Refunded: day.refunded / 100,
  }))

  const recent = [...store.payments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)

  return (
    <div className="border-t border-gray-200 p-4 sm:p-6 dark:border-gray-800">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Gross volume"
          value={formatMoneyCompact(metrics.grossVolume, "USD")}
          sub="Last 120 days"
          icon={RiMoneyDollarCircleLine}
          tone="blue"
        />
        <Stat
          label="Payments"
          value={metrics.paymentCount.toLocaleString()}
          sub={`${store.disputes.length} disputes opened`}
          icon={RiBankCardLine}
          tone="violet"
        />
        <Stat
          label="Open disputes"
          value={String(metrics.openDisputes)}
          sub={`${formatMoney(metrics.disputedAmount, "USD")} at risk`}
          icon={RiAlarmWarningLine}
          tone="amber"
        />
      </dl>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6 dark:bg-gray-950 dark:ring-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          Daily volume
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Captured against refunded over the last 30 days.
        </p>
        <VolumeChart data={chartData} />
      </section>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Recent payments
          </h2>
          <Link
            href="/payments"
            className="text-sm text-blue-600 hover:underline dark:text-blue-500"
          >
            View all
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
          {recent.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/payments/${payment.id}`}
                  className="text-sm font-medium text-gray-900 hover:underline dark:text-gray-50"
                >
                  {merchantById(payment.merchantId)?.name}
                </Link>
                <p className="truncate text-sm text-gray-500">
                  {payment.description} · {formatDate(payment.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-50">
                  {formatMoney(payment.amount, payment.currency)}
                </span>
                <StatusBadge status={payment.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const toneClasses = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  violet:
    "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
  amber:
    "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  icon: RemixiconComponentType
  tone: keyof typeof toneClasses
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-gray-950 dark:ring-gray-800">
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </dt>
        <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-gray-50">
          {value}
        </dd>
        {sub && <p className="mt-1.5 text-sm text-gray-500">{sub}</p>}
      </div>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${toneClasses[tone]}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
    </div>
  )
}
