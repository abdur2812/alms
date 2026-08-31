"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiCheck, FiX } from "react-icons/fi";
import { PageHeader, Card, CardBody, LoadingSpinner, Badge, ConfirmDialog } from "@/components/UI";
import { staffAPI } from "@/lib/api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function StaffReportPage() {
  const params = useParams();
  const id = params.id;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingDate, setSavingDate] = useState(null);
  const [payingDate, setPayingDate] = useState(null);
  const [confirmPayCell, setConfirmPayCell] = useState(null);
  const [toast, setToast] = useState("");

  const monthLabel = new Date(year, monthIdx, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const loadCalendar = async (y, m) => {
    setLoading(true);
    setError("");
    try {
      const monthStr = `${y}-${String(m + 1).padStart(2, "0")}`;
      const res = await staffAPI.getCalendar(id, { month: monthStr });
      setData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load staff report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar(year, monthIdx);
  }, [year, monthIdx, id]);

  const attendanceMap = useMemo(() => {
    if (!data) return new Map();
    const m = new Map();
    data.attendance.forEach((a) => {
      m.set(a.date, a.status);
    });
    return m;
  }, [data]);

  const dailyPayments = useMemo(() => data?.dailyPayments || [], [data]);

  const dailyMap = useMemo(() => {
    const m = new Map();
    dailyPayments.forEach((p) => m.set(p.date, p));
    return m;
  }, [dailyPayments]);

  const isPaidForDate = useCallback(
    (dateStr) => dailyMap.has(dateStr),
    [dailyMap],
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, monthIdx, 1));
    const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0));
    const daysInMonth = lastDay.getUTCDate();
    const startWeekDay = firstDay.getUTCDay();
    const mondayOffset = (startWeekDay + 6) % 7;
    const cells = [];
    for (let i = 0; i < mondayOffset; i++) {
      cells.push(null);
    }
    const todayStr = toDateInput(new Date());
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const status = attendanceMap.get(dateStr);
      let displayStatus = status;
      const isFuture = dateStr > todayStr;
      if (!displayStatus) {
        if (isFuture) displayStatus = "future";
        else displayStatus = null;
      }
      const dailyPaid = dailyMap.has(dateStr);
      const paid = dailyPaid;
      const dailyPayment = dailyMap.get(dateStr) || null;
      const dailyWage = data?.staff?.dailyWage || 0;
      let credited = 0;
      if (displayStatus === "present") credited = dailyWage;
      else if (displayStatus === "half") credited = dailyWage * 0.5;
      else credited = 0;
      cells.push({ day: d, dateStr, status: displayStatus, paid, dailyPaid, dailyPayment, credited, isFuture });
    }
    return cells;
  }, [year, monthIdx, attendanceMap, dailyMap, data]);

  const stats = useMemo(() => {
    if (!calendarDays.length) return { present: 0, half: 0, absent: 0, paidDays: 0, dailyPaidDays: 0, totalCredited: 0, salaryPaid: 0, dailyPaidAmount: 0, totalSalary: 0 };
    let present = 0, half = 0, absent = 0, paidDays = 0, dailyPaidDays = 0, totalCredited = 0;
    calendarDays.forEach((c) => {
      if (!c) return;
      if (c.status === "present") present++;
      else if (c.status === "half") half++;
      else if (c.status === "absent") absent++;
      if (c.paid) paidDays++;
      if (c.dailyPaid) dailyPaidDays++;
      totalCredited += c.credited || 0;
    });
    const dailyPaidAmount = dailyPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const salaryPaid = dailyPaidAmount;
    return { present, half, absent, paidDays, dailyPaidDays, totalCredited, salaryPaid, dailyPaidAmount, totalSalary: totalCredited };
  }, [calendarDays, dailyPayments]);

  const goPrev = () => {
    if (monthIdx === 0) { setYear((y) => y - 1); setMonthIdx(11); }
    else setMonthIdx((m) => m - 1);
  };
  const goNext = () => {
    if (monthIdx === 11) { setYear((y) => y + 1); setMonthIdx(0); }
    else setMonthIdx((m) => m + 1);
  };
  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonthIdx(n.getMonth());
  };

  const handleDayClick = async (cell) => {
    if (!cell || cell.isFuture) return;
    const cur = cell.status;
    const next = cur === "present" ? "half" : cur === "half" ? "absent" : "present";
    setSavingDate(cell.dateStr);
    try {
      await staffAPI.saveDailyAttendance({ date: cell.dateStr, records: [{ staffId: id, status: next }] });
      // Optimistic update
      await loadCalendar(year, monthIdx);
      setToast(`Marked ${cell.dateStr} as ${next}`);
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update attendance");
    } finally {
      setSavingDate(null);
    }
  };

  const handleTogglePay = async (cell, e) => {
    if (e) e.stopPropagation();
    if (!cell || cell.isFuture) return;
    if (cell.credited === 0) {
      setError("Cannot pay for absent day (0 wage)");
      setTimeout(() => setError(""), 2000);
      return;
    }
    setPayingDate(cell.dateStr);
    try {
      if (cell.dailyPaid) {
        await staffAPI.markDayUnpaid({ staffId: id, date: cell.dateStr });
        setToast(`Payment removed for ${cell.dateStr}`);
      } else {
        await staffAPI.markDayPaid({ staffId: id, date: cell.dateStr });
        setToast(`Marked as paid for ${cell.dateStr}`);
      }
      await loadCalendar(year, monthIdx);
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle payment");
    } finally {
      setPayingDate(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title={data?.staff ? `${data.staff.name} — Report` : "Staff Report"}
        subtitle={data?.staff ? `${data.staff.role} • ${monthLabel}` : monthLabel}
        backLink="/dashboard/staff"
        action={
          <Link href={`/dashboard/staff/${id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">
            <FiCalendar className="h-4 w-4" /> Edit Staff
          </Link>
        }
      />

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-fadeIn">
          {toast}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Month navigation */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200"><FiChevronLeft className="h-5 w-5" /></button>
          <div className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold min-w-[180px] text-center">
            {monthLabel}
          </div>
          <button onClick={goNext} className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200"><FiChevronRight className="h-5 w-5" /></button>
          <button onClick={goToday} className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 hover:bg-indigo-100">Today</button>
        </div>
        <div className="text-xs text-gray-500">Click top to cycle attendance • Pay button to settle day</div>
      </div>

      {/* Big Calendar — functional */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Attendance Calendar</h3>
          <span className="text-xs text-cyan-100 hidden sm:inline">Green=Present • Amber=Half • Red=Absent • Blue ring=Paid • Top click cycles attendance • Bottom Pay settles day</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell) return <div key={`empty-${idx}`} className="h-32 rounded-xl bg-gray-50 border border-dashed border-gray-200" />;
              const { day, status, paid, dailyPaid, credited, dailyPayment, isFuture } = cell;
              let bg = "bg-white border-gray-200";
              let textColor = "text-gray-900";
              if (isFuture) {
                bg = "bg-gray-50 border-gray-200 opacity-60";
                textColor = "text-gray-400";
              } else if (status === "present") {
                bg = "bg-green-50 border-green-300";
                textColor = "text-green-800";
              } else if (status === "half") {
                bg = "bg-amber-50 border-amber-300";
                textColor = "text-amber-800";
              } else if (status === "absent") {
                bg = "bg-red-50 border-red-200";
                textColor = "text-red-700";
              }
              const paidRing = paid ? "ring-2 ring-blue-400 ring-offset-1" : "";
              const isSaving = savingDate === cell.dateStr;
              const isPaying = payingDate === cell.dateStr;
              return (
                <div
                  key={cell.dateStr}
                  className={`h-32 rounded-xl border p-2 flex flex-col justify-between ${bg} ${paidRing} transition-all hover:shadow-md ${isSaving || isPaying ? "animate-pulse" : ""} ${isFuture ? "opacity-60" : ""}`}
                >
                  <button
                    onClick={() => handleDayClick(cell)}
                    disabled={isFuture || isSaving}
                    className="flex-1 flex flex-col justify-between text-left disabled:cursor-not-allowed w-full"
                    title={isFuture ? "Future date" : `Click to change status (current: ${status})`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className={`text-lg font-black ${textColor}`}>{day}</span>
                      {paid ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white" title="Daily paid">
                          Paid
                        </span>
                      ) : status === "present" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-600 text-white">P</span>
                      ) : status === "half" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">H</span>
                      ) : status === "absent" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">A</span>
                      ) : status === "future" ? null : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200">—</span>
                      )}
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="text-[10px] text-gray-500">{cell.dateStr}</div>
                    </div>
                  </button>
                  {!isFuture && (
                    <div className="mt-1">
                      {dailyPaid ? (
                        <button
                          onClick={(e) => handleTogglePay(cell, e)}
                          disabled={isPaying}
                          className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 shadow-sm"
                          title="Paid — click to undo"
                        >
                          <FiCheck className="h-3 w-3" /> Paid
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmPayCell(cell);
                          }}
                          disabled={isPaying || credited === 0}
                          className={`w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border shadow-sm disabled:opacity-50 ${
                            credited === 0
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
                          }`}
                          title={credited === 0 ? "Absent — no wage" : "Mark as paid"}
                        >
                          {isPaying ? "Saving..." : "Pay"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Present (full wage)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> Half (½ wage)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200"></span> Absent (0)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 text-white px-1.5 py-0.5 text-[10px] font-bold">Paid</span> Daily paid</span>

            <span className="text-gray-500 ml-auto hidden sm:inline">Top: click to cycle attendance • Bottom: Pay button to settle day</span>
          </div>
        </div>
      </Card>

      {/* Report below calendar — required stats */}
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiCalendar className="h-4 w-4 text-cyan-600" /> Monthly Report — {monthLabel}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Present Days</p>
              <p className="text-2xl font-black text-green-800">{stats.present}</p>
              <p className="text-xs text-green-600">{stats.present} days</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Half Days</p>
              <p className="text-2xl font-black text-amber-800">{stats.half}</p>
              <p className="text-xs text-amber-600">{stats.half} days</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Absent Days</p>
              <p className="text-2xl font-black text-red-800">{stats.absent}</p>
              <p className="text-xs text-red-500">{stats.absent} days</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Paid Days</p>
              <p className="text-2xl font-black text-blue-800">{stats.paidDays}</p>
              <p className="text-xs text-blue-600">{stats.dailyPaidDays} daily</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Settlements</p>
              <p className="text-2xl font-black text-indigo-800">{dailyPayments.length}</p>
              <p className="text-xs text-indigo-600">{dailyPayments.length} daily</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 text-white">
              <p className="text-xs font-bold text-cyan-100 uppercase tracking-wider">Total Days</p>
              <p className="text-2xl font-black text-white">{stats.present + stats.half + stats.absent}</p>
              <p className="text-xs text-cyan-100">{stats.present} present • {stats.half} half • {stats.absent} absent</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 text-center">
        <Link href="/dashboard/staff" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"><FiArrowLeft className="h-4 w-4" /> Back to Staff</Link>
      </div>
      <ConfirmDialog
        isOpen={!!confirmPayCell}
        title="Confirm Payment"
        message={confirmPayCell ? `Mark ${data?.staff?.name || "this staff"} as paid for ${confirmPayCell.dateStr}?` : ""}
        onConfirm={() => {
          const cell = confirmPayCell;
          setConfirmPayCell(null);
          if (cell) handleTogglePay(cell);
        }}
        onCancel={() => setConfirmPayCell(null)}
      />
    </div>
  );
}
