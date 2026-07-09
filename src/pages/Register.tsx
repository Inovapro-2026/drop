import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, ShieldAlert, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [document, setDocument] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const redirectUrl = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      toast.error("Preencha todos os campos obrigatórios (Nome, E-mail, Senha).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await register({
        fullName,
        email,
        password,
        phone,
        document,
      });

      if (res.success) {
        toast.success("Conta criada e login efetuado com sucesso!");
        navigate(redirectUrl);
      } else {
        toast.error(res.error || "Erro ao realizar cadastro.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 py-12 px-4 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xs border border-slate-100">
        
        {/* Header */}
        <div className="text-center">
          <span className="bg-orange-100 text-orange-600 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase inline-flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5" />
            Cadastre-se
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Criar sua Conta Grátis
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Faça seu cadastro rápido e compre com segurança.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              placeholder="Digite seu nome completo"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Endereço de E-mail *
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Senha de Acesso *
            </label>
            <input
              type="password"
              placeholder="Crie uma senha forte"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                CPF / CNPJ
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Telefone
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors shadow-xs"
            >
              {submitting ? "Efetuando Cadastro..." : "Cadastrar e Entrar"}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Login CTA */}
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Já possui uma conta ativa?{" "}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-orange-500 hover:text-orange-600 font-bold inline-flex items-center gap-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Fazer Login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
