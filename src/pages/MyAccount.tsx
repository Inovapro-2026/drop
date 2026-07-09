import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ShoppingBag, ShoppingCart, BarChart3, MapPin, 
  MessageSquare, GraduationCap, Copy, Trash2, 
  Send, Calendar, DollarSign, ListOrdered, 
  Play, ExternalLink, CheckCircle, Clock, Truck, 
  AlertTriangle, ShieldAlert, Edit, Save 
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { Order, Product, TrainingLesson, ChatMessage, ChatSession } from "../types.ts";
import { toast } from "sonner";
import { formatPrice } from "./Home.tsx";
import { 
  ResponsiveContainer, LineChart, Line, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend 
} from "recharts";

export default function MyAccount() {
  const { user, token, logout, updateProfile } = useAuth();
  const { cartItems, removeFromCart, updateQuantity, cartTotal, checkout } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab state
  const activeTab = searchParams.get("tab") || "pedidos";

  // Data states
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [trainings, setTrainings] = useState<TrainingLesson[]>([]);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  
  // Loading states
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);
  const [trainingsLoading, setTrainingsLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [chatLoading, setChatLoading] = useState<boolean>(true);
  
  // Modals & form edits
  const [checkoutNotes, setCheckoutNotes] = useState<string>("");
  const [completingCheckout, setCompletingCheckout] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingAddress, setEditingAddress] = useState<boolean>(false);
  
  // Address form fields
  const [cep, setCep] = useState<string>(user?.cep || "01022-050");
  const [street, setStreet] = useState<string>(user?.street || "Rua Parque Dom Pedro II");
  const [number, setNumber] = useState<string>(user?.number || "268");
  const [complement, setComplement] = useState<string>(user?.complement || "Apt 22");
  const [neighborhood, setNeighborhood] = useState<string>(user?.neighborhood || "Centro");
  const [city, setCity] = useState<string>(user?.city || "São Paulo");
  const [state, setState] = useState<string>(user?.state || "SP");

  // Protect route
  useEffect(() => {
    if (!user) {
      toast.error("Por favor, faça login para acessar seu painel.");
      navigate("/login?redirect=/minha-conta");
    }
  }, [user, navigate]);

  // Load active tab data
  useEffect(() => {
    if (!user || !token) return;

    if (activeTab === "pedidos") {
      fetchOrders();
    } else if (activeTab === "dashboard") {
      fetchStats();
    } else if (activeTab === "suporte") {
      fetchSupport();
    } else if (activeTab === "treinamentos") {
      fetchTrainings();
    }
  }, [activeTab, user, token]);

  // Polling chat messages
  useEffect(() => {
    if (activeTab !== "suporte" || !chatSession || !token) return;

    const interval = setInterval(() => {
      fetchChatMessages(chatSession.id);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, chatSession, token]);

  const handleTabChange = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders/my-orders", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data);
      } else {
        toast.error("Erro ao buscar histórico de pedidos.");
      }
    } catch (err) {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/finance/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchSupport = async () => {
    setChatLoading(true);
    try {
      const res = await fetch("/api/support/session", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const sessionData: ChatSession = await res.json();
        setChatSession(sessionData);
        await fetchChatMessages(sessionData.id);
      }
    } catch (err) {
      toast.error("Erro ao carregar suporte.");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchChatMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/support/messages/${sessionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const msgs = await res.json();
        setChatMessages(msgs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatSession) return;

    try {
      const res = await fetch(`/api/support/messages/${chatSession.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setNewMessage("");
      } else {
        toast.error("Erro ao enviar mensagem.");
      }
    } catch (err) {
      toast.error("Falha ao enviar.");
    }
  };

  const fetchTrainings = async () => {
    setTrainingsLoading(true);
    try {
      const res = await fetch("/api/trainings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrainings(data);
      }
    } catch (err) {
      toast.error("Erro ao carregar treinamentos.");
    } finally {
      setTrainingsLoading(false);
    }
  };

  const handleAddressSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile({
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state
    });

    if (res.success) {
      toast.success("Endereço atualizado com sucesso!");
      setEditingAddress(false);
    } else {
      toast.error(res.error || "Erro ao atualizar endereço.");
    }
  };

  const copyAddress = () => {
    const addressText = `${street}, ${number} ${complement ? "- " + complement : ""} - ${neighborhood}, ${city} - ${state}, ${cep}`;
    navigator.clipboard.writeText(addressText);
    toast.success("Endereço copiado para a área de transferência!");
  };

  const handleCheckout = async () => {
    setCompletingCheckout(true);
    try {
      const res = await checkout(checkoutNotes);
      if (res.success) {
        toast.success("Pedido realizado com sucesso!");
        setCheckoutNotes("");
        handleTabChange("pedidos");
      } else {
        toast.error(res.error || "Erro ao processar pedido.");
      }
    } catch (err) {
      toast.error("Falha ao realizar pedido.");
    } finally {
      setCompletingCheckout(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aguardando_pagamento":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Aguardando Pagamento</span>;
      case "pago":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Pago</span>;
      case "enviado":
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><Truck className="w-3 h-3" /> Enviado</span>;
      case "entregue":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Entregue</span>;
      case "cancelado":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cancelado</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2.5 py-1 rounded-full font-semibold">{status}</span>;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#1E293B] font-sans py-12 text-slate-100">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Profile Welcome Header */}
        <div className="bg-[#0F172A] rounded-2xl p-6 border border-slate-800 shadow-xs mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-400 font-display font-extrabold text-2xl border border-orange-500/20">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">Olá, {user.fullName}!</h1>
              <p className="text-slate-400 text-xs mt-1">E-mail: {user.email} | Nível: {user.role === "admin" ? "Administrador" : "Cliente"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="border border-slate-800 text-slate-400 font-bold hover:text-red-400 hover:border-red-500/30 px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>

        {/* Dashboard Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xs p-4 space-y-1 h-fit">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-3 mb-2">Painel do Cliente</p>
            
            <button
              onClick={() => handleTabChange("pedidos")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "pedidos" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-[#1E293B]/50"
              }`}
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              Meus Pedidos
            </button>

            <button
              onClick={() => handleTabChange("carrinho")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "carrinho" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-[#1E293B]/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4.5 h-4.5" />
                Carrinho
              </div>
              {cartItems.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "carrinho" ? "bg-white text-orange-600" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                }`}>
                  {cartItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "dashboard" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-[#1E293B]/50"
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5" />
              Minhas Estatísticas
            </button>

            <button
              onClick={() => handleTabChange("enderecos")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "enderecos" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-[#1E293B]/50"
              }`}
            >
              <MapPin className="w-4.5 h-4.5" />
              Meus Endereços
            </button>

            <button
              onClick={() => handleTabChange("suporte")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "suporte" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-[#1E293B]/50"
              }`}
            >
              <MessageSquare className="w-4.5 h-4.5" />
              Suporte Online
            </button>

            <button
              onClick={() => handleTabChange("treinamentos")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "treinamentos" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-[#1E293B]/50"
              }`}
            >
              <GraduationCap className="w-4.5 h-4.5" />
              Treinamentos / Aulas
            </button>

            {user.role === "admin" && (
              <div className="pt-4 border-t border-slate-800 mt-4 space-y-1">
                <p className="text-orange-500 text-[10px] uppercase font-bold tracking-widest px-3 mb-2">Administração</p>
                <button
                  onClick={() => navigate("/admin/painel")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-slate-100 hover:bg-slate-800/80 transition-colors border border-slate-800 cursor-pointer"
                >
                  <ShieldAlert className="w-4.5 h-4.5 text-orange-500" />
                  Painel Administrativo
                </button>
              </div>
            )}
          </div>

          {/* Active Tab Panel Body */}
          <div className="lg:col-span-3 bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xs p-6 md:p-8 min-h-[500px] text-slate-100">
            
            {/* ======================= TAB: PEDIDOS ======================= */}
            {activeTab === "pedidos" && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-orange-500" />
                    Histórico de Pedidos ({ordersList.length})
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Veja todos os seus pedidos efetuados em nossa loja.</p>
                </div>

                {ordersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-slate-800 h-24 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                ) : ordersList.length === 0 ? (
                  <div className="text-center py-12 bg-[#1E293B]/30 rounded-xl border border-dashed border-slate-800">
                    <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-300 text-sm">Nenhum pedido feito ainda</h3>
                    <p className="text-slate-500 text-xs mt-1">Suas compras aparecerão aqui assim que finalizar o carrinho.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ordersList.map((ord) => {
                      const img = ord.productImages && ord.productImages.length > 0
                        ? ord.productImages[0]
                        : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200";

                      return (
                        <div key={ord.id} className="border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors bg-[#1E293B]/30">
                          <div className="flex items-center gap-4">
                            <img src={img} alt={ord.productTitle} referrerPolicy="no-referrer" className="w-16 h-16 object-cover rounded-lg bg-[#0F172A] border border-slate-800" />
                            <div>
                              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">ID: {ord.id.slice(0, 8)}...</p>
                              <h4 className="font-sans font-semibold text-slate-100 text-xs line-clamp-1 mt-0.5">{ord.productTitle}</h4>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(ord.createdAt).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-end sm:items-end flex-col gap-2 w-full sm:w-auto">
                            <p className="font-display font-bold text-white text-sm">{formatPrice(ord.salePrice)}</p>
                            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                              {getStatusBadge(ord.status)}
                              <button
                                onClick={() => setSelectedOrder(ord)}
                                className="text-xs text-orange-400 hover:text-orange-500 font-bold cursor-pointer"
                              >
                                Detalhes
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Detailed Order Modal Overlay */}
                {selectedOrder && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0F172A] rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-800 relative text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                      <h3 className="font-display text-lg font-bold text-white mb-4 border-b border-slate-800 pb-3">
                        Detalhes do Pedido
                      </h3>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white font-bold cursor-pointer"
                      >
                        Fechar
                      </button>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold font-mono">ID COMPLETO DO PEDIDO</p>
                          <p className="text-xs text-slate-300 bg-[#1E293B] p-2 rounded border border-slate-800 font-mono break-all">{selectedOrder.id}</p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">PRODUTO ADQUIRIDO</p>
                          <p className="text-xs font-semibold text-slate-200 mt-1">{selectedOrder.productTitle}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-[#1E293B] p-3 rounded-lg border border-slate-800">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">TOTAL PAGO</p>
                            <p className="text-sm font-bold text-orange-400">{formatPrice(selectedOrder.salePrice)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">DATA DE CRIAÇÃO</p>
                            <p className="text-xs text-slate-300 mt-1">{new Date(selectedOrder.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">STATUS ATUAL DO PEDIDO</p>
                          <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">CÓDIGO DE RASTREAMENTO</p>
                          <p className="text-xs font-semibold text-slate-200 bg-[#1E293B] p-2 rounded mt-1 border border-slate-800">
                            {selectedOrder.trackingCode || "Código de rastreio não gerado ainda."}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">NOTAS ADICIONAIS / INFORMAÇÕES</p>
                          <p className="text-xs text-slate-300 mt-1">{selectedOrder.notes || "Nenhuma nota inserida."}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB: CARRINHO ======================= */}
            {activeTab === "carrinho" && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    Carrinho de Compras ({cartItems.length} itens)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Revise os produtos adicionados e conclua o pagamento de forma segura.</p>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-12 bg-[#1E293B]/30 rounded-xl border border-dashed border-slate-800">
                    <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm font-medium">Seu carrinho está vazio no momento.</p>
                    <button
                      onClick={() => navigate("/")}
                      className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Ir para a Loja
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Items List */}
                    <div className="divide-y divide-slate-800">
                      {cartItems.map((item) => {
                        const img = item.product.images && item.product.images.length > 0
                          ? item.product.images[0]
                          : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200";

                        return (
                          <div key={item.product.id} className="py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <img src={img} alt={item.product.title} referrerPolicy="no-referrer" className="w-14 h-14 object-cover rounded-lg border border-slate-800 bg-[#1E293B]" />
                              <div>
                                <h4 className="font-semibold text-slate-100 text-xs max-w-sm line-clamp-2">{item.product.title}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">{item.product.category || "Geral"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              {/* Quantity inputs */}
                              <div className="flex items-center gap-2 border border-slate-800 rounded-md p-0.5 bg-[#1E293B]">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-[#0F172A] rounded cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold text-slate-100 w-5 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-[#0F172A] rounded cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right min-w-[80px]">
                                <p className="text-xs font-bold text-slate-100">{formatPrice(parseFloat(item.product.salePrice) * item.quantity)}</p>
                                <p className="text-[10px] text-slate-400">{formatPrice(item.product.salePrice)} un</p>
                              </div>

                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary and notes */}
                    <div className="bg-[#1E293B]/40 rounded-xl p-5 border border-slate-800 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase">Observações do Pedido</label>
                        <textarea
                          placeholder="Instruções de entrega, embalagem, ou outros comentários..."
                          rows={3}
                          value={checkoutNotes}
                          onChange={(e) => setCheckoutNotes(e.target.value)}
                          className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-100 placeholder-slate-500"
                        />
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Valor Total Bruto</p>
                          <p className="text-orange-400 font-display font-extrabold text-2xl mt-0.5">{formatPrice(cartTotal)}</p>
                        </div>

                        <button
                          onClick={handleCheckout}
                          disabled={completingCheckout}
                          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 px-8 rounded-xl text-xs transition-colors shadow-xs mt-4 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {completingCheckout ? "Finalizando Pedido..." : "Finalizar Compra / Pagar"}
                          <CheckCircle className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB: DASHBOARD ======================= */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    Minhas Estatísticas de Compras
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Acompanhe seu volume de compras e gastos totais com gráficos interativos.</p>
                </div>

                {statsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse">
                    <div className="bg-[#1E293B]/50 h-24 rounded-xl"></div>
                    <div className="bg-[#1E293B]/50 h-24 rounded-xl"></div>
                    <div className="bg-[#1E293B]/50 h-24 rounded-xl"></div>
                  </div>
                ) : !stats ? (
                  <p className="text-slate-400 text-sm">Nenhum dado disponível.</p>
                ) : (
                  <div className="space-y-8">
                    {/* Numeric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-xs">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Investido</p>
                        <p className="text-orange-400 text-xl font-bold mt-1.5">{formatPrice(stats.totalSpent)}</p>
                      </div>

                      <div className="bg-[#1E293B]/30 border border-slate-800 rounded-xl p-4 shadow-xs">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pedidos Concluídos</p>
                        <p className="text-white text-xl font-bold mt-1.5">{stats.totalOrders} compras</p>
                      </div>

                      <div className="bg-[#1E293B]/30 border border-slate-800 rounded-xl p-4 shadow-xs">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Média por Compra</p>
                        <p className="text-white text-xl font-bold mt-1.5">{formatPrice(stats.averageValue)}</p>
                      </div>
                    </div>

                    {/* Charts */}
                    {stats.chartData && stats.chartData.length > 0 ? (
                      <div className="space-y-6">
                        <div className="bg-[#1E293B]/20 border border-slate-800 p-4 rounded-xl shadow-xs">
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Volume de Compras por Mês (BRL)</h3>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", color: "#F8FAFC" }} formatter={(value) => formatPrice(String(value))} />
                                <Line type="monotone" dataKey="compras" stroke="#F97316" strokeWidth={3} activeDot={{ r: 8 }} name="Total Gasto" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="bg-[#1E293B]/20 border border-slate-800 p-4 rounded-xl shadow-xs">
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Quantidade de Pedidos por Período</h3>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", color: "#F8FAFC" }} />
                                <Bar dataKey="quantidade" fill="#F97316" radius={[4, 4, 0, 0]} name="Quantidade" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#1E293B]/30 rounded-xl p-8 text-center border border-slate-800">
                        <p className="text-slate-400 text-xs">Estatísticas insuficientes. Faça sua primeira compra para habilitar os gráficos.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB: ENDEREÇOS ======================= */}
            {activeTab === "enderecos" && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      Endereço de Entrega
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">Gerencie o endereço padrão para entregas rápidas.</p>
                  </div>
                  {!editingAddress && (
                    <button
                      onClick={() => setEditingAddress(true)}
                      className="text-xs text-orange-400 hover:text-orange-500 font-bold flex items-center gap-1 border border-slate-800 hover:border-slate-700 rounded-lg py-2 px-3 transition-colors bg-[#1E293B]/50 shadow-xs cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar Endereço
                    </button>
                  )}
                </div>

                {editingAddress ? (
                  <form onSubmit={handleAddressSave} className="space-y-4 max-w-2xl bg-[#1E293B]/40 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Modificar Endereço Padrão</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Rua / Logradouro</label>
                        <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} required className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Número</label>
                        <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} required className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Complemento / Bloco</label>
                        <input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Bairro</label>
                        <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">CEP</label>
                        <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} required className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Cidade</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Estado (UF)</label>
                        <input type="text" value={state} onChange={(e) => setState(e.target.value)} required className="w-full bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-xs focus:ring-orange-500 text-slate-100" maxLength={2} />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                        <Save className="w-3.5 h-3.5" /> Salvar Endereço
                      </button>
                      <button type="button" onClick={() => setEditingAddress(false)} className="border border-slate-800 hover:bg-[#1E293B] text-slate-400 py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="max-w-xl bg-[#1E293B]/30 border border-slate-800 rounded-2xl p-6 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Endereço Padrão de Entrega</p>
                      <p className="text-slate-100 text-sm font-semibold mt-2">{street}, {number} {complement ? "- " + complement : ""}</p>
                      <p className="text-slate-400 text-xs">{neighborhood} - {city} / {state}</p>
                      <p className="text-slate-500 text-xs">CEP: {cep}</p>
                    </div>
                    
                    <button
                      onClick={copyAddress}
                      className="border border-slate-800 hover:bg-[#1E293B] text-slate-300 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto bg-[#0F172A] transition-colors shadow-xs cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar Endereço
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB: SUPORTE ======================= */}
            {activeTab === "suporte" && (
              <div className="space-y-6 flex flex-col h-full">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                    Suporte Online ao Cliente
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Converse diretamente com nossa equipe de administradores em tempo real.</p>
                </div>

                {chatLoading ? (
                  <div className="h-48 bg-slate-800 rounded-xl animate-pulse"></div>
                ) : (
                  <div className="flex flex-col flex-1 border border-slate-800 rounded-xl overflow-hidden bg-[#1E293B]/20">
                    
                    {/* Message Box */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[360px] min-h-[280px]">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Nenhuma mensagem enviada. Comece digitando abaixo!</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.role === "user";
                          return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed ${
                                isMe 
                                  ? "bg-orange-500 text-white rounded-tr-none" 
                                  : "bg-[#0F172A] text-slate-100 border border-slate-800 rounded-tl-none"
                              }`}>
                                <p className="font-bold text-[9px] uppercase tracking-wider opacity-75 mb-1 text-orange-400">
                                  {isMe ? "Você" : "Atendente INOVADROP"}
                                </p>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <span className={`block text-[8px] text-right mt-1.5 opacity-60 text-slate-500`}>
                                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Form */}
                    <form onSubmit={handleSendMessage} className="bg-[#0F172A] border-t border-slate-800 p-3 flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua dúvida ou mensagem de suporte..."
                        className="flex-1 bg-[#1E293B] border border-slate-800 rounded-lg px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-100 placeholder-slate-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar
                      </button>
                    </form>

                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB: TREINAMENTOS ======================= */}
            {activeTab === "treinamentos" && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-orange-500" />
                    Treinamentos Acadêmicos INOVADROP
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Aulas exclusivas para configurar sua loja virtual e alavancar suas vendas de dropshipping.</p>
                </div>

                {trainingsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 h-48 rounded-xl animate-pulse"></div>
                    <div className="bg-slate-800 h-48 rounded-xl animate-pulse"></div>
                  </div>
                ) : trainings.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-12">Nenhuma aula cadastrada pelos administradores ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trainings.map((lesson) => (
                      <div key={lesson.id} className="border border-slate-800 rounded-2xl overflow-hidden bg-[#1E293B]/30 flex flex-col shadow-xs hover:border-slate-700 transition-all">
                        
                        {/* Video Player */}
                        <div className="aspect-video bg-slate-950 flex items-center justify-center relative">
                          {lesson.videoUrl.includes("embed") ? (
                            <iframe
                              src={lesson.videoUrl}
                              title={lesson.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          ) : (
                            <div className="text-center p-4">
                              <Play className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                              <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-white underline font-bold inline-flex items-center gap-1">
                                Assistir no YouTube <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-sans font-bold text-slate-100 text-xs mb-1 line-clamp-1">{lesson.title}</h3>
                          <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-3 mb-4">{lesson.description}</p>
                          <span className="text-[9px] text-slate-500 font-semibold mt-auto flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Publicado em: {new Date(lesson.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
