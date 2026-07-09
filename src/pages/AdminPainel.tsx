import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ShieldAlert, Settings, Package, ListOrdered, 
  GraduationCap, MessageSquare, TrendingUp, Plus, 
  Edit, Save, Trash2, Check, X, Truck, Eye, ArrowUpDown, 
  User, CheckCircle, RefreshCw, Send, DollarSign, ArrowLeft 
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { Product, Order, TrainingLesson, ChatMessage, ChatSession } from "../types.ts";
import { toast } from "sonner";
import { formatPrice } from "./Home.tsx";
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, 
  Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from "recharts";

export default function AdminPainel() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab state
  const activeTab = searchParams.get("tab") || "produtos";

  // Data states
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [trainingsList, setTrainingsList] = useState<TrainingLesson[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [finStats, setFinStats] = useState<any>(null);

  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [btnLoading, setBtnLoading] = useState<boolean>(false);

  // Modal / Editor Forms states
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState<boolean>(false);

  // Product Form field states
  const [pTitle, setPTitle] = useState<string>("");
  const [pDescription, setPDescription] = useState<string>("");
  const [pCategory, setPCategory] = useState<string>("");
  const [pSalePrice, setPSalePrice] = useState<string>("");
  const [pCostPrice, setPCostPrice] = useState<string>("");
  const [pStock, setPStock] = useState<number>(10);
  const [pImages, setPImages] = useState<string>(""); // comma separated
  const [pStatus, setPStatus] = useState<string>("active");
  const [pStoreVisible, setPStoreVisible] = useState<boolean>(true);

  // Training Form states
  const [tTitle, setTTitle] = useState<string>("");
  const [tDescription, setTDescription] = useState<string>("");
  const [tVideoUrl, setTVideoUrl] = useState<string>("");

  // Order status editing states
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [oStatus, setOStatus] = useState<string>("");
  const [oTrackingCode, setOTrackingCode] = useState<string>("");

  // Guard routing
  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Acesso restrito. Apenas administradores.");
      navigate("/");
    }
  }, [user, navigate]);

  // Load active tab data
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadTabData();
  }, [activeTab, token]);

  // Support Polling (for active session)
  useEffect(() => {
    if (activeTab !== "suporte" || !activeSession || !token) return;

    const interval = setInterval(() => {
      fetchMessages(activeSession.id);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, activeSession, token]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === "produtos") {
        await fetchProducts();
      } else if (activeTab === "pedidos") {
        await fetchOrders();
      } else if (activeTab === "treinamentos") {
        await fetchTrainings();
      } else if (activeTab === "suporte") {
        await fetchSessions();
      } else if (activeTab === "financeiro") {
        await fetchFinances();
      }
    } catch (err) {
      toast.error("Erro ao carregar dados do painel.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const res = await fetch("/api/products?admin=true");
    if (res.ok) {
      const data = await res.json();
      setProductsList(data);
    }
  };

  const fetchOrders = async () => {
    const res = await fetch("/api/orders/all", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setOrdersList(data);
    }
  };

  const fetchTrainings = async () => {
    const res = await fetch("/api/trainings", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setTrainingsList(data);
    }
  };

  const fetchSessions = async () => {
    const res = await fetch("/api/support/sessions/all", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setChatSessions(data);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    const res = await fetch(`/api/support/messages/${sessionId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setChatMessages(data);
    }
  };

  const fetchFinances = async () => {
    const res = await fetch("/api/finance/dashboard", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setFinStats(data);
    }
  };

  const handleTabChange = (tabName: string) => {
    setSearchParams({ tab: tabName });
    setActiveSession(null);
    setChatMessages([]);
  };

  // ==================== ACTIONS: PRODUCTS CRUD ====================
  const handleOpenProductCreate = () => {
    setEditingProduct(null);
    setPTitle("");
    setPDescription("");
    setPCategory("");
    setPSalePrice("");
    setPCostPrice("");
    setPStock(10);
    setPImages("");
    setPStatus("active");
    setPStoreVisible(true);
    setShowProductModal(true);
  };

  const handleOpenProductEdit = (prod: Product) => {
    setEditingProduct(prod);
    setPTitle(prod.title);
    setPDescription(prod.description || "");
    setPCategory(prod.category || "");
    setPSalePrice(prod.salePrice);
    setPCostPrice(prod.costPrice);
    setPStock(prod.stock);
    setPImages(prod.images ? prod.images.join(", ") : "");
    setPStatus(prod.status);
    setPStoreVisible(prod.storeVisible);
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pTitle || !pSalePrice || !pCostPrice) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setBtnLoading(true);
    const parsedImages = pImages.split(",").map((url) => url.trim()).filter(Boolean);

    const payload = {
      title: pTitle,
      description: pDescription,
      category: pCategory,
      salePrice: parseFloat(pSalePrice),
      costPrice: parseFloat(pCostPrice),
      stock: parseInt(String(pStock)),
      images: parsedImages,
      status: pStatus,
      storeVisible: pStoreVisible,
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingProduct ? "Produto editado com sucesso!" : "Produto criado com sucesso!");
        setShowProductModal(false);
        fetchProducts();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Ocorreu um erro ao salvar o produto.");
      }
    } catch (err) {
      toast.error("Erro ao se conectar com o servidor.");
    } finally {
      setBtnLoading(false);
    }
  };

  // ==================== ACTIONS: ORDERS STATUS ====================
  const handleOpenOrderEdit = (ord: Order) => {
    setEditingOrder(ord);
    setOStatus(ord.status);
    setOTrackingCode(ord.trackingCode || "");
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setBtnLoading(true);
    try {
      const res = await fetch(`/api/orders/${editingOrder.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: oStatus, trackingCode: oTrackingCode })
      });

      if (res.ok) {
        toast.success("Pedido atualizado com sucesso!");
        setEditingOrder(null);
        fetchOrders();
      } else {
        toast.error("Erro ao atualizar pedido.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setBtnLoading(false);
    }
  };

  // ==================== ACTIONS: TRAINING CRUD ====================
  const handleTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle || !tDescription || !tVideoUrl) {
      toast.error("Preencha todos os campos da aula.");
      return;
    }

    // Convert regular YouTube link into embed path
    let finalUrl = tVideoUrl;
    if (tVideoUrl.includes("watch?v=")) {
      const videoId = tVideoUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    setBtnLoading(true);
    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: tTitle, description: tDescription, videoUrl: finalUrl })
      });

      if (res.ok) {
        toast.success("Nova aula de treinamento publicada com sucesso!");
        setShowTrainingModal(false);
        setTTitle("");
        setTDescription("");
        setTVideoUrl("");
        fetchTrainings();
      } else {
        toast.error("Erro ao publicar aula.");
      }
    } catch (err) {
      toast.error("Erro ao conectar.");
    } finally {
      setBtnLoading(false);
    }
  };

  // ==================== ACTIONS: SUPPORT ANSWERS ====================
  const handleSelectSession = (session: ChatSession) => {
    setActiveSession(session);
    fetchMessages(session.id);
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeSession) return;

    try {
      const res = await fetch(`/api/support/messages/${activeSession.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessageText })
      });

      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setNewMessageText("");
      } else {
        toast.error("Erro ao enviar resposta.");
      }
    } catch (err) {
      toast.error("Falha ao enviar resposta.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16 py-12">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Admin Header */}
        <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div>
            <span className="bg-orange-500 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 self-start w-fit">
              <ShieldAlert className="w-3.5 h-3.5" /> Controle de Admin
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mt-3">Painel do Administrador</h1>
            <p className="text-slate-400 text-xs mt-1">Gerencie produtos, pedidos de dropshipping, suporte e treinamentos de um só lugar.</p>
          </div>
          
          <button
            onClick={() => navigate("/minha-conta")}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-4 h-4 text-orange-500" />
            Voltar ao Meu Painel
          </button>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Admin Menu */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-1 h-fit">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest px-3 mb-2">Administração</p>
            
            <button
              onClick={() => handleTabChange("produtos")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === "produtos" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Package className="w-4.5 h-4.5" />
              Gerenciar Produtos
            </button>

            <button
              onClick={() => handleTabChange("pedidos")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === "pedidos" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ListOrdered className="w-4.5 h-4.5" />
              Gerenciar Pedidos
            </button>

            <button
              onClick={() => handleTabChange("treinamentos")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === "treinamentos" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <GraduationCap className="w-4.5 h-4.5" />
              Treinamentos / Aulas
            </button>

            <button
              onClick={() => handleTabChange("suporte")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === "suporte" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-4.5 h-4.5" />
              Suporte Técnico Chat
            </button>

            <button
              onClick={() => handleTabChange("financeiro")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === "financeiro" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="w-4.5 h-4.5" />
              Financeiro & Lucros
            </button>
          </div>

          {/* Panel content block */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 md:p-8 min-h-[520px]">
            
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-200 w-1/4 rounded"></div>
                <div className="h-4 bg-slate-200 w-1/2 rounded"></div>
                <div className="h-48 bg-slate-200 rounded-xl mt-6"></div>
              </div>
            ) : (
              <>
                {/* ==================== TAB: PRODUTOS ==================== */}
                {activeTab === "produtos" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
                      <div>
                        <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Package className="w-5 h-5 text-orange-500" />
                          Gerenciamento do Catálogo ({productsList.length})
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">Adicione novos itens ao estoque ou edite preços e visibilidade da vitrine.</p>
                      </div>
                      <button
                        onClick={handleOpenProductCreate}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Novo Produto
                      </button>
                    </div>

                    {/* Products Grid Table list */}
                    {productsList.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-12">Nenhum produto cadastrado no catálogo.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px] border-b border-slate-100 font-bold">
                              <th className="p-3">Título / Categoria</th>
                              <th className="p-3">Preço / Custo</th>
                              <th className="p-3">Estoque</th>
                              <th className="p-3">Visível</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {productsList.map((prod) => (
                              <tr key={prod.id} className="hover:bg-slate-50/50">
                                <td className="p-3">
                                  <p className="font-bold text-slate-800 line-clamp-1">{prod.title}</p>
                                  <p className="text-slate-400 text-[10px] mt-0.5">{prod.category || "Sem Categoria"}</p>
                                </td>
                                <td className="p-3">
                                  <p className="font-semibold text-slate-800">Venda: {formatPrice(prod.salePrice)}</p>
                                  <p className="text-slate-500 font-medium">Custo: {formatPrice(prod.costPrice)}</p>
                                </td>
                                <td className="p-3 font-semibold font-mono text-slate-800">
                                  {prod.stock} un
                                </td>
                                <td className="p-3">
                                  {prod.storeVisible ? (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">Sim</span>
                                  ) : (
                                    <span className="text-slate-400 font-medium flex items-center gap-0.5">Não</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    prod.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    {prod.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleOpenProductEdit(prod)}
                                    className="text-orange-500 hover:text-orange-600 font-bold p-1 rounded hover:bg-orange-50"
                                  >
                                    <Edit className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Product CRUD Modal */}
                    {showProductModal && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <form onSubmit={handleProductSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
                          <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                            {editingProduct ? "Editar Produto" : "Criar Novo Produto"}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowProductModal(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-950 font-bold"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome do Produto *</label>
                              <input type="text" value={pTitle} onChange={(e) => setPTitle(e.target.value)} required placeholder="Ex: Smartwatch Premium" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase">Categoria</label>
                                <input type="text" value={pCategory} onChange={(e) => setPCategory(e.target.value)} placeholder="Ex: Eletrônicos" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase">Estoque Inicial *</label>
                                <input type="number" value={pStock} onChange={(e) => setPStock(parseInt(e.target.value) || 0)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase">Preço de Venda (BRL) *</label>
                                <input type="number" step="0.01" value={pSalePrice} onChange={(e) => setPSalePrice(e.target.value)} required placeholder="149.90" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase">Custo do Produto (BRL) *</label>
                                <input type="number" step="0.01" value={pCostPrice} onChange={(e) => setPCostPrice(e.target.value)} required placeholder="45.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">Imagens (URLs separadas por vírgula)</label>
                              <textarea value={pImages} onChange={(e) => setPImages(e.target.value)} placeholder="https://url1.com, https://url2.com" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">Descrição Detalhada</label>
                              <textarea value={pDescription} onChange={(e) => setPDescription(e.target.value)} placeholder="Detalhes técnicos, benefícios..." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase">Status</label>
                                <select value={pStatus} onChange={(e) => setPStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 bg-white">
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                  <option value="archived">Archived</option>
                                </select>
                              </div>
                              <div className="flex items-center mt-6">
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                  <input type="checkbox" checked={pStoreVisible} onChange={(e) => setPStoreVisible(e.target.checked)} className="w-4 h-4 text-orange-500" />
                                  Visível na Vitrine Pública
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="submit" disabled={btnLoading} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold py-2 px-5 rounded-lg text-xs transition-colors shadow-xs">
                              {btnLoading ? "Salvando..." : "Salvar Produto"}
                            </button>
                            <button type="button" onClick={() => setShowProductModal(false)} className="border border-slate-300 text-slate-600 py-2 px-4 rounded-lg text-xs hover:bg-slate-50">
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== TAB: PEDIDOS ==================== */}
                {activeTab === "pedidos" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ListOrdered className="w-5 h-5 text-orange-500" />
                        Histórico Geral de Vendas ({ordersList.length})
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">Monitore e mude os estados de envio ou código de rastreamento de compras feitas na loja.</p>
                    </div>

                    {ordersList.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-12">Nenhum pedido foi efetuado na loja ainda.</p>
                    ) : (
                      <div className="space-y-4">
                        {ordersList.map((ord) => (
                          <div key={ord.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40 hover:border-slate-200 transition-colors">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold font-mono">PEDIDO: {ord.id.slice(0, 8)}...</p>
                                <p className="text-xs font-bold text-slate-800 mt-1">{ord.productTitle}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Comprador: {ord.customerName} ({ord.customerEmail})</p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1.5 w-full sm:w-auto">
                                <p className="font-bold text-sm text-slate-900">{formatPrice(ord.salePrice)}</p>
                                <button
                                  onClick={() => handleOpenOrderEdit(ord)}
                                  className="text-[11px] text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 border border-slate-200 py-1.5 px-3 rounded-lg bg-white shadow-xs hover:border-slate-300"
                                >
                                  <Settings className="w-3.5 h-3.5" /> Atualizar Status
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Order Status Dialog Editor overlay */}
                    {editingOrder && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <form onSubmit={handleOrderSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative space-y-4">
                          <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                            Atualizar Status do Pedido
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingOrder(null)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-950 font-bold"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">PRODUTO</p>
                              <p className="text-xs font-semibold text-slate-800 mt-0.5">{editingOrder.productTitle}</p>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status de Entrega</label>
                              <select value={oStatus} onChange={(e) => setOStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 bg-white">
                                <option value="aguardando_pagamento">Aguardando Pagamento</option>
                                <option value="pago">Pago</option>
                                <option value="enviado">Enviado</option>
                                <option value="entregue">Entregue</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Código de Rastreamento</label>
                              <input type="text" placeholder="Ex: BR123456789BR" value={oTrackingCode} onChange={(e) => setOTrackingCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="submit" disabled={btnLoading} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold py-2 px-5 rounded-lg text-xs transition-colors shadow-xs">
                              {btnLoading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                            <button type="button" onClick={() => setEditingOrder(null)} className="border border-slate-300 text-slate-600 py-2 px-4 rounded-lg text-xs hover:bg-slate-50">
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                  </div>
                )}

                {/* ==================== TAB: TREINAMENTOS ==================== */}
                {activeTab === "treinamentos" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
                      <div>
                        <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-orange-500" />
                          Gerenciar Aulas de Treinamento ({trainingsList.length})
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">Disponibilize aulas gravadas ou novos cursos com vídeos do YouTube para os alunos.</p>
                      </div>
                      <button
                        onClick={() => setShowTrainingModal(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Nova Aula
                      </button>
                    </div>

                    {trainingsList.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-12">Nenhuma aula cadastrada ainda.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trainingsList.map((tr) => (
                          <div key={tr.id} className="border border-slate-150 p-4 rounded-xl bg-slate-50 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">{tr.title}</h4>
                              <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 mt-1">{tr.description}</p>
                            </div>
                            <span className="text-[10px] text-orange-500 font-mono mt-3 break-all">{tr.videoUrl}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Training dialog Modal form */}
                    {showTrainingModal && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <form onSubmit={handleTrainingSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative space-y-4">
                          <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                            Publicar Nova Aula de Treinamento
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowTrainingModal(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-950 font-bold"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">Título da Aula *</label>
                              <input type="text" placeholder="Ex: Como Configurar Margem de Lucro" value={tTitle} onChange={(e) => setTTitle(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">Link do Vídeo (YouTube) *</label>
                              <input type="url" placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ" value={tVideoUrl} onChange={(e) => setTVideoUrl(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">Descrição Detalhada *</label>
                              <textarea placeholder="Resumo do conteúdo e links adicionais da aula..." value={tDescription} onChange={(e) => setTDescription(e.target.value)} required rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-orange-500 focus:bg-white" />
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="submit" disabled={btnLoading} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold py-2 px-5 rounded-lg text-xs transition-colors shadow-xs">
                              {btnLoading ? "Salvando..." : "Publicar Aula"}
                            </button>
                            <button type="button" onClick={() => setShowTrainingModal(false)} className="border border-slate-300 text-slate-600 py-2 px-4 rounded-lg text-xs hover:bg-slate-50">
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                  </div>
                )}

                {/* ==================== TAB: SUPORTE ==================== */}
                {activeTab === "suporte" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-orange-500" />
                        Atendimento aos Clientes ({chatSessions.length} conversas)
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">Responda e interaja com seus clientes tirando dúvidas em tempo real.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      
                      {/* Left list of sessions */}
                      <div className="md:col-span-1 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white max-h-[420px] overflow-y-auto">
                        {chatSessions.length === 0 ? (
                          <p className="p-4 text-center text-slate-400 text-xs">Nenhuma sessão de chat ativa.</p>
                        ) : (
                          chatSessions.map((session) => (
                            <button
                              key={session.id}
                              onClick={() => handleSelectSession(session)}
                              className={`w-full text-left p-3.5 flex flex-col hover:bg-slate-50 transition-colors text-xs ${
                                activeSession?.id === session.id ? "bg-orange-50/75 border-l-4 border-l-orange-500" : ""
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <p className="font-bold text-slate-800">{session.title}</p>
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium mt-1">Última atualização: {new Date(session.updatedAt).toLocaleTimeString()}</p>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Right active chat window */}
                      <div className="md:col-span-2 border border-slate-200 rounded-xl bg-slate-50 flex flex-col h-[420px]">
                        {activeSession ? (
                          <>
                            {/* Chat Header */}
                            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                              <p className="font-bold text-xs text-slate-800">Atendimento: {activeSession.title}</p>
                            </div>

                            {/* Message history */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                              {chatMessages.length === 0 ? (
                                <p className="text-center text-slate-400 text-xs py-12">Nenhuma mensagem nesta conversa.</p>
                              ) : (
                                chatMessages.map((msg) => {
                                  const isMe = msg.role === "admin";
                                  return (
                                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                      <div className={`max-w-[80%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed ${
                                        isMe 
                                          ? "bg-slate-900 text-white rounded-tr-none" 
                                          : "bg-white text-slate-800 border border-slate-150 rounded-tl-none"
                                      }`}>
                                        <p className="font-bold text-[9px] uppercase tracking-wider opacity-75 mb-1">
                                          {isMe ? "Você (Atendente)" : "Cliente"}
                                        </p>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        <span className="block text-[8px] text-right mt-1 opacity-60">
                                          {new Date(msg.createdAt).toLocaleTimeString()}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Input Form */}
                            <form onSubmit={handleSendAdminMessage} className="bg-white border-t border-slate-200 p-3 flex gap-3">
                              <input
                                type="text"
                                placeholder="Digite sua resposta técnica..."
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                                required
                              />
                              <button
                                type="submit"
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shrink-0"
                              >
                                <Send className="w-3.5 h-3.5" /> Responder
                              </button>
                            </form>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-xs">Selecione uma conversa ao lado para responder o cliente.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ==================== TAB: FINANCEIRO ==================== */}
                {activeTab === "financeiro" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        Análise Financeira Completa de Vendas
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">Estatísticas consolidadas da saúde financeira e lucratividade real da loja virtual.</p>
                    </div>

                    {finStats ? (
                      <div className="space-y-8">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 border shadow-xs">
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Faturamento Bruto</p>
                            <p className="text-orange-400 text-xl font-bold mt-1.5">{formatPrice(finStats.totalSales)}</p>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Despesas / Custo Fornecedor</p>
                            <p className="text-red-500 text-xl font-bold mt-1.5">{formatPrice(finStats.totalCosts)}</p>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Lucro Líquido Real</p>
                            <p className="text-emerald-500 text-xl font-bold mt-1.5">{formatPrice(finStats.totalProfit)}</p>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Taxa de Conversão</p>
                            <p className="text-slate-900 text-xl font-bold mt-1.5">{finStats.paidCount} / {finStats.ordersCount} pagos</p>
                          </div>
                        </div>

                        {/* Charts layout */}
                        {finStats.chartData && finStats.chartData.length > 0 ? (
                          <div className="grid grid-cols-1 gap-6">
                            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs">
                              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Gráfico Comparativo de Despesas vs Incomes (BRL)</h3>
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={finStats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                                    <Tooltip formatter={(value) => formatPrice(String(value))} />
                                    <Legend />
                                    <Bar dataKey="vendas" fill="#F97316" radius={[4, 4, 0, 0]} name="Incomes / Faturamento" />
                                    <Bar dataKey="despesas" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Expenses / Custos" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs">
                              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Evolução do Lucro Líquido</h3>
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={finStats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                                    <Tooltip formatter={(value) => formatPrice(String(value))} />
                                    <Legend />
                                    <Line type="monotone" dataKey="lucro" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} name="Lucro Real" />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs py-8 text-center">Faturamento insuficiente para exibir gráficos de desempenho.</p>
                        )}

                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs">Nenhum dado financeiro disponível.</p>
                    )}
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
