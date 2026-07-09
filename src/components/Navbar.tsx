import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, ShieldAlert, LogOut, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { toast } from "sonner";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="bg-[#0F172A] border-b border-slate-700/80 sticky top-0 z-40 font-sans shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo / Brand Name */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-display font-extrabold text-lg shadow-md shadow-orange-500/20">
            ID
          </div>
          <span className="font-display font-black text-slate-100 tracking-tight text-lg">
            INOVA<span className="text-orange-500">DROP</span>
          </span>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {/* Cart Indicator */}
          <Link
            to="/minha-conta?tab=carrinho"
            className="relative p-2 text-slate-300 hover:text-orange-500 hover:bg-slate-800/50 rounded-xl transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white font-bold text-[9px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0F172A] animate-pulse">
                {cartItems.length}
              </span>
            )}
          </Link>

          {/* Admin panel Shortcut link */}
          {user && user.role === "admin" && (
            <Link
              to="/admin/painel"
              className="hidden sm:inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl border border-slate-700 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
              Painel Admin
            </Link>
          )}

          {/* User profile / Login logout */}
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/minha-conta"
                className="flex items-center gap-2 border border-slate-700 hover:border-slate-600 py-1.5 px-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-all text-xs font-semibold text-slate-300"
              >
                <div className="w-6 h-6 bg-orange-500/20 text-orange-400 font-extrabold flex items-center justify-center rounded-full text-[10px]">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[80px] truncate hidden md:inline">{user.fullName.split(" ")[0]}</span>
              </Link>
              
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                  toast.success("Sessão finalizada com sucesso.");
                }}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors"
                title="Sair da Conta"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Link>
          )}

        </div>

      </div>
    </nav>
  );
}
