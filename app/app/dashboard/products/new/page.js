"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { productsAPI } from "@/lib/api";
import {
  PageHeader,
  Card,
  CardBody,
  Input,
  Select,
  Dropdown,
  Button,
} from "@/components/UI";
import { FiArrowLeft, FiPackage } from "react-icons/fi";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await productsAPI.create({
        ...formData,
        price: parseFloat(formData.price),
        gst: parseFloat(formData.gst),
        totalProductsAdded: parseInt(formData.totalProductsAdded),
        stockQuantity: parseInt(formData.stockQuantity),
      });
      // Wait a moment then redirect to ensure backend has processed
      setTimeout(() => {
        router.push("/dashboard/products");
      }, 500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Add New Product"
        subtitle="Create a new product with all details"
        action={
          <Link href="/dashboard/products">
            <Button variant="secondary" size="md">
              <FiArrowLeft className="mr-2" />
              Back to Products
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm animate-shake">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card className="animate-fadeIn">
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Product Name */}
              <Input
                label="Product Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                containerClassName="sm:col-span-2"
              />

              {/* Total Products Added */}
              <Input
                label="Total Products Added"
                name="totalProductsAdded"
                type="number"
                required
                min="1"
                value={formData.totalProductsAdded}
                onChange={handleChange}
              />

              {/* GST */}
              <Input
                label="GST (%)"
                name="gst"
                type="number"
                required
                min="0"
                max="100"
                step="0.01"
                value={formData.gst}
                onChange={handleChange}
                placeholder="18"
              />

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900"
                  placeholder="Enter product description"
                />
              </div>

              {/* HSN Code */}
              <Input
                label="HSN Code"
                name="hsnCode"
                value={formData.hsnCode}
                onChange={handleChange}
                placeholder="e.g., 2710"
              />

              {/* Part No */}
              <Input
                label="Part No"
                name="partNo"
                value={formData.partNo}
                onChange={handleChange}
                placeholder="e.g., ABC123"
              />

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Stock Quantity */}
              <Input
                label="Stock Quantity"
                name="stockQuantity"
                type="number"
                required
                min="0"
                value={formData.stockQuantity}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end space-x-3">
              <Link href="/dashboard/products">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <FiPackage className="mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
