"use client";
import { useState } from "react";
import { formatINR } from "@/lib/formatters";

export default function BulkProductsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [products, setProducts] = useState([
    { name: "", sku: "", price: "", stockQuantity: "", description: "" },
  ]);

  const addRow = () => {
    setProducts([
      ...products,
      { name: "", sku: "", price: "", stockQuantity: "", description: "" },
    ]);
  };

  const removeRow = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch("http://localhost:3000/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });

      const data = await response.json();
      setResults(data.data);

      // Clear successful products from form
      if (data.data.success.length > 0) {
        // Keep only failed products in the form
        const failedProducts = data.data.failed.map((f) => f.data);
        if (failedProducts.length > 0) {
          setProducts(failedProducts);
        } else {
          // If all succeeded, reset form
          setProducts([
            {
              name: "",
              sku: "",
              price: "",
              stockQuantity: "",
              description: "",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error bulk creating products:", error);
      alert("Error creating products");
    } finally {
      setLoading(false);
    }
  };

  const parseCsv = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const product = {};
      headers.forEach((header, index) => {
        product[header.toLowerCase()] = values[index] || "";
      });
      data.push(product);
    }

    return data;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCsv(text);
      if (parsed.length > 0) {
        setProducts(parsed);
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = "name,sku,price,stockQuantity,description\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bulk Product Import</h1>
        <p className="text-gray-600 mt-1">
          Add multiple products at once using the form or CSV upload
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Download CSV Template
          </button>
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product Name *
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU *
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price (₹) *
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) =>
                          handleChange(index, "name", e.target.value)
                        }
                        required
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Product name"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={product.sku}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "sku",
                            e.target.value.toUpperCase(),
                          )
                        }
                        required
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="SKU123"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={product.price}
                        onChange={(e) =>
                          handleChange(index, "price", e.target.value)
                        }
                        required
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={product.stockQuantity}
                        onChange={(e) =>
                          handleChange(index, "stockQuantity", e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={product.description}
                        onChange={(e) =>
                          handleChange(index, "description", e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              + Add Row
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Importing..." : "Import Products"}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Import Results</h2>

          {results.success.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                ✓ Successfully Imported ({results.success.length})
              </h3>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {results.success.map((product) => (
                    <div
                      key={product._id}
                      className="bg-white p-3 rounded border border-green-200"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">
                        SKU: {product.sku} | Price: {formatINR(product.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {results.failed.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                ✗ Failed to Import ({results.failed.length})
              </h3>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="space-y-2">
                  {results.failed.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded border border-red-200"
                    >
                      <div className="font-medium">
                        {item.data.name || "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">
                        SKU: {item.data.sku || "N/A"}
                      </div>
                      <div className="text-sm text-red-600 mt-1">
                        Error: {item.error}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
