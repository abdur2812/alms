"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiUsers, FiCheck, FiAlertCircle } from "react-icons/fi";
import { PageHeader, Card, CardBody, Input, Button } from "@/components/UI";
import { staffAPI } from "@/lib/api";
import Link from "next/link";

export default function NewStaffPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
      await staffAPI.create(data);
      setSaved(true);
      setTimeout(() => router.push("/dashboard/staff"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add staff");
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">Staff added successfully!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader title="Add Staff" subtitle="Register a new staff member" backLink="/dashboard/staff" />

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

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
              <Input label="Full Name" name="name" required placeholder="Enter staff name" />
              <Input label="Phone Number" type="tel" name="phone" placeholder="+91 9876543210" />
              <Input label="Role / Position" name="role" required placeholder="e.g. Mechanic, Helper" />
              <Input label="Daily Wage (₹)" type="number" name="dailyWage" required min="0" step="0.01" placeholder="800" />
              <div className="sm:col-span-2">
                <Input label="Address" name="address" placeholder="Full address" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Link href="/dashboard/staff">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <FiUsers className="mr-2" />
                {saving ? "Adding..." : "Add Staff"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}