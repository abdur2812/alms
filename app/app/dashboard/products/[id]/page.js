"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { productsAPI } from "@/lib/api";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  NumberInput,
  Input,
} from "@/components/UI";

export default function EditProductPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      gst: parseFloat(formData.gst),
      stockQuantity: parseInt(formData.stockQuantity),
    };

    try {
      const response = await productsAPI.update(id, productData);
      router.push("/dashboard/products");
    } catch (err) {
      console.error("Error updating product:", err);
      setError(err.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Edit Product"
        subtitle="Update product details and stock"
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
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

      <Card className="animate-fadeIn">
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Product Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                containerClassName="sm:col-span-2"
              />

              <NumberInput
                label="GST (%)"
                name="gst"
                min="0"
                max="100"
                step="0.01"
                value={formData.gst}
                onChange={handleChange}
                required
              />

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

              <Input
                label="HSN Code"
                name="hsnCode"
                value={formData.hsnCode}
                onChange={handleChange}
                placeholder="e.g., 2710"
              />

              <Input
                label="Part Number"
                name="partNo"
                value={formData.partNo}
                onChange={handleChange}
                placeholder="e.g., ABC123"
              />

              <NumberInput
                label="Price (₹)"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                prefix="₹"
                required
              />

              <NumberInput
                label="Stock Quantity"
                name="stockQuantity"
                min="0"
                value={formData.stockQuantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <Link href="/dashboard/products">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving} variant="primary">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
