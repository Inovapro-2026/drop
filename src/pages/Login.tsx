import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const redirectUrl = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("E-mail e senha são campos obrigatórios.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success("Login efetuado com sucesso!");
        
        // If checking login as admin, navigate to admin panel, else to redirect url
        // Let's retrieve user from localStorage to verify roles
        const savedUserStr = localStorage.getItem("inovamarket_user");
        if (savedUserStr) {
          const userObj = JSON.parse(savedUserStr);
          if (userObj.role === "admin") {
            navigate("/admin/painel");
            return;
          }
        }

        navigate(redirectUrl);
      } else {
        toast.error(res.error || "Credenciais inválidas ou conta bloqueada.");
      }
    } catch (err) {
      toast.error("Falha ao se conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast.info("Digite seu e-mail no campo acima para recuperar a senha.");
      return;
    }
    toast.success(`Instruções de recuperação enviadas para o e-mail: ${email}`);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-12 px-4 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xs border border-slate-100">
        
        {/* Header */}
        <div className="text-center">
          <span className="bg-orange-100 text-orange-600 text-xs font-bold tracking-wider px-3 py-1 rounded-full uppercase inline-flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-4 h-4" />
            Acesso Seguro
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Entrar na sua Conta
          </h2>
          <p className="text-slate-500 text-xs mt-1.5">
            Insira suas credenciais cadastradas para gerenciar compras e suporte.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="exemplo@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Sua Senha
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-orange-500 hover:text-orange-600 font-semibold"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  placeholder="********"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Remember me Checkbox */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              Lembrar-me por 30 dias
            </label>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors shadow-xs"
          >
            {submitting ? "Autenticando..." : "Entrar na Conta"}
            {!submitting && <LogIn className="w-4 h-4" />}
          </button>
        </form>

        {/* Register CTA */}
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Ainda não tem cadastro?{" "}
            <Link
              to={`/cadastro?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-orange-500 hover:text-orange-600 font-bold inline-flex items-center gap-0.5"
            >
              Criar Conta Grátis
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
