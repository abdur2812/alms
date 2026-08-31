"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiEdit, FiTrash2, FiShoppingBag, FiCalendar, FiHash, FiUsers } from "react-icons/fi";
import { PageHeader, Card, CardBody, Badge, Button, LoadingSpinner } from "@/components/UI";
import { purchasesAPI } from "@/lib/api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

export default function ViewPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await purchasesAPI.getById(params.id);
        if (!cancelled) setPurchase(res.data.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || "Failed to load purchase");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Delete this purchase? This cannot be undone.")) return;
    try {
      setDeleting(true);
      await purchasesAPI.delete(params.id);
      router.push("/dashboard/purchases");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete purchase");
      setDeleting(false);
    }
  };

  const chequeStatusVariant = (status) => {
    return status === "Cleared" ? "success" : "default";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <PageHeader title="Purchase" backLink="/dashboard/purchases" />
        <Card className="animate-fadeIn">
          <CardBody>
            <p className="text-center text-gray-500">{error || "Purchase not found."}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title={`Purchase ${purchase.purchaseNumber || purchase.invoiceNumber}`}
        subtitle="Purchase invoice details"
        action={
          <div className="flex gap-2">
            <Link href={`/dashboard/purchases/${purchase._id}/edit`}>
              <Button variant="secondary"><FiEdit className="mr-2" />Edit</Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}><FiTrash2 className="mr-2" />{deleting ? "Deleting..." : "Delete"}</Button>
          </div>
        }
        backLink="/dashboard/purchases"
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 animate-fadeIn">
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                <FiShoppingBag className="text-white h-4 w-4" />
              </div>
              Purchase Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Purchase No.</p>
                <p className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">{purchase.purchaseNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vendor Invoice No.</p>
                <p className="text-sm font-semibold text-gray-900">{purchase.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                  {new Date(purchase.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vendor</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <FiUsers className="h-3.5 w-3.5 text-gray-400" />
                  {purchase.vendorId?.name || "—"}
                </p>
                {purchase.vendorId?.phone && (
                  <p className="text-xs text-gray-500 mt-1">{purchase.vendorId.phone}</p>
                )}
              </div>
              {purchase.vendorId?.gstNumber && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vendor GSTIN</p>
                  <p className="text-sm font-mono font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg inline-block">{purchase.vendorId.gstNumber}</p>
                </div>
              )}
              {purchase.vendorId?.address && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vendor Address</p>
                  <p className="text-sm text-gray-700">{purchase.vendorId.address}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatINR(purchase.amount)}</p>
              </div>
            </div>

            {/* Vendor Bank Details — shown when available */}
            {purchase.vendorId?.bankDetails && (purchase.vendorId.bankDetails.bankName || purchase.vendorId.bankDetails.accountNumber || purchase.vendorId.bankDetails.ifscCode || purchase.vendorId.bankDetails.accountHolder || purchase.vendorId.bankDetails.branchName) && (
              <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiUsers className="h-3.5 w-3.5" /> Vendor Bank Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {purchase.vendorId.bankDetails.accountHolder && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">A/C Holder</p>
                      <p className="font-semibold text-gray-900">{purchase.vendorId.bankDetails.accountHolder}</p>
                    </div>
                  )}
                  {purchase.vendorId.bankDetails.bankName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Name</p>
                      <p className="font-semibold text-gray-900">{purchase.vendorId.bankDetails.bankName}</p>
                    </div>
                  )}
                  {purchase.vendorId.bankDetails.branchName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</p>
                      <p className="font-semibold text-gray-900">{purchase.vendorId.bankDetails.branchName}</p>
                    </div>
                  )}
                  {purchase.vendorId.bankDetails.accountNumber && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Number</p>
                      <p className="font-mono font-semibold text-gray-900">{purchase.vendorId.bankDetails.accountNumber}</p>
                    </div>
                  )}
                  {purchase.vendorId.bankDetails.ifscCode && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IFSC Code</p>
                      <p className="font-mono font-semibold text-gray-900">{purchase.vendorId.bankDetails.ifscCode}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="animate-fadeIn">
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                <FiHash className="text-white h-4 w-4" />
              </div>
              Cheque / Payment
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cheque Details</p>
                <p className="text-sm font-semibold text-gray-900">{purchase.chequeDetails || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cheque Amount</p>
                <p className="text-sm font-bold text-gray-900">{formatINR(purchase.chequeAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cheque Status</p>
                <Badge variant={chequeStatusVariant(purchase.chequeStatus)}>{purchase.chequeStatus}</Badge>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Passed Date</p>
                <p className="text-sm font-semibold text-gray-900">{purchase.passedDate ? new Date(purchase.passedDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}