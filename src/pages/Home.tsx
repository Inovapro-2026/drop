import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Search, ShoppingCart, Filter, Eye, AlertCircle, ArrowUpDown,
  Laptop, Home as HomeIcon, Wrench, Sparkles, Gamepad2, Box,
  Flame, Zap, Award, CheckCircle, Star, ShieldCheck, HelpCircle,
  Truck, HelpCircle as HelpIcon, PlayCircle
} from "lucide-react";
import { Product } from "../types.ts";
import { useCart } from "../context/CartContext.tsx";
import { toast } from "sonner";

export const formatPrice = (val: number | string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parseFloat(String(val)) || 0);
};

export const formatParcel = (val: number | string) => {
  const num = parseFloat(String(val)) || 0;
  const parcel = (num / 12).toFixed(2);
  return formatPrice(parcel);
};

// Map categories to visual icons
const getCategoryIcon = (cat: string) => {
  const normalized = cat.toLowerCase();
  if (normalized.includes("casa") || normalized.includes("lar")) return <HomeIcon className="w-6 h-6" />;
  if (normalized.includes("inform") || normalized.includes("tecn") || normalized.includes("computa")) return <Laptop className="w-6 h-6" />;
  if (normalized.includes("ferramenta") || normalized.includes("repar")) return <Wrench className="w-6 h-6" />;
  if (normalized.includes("beleza") || normalized.includes("cosmet") || normalized.includes("saude")) return <Sparkles className="w-6 h-6" />;
  if (normalized.includes("brinquedo") || normalized.includes("jog") || normalized.includes("game")) return <Gamepad2 className="w-6 h-6" />;
  return <Box className="w-6 h-6" />;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>(["All", "Casa", "Informática", "Ferramentas", "Beleza", "Brinquedos", "Outros"]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sort, setSort] = useState<string>("recent"); // 'recent' | 'price-asc' | 'price-desc'
  const { addToCart } = useCart();

  // Highlight/Filter tabs
  const [activeTab, setActiveTab] = useState<string>("todos"); // 'todos' | 'novidades' | 'ofertas' | 'mais_vendidos' | 'esgotados'

  useEffect(() => {
    // Fetch unique categories once from all active products
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data: Product[] = await response.json();
          const uniqueFromDB = Array.from(new Set(data.map((p) => p.category).filter(Boolean)));
          // Ensure we merge standard categories with any custom ones in DB
          const merged = ["All", ...Array.from(new Set([
            "Casa", "Informática", "Ferramentas", "Beleza", "Brinquedos", "Outros", ...uniqueFromDB
          ]))];
          setCategories(merged);
          setTotalCount(data.length);
        }
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      }
    };
    loadCategories();
  }, []);

  const fetchProducts = async (currSearch: string, currCategory: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currSearch.trim()) params.append("search", currSearch.trim());
      if (currCategory && currCategory !== "All") params.append("category", currCategory);

      const response = await fetch(`/api/products?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        toast.error("Não foi possível carregar os produtos.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(search, category);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, category]);

  const handleAddToCart = (product: Product) => {
    const res = addToCart(product, 1);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.warning(res.message);
    }
  };

  // Base list before specific tab filters
  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sort === "price-asc") {
      return parseFloat(a.salePrice) - parseFloat(b.salePrice);
    }
    if (sort === "price-desc") {
      return parseFloat(b.salePrice) - parseFloat(a.salePrice);
    }
    return 0;
  });

  // Split and categorise products to match C7Drop requirements:
  // - Novidades: newest first (active, in stock)
  // - Ofertas: promotion (has simulated strikethrough, or labeled/simulated 25% OFF)
  // - Mais Vendidos: items in stock with highest demand (for layout we showcase first ones)
  // - Esgotados: stock === 0
  
  const novidades = sortedProducts.filter(p => p.stock > 0).slice(0, 8);
  const ofertas = sortedProducts.filter(p => p.stock > 0).map(p => ({
    ...p,
    simulatedOriginalPrice: parseFloat(p.salePrice) * 1.35 // simulate a 35% discount
  }));
  const maisVendidos = sortedProducts.filter(p => p.stock > 0).slice(0, 8);
  const esgotados = sortedProducts.filter(p => p.stock === 0);

  // Render list depending on activeTab (only applies when category and search are cleared for best UX)
  const getDisplayProducts = () => {
    if (search.trim() || category !== "All") {
      return sortedProducts;
    }
    if (activeTab === "novidades") return novidades;
    if (activeTab === "ofertas") return ofertas;
    if (activeTab === "mais_vendidos") return maisVendidos;
    if (activeTab === "esgotados") return esgotados;
    return sortedProducts;
  };

  const displayList = getDisplayProducts();

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans pb-16 text-slate-100">
      
      {/* 🚚 Top Thin Promo Header Bar */}
      <div className="bg-[#1E293B] border-b border-slate-800 text-slate-300 py-2.5 px-4 text-center text-xs font-semibold tracking-wider flex items-center justify-center gap-6 overflow-hidden">
        <span className="flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-orange-500" />
          FRETE GRÁTIS PARA TODO O BRASIL
        </span>
        <span className="hidden md:inline text-slate-600">|</span>
        <span className="hidden md:flex items-center gap-1.5">
          <Award className="w-4 h-4 text-orange-500" />
          LIBERDADE SEM ESTOQUE • ATACADO NACIONAL
        </span>
        <span className="hidden md:inline text-slate-600">|</span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-orange-500" />
          PARCELE EM ATÉ 12X SEM JUROS
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0b0f19] to-orange-950/20 text-white py-16 px-4 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left Text */}
          <div className="text-center lg:text-left flex-1 space-y-6">
            <span className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs">
              <Zap className="w-3.5 h-3.5" />
              Sua melhor escolha em dropshipping
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white">
              Sua Loja <span className="text-orange-500">InovaDrop</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg max-w-xl font-normal leading-relaxed">
              Descubra um catálogo premium nacional com estoque atualizado. Encontre produtos de alta margem prontos para revenda ou consumo imediato.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                <span>Preços Livres de Login</span>
              </div>
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-orange-500" />
                <span>Parcelamento em até 12x</span>
              </div>
            </div>
          </div>

          {/* Right Cards/Features */}
          <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:min-w-[320px]">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/10 text-orange-400 flex items-center justify-center rounded-xl font-bold">
                🆕
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Últimas Novidades</h4>
                <p className="text-xs text-slate-400 mt-1">Produtos recém cadastrados direto dos fornecedores.</p>
              </div>
            </div>
            
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/10 text-orange-400 flex items-center justify-center rounded-xl font-bold">
                🔥
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Ofertas Imbatíveis</h4>
                <p className="text-xs text-slate-400 mt-1">Preços em promoção com descontos reais de atacado.</p>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/10 text-orange-400 flex items-center justify-center rounded-xl font-bold">
                ⭐
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Grupo VIP Inova</h4>
                <p className="text-xs text-slate-400 mt-1">Suporte exclusivo, treinamentos e muito mais.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 🧭 Interactive Categories Visual Selector */}
      <div className="max-w-7xl mx-auto px-4 mt-12">
        <h3 className="font-display text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <Filter className="w-5 h-5 text-orange-500" />
          Navegar por Categorias
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <button
            onClick={() => { setCategory("All"); setSearch(""); }}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer border ${
              category === "All" 
                ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-750"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category === "All" ? "bg-white/20" : "bg-slate-800 text-slate-300"}`}>
              <Box className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold tracking-tight">Ver Tudo</span>
          </button>

          {["Casa", "Informática", "Ferramentas", "Beleza", "Brinquedos", "Outros"].map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setSearch(""); }}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer border ${
                category === cat 
                  ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                  : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-750"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category === cat ? "bg-white/20" : "bg-slate-800 text-slate-300"}`}>
                {getCategoryIcon(cat)}
              </div>
              <span className="text-xs font-bold tracking-tight">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-12">
        
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-850 shadow-sm mb-8">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-455 w-5 h-5" />
            <input
              type="text"
              placeholder="Digite o nome ou palavras-chave do produto..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-800 bg-[#0F172A] text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 text-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-4">
            
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-slate-455 w-4 h-4" />
              <select
                className="border border-slate-850 bg-[#0F172A] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Mais recentes</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
              </select>
            </div>
          </div>
        </div>

        {/* 🏷️ Filter shelf sections (only visible if not searching/filtering category explicitly) */}
        {!search.trim() && category === "All" && (
          <div className="flex flex-wrap gap-2.5 mb-8 pb-2 border-b border-slate-850">
            <button
              onClick={() => setActiveTab("todos")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "todos" 
                  ? "bg-slate-800 text-white border-orange-500/50 border" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ⭐ Todos
            </button>
            <button
              onClick={() => setActiveTab("novidades")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "novidades" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              🆕 Novidades
            </button>
            <button
              onClick={() => setActiveTab("ofertas")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ofertas" 
                  ? "bg-red-500/10 text-red-400 border border-red-500/30" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              🔥 Ofertas Limitadas
            </button>
            <button
              onClick={() => setActiveTab("mais_vendidos")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "mais_vendidos" 
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              👑 Mais Vendidos
            </button>
            <button
              onClick={() => setActiveTab("esgotados")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "esgotados" 
                  ? "bg-slate-800 text-slate-300 border border-slate-700" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📦 Esgotados
            </button>
          </div>
        )}

        {/* Results Banner */}
        <div className="mb-6 flex justify-between items-center text-xs text-slate-400">
          <p>
            {search.trim() || category !== "All" 
              ? `Resultado da busca: ${displayList.length} produtos`
              : `Mostrando ${displayList.length} de ${totalCount} produtos.`
            }
          </p>
          {category !== "All" && (
            <button 
              onClick={() => { setCategory("All"); setSearch(""); }} 
              className="text-orange-500 font-bold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Skeleton Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-850 animate-pulse">
                <div className="bg-slate-800 h-48 w-full"></div>
                <div className="p-5 space-y-3.5">
                  <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-800 rounded mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl border border-slate-850 p-12 text-center max-w-md mx-auto mt-8 shadow-sm">
            <AlertCircle className="mx-auto text-orange-500 w-12 h-12 mb-4" />
            <h3 className="font-display text-lg font-bold text-slate-100">Nenhum produto encontrado</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Não encontramos nenhum produto com essas especificações no momento. Experimente limpar os filtros ou digitar outra palavra!
            </p>
            <button
              onClick={() => { setCategory("All"); setSearch(""); setActiveTab("todos"); }}
              className="mt-6 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Ver Catálogo Completo
            </button>
          </div>
        ) : (
          /* Products Grid matching C7Drop Cards layout exactly */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayList.map((product) => {
              const mainImage = product.images && product.images.length > 0 
                ? product.images[0] 
                : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60";

              // Check if in promotion list or simulated original price is needed
              const isPromo = activeTab === "ofertas" || parseFloat(product.salePrice) < 300; 
              const originalPrice = isPromo ? parseFloat(product.salePrice) * 1.35 : null;

              return (
                <div
                  key={product.id}
                  id={`product-${product.id}`}
                  className={`bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border ${
                    product.stock === 0 
                      ? "border-slate-800/60 opacity-75" 
                      : "border-slate-850 hover:border-slate-700"
                  } flex flex-col h-full`}
                >
                  {/* Image wrapper */}
                  <div className="relative group overflow-hidden bg-slate-950 h-52">
                    <img
                      src={mainImage}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                    
                    {/* 🏷️ Status indicator badges matching requested rules */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {product.stock === 0 ? (
                        <span className="bg-red-600 text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md shadow-md shadow-red-900/30">
                          ESGOTADO
                        </span>
                      ) : product.stock <= 5 ? (
                        <span className="bg-amber-500 text-slate-950 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md shadow-md shadow-amber-900/30">
                          ÚLTIMAS UNIDADES ({product.stock})
                        </span>
                      ) : isPromo ? (
                        <span className="bg-red-500 text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md shadow-md shadow-red-900/30">
                          OFERTA (25% OFF)
                        </span>
                      ) : (
                        <span className="bg-emerald-600 text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md shadow-md shadow-emerald-900/30">
                          EM ESTOQUE
                        </span>
                      )}
                    </div>

                    {product.category && (
                      <span className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-xs text-slate-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-850">
                        {product.category}
                      </span>
                    )}
                  </div>

                  {/* Body details */}
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div className="space-y-1.5">
                      <h3 className="font-sans font-semibold text-slate-100 text-sm line-clamp-2 h-10 leading-snug">
                        {product.title}
                      </h3>
                      
                      {/* Price section with discount strikethrough if promo */}
                      <div className="pt-2">
                        {originalPrice && (
                          <p className="text-slate-500 text-xs line-through">
                            De: {formatPrice(originalPrice)}
                          </p>
                        )}
                        <p className="text-orange-500 font-display font-black text-xl tracking-tight">
                          {formatPrice(product.salePrice)} <span className="text-slate-400 text-xs font-normal">à vista</span>
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          ou <span className="text-slate-200 font-medium">12x de {formatParcel(product.salePrice)}</span> sem juros
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2.5 mt-5">
                      <Link
                        to={`/produto/${product.id}`}
                        className="flex items-center justify-center gap-1.5 border border-slate-800 text-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold hover:bg-slate-800 hover:border-slate-700 transition-all bg-slate-900"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                        Ver Detalhes
                      </Link>
                      
                      <button
                        disabled={product.stock === 0}
                        onClick={() => handleAddToCart(product)}
                        className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-650 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10 cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Comprar
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
