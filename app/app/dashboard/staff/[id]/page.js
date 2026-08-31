"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiUsers, FiSave, FiX, FiCheck, FiAlertCircle, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import { PageHeader, Card, CardBody, Input, Button, ConfirmDialog, LoadingSpinner } from "@/components/UI";
import { staffAPI } from "@/lib/api";

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await staffAPI.getById(id);
        if (!cancelled) setFormData(res.data.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || "Failed to load staff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.target);
    const data = {
      name: form.get("name"),
      phone: form.get("phone") || "",
      role: form.get("role"),
      dailyWage: parseFloat(form.get("dailyWage")) || 0,
      address: form.get("address") || "",
    };
    try {
      await staffAPI.update(id, data);
      setSaved(true);
      setTimeout(() => router.push("/dashboard/staff"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update staff");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await staffAPI.delete(id);
      setSaved(true);
      setTimeout(() => router.push("/dashboard/staff"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete staff");
      setConfirmDelete(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            Staff {formData ? (formData.name || "") : ""} saved successfully!
          </p>
        </div>
      </div>
    );
  }

  const labelClass = "block text-sm font-medium text-gray-700 mb-2";
  const inputClass =
    "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Edit Staff"
        subtitle={formData ? `Editing ${formData.name}` : "Editing staff member"}
        backLink="/dashboard/staff"
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <Card className="animate-fadeIn">
          <LoadingSpinner />
        </Card>
      ) : (
        <Card className="animate-fadeIn">
          <CardBody>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <FiUsers className="text-white" />
                    </div>
                    Staff Information
                  </h3>
                </div>
                <div>
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required defaultValue={formData.name} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" name="phone" defaultValue={formData.phone} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Role / Position <span className="text-red-500">*</span></label>
                  <input type="text" name="role" required defaultValue={formData.role} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Daily Wage (₹) <span className="text-red-500">*</span></label>
                  <input type="number" name="dailyWage" required min="0" step="0.01" defaultValue={formData.dailyWage} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <input type="text" name="address" defaultValue={formData.address} className={inputClass} />
                </div>
              </div>
              <div className="mt-8 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <FiTrash2 className="h-4 w-4" /> Delete Staff
                </button>
                <div className="flex gap-3">
                  <Link href="/dashboard/staff">
                    <Button variant="secondary" type="button">
                      <FiX className="mr-2 h-4 w-4" />Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving}>
                    <FiSave className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Staff"
        message={`Deactivate ${formData?.name}? They will be hidden from new attendance and salary entry, but their attendance, salary and payment history will be preserved.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}