import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import Navbar from "./components/Navbar.tsx";
import Home from "./pages/Home.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import MyAccount from "./pages/MyAccount.tsx";
import AdminPainel from "./pages/AdminPainel.tsx";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#1E293B] text-slate-100 flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/produto/:id" element={<ProductDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Register />} />
                <Route path="/minha-conta" element={<MyAccount />} />
                <Route path="/admin/painel" element={<AdminPainel />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 text-center text-xs font-sans">
              <p>© {new Date().getFullYear()} INOVADROP Ltda. Todos os direitos reservados.</p>
            </footer>
          </div>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

