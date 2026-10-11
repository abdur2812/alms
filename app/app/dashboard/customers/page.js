"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { customersAPI, invoicesAPI } from "@/lib/api";
import useFitRows from "@/lib/useFitRows";
import usePersistentState from "@/lib/usePersistentState";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiMail,
  FiPhone,
  FiFilter,
  FiFileText,
  FiUsers,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiEye,
  FiEdit2,
} from "react-icons/fi";
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Select,
  ListPage,
  ListToolbar,
  ToolbarDivider,
  ListCount,
  SearchBox,
  Segmented,
  ListPanel,
  ListScroll,
  PaginationBar,
} from "@/components/UI";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState("customers.search", "");
  const [page, setPage] = usePersistentState("customers.page", 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(null);
  const { ref: listRef, pageSize, ready } = useFitRows({ deps: [customers] });
  const [error, setError] = useState("");
  const [filterCredit, setFilterCredit] = usePersistentState("customers.credit", false);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  useEffect(() => {
    if (ready) fetchCustomers();
  }, [ready, pageSize, page, search, filterCredit]);

  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages);
  }, [loading, page, totalPages]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      if (filterCredit) params.hasCreditInvoices = true;
      const response = await customersAPI.getAll(params);
      setCustomers(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total ?? null);
      setError("");

      // Debug logging
    } catch (err) {
      setError("Failed to fetch customers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      await customersAPI.delete(id);
      fetchCustomers();
    } catch (err) {
      alert("Failed to delete customer");
      console.error(err);
    }
  };

  const toggleExpandCustomer = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  const markAsPaid = async (invoiceId) => {
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      await invoicesAPI.update(invoiceId, { status: "Paid" });
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark as paid");
    }
  };

  return (
    <ListPage>
      <PageHeader
        compact
        title="Customers"
        subtitle="Manage your customer relationships"
        action={
          <Button
            onClick={() => (window.location.href = "/dashboard/customers/new")}
            variant="primary"
          >
            <FiPlus className="mr-2" />
            Add Customer
          </Button>
        }
      />

      {error && (
        <div className="shrink-0 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {/* Customers table */}
      <ListPanel panelRef={listRef}>
        <ListToolbar>
        <SearchBox
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
        />
        <ToolbarDivider />
        <div className="flex items-center gap-2">
          <FiFilter className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-700">Dues</span>
          <Segmented
            value={filterCredit}
            onChange={(v) => {
              setFilterCredit(v);
              setPage(1);
            }}
            options={[
              { value: false, label: "All" },
              { value: true, label: "Pending (Credit)", tone: "text-red-600" },
            ]}
          />
        </div>
        <ListCount count={total} label="customer" />
      </ListToolbar>
        <div className="flex flex-col flex-1 min-h-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">
                Loading customers...
              </p>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="mb-4">
                <FiUsers className="mx-auto h-12 w-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                No customers found
              </p>
              <p className="mt-1">
                Try adjusting your search or filter to find what you're looking
                for.
              </p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() =>
                  (window.location.href = "/dashboard/customers/new")
                }
              >
                <FiPlus className="mr-2" />
                Add Customer
              </Button>
            </div>
          ) : (
            <>
              <ListScroll>
                <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Customer Info
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Contact Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {customers.map((customer, idx) => (
                    <React.Fragment key={customer._id}>
                      <tr className="hover:bg-indigo-50/30 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 shrink-0">
                              <div className="h-10 w-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {customer.name?.charAt(0).toUpperCase() ?? "?"}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">
                                {customer.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {customer._id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-sm text-gray-600 font-medium">
                              <FiMail className="mr-2 h-3.5 w-3.5 text-indigo-400" />
                              {customer.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 font-medium">
                              <FiPhone className="mr-2 h-3.5 w-3.5 text-purple-400" />
                              {customer.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-medium">
                            {(() => {
                              // Show permanent address first (preferred)
                              if (
                                customer.permanentAddress &&
                                (customer.permanentAddress.companyAddress ||
                                  customer.permanentAddress.city ||
                                  customer.permanentAddress.state)
                              ) {
                                const parts = [
                                  customer.permanentAddress.companyAddress,
                                  customer.permanentAddress.city,
                                  customer.permanentAddress.state,
                                ].filter(Boolean);

                                return (
                                  <>
                                    {parts.join(", ")}
                                    {customer.permanentAddress.country && (
                                      <span className="block text-xs text-gray-400 font-normal">
                                        {customer.permanentAddress.country}
                                      </span>
                                    )}
                                  </>
                                );
                              }

                              // Fallback to address field
                              if (
                                customer.address &&
                                (customer.address.companyAddress ||
                                  customer.address.city ||
                                  customer.address.state)
                              ) {
                                const parts = [
                                  customer.address.companyAddress,
                                  customer.address.city,
                                  customer.address.state,
                                ].filter(Boolean);

                                return (
                                  <>
                                    {parts.join(", ")}
                                    {customer.address.country && (
                                      <span className="block text-xs text-gray-400 font-normal">
                                        {customer.address.country}
                                      </span>
                                    )}
                                  </>
                                );
                              }

                              // Show permanent address country if available
                              if (customer.permanentAddress?.country) {
                                return (
                                  <span className="text-xs text-gray-400">
                                    {customer.permanentAddress.country}
                                  </span>
                                );
                              }

                              // Show shipping address country if available
                              if (customer.shippingAddress?.country) {
                                return (
                                  <span className="text-xs text-gray-400">
                                    {customer.shippingAddress.country}
                                  </span>
                                );
                              }

                              return (
                                <span className="text-gray-400">
                                  No location
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.creditAmount > 0 ? (
                            <div className="flex flex-col items-start">
                              <button
                                onClick={() =>
                                  toggleExpandCustomer(customer._id)
                                }
                                className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-sm font-bold border border-orange-200 hover:bg-orange-100 transition-colors"
                              >
                                ₹{customer.creditAmount.toFixed(2)}
                                {expandedCustomer === customer._id ? (
                                  <FiChevronUp className="ml-2 h-3 w-3" />
                                ) : (
                                  <FiChevronDown className="ml-2 h-3 w-3" />
                                )}
                              </button>
                              {customer.creditInvoices &&
                                customer.creditInvoices.length > 0 && (
                                  <span className="text-xs text-gray-500 mt-1">
                                    {customer.creditInvoices.length} invoice
                                    {customer.creditInvoices.length !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              No Credit
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                            <FiFileText className="mr-1.5 h-3 w-3" />
                            {customer.totalInvoices || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end space-x-2">
                            <Link
                              href={`/dashboard/customers/${customer._id}`}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                            >
                              <FiEdit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(customer._id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete Customer"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedCustomer === customer._id && (
                        <tr key={`${customer._id}-expanded`}>
                          <td
                            colSpan="6"
                            className="px-6 py-4 bg-linear-to-br from-indigo-50/60 via-purple-50/40 to-pink-50/40"
                          >
                            <div className="rounded-2xl bg-white border border-indigo-100 shadow-lg overflow-hidden">
                              {/* Header */}
                              <div className="px-5 py-3 bg-linear-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white tracking-wide">
                                  Credit Invoices
                                  {customer.creditInvoices &&
                                    customer.creditInvoices.length > 0 &&
                                    ` (${customer.creditInvoices.length})`}
                                </h4>
                                <span className="text-xs text-indigo-200 font-semibold">
                                  ₹{customer.creditAmount?.toFixed(2)}{" "}
                                  outstanding
                                </span>
                              </div>
                              {customer.creditInvoices &&
                              customer.creditInvoices.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                          Invoice #
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                          Date
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                          Due Date
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                          Status
                                        </th>
                                        <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                          Amount
                                        </th>
                                        <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                      {customer.creditInvoices.map(
                                        (invoice) => (
                                          <tr
                                            key={invoice._id}
                                            className="hover:bg-indigo-50/40 transition-colors duration-150"
                                          >
                                            <td className="px-4 py-3 text-sm font-semibold text-indigo-600">
                                              <Link
                                                href={`/dashboard/invoices/${invoice._id}`}
                                                className="hover:text-indigo-900 transition-colors"
                                              >
                                                {invoice.invoiceNumber}
                                              </Link>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                              {new Date(
                                                invoice.date,
                                              ).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                              {new Date(
                                                invoice.dueDate,
                                              ).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <span
                                                className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                                                  invoice.status === "Overdue"
                                                    ? "bg-red-100 text-red-700"
                                                    : invoice.status ===
                                                        "Partially Paid"
                                                      ? "bg-yellow-100 text-yellow-700"
                                                      : "bg-orange-100 text-orange-700"
                                                }`}
                                              >
                                                {invoice.status}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                              ₹{invoice.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                              <div className="inline-flex items-center gap-1.5 justify-end">
                                                <button
                                                  onClick={() =>
                                                    markAsPaid(invoice._id)
                                                  }
                                                  className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                                  title="Mark as Paid"
                                                >
                                                  <FiCheck className="h-3 w-3 mr-1" />
                                                  Paid
                                                </button>
                                                <Link
                                                  href={`/dashboard/invoices/${invoice._id}/view`}
                                                  className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                                  title="View PDF"
                                                >
                                                  <FiEye className="h-3 w-3 mr-1" />
                                                  PDF
                                                </Link>
                                                <Link
                                                  href={`/dashboard/invoices/${invoice._id}/edit`}
                                                  className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-gray-500 to-gray-600 text-white text-xs font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                                  title="Edit Invoice"
                                                >
                                                  <FiEdit2 className="h-3 w-3 mr-1" />
                                                  Edit
                                                </Link>
                                              </div>
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 text-center py-6">
                                  No unpaid invoices found for this customer.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </ListScroll>

              {/* Pagination */}
              <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </div>
      </ListPanel>
    </ListPage>
  );
}
