"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiUsers,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import {
  PageHeader,
  Card,
  Button,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
} from "@/components/UI";
import { staffAPI } from "@/lib/api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatWeekday = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const salaryOf = (s, a) => {
  if (!a || !a.status) return 0;
  const st = a.status;
  if (st === "present") return s.dailyWage;
  if (st === "half") return s.dailyWage * 0.5;
  return 0;
};

const getAttendanceStatus = (a) => {
  if (!a || !a.status) return null;
  if (a.status) return a.status;
  return a.present ? "present" : "absent";
};

export default function StaffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("staff");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Daily attendance
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()));
  const [attendance, setAttendance] = useState({});
  const [attendanceStaff, setAttendanceStaff] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const attendanceRef = useRef({});
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);
  // Daily per-day payment tracking
  const [dailyPayments, setDailyPayments] = useState({});
  const [paying, setPaying] = useState(null);
  const [confirmPay, setConfirmPay] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    setTab(searchParams.get("tab") === "attendance" ? "attendance" : "staff");
  }, [searchParams]);

  const switchTab = (t) => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    if (t === "attendance") params.set("tab", "attendance");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/dashboard/staff?${qs}` : "/dashboard/staff", { scroll: false });
  };

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  };

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await staffAPI.getAll({ limit: 500 });
      setStaff(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load staff");
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const loadAttendance = useCallback(async (date) => {
    setAttLoading(true);
    try {
      const res = await staffAPI.getDailyAttendance(date);
      const map = {};
      const payMap = {};
      res.data.data.forEach((item) => {
        if (!item.attendance) {
          map[item.staff._id] = null;
        } else {
          const st = item.attendance.status || (item.attendance.present ? "present" : "absent");
          map[item.staff._id] = {
            present: item.attendance.present,
            status: st,
          };
        }
        if (item.payment) {
          payMap[item.staff._id] = item.payment;
        }
      });
      attendanceRef.current = map;
      setAttendance(map);
      setDailyPayments(payMap);
      // Only show active staff in the shop for daily marking (simplified)
      const activeOnly = res.data.data.map((item) => item.staff).filter((s) => s.isActive !== false);
      setAttendanceStaff(activeOnly);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load attendance");
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "attendance") {
      loadAttendance(selectedDate);
    }
  }, [tab, selectedDate, loadAttendance]);

  const persistAttendance = useCallback(
    async (map) => {
      setSaving(true);
      try {
        const records = Object.entries(map).map(([staffId, a]) => {
          const status = a.status || (a.present ? "present" : "absent");
          return {
            staffId,
            status,
            present: status !== "absent",
          };
        });
        await staffAPI.saveDailyAttendance({ date: selectedDate, records });
        showToast("Attendance saved");
      } catch (e) {
        setError(e.response?.data?.message || "Failed to save attendance");
      } finally {
        setSaving(false);
      }
    },
    [selectedDate],
  );

  const scheduleSave = (map) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistAttendance(map), 400);
  };

  const updateAttendance = (staffId, patch) => {
    const current = attendanceRef.current;
    const existing = current[staffId] || {};
    let nextEntry = { ...existing, ...patch };
    if (patch.status !== undefined) {
      nextEntry.status = patch.status;
      nextEntry.present = patch.status !== "absent";
    } else if (patch.present !== undefined) {
      nextEntry.present = !!patch.present;
      nextEntry.status = patch.present ? "present" : "absent";
    } else if (!nextEntry.status) {
      nextEntry.status = "present";
      nextEntry.present = true;
    }
    const next = {
      ...current,
      [staffId]: nextEntry,
    };
    attendanceRef.current = next;
    setAttendance(next);
    scheduleSave(next);
  };

  const handlePayDay = async (staffId) => {
    setPaying(staffId);
    try {
      await staffAPI.markDayPaid({ staffId, date: selectedDate });
      showToast("Day marked as paid");
      await loadAttendance(selectedDate);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to mark paid");
    } finally {
      setPaying(null);
    }
  };

  const handleUnpayDay = async (staffId) => {
    setPaying(staffId);
    try {
      await staffAPI.markDayUnpaid({ staffId, date: selectedDate });
      showToast("Payment removed");
      await loadAttendance(selectedDate);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to remove payment");
    } finally {
      setPaying(null);
    }
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const handleDelete = async (id) => {
    try {
      await staffAPI.delete(id);
      await loadStaff();
      showToast("Staff deactivated. History preserved.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to deactivate staff");
    }
    setConfirmDelete(null);
  };

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.trim().toLowerCase();
    return staff.filter((s) =>
      [s.name, s.phone, s.role].some((f) => (f || "").toLowerCase().includes(q)),
    );
  }, [staff, search]);

  const totals = useMemo(() => {
    let totalWages = 0,
      presentCount = 0,
      halfCount = 0,
      absentCount = 0,
      paidCount = 0,
      paidAmount = 0;
    attendanceStaff.forEach((s) => {
      const a = attendance[s._id];
      const st = getAttendanceStatus(a);
      if (st === "present") presentCount++;
      else if (st === "half") {
        halfCount++;
        presentCount++; // half counts as present day
      } else if (st === "absent") absentCount++;
      // unmarked (null) not counted
      totalWages += salaryOf(s, a);
      const pay = dailyPayments[s._id];
      if (pay) {
        paidCount++;
        paidAmount += pay.amount || 0;
      }
    });
    return { totalWages, presentCount, halfCount, absentCount, paidCount, paidAmount };
  }, [attendance, attendanceStaff, dailyPayments]);

  const changeDate = (delta) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateInput(d));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Staff"
        subtitle="Daily attendance — mark present / half / absent"
        action={
          tab === "staff" ? (
            <Link href="/dashboard/staff/new">
              <Button variant="primary">
                <FiPlus className="mr-2" />
                Add Staff
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-6 w-fit">
        <button
          onClick={() => switchTab("staff")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === "staff" ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FiUsers className="h-4 w-4" /> Staff List
        </button>
        <button
          onClick={() => switchTab("attendance")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === "attendance" ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FiCalendar className="h-4 w-4" /> Attendance
        </button>
      </div>

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-fadeIn">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 font-bold">
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {tab === "staff" ? (
        <>
          <Card className="mb-6 animate-fadeIn">
            <div className="px-6 py-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-gray-100 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search staff..."
                />
              </div>
            </div>
          </Card>

          <Card className="animate-fadeIn">
            {staffLoading ? (
              <LoadingSpinner />
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={FiUsers}
                title="No staff found"
                description={staff.length === 0 ? "Add your first staff member to get started." : "Try a different search."}
                action={
                  <Link href="/dashboard/staff/new">
                    <Button variant="primary">
                      <FiPlus className="mr-2" />Add Staff
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Daily Wage</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {filteredStaff.map((s) => (
                      <tr key={s._id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {s.name.charAt(0)}
                            </div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              {s.name}
                              {s.isActive === false && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{s.phone || "—"}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {s.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{formatINR(s.dailyWage)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/staff/${s._id}/report`} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Report & Calendar">
                              <FiCalendar className="h-4 w-4" />
                            </Link>
                            <Link href={`/dashboard/staff/${s._id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                              <FiEdit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setConfirmDelete(s)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          {/* Daily Attendance — redesigned, simple */}
          <Card className="mb-6 animate-fadeIn overflow-hidden">
            <div className="bg-white border-b border-gray-100 px-5 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Daily Attendance</h3>
                  <p className="text-sm text-gray-500">{formatWeekday(new Date(selectedDate + "T00:00:00"))}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => changeDate(-1)}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
                    title="Previous day"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[150px]"
                  />
                  <button
                    onClick={() => changeDate(1)}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
                    title="Next day"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDate(toDateInput(new Date()))}
                    className="ml-1 px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700 shadow-sm"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                {totals.presentCount} Present
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                {totals.halfCount} Half
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                {totals.absentCount} Absent
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                {totals.paidCount} Paid
              </span>
              {saving && <span className="text-xs text-gray-400 font-medium">Saving...</span>}
              <span className="ml-auto text-xs text-gray-500 hidden sm:inline">Tip: Click Present / Half / Absent to mark • Use Pay to settle</span>
            </div>
            <div className="overflow-x-auto">
              {attLoading ? (
                <LoadingSpinner />
              ) : attendanceStaff.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No active staff in shop for this date. Add staff from Staff List.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Staff</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Pay</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {attendanceStaff.map((s) => {
                      const a = attendance[s._id] || null;
                      const isPaid = !!dailyPayments[s._id];
                      const canPay = salaryOf(s, a) !== 0;
                      return (
                        <tr key={s._id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {s.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{s.name}</div>
                                <div className="text-xs text-gray-500 sm:hidden">{s.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{s.role}</td>
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const st = getAttendanceStatus(a);
                              return (
                                <div className="inline-flex rounded-full border border-gray-200 overflow-hidden">
                                  <button
                                    onClick={() => updateAttendance(s._id, { status: "present" })}
                                    className={`px-3 py-1.5 text-xs font-bold transition-all ${st === "present" ? "bg-green-100 text-green-700" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => updateAttendance(s._id, { status: "half" })}
                                    className={`px-3 py-1.5 text-xs font-bold border-l border-gray-200 transition-all ${st === "half" ? "bg-amber-100 text-amber-700" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                  >
                                    Half
                                  </button>
                                  <button
                                    onClick={() => updateAttendance(s._id, { status: "absent" })}
                                    className={`px-3 py-1.5 text-xs font-bold border-l border-gray-200 transition-all ${st === "absent" ? "bg-red-100 text-red-700" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end">
                              {isPaid ? (
                                <button
                                  onClick={() => handleUnpayDay(s._id)}
                                  disabled={paying === s._id}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 shadow-sm"
                                  title="Paid — click to undo"
                                >
                                  <FiCheck className="h-3.5 w-3.5" />
                                  Paid
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmPay(s._id)}
                                  disabled={paying === s._id || !canPay}
                                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border transition-all ${
                                    !canPay
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                      : "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                                  } disabled:opacity-50`}
                                  title={!canPay ? "Absent — no wage to pay" : `Pay for ${selectedDate}`}
                                >
                                  {paying === s._id ? "Saving..." : "Pay"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <div className="flex justify-center">
            <Link href="/dashboard/staff" className="text-xs text-gray-500 hover:text-gray-700">
              Showing {attendanceStaff.length} active staff • Switch date above to mark other days • View individual report via calendar icon in Staff List
            </Link>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Staff"
        message={
          confirmDelete
            ? `Deactivate ${confirmDelete.name}? They will be hidden from new attendance and salary entry, but their attendance, salary and payment history will be preserved.`
            : ""
        }
        onConfirm={() => confirmDelete && handleDelete(confirmDelete._id)}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        isOpen={!!confirmPay}
        title="Confirm Payment"
        message={
          confirmPay
            ? `Mark ${attendanceStaff.find((s) => s._id === confirmPay)?.name || "this staff"} as paid for ${selectedDate}?`
            : ""
        }
        onConfirm={() => {
          const id = confirmPay;
          setConfirmPay(null);
          if (id) handlePayDay(id);
        }}
        onCancel={() => setConfirmPay(null)}
      />
    </div>
  );
}
