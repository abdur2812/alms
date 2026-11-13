"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

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

    // localStorage only exists in the browser, so it can only be read after mount
    /* eslint-disable react-hooks/set-state-in-effect */
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    // Confirm the saved token with the server. A rejected token (401) is cleared and sent
    // to /login by the API client; network errors keep the session.
    if (localStorage.getItem("token")) {
      api.get("/api/auth/me").catch(() => {});
    }
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      router.push("/dashboard");
      return { success: true };
    } catch (error) {
      if (error.response) {
        // 400/401/429/503 from the server carry a readable message
        throw new Error(error.response.data?.message || "Login failed");
      }
      throw new Error("Cannot reach the server. Check your connection and try again.");
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
