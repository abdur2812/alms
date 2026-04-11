"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { customersAPI, productsAPI, invoicesAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import {
  FiUsers,
  FiPackage,
  FiFileText,
  FiAlertCircle,
  FiTrendingUp,
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

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

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
    </div>
  );
}
