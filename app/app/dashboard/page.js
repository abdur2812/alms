"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { customersAPI, productsAPI, invoicesAPI, purchasesAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import {
  FiUsers,
  FiPackage,
  FiFileText,
  FiAlertCircle,
  FiTrendingUp,
  FiShoppingBag,
  FiX,
} from "react-icons/fi";

const RupeeIcon = ({ className = "" }) => (
  <span
    className={`inline-flex h-8 w-8 items-center justify-center text-3xl leading-none font-bold text-white ${className}`}
    aria-hidden="true"
  >
    ₹
  </span>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    lowStockProducts: [],
    recentInvoices: [],
  });
  const [loading, setLoading] = useState(true);

  // Credit customers (grouped) - paginated with scroll
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [creditPage, setCreditPage] = useState(1);
  const [creditHasMore, setCreditHasMore] = useState(true);
  const [creditLoading, setCreditLoading] = useState(true);
  const [creditLoadingMore, setCreditLoadingMore] = useState(false);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerInvoicesLoading, setCustomerInvoicesLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Purchase pending vendors - grouped by vendor via pending purchases
  const [vendorGroups, setVendorGroups] = useState([]); // array of { key, vendor, vendorName, count, total, purchases }
  const [vendorGroupMap, setVendorGroupMap] = useState(new Map());
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseHasMore, setPurchaseHasMore] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [purchaseLoadingMore, setPurchaseLoadingMore] = useState(false);
  const [selectedVendorGroup, setSelectedVendorGroup] = useState(null);
  const [vendorPurchases, setVendorPurchases] = useState([]);
  const [vendorPurchasesLoading, setVendorPurchasesLoading] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchCreditCustomers = async (page = 1, append = false) => {
    if (append) setCreditLoadingMore(true);
    else setCreditLoading(true);
    try {
      const res = await customersAPI.getAll({ hasCreditInvoices: "true", limit: 10, page });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const totalPages = res.data?.totalPages || 1;
      if (append) setCreditCustomers((prev) => [...prev, ...data]);
      else setCreditCustomers(data);
      setCreditHasMore(page < totalPages);
      setCreditPage(page);
    } catch (err) {
      console.error("Failed to fetch credit customers", err);
      if (!append) setCreditCustomers([]);
    } finally {
      setCreditLoading(false);
      setCreditLoadingMore(false);
    }
  };

  const fetchPurchaseVendors = async (page = 1, append = false) => {
    if (append) setPurchaseLoadingMore(true);
    else setPurchaseLoading(true);
    try {
      const res = await purchasesAPI.getAll({ chequeStatus: "Pending", limit: 20, page });
      const purchases = Array.isArray(res.data?.data) ? res.data.data : [];
      const totalPages = res.data?.totalPages || 1;
      setPurchaseHasMore(page < totalPages);
      setPurchasePage(page);
      // Group by vendor
      setVendorGroupMap((prevMap) => {
        const nextMap = append ? new Map(prevMap) : new Map();
        for (const p of purchases) {
          const vId = p.vendorId?._id || p.vendorId || "no-vendor";
          const key = String(vId);
          if (!nextMap.has(key)) {
            nextMap.set(key, {
              key,
              vendor: p.vendorId,
              vendorName: p.vendorId?.name || (p.vendorId ? "Unknown Vendor" : "No Vendor"),
              vendorPhone: p.vendorId?.phone || "",
              count: 0,
              total: 0,
              purchases: [],
            });
          }
          const entry = nextMap.get(key);
          entry.count += 1;
          entry.total += Number(p.amount) || 0;
          entry.purchases.push(p);
        }
        // Convert to sorted array (by total descending)
        const arr = Array.from(nextMap.values()).sort((a, b) => b.total - a.total);
        setVendorGroups(arr);
        return nextMap;
      });
    } catch (err) {
      console.error("Failed to fetch purchase vendors", err);
      if (!append) {
        setVendorGroups([]);
        setVendorGroupMap(new Map());
      }
    } finally {
      setPurchaseLoading(false);
      setPurchaseLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCreditCustomers(1, false);
    fetchPurchaseVendors(1, false);
  }, []);

  const handleCreditScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 80 && creditHasMore && !creditLoadingMore && !creditLoading) {
      fetchCreditCustomers(creditPage + 1, true);
    }
  };

  const handlePurchaseScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 80 && purchaseHasMore && !purchaseLoadingMore && !purchaseLoading) {
      fetchPurchaseVendors(purchasePage + 1, true);
    }
  };

  const openCustomerCreditModal = async (customer) => {
    setSelectedCreditCustomer(customer);
    setShowCustomerModal(true);
    setCustomerInvoicesLoading(true);
    try {
      // Prefer invoicesAPI for paginated, but use customersAPI.getCredit for full
      const res = await customersAPI.getCredit(customer._id);
      const data = res.data?.data;
      const invoices = data?.creditInvoices || [];
      // If not enough via that endpoint, fallback to invoicesAPI
      if (invoices.length === 0) {
        const invRes = await invoicesAPI.getAll({ customerId: customer._id, billType: "credit", limit: 100, page: 1 });
        setCustomerInvoices(Array.isArray(invRes.data?.data) ? invRes.data.data : []);
      } else {
        setCustomerInvoices(invoices);
      }
    } catch (err) {
      console.error("Failed to fetch customer credit invoices", err);
      setCustomerInvoices([]);
    } finally {
      setCustomerInvoicesLoading(false);
    }
  };

  const openVendorModal = async (group) => {
    setSelectedVendorGroup(group);
    setShowVendorModal(true);
    // If vendor is "no-vendor", just show the grouped purchases we already have
    if (!group.vendor?._id) {
      setVendorPurchases(group.purchases);
      return;
    }
    setVendorPurchasesLoading(true);
    try {
      const res = await purchasesAPI.getAll({ vendorId: group.vendor._id || group.vendor, chequeStatus: "Pending", limit: 100, page: 1 });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setVendorPurchases(data.length ? data : group.purchases);
    } catch (err) {
      console.error("Failed to fetch vendor purchases", err);
      setVendorPurchases(group.purchases);
    } finally {
      setVendorPurchasesLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Wait for user context to be available
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch operational data
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        const monthRangeParams = {
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
          isGstBill: "true",
        };

        const [
          customersRes,
          productsRes,
          monthlyStatsRes,
          recentInvoicesRes,
          lowStockRes,
        ] = await Promise.allSettled([
          customersAPI.getAll({ limit: 1 }),
          productsAPI.getAll({ limit: 1 }),
          invoicesAPI.getStats(monthRangeParams),
          invoicesAPI.getAll({ limit: 5 }),
          productsAPI.getLowStock(),
        ]);
        const customersData =
          customersRes.status === "fulfilled" ? customersRes.value?.data : null;
        const productsData =
          productsRes.status === "fulfilled" ? productsRes.value?.data : null;
        const monthlyStats =
          monthlyStatsRes.status === "fulfilled"
            ? monthlyStatsRes.value?.data?.data || {}
            : {};
        const lowStockProducts =
          lowStockRes.status === "fulfilled" &&
          Array.isArray(lowStockRes.value?.data?.data)
            ? lowStockRes.value.data.data
            : [];
        const recentInvoices =
          recentInvoicesRes.status === "fulfilled" &&
          Array.isArray(recentInvoicesRes.value?.data?.data)
            ? recentInvoicesRes.value.data.data
          : [];

        if (customersRes.status === "rejected") {
          console.error("customersAPI.getAll failed", customersRes.reason);
        }
        if (productsRes.status === "rejected") {
          console.error("productsAPI.getAll failed", productsRes.reason);
        }
        if (monthlyStatsRes.status === "rejected") {
          console.error("invoicesAPI.getStats failed", monthlyStatsRes.reason);
        }
        if (recentInvoicesRes.status === "rejected") {
          console.error("invoicesAPI.getAll failed", recentInvoicesRes.reason);
        }
        if (lowStockRes.status === "rejected") {
          console.error("productsAPI.getLowStock failed", lowStockRes.reason);
        }

        setStats({
          totalCustomers: customersData?.total || 0,
          totalProducts: productsData?.total || 0,
          totalInvoices: monthlyStats.totalInvoices || 0,
          totalRevenue: monthlyStats.totalRevenue || 0,
          lowStockProducts: lowStockProducts.slice(0, 5),
          recentInvoices,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStats({
          totalCustomers: 0,
          totalProducts: 0,
          totalInvoices: 0,
          totalRevenue: 0,
          lowStockProducts: [],
          recentInvoices: [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatCards = () => {
    return [
      {
        title: "Total Customers",
        value: stats.totalCustomers,
        icon: FiUsers,
        color: "bg-blue-500",
        link: "/dashboard/customers",
      },
      {
        title: "Total Products",
        value: stats.totalProducts,
        icon: FiPackage,
        color: "bg-green-500",
        link: "/dashboard/products",
      },
      {
        title: "Total Invoices",
        value: stats.totalInvoices,
        icon: FiFileText,
        color: "bg-purple-500",
        link: "/dashboard/invoices",
      },
      {
        title: "Total Revenue",
        value: formatINR(stats.totalRevenue),
        icon: RupeeIcon,
        color: "bg-indigo-500",
        link: "/dashboard/invoices",
      },
    ];
  };

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Paid: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  };

  const recentInvoices = Array.isArray(stats?.recentInvoices)
    ? stats.recentInvoices
    : [];
  const lowStockProducts = Array.isArray(stats?.lowStockProducts)
    ? stats.lowStockProducts
    : [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to ALMS Billing System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {getStatCards().map((stat, index) => {
          const gradients = [
            "from-blue-500 to-cyan-500",
            "from-purple-500 to-pink-500",
            "from-orange-500 to-red-500",
            "from-green-500 to-emerald-500",
          ];
          const gradient = gradients[index % gradients.length];

          return (
            <Link
              key={index}
              href={stat.link}
              className="group relative bg-white overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Gradient background overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              ></div>

              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex-shrink-0 bg-gradient-to-br ${gradient} rounded-2xl p-4 shadow-md`}
                  >
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Decorative element */}
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  View details
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Credit & Purchase Reminders - Grouped by Company with scroll & modals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Credit Sales Reminder - Customers with credit */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-red-100 flex flex-col">
          <div className="px-6 py-5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mr-3">
                  <FiAlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Credit Sales</h2>
                  <p className="text-xs text-gray-600">Customers with unpaid credit</p>
                </div>
              </div>
              <Link href="/dashboard/invoices?billType=credit" className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center">
                View all
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div onScroll={handleCreditScroll} className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {creditLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading credit customers...</p>
              </div>
            ) : creditCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFileText className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium">No pending credit sales!</p>
                <p className="text-sm">All credit payments are settled.</p>
              </div>
            ) : (
              <>
                {creditCustomers.map((customer) => {
                  const count = customer.creditInvoices?.length || customer.totalInvoices || 0;
                  const amount = customer.creditAmount ?? customer.creditInvoices?.reduce((s, inv) => s + (inv.totalAmount || 0), 0) ?? 0;
                  return (
                    <button
                      key={customer._id}
                      onClick={() => openCustomerCreditModal(customer)}
                      className="w-full text-left px-6 py-4 hover:bg-red-50/50 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {customer.phone || "No phone"} • {count} invoice{count !== 1 ? "s" : ""} pending
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-red-600">{formatINR(amount)}</p>
                        <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">View</span>
                      </div>
                    </button>
                  );
                })}
                {creditLoadingMore && (
                  <div className="p-4 text-center text-xs text-gray-500">Loading more...</div>
                )}
                {!creditHasMore && creditCustomers.length > 0 && (
                  <div className="p-3 text-center text-xs text-gray-400">All customers loaded • Scrollable</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Purchase Reminder - Vendors with unpaid (Pending cheque) */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100 flex flex-col">
          <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mr-3">
                  <FiShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Purchase Due</h2>
                  <p className="text-xs text-gray-600">Vendors with unpaid purchases</p>
                </div>
              </div>
              <Link href="/dashboard/purchases" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center">
                View all
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div onScroll={handlePurchaseScroll} className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {purchaseLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading vendors...</p>
              </div>
            ) : vendorGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiShoppingBag className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium">No pending purchases!</p>
                <p className="text-sm">All vendor payments are cleared.</p>
              </div>
            ) : (
              <>
                {vendorGroups.map((group) => (
                  <button
                    key={group.key}
                    onClick={() => openVendorModal(group)}
                    className="w-full text-left px-6 py-4 hover:bg-amber-50/50 transition-all duration-200 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{group.vendorName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {group.vendorPhone || "No phone"} • {group.count} invoice{group.count !== 1 ? "s" : ""} pending
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-amber-600">{formatINR(group.total)}</p>
                      <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">View</span>
                    </div>
                  </button>
                ))}
                {purchaseLoadingMore && <div className="p-4 text-center text-xs text-gray-500">Loading more...</div>}
                {!purchaseHasMore && vendorGroups.length > 0 && <div className="p-3 text-center text-xs text-gray-400">All vendors loaded • Scrollable</div>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-3">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Invoices
                </h2>
              </div>
              <Link
                href="/dashboard/invoices"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                View all
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium">No invoices yet.</p>
                <Link
                  href="/dashboard/invoices/new"
                  className="mt-3 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create your first invoice →
                </Link>
              </div>
            ) : (
              recentInvoices.map((invoice) => (
                <Link
                  key={invoice._id}
                  href={`/dashboard/invoices/${invoice._id}/view`}
                  className="block px-6 py-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {invoice.customerData?.name ||
                          invoice.customerId?.name ||
                          "N/A"}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatINR(invoice.totalAmount || 0)}
                      </p>
                      <span
                        className={`mt-1 inline-flex px-2 text-xs font-semibold rounded-full ${statusColors[invoice.status]}`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-5 bg-gradient-to-r from-orange-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3">
                  <FiAlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Low Stock Alerts
                </h2>
              </div>
              <Link
                href="/dashboard/products"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                View all
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiPackage className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium">All products are well stocked!</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <Link
                  key={product._id}
                  href={`/dashboard/products/${product._id}`}
                  className="block px-6 py-4 hover:bg-gradient-to-r hover:from-orange-50 hover:to-white transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200">
                        {product.stockQuantity} left
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <svg
            className="w-6 h-6 mr-2 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/invoices/new"
            className="group relative overflow-hidden flex items-center justify-center px-6 py-4 border-2 border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            <FiFileText className="mr-2 w-5 h-5" />
            Create Invoice
          </Link>
          <Link
            href="/dashboard/customers/new"
            className="group flex items-center justify-center px-6 py-4 border-2 border-gray-200 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 transform hover:-translate-y-1 shadow-md hover:shadow-lg"
          >
            <FiUsers className="mr-2 w-5 h-5" />
            Add Customer
          </Link>
          <Link
            href="/dashboard/products/new"
            className="group flex items-center justify-center px-6 py-4 border-2 border-gray-200 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 transform hover:-translate-y-1 shadow-md hover:shadow-lg"
          >
            <FiPackage className="mr-2 w-5 h-5" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Customer Credit Modal - scrollable invoice list */}
      {showCustomerModal && selectedCreditCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCustomerModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedCreditCustomer.name}</h3>
                <p className="text-xs text-gray-600">{selectedCreditCustomer.phone || "No phone"} • {formatINR(selectedCreditCustomer.creditAmount || 0)} pending</p>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-gray-700">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {customerInvoicesLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading invoices...</p>
                </div>
              ) : customerInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No credit invoices found for this customer.</div>
              ) : (
                customerInvoices.map((inv) => (
                  <Link
                    key={inv._id}
                    href={`/dashboard/invoices/${inv._id}/view`}
                    className="block px-6 py-4 hover:bg-red-50/50 transition-colors"
                    onClick={() => setShowCustomerModal(false)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString("en-IN")} • {inv.billType}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-bold text-gray-900">{formatINR(inv.totalAmount || 0)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">Scrollable • All unpaid credit invoices for {selectedCreditCustomer.name}</div>
          </div>
        </div>
      )}

      {/* Vendor Pending Modal - scrollable purchase list */}
      {showVendorModal && selectedVendorGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowVendorModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedVendorGroup.vendorName}</h3>
                <p className="text-xs text-gray-600">{selectedVendorGroup.vendorPhone || "No phone"} • {formatINR(selectedVendorGroup.total)} pending • {selectedVendorGroup.count} invoices</p>
              </div>
              <button onClick={() => setShowVendorModal(false)} className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-gray-700">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {vendorPurchasesLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading purchases...</p>
                </div>
              ) : vendorPurchases.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No pending purchases for this vendor.</div>
              ) : (
                vendorPurchases.map((pur) => (
                  <Link
                    key={pur._id}
                    href={`/dashboard/purchases/${pur._id}/view`}
                    className="block px-6 py-4 hover:bg-amber-50/50 transition-colors"
                    onClick={() => setShowVendorModal(false)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{pur.purchaseNumber || pur.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(pur.date).toLocaleDateString("en-IN")} • {pur.invoiceNumber}</p>
                        {pur.chequeDetails && <p className="text-xs text-gray-400 truncate">Cheque: {pur.chequeDetails}</p>}
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-bold text-gray-900">{formatINR(pur.amount || 0)}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">{pur.chequeStatus}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">Scrollable • All unpaid purchase invoices for {selectedVendorGroup.vendorName}</div>
          </div>
        </div>
      )}
    </div>
  );
}
