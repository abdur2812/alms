"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Input,
  Badge,
  LoadingSpinner,
  EmptyState,
  Modal,
} from "@/components/UI";
import { FiShoppingBag, FiEdit2, FiTrash2 } from "react-icons/fi";

export default function ShopsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [formData, setFormData] = useState({
    shopName: "",
    email: "",
    password: "",
    ownerName: "",
    phone: "",
    address: "",
    isActive: true,
  });

  useEffect(() => {
    // Redirect if not super admin
    if (user && !user.isSuperAdmin) {
      router.push("/dashboard");
      return;
    }
    if (user?.isSuperAdmin) {
      fetchShops();
    }
  }, [user, router]);

  const fetchShops = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/shops");
      const data = await response.json();
      setShops(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingShop
        ? `http://localhost:3000/api/shops/${editingShop._id}`
        : "http://localhost:3000/api/shops";

      const method = editingShop ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchShops();
        setShowModal(false);
        setEditingShop(null);
        setFormData({
          shopName: "",
          email: "",
          password: "",
          ownerName: "",
          phone: "",
          address: "",
          isActive: true,
        });
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || "Failed to save shop"}`);
      }
    } catch (error) {
      console.error("Error saving shop:", error);
      alert("Network error: Could not connect to backend");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this shop?")) return;

    try {
      const response = await fetch(`http://localhost:3000/api/shops/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchShops();
      }
    } catch (error) {
      console.error("Error deleting shop:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreateModal = () => {
    setEditingShop(null);
    setFormData({
      shopName: "",
      email: "",
      password: "",
      ownerName: "",
      phone: "",
      address: "",
      isActive: true,
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Shop Management"
        subtitle="Manage shops (tenants) - Each shop has one login email"
        action={
          <Button onClick={openCreateModal} size="lg">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add New Shop
          </Button>
        }
      />

      {shops.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={FiShoppingBag}
              title="No shops yet"
              description="Get started by creating your first shop"
              action={
                <Button onClick={openCreateModal}>Create First Shop</Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Shop Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {shops.map((shop) => (
                  <tr
                    key={shop._id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold mr-3">
                          {shop.shopName.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-semibold text-gray-900">
                          {shop.shopName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{shop.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {shop.ownerName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {shop.phone || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={shop.isActive ? "success" : "danger"}>
                        {shop.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(shop.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(shop)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(shop._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingShop(null);
        }}
        title={editingShop ? "Edit Shop" : "Add New Shop"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Shop Name *"
            name="shopName"
            value={formData.shopName}
            onChange={handleChange}
            required
            placeholder="Enter shop name"
          />

          <Input
            label="Login Email *"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="shop@example.com"
          />

          <Input
            label={`Password ${editingShop ? "(Leave blank to keep current)" : "*"}`}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!editingShop}
            placeholder="Enter password"
          />

          <Input
            label="Owner Name"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            placeholder="Enter owner name"
          />

          <Input
            label="Phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              placeholder="Enter address"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
            ></textarea>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingShop(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingShop ? "Update Shop" : "Create Shop"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
