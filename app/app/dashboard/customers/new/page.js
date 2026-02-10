"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customersAPI } from "@/lib/api";
import { FiUser } from "react-icons/fi";
import {
  PageHeader,
  Card,
  CardBody,
  Input,
  Select,
  Dropdown,
  Button,
} from "@/components/UI";
import Link from "next/link";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    customerType: "individual",
    name: "",
    pocName: "",
    phone: "",
    gstNumber: "",
    address: {
      companyAddress: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await customersAPI.create(formData);
      router.push("/dashboard/customers");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Add New Customer"
        subtitle="Create a new customer record"
        backLink="/dashboard/customers"
      />

      <Card className="animate-fadeIn">
        <CardBody>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Basic Information */}
              <div className="sm:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                    <FiUser className="text-white" />
                  </div>
                  Basic Information
                </h3>
              </div>

              <Dropdown
                label="Customer Type"
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                placeholder="Select customer type"
                options={[
                  { value: "individual", label: "Individual" },
                  { value: "business", label: "Business" },
                ]}
                required
              />

              <Input
                label={
                  formData.customerType === "business"
                    ? "Business Name"
                    : "Name"
                }
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter name"
              />

              <Input
                label="POC Name"
                name="pocName"
                value={formData.pocName}
                onChange={handleChange}
                required={formData.customerType === "business"}
                placeholder="Point of Contact Name"
              />

              <Input
                label="Phone Number"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+91 1234567890"
              />

              <Input
                label="GST Number"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                placeholder="e.g., 22AAAAA0000A1Z5"
                className="uppercase"
              />

              {/* Address Information */}
              <div className="sm:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-4">
                  Address
                </h3>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Company Address"
                  name="address.companyAddress"
                  value={formData.address.companyAddress}
                  onChange={handleChange}
                  placeholder="Full address"
                />
              </div>

              <Input
                label="City"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="City name"
              />

              <Input
                label="State/Province"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="State or Province"
              />

              <Input
                label="Postal Code"
                name="address.postalCode"
                value={formData.address.postalCode}
                onChange={handleChange}
                placeholder="Postal/ZIP code"
              />

              <Input
                label="Country"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="Country"
              />
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <Link href="/dashboard/customers">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    <FiUser className="mr-2" />
                    Create Customer
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
