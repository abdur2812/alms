"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { productsAPI } from "@/lib/api";
import usePersistentState from "@/lib/usePersistentState";
import { formatINR } from "@/lib/formatters";
import {
  PageHeader,
  Card,
  CardBody,
  Button,
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
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiAlertCircle,
  FiPackage,
  FiUpload,
  FiX,
} from "react-icons/fi";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState("products.search", "");
  const [page, setPage] = usePersistentState("products.page", 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(null);
  const [error, setError] = useState("");

  // Low-stock filter driven by URL (dashboard "View all" links here with ?lowStock=true)
  const lowStockOnly = searchParams.get("lowStock") === "true";

  useEffect(() => {
    fetchProducts();
  }, [page, search, lowStockOnly]);

  const setLowStockFilter = (on) => {
    setPage(1);
    router.replace(`/dashboard/products${on ? "?lowStock=true" : ""}`, { scroll: false });
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let response;
      if (search || lowStockOnly) {
        // Filtered view (search and/or low-stock) uses the filterable endpoint.
        // getPopular doesn't support the lowStock flag.
        const params = { page, limit: 20 };
        if (search) {
          params.search = search;
          params.includePartNo = true;
        }
        if (lowStockOnly) params.lowStock = "true";
        response = await productsAPI.getAll(params);
        setTotalPages(response?.data?.totalPages || 1);
        setTotal(response?.data?.total ?? null);
      } else {
        // Default: show most billed products first, paginated
        response = await productsAPI.getPopular({ page, limit: 20 });
        setTotalPages(response?.data?.totalPages || 1);
        setTotal(response?.data?.total ?? null);
      }
      setProducts(Array.isArray(response?.data?.data) ? response.data.data : []);
      setError("");
    } catch (err) {
      setError("Failed to fetch products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await productsAPI.delete(id);
      fetchProducts();
    } catch (err) {
      alert("Failed to delete product");
      console.error(err);
    }
  };

  const getThreshold = (product) =>
    Number.isFinite(Number(product.lowStockThreshold))
      ? Number(product.lowStockThreshold)
      : 10;

  const isLowStock = (product) =>
    product.stockQuantity > 0 && product.stockQuantity <= getThreshold(product);

  const getStockBadge = (product) => {
    if (product.stockQuantity === 0) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Out of Stock
        </span>
      );
    } else if (isLowStock(product)) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Low Stock (≤ {getThreshold(product)})
        </span>
      );
    } else {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          In Stock
        </span>
      );
    }
  };

  const exportStock = async () => {
    // Add confirmation dialog
    if (!confirm("Are you sure you want to export the stock report as CSV?")) {
      return;
    }

    try {
      // Fetch all products without pagination
      const response = await productsAPI.getAll({ limit: 10000 });
      const allProducts = response.data.data;

      // Create CSV content with order: name, price, gst, hsn, stock qty, alert threshold
      const headers = [
        "Product Name",
        "Price",
        "GST %",
        "HSN Code",
        "Stock Quantity",
        "Low Stock Alert At",
      ];
      const csvContent = [
        headers.join(","),
        ...allProducts.map((product) =>
          [
            `"${product.name}"`,
            product.price,
            product.gst || 0,
            product.hsnCode || "-",
            product.stockQuantity,
            product.lowStockThreshold ?? 10,
          ].join(","),
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export stock");
      console.error(err);
    }
  };

  return (
    <ListPage>
      <PageHeader
        compact
        title="Products"
        subtitle="Manage your product catalogue and stock"
        action={
          <div className="flex gap-3">
            <Button
              onClick={() => (window.location.href = "/dashboard/admin/bulk-products")}
              variant="secondary"
            >
              <FiUpload className="mr-2" />
              Bulk Import
            </Button>
            <Button
              onClick={() => (window.location.href = "/dashboard/products/new")}
              variant="primary"
            >
              <FiPlus className="mr-2" />
              Add Product
            </Button>
          </div>
        }
      />

      {error && (
        <div className="shrink-0 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {/* Products table */}
      <ListPanel>
        <ListToolbar>
        <SearchBox
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products by name or part no..."
        />
        <ToolbarDivider />
        <Segmented
          value={lowStockOnly}
          onChange={setLowStockFilter}
          options={[
            { value: false, label: "All Products" },
            { value: true, label: "Low Stock Only", tone: "text-orange-600" },
          ]}
        />
        {lowStockOnly && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full border border-orange-200">
            <FiAlertCircle className="h-3.5 w-3.5" />
            Showing low-stock items
            <button
              onClick={() => setLowStockFilter(false)}
              className="ml-1 hover:text-orange-900"
              title="Clear filter"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        <ListCount count={total} label="product" />
      </ListToolbar>
        <div className="flex flex-col flex-1 min-h-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">
                Loading products...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="mb-4">
                <FiPackage className="mx-auto h-12 w-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                {lowStockOnly ? "All products are well stocked!" : "No products found"}
              </p>
              <p className="mt-1">
                {lowStockOnly
                  ? "No items are at or below their alert level."
                  : "Try a different search term or add a new product."}
              </p>
            </div>
          ) : (
            <>
              <ListScroll>
                <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {products.map((product, idx) => (
                    <tr
                      key={product._id}
                      className="hover:bg-indigo-50/30 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-mono">
                          {product.serialNo || (page - 1) * 20 + idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {product.name}
                        </div>
                        {product.partNo ? (
                          <div className="text-xs text-gray-500 font-mono truncate max-w-xs">
                            Part No: {product.partNo}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatINR(product.price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900">
                            {product.stockQuantity}
                            <span className="text-xs text-gray-400">
                              {" "}
                              / alert at {getThreshold(product)}
                            </span>
                          </div>
                          {isLowStock(product) && (
                            <FiAlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStockBadge(product)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/products/${product._id}`}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                            title="Edit Product"
                          >
                            <FiEdit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete Product"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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
