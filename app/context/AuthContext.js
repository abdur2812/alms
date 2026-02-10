"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Check if super admin
      if (email === "abnusuki@gmail.com") {
        if (password === "asdf") {
          const userData = {
            id: "super-admin",
            email: email,
            name: "Abu",
            isSuperAdmin: true,
          };

          const token = "super-admin-token-" + Date.now();
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          router.push("/dashboard");
          return { success: true };
        }
        throw new Error("Invalid password");
      }

      // For regular shops, validate against backend
      console.log("Logging in via API...");
      const response = await fetch("http://localhost:3000/api/shops/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();
      console.log("Login successful:", data);

      if (!data.success || !data.shop) {
        throw new Error("Invalid response from server");
      }

      const userData = {
        id: data.shop._id,
        email: data.shop.email,
        shopName: data.shop.shopName,
        ownerName: data.shop.ownerName,
        isSuperAdmin: false,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      router.push("/dashboard");
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
