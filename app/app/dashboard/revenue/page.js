"use client";

import { useState, useEffect } from "react";
import { invoicesAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/UI";
import DateRangePicker from "@/components/DateRangePicker";
import {
  FiFilter,
  FiTrendingUp,
  FiUsers,
  FiPackage,
  FiCalendar,
} from "react-icons/fi";

const RupeeIcon = ({ className = "" }) => (
  <span className={`inline-flex h-8 w-8 items-center justify-center text-3xl leading-none font-bold text-white ${className}`}>
    ₹
  </span>
);

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium truncate">{label}</span>
        <span className="text-gray-900 font-semibold">{formatINR(value)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}

export default function RevenueFilterPage() {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [range, setRange] = useState({ startDate: monthStart, endDate: monthEnd });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchInsights = async (r) => {
    if (!r.startDate || !r.endDate) return;
    try {
      setLoading(true);
      setError("");
      const params = {
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
      };
      const res = await invoicesAPI.getRevenueInsights(params);
      setData(res?.data?.data || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load revenue insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && range.startDate && range.endDate) fetchInsights(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (r) => {
    setRange(r);
    if (r.startDate && r.endDate) fetchInsights(r);
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const dailyMax = data?.daily?.length
    ? Math.max(...data.daily.map((d) => d.revenue), 0)
    : 0;
  const custMax = data?.topCustomers?.length
    ? Math.max(...data.topCustomers.map((c) => c.revenue), 0)
    : 0;
  const prodMax = data?.topProducts?.length
    ? Math.max(...data.topProducts.map((p) => p.revenue), 0)
    : 0;

  return (
    <div className="p-6">
      <PageHeader
        title="Revenue Filter"
        subtitle="Filter revenue insights by date range"
      />

      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <DateRangePicker startDate={range.startDate} endDate={range.endDate} onChange={handleChange} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-xl">
            <FiCalendar className="h-5 w-5 text-indigo-500" />
            <span>
              {fmtDate(range.startDate)} — {fmtDate(range.endDate)}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Revenue for selected range */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Revenue ({fmtDate(range.startDate)} — {fmtDate(range.endDate)})
                </p>
                <p className="mt-2 text-4xl font-bold text-gray-900">
                  {formatINR(data.totalRevenue)}
                </p>
              </div>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
                <RupeeIcon />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily revenue chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
                <FiTrendingUp className="mr-2 h-5 w-5 text-indigo-600" />
                Daily Revenue Trend
              </h2>
              {data.daily?.length ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
                    <div className="w-16 text-xs font-semibold text-gray-400 uppercase shrink-0">
                      Date
                    </div>
                    <div className="flex-1"></div>
                    <div className="w-28 text-right text-xs font-semibold text-gray-400 uppercase shrink-0">
                      Revenue
                    </div>
                    <div className="w-10 text-right text-xs font-semibold text-gray-400 uppercase shrink-0">
                      Bills
                    </div>
                  </div>
                  {data.daily.map((d) => {
                    const dt = new Date(d._id);
                    const lbl = dt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    });
                    return (
                      <div key={d._id} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-gray-500 shrink-0">{lbl}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{
                              width: `${dailyMax > 0 ? (d.revenue / dailyMax) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div className="w-28 text-right text-sm font-semibold text-gray-900 shrink-0">
                          {formatINR(d.revenue)}
                        </div>
                        <div className="w-10 text-right text-xs text-gray-400 shrink-0">
                          {d.invoices}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No paid invoices in this range.</p>
              )}
            </div>

            {/* Top customers */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
                <FiUsers className="mr-2 h-5 w-5 text-indigo-600" />
                Top Customers
              </h2>
              {data.topCustomers?.length ? (
                <div>
                  {data.topCustomers.map((c) => (
                    <Bar
                      key={c._id || "na"}
                      label={c.name || "Walk-in"}
                      value={c.revenue}
                      max={custMax}
                      color="bg-gradient-to-r from-indigo-500 to-purple-500"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data available.</p>
              )}
            </div>

            {/* Top products */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
                <FiPackage className="mr-2 h-5 w-5 text-indigo-600" />
                Top Products by Revenue
              </h2>
              {data.topProducts?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {data.topProducts.map((p) => (
                    <Bar
                      key={p._id || p.name}
                      label={`${p.name} (${p.quantity} qty)`}
                      value={p.revenue}
                      max={prodMax}
                      color="bg-gradient-to-r from-green-500 to-emerald-500"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No sales in this range.</p>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !data && !error && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFilter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">Select a date range to view insights.</p>
        </div>
      )}
    </div>
  );
}
