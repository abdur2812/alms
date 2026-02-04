"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { customersAPI, productsAPI, invoicesAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import {
  FiUsers,
  FiPackage,
  FiFileText,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
} from "react-icons/fi";

export default function DashboardPage() {
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
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [customersRes, productsRes, invoicesRes, lowStockRes] =
        await Promise.all([
          customersAPI.getAll({ limit: 1 }),
          productsAPI.getAll({ limit: 1 }),
          invoicesAPI.getAll({ limit: 5 }),
          productsAPI.getLowStock(),
        ]);

      // Calculate total revenue from paid invoices
      const allInvoicesRes = await invoicesAPI.getAll({
        status: "Paid",
        limit: 1000,
      });
      const totalRevenue = allInvoicesRes.data.data.reduce(
        (sum, invoice) => sum + (invoice.totalAmount || 0),
        0,
      );

      setStats({
        totalCustomers: customersRes.data.total,
        totalProducts: productsRes.data.total,
        totalInvoices: invoicesRes.data.total,
        totalRevenue: totalRevenue,
        lowStockProducts: lowStockRes.data.data.slice(0, 5),
        recentInvoices: invoicesRes.data.data,
      });
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
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
      icon: FiDollarSign,
      color: "bg-indigo-500",
      link: "/dashboard/invoices",
    },
  ];

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Paid: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to your ERP Billing System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            href={stat.link}
            className="bg-white overflow-hidden shadow-md rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Invoices
              </h2>
              <Link
                href="/dashboard/invoices"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentInvoices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No invoices yet.</p>
                <Link
                  href="/dashboard/invoices/new"
                  className="mt-2 inline-block text-indigo-600 hover:text-indigo-700"
                >
                  Create your first invoice
                </Link>
              </div>
            ) : (
              stats.recentInvoices.map((invoice) => (
                <Link
                  key={invoice._id}
                  href={`/dashboard/invoices/${invoice._id}/view`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {invoice.customerId?.name || "N/A"}
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
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiAlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Low Stock Alerts
                </h2>
              </div>
              <Link
                href="/dashboard/products"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No low stock products.</p>
              </div>
            ) : (
              stats.lowStockProducts.map((product) => (
                <Link
                  key={product._id}
                  href={`/dashboard/products/${product._id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        SKU: {product.sku}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
      <div className="mt-8 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/invoices/new"
            className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <FiFileText className="mr-2" />
            Create Invoice
          </Link>
          <Link
            href="/dashboard/customers/new"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiUsers className="mr-2" />
            Add Customer
          </Link>
          <Link
            href="/dashboard/products/new"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiPackage className="mr-2" />
            Add Product
          </Link>
        </div>
      </div>
    </div>
  );
}
