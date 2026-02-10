"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { productsAPI } from "@/lib/api";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

export default function EditProductPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    totalProductsAdded: "1",
    hsnCode: "",
    partNo: "",
    gst: "18",
    price: "",
    stockQuantity: "",
  });

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.getById(id);
      const product = response.data.data;
      setFormData({
        name: product.name,
        description: product.description || "",
        totalProductsAdded: product.totalProductsAdded || 1,
        hsnCode: product.hsnCode || "",
        partNo: product.partNo || "",
        gst: product.gst || 18,
        price: product.price,
        stockQuantity: product.stockQuantity,
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch product");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await productsAPI.update(id, {
        ...formData,
        price: parseFloat(formData.price),
        gst: parseFloat(formData.gst),
        totalProductsAdded: parseInt(formData.totalProductsAdded),
        stockQuantity: parseInt(formData.stockQuantity),
      });
      router.push("/dashboard/products");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <FiArrowLeft className="mr-2" />
          Back to Products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Product</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="totalProductsAdded"
                className="block text-sm font-medium text-gray-700"
              >
                Total Products Added <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="totalProductsAdded"
                id="totalProductsAdded"
                required
                min="1"
                value={formData.totalProductsAdded}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="gst"
                className="block text-sm font-medium text-gray-700"
              >
                GST (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="gst"
                id="gst"
                required
                min="0"
                max="100"
                step="0.01"
                value={formData.gst}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="hsnCode"
                className="block text-sm font-medium text-gray-700"
              >
                HSN Code
              </label>
              <input
                type="text"
                name="hsnCode"
                id="hsnCode"
                value={formData.hsnCode}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="partNo"
                className="block text-sm font-medium text-gray-700"
              >
                Part Number
              </label>
              <input
                type="text"
                name="partNo"
                id="partNo"
                value={formData.partNo}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700"
              >
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="price"
                  id="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="stockQuantity"
                className="block text-sm font-medium text-gray-700"
              >
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stockQuantity"
                id="stockQuantity"
                required
                min="0"
                value={formData.stockQuantity}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
