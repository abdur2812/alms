"use client";
import { useState } from "react";
import {
  FiDownload,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { PageHeader, Card, CardBody, Button, Badge } from "@/components/UI";

export default function BulkProductsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [products, setProducts] = useState([
    {
      name: "",
      price: "",
      stockQuantity: "",
      description: "",
      gst: "18",
      hsnCode: "",
      partNo: "",
    },
  ]);

  const addRow = () => {
    setProducts((prev) => [
      ...prev,
      {
        name: "",
        price: "",
        stockQuantity: "",
        description: "",
        gst: "18",
        hsnCode: "",
        partNo: "",
      },
    ]);
  };

  const removeRow = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      const response = await productsAPI.bulkCreate({ products });
      const data = response.data;
      setResults(data.data);

      if (data.data.success.length > 0) {
        const failedProducts = data.data.failed.map((f) => f.data);
        if (failedProducts.length > 0) {
          setProducts(failedProducts);
        } else {
          setProducts([
            {
              name: "",
              price: "",
              stockQuantity: "",
              description: "",
              gst: "18",
              hsnCode: "",
              partNo: "",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error bulk creating products:", error);
      alert(error.response?.data?.message || "Error creating products");
    } finally {
      setLoading(false);
    }
  };

  const parseCsv = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const normalizeHeader = (h) => {
      const cleaned = h
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase();
      const map = {
        name: "name",
        price: "price",
        stockquantity: "stockQuantity",
        stock: "stockQuantity",
        gst: "gst",
        hsncode: "hsnCode",
        hsn: "hsnCode",
        partno: "partNo",
        part: "partNo",
        description: "description",
        desc: "description",
      };
      return map[cleaned] || cleaned;
    };

    const headers = lines[0].split(",").map(normalizeHeader);

    return lines
      .slice(1)
      .map((line) => {
        const values = line
          .split(",")
          .map((v) => v.trim().replace(/^"|"$/g, ""));
        const product = {
          name: "",
          price: "",
          stockQuantity: "",
          gst: "18",
          hsnCode: "",
          partNo: "",
          description: "",
        };
        headers.forEach((field, i) => {
          if (field in product) {
            product[field] = values[i] ?? "";
          }
        });
        return product;
      })
      .filter((p) => p.name.trim() !== "");
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
    const csv = "name,price,stockQuantity,gst,hsnCode,partNo,description\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
  };

  const inputClasses =
    "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <PageHeader
        title="Bulk Product Import"
        subtitle="Add multiple products at once with a CSV or manual rows"
        action={
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadTemplate} variant="secondary">
              <FiDownload className="mr-2" />
              Download Template
            </Button>
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <FiUpload className="mr-2" />
              Upload CSV
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        }
      />

      <Card className="mb-8 animate-fadeIn">
        <CardBody className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-700 font-semibold">Columns</p>
              <p className="text-sm text-gray-600 mt-1">
                name, price, gst, stockQuantity, hsnCode, partNo, description
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm">
              <p className="text-sm text-indigo-900 font-semibold">Tip</p>
              <p className="text-sm text-indigo-800 mt-1">
                Upload your CSV to prefill rows, then adjust any values inline.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
              <p className="text-sm text-amber-900 font-semibold flex items-center gap-2">
                <FiAlertTriangle className="h-4 w-4" /> Heads Up
              </p>
              <p className="text-sm text-amber-800 mt-1">
                HSN & Part No are optional — add for GST. Stock qty defaults to 0 if blank; GST defaults to 18%.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Product Name *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Price (₹) *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      GST (%) *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Stock Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      HSN Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Part No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {products.map((product, index) => (
                    <tr key={index} className="hover:bg-indigo-50/40">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) =>
                            handleChange(index, "name", e.target.value)
                          }
                          required
                          className={inputClasses}
                          placeholder="Product name"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={product.price}
                          onChange={(e) =>
                            handleChange(index, "price", e.target.value)
                          }
                          required
                          className={inputClasses}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={product.gst}
                          onChange={(e) =>
                            handleChange(index, "gst", e.target.value)
                          }
                          required
                          className={inputClasses}
                          placeholder="18"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={product.stockQuantity}
                          onChange={(e) =>
                            handleChange(index, "stockQuantity", e.target.value)
                          }
                          className={inputClasses}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={product.hsnCode || ""}
                          onChange={(e) =>
                            handleChange(index, "hsnCode", e.target.value)
                          }
                          className={inputClasses}
                          placeholder="HSN Code"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={product.partNo || ""}
                          onChange={(e) =>
                            handleChange(index, "partNo", e.target.value)
                          }
                          className={inputClasses}
                          placeholder="Part No"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={product.description}
                          onChange={(e) =>
                            handleChange(index, "description", e.target.value)
                          }
                          className={inputClasses}
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {products.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeRow(index)}
                            variant="danger"
                            size="sm"
                            className="!px-3"
                          >
                            <FiTrash2 className="mr-2" />
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" onClick={addRow} variant="secondary">
                <FiPlus className="mr-2" />
                Add Row
              </Button>

              <Button type="submit" disabled={loading} variant="primary">
                {loading ? "Importing..." : "Import Products"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {results && (
        <Card className="animate-fadeIn">
          <CardBody>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <FiUpload />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Import Results
                </h2>
                <p className="text-sm text-gray-600">
                  Review successes and fix any failed rows below.
                </p>
              </div>
            </div>

            {results.success.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <FiCheckCircle className="text-emerald-600" />
                  <h3 className="text-lg font-semibold text-emerald-700">
                    Successfully Imported ({results.success.length})
                  </h3>
                  <Badge variant="success">Ready</Badge>
                </div>
                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.success.map((product) => (
                      <div
                        key={product._id}
                        className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm"
                      >
                        <div className="font-semibold text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Price: {formatINR(product.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {results.failed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FiAlertTriangle className="text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-700">
                    Failed to Import ({results.failed.length})
                  </h3>
                  <Badge variant="warning">Needs Fix</Badge>
                </div>
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                  <div className="space-y-3">
                    {results.failed.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900">
                            {item.data.name || "N/A"}
                          </div>
                          <Badge variant="warning">Check row</Badge>
                        </div>
                        <div className="text-sm text-amber-700 mt-1">
                          Error: {item.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
