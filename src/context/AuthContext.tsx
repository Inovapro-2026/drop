import React, { createContext, useState, useEffect, useContext } from "react";
import { User } from "../types.ts";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load credentials from localStorage
    const savedToken = localStorage.getItem("inovamarket_token");
    const savedUser = localStorage.getItem("inovamarket_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Erro ao realizar login." };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("inovamarket_token", data.token);
      localStorage.setItem("inovamarket_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: "Falha na conexão com o servidor." };
    }
  };

  const register = async (userData: Partial<User> & { password?: string }) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Erro ao cadastrar conta." };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("inovamarket_token", data.token);
      localStorage.setItem("inovamarket_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: "Falha na conexão com o servidor." };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("inovamarket_token");
    localStorage.removeItem("inovamarket_user");
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!token) return { success: false, error: "Não autenticado." };

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Erro ao atualizar perfil." };
      }

      setUser(data.user);
      localStorage.setItem("inovamarket_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: "Erro de conexão com o servidor." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
