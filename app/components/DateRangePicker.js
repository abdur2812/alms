"use client";

import { useState, useRef, useEffect } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const toInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const parseInputValue = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function MonthCalendar({ monthDate, selectedStart, selectedEnd, onPick, otherDate }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="w-full">
      <div className="text-center text-sm font-semibold text-gray-800 mb-3">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-xs font-medium text-gray-400 py-1"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const isStart = sameDay(date, selectedStart);
          const isEnd = sameDay(date, selectedEnd);
          const inRange =
            selectedStart &&
            selectedEnd &&
            date > startOfDay(selectedStart) &&
            date < startOfDay(selectedEnd);
          const isOther = sameDay(date, otherDate);

          let cls =
            "relative h-9 flex items-center justify-center text-sm rounded-xl cursor-pointer transition-all duration-200 ";
          if (isStart || isEnd) {
            cls +=
              " bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md";
          } else if (inRange) {
            cls += " bg-indigo-50 text-indigo-700 font-medium";
          } else if (isOther) {
            cls += " bg-purple-100 text-purple-700 font-medium";
          } else {
            cls += " text-gray-700 hover:bg-gray-100";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onPick(date)}
              className={cls}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  presetOptions = true,
}) {
  const [open, setOpen] = useState(false);
  const base = endDate || startDate || new Date();
  const [viewMonth, setViewMonth] = useState(
    new Date(base.getFullYear(), base.getMonth(), 1),
  );
  const [draftStart, setDraftStart] = useState(startDate ? new Date(startDate) : null);
  const [draftEnd, setDraftEnd] = useState(endDate ? new Date(endDate) : null);
  const containerRef = useRef(null);

  const toggleOpen = () => {
    if (!open) {
      setDraftStart(startDate ? new Date(startDate) : null);
      setDraftEnd(endDate ? new Date(endDate) : null);
      const b = endDate || startDate || new Date();
      setViewMonth(new Date(b.getFullYear(), b.getMonth(), 1));
    }
    setOpen(!open);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (date) => {
    const picked = startOfDay(date);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(picked);
      setDraftEnd(null);
    } else if (picked < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(picked);
    } else {
      setDraftEnd(picked);
    }
  };

  const apply = () => {
    if (draftStart && draftEnd) {
      onChange({ startDate: startOfDay(draftStart), endDate: endOfDay(draftEnd) });
      setOpen(false);
    } else if (draftStart && !draftEnd) {
      onChange({ startDate: startOfDay(draftStart), endDate: endOfDay(draftStart) });
      setOpen(false);
    }
  };

  const clear = () => {
    setDraftStart(null);
    setDraftEnd(null);
    onChange({ startDate: null, endDate: null });
  };

  const applyPreset = (preset) => {
    const now = new Date();
    let s, e;
    if (preset === "thisMonth") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === "lastMonth") {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === "last30") {
      s = new Date(now);
      s.setDate(s.getDate() - 29);
      e = now;
    } else if (preset === "thisYear") {
      s = new Date(now.getFullYear(), 0, 1);
      e = new Date(now.getFullYear(), 11, 31);
    }
    setDraftStart(startOfDay(s));
    setDraftEnd(endOfDay(e));
    onChange({ startDate: startOfDay(s), endDate: endOfDay(e) });
    setOpen(false);
  };

  const shiftMonth = (delta) => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  const label =
    draftStart && draftEnd
      ? `${toInputValue(draftStart)} → ${toInputValue(draftEnd)}`
      : draftStart
      ? `${toInputValue(draftStart)} → …`
      : "Select date range";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 hover:border-indigo-400 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <span className="flex items-center">
          <FiCalendar className="mr-2 h-5 w-5 text-indigo-500" />
          <span className={draftStart ? "text-gray-900" : "text-gray-500"}>
            {label}
          </span>
        </span>
        {draftStart && (
          <FiX
            className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-3 w-full max-w-xl bg-white border-2 border-indigo-200 rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in duration-200">
          {presetOptions && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "thisMonth", label: "This Month" },
                { key: "lastMonth", label: "Last Month" },
                { key: "last30", label: "Last 30 Days" },
                { key: "thisYear", label: "This Year" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition-all duration-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MonthCalendar
              monthDate={viewMonth}
              selectedStart={draftStart}
              selectedEnd={draftEnd}
              otherDate={draftEnd}
              onPick={handlePick}
            />
            <MonthCalendar
              monthDate={nextMonth}
              selectedStart={draftStart}
              selectedEnd={draftEnd}
              otherDate={draftStart}
              onPick={handlePick}
            />
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={clear}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!draftStart}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-200"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { toInputValue, parseInputValue };
