import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ShoppingCart, ShieldCheck, Truck, Star, Award, MessageSquare, Plus, Minus, AlertTriangle } from "lucide-react";
import { Product, Order } from "../types.ts";
import { useCart } from "../context/CartContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "sonner";
import { formatPrice } from "./Home.tsx";

// Simple local reviews storage in localStorage to support review posting instantly
interface Review {
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);

  // Review Form state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");

  useEffect(() => {
    if (id) {
      fetchProduct();
      loadReviews();
      if (user && token) {
        checkPurchaseHistory();
      }
    }
  }, [id, user]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0]);
        } else {
          setSelectedImage("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60");
        }
      } else {
        toast.error("Produto não encontrado.");
        navigate("/");
      }
    } catch (err) {
      toast.error("Erro ao carregar detalhes do produto.");
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = () => {
    const saved = localStorage.getItem(`inovamarket_reviews_${id}`);
    if (saved) {
      setReviews(JSON.parse(saved));
    } else {
      // Seed default reviews
      const defaults: Review[] = [
        {
          productId: id!,
          userName: "Rodrigo Almeida",
          rating: 5,
          comment: "Excelente qualidade! Entrega rápida e o produto superou minhas expectativas.",
          date: "2026-06-15",
        },
        {
          productId: id!,
          userName: "Fernanda Costa",
          rating: 4,
          comment: "Muito bom, excelente custo-benefício. Recomendo para todos.",
          date: "2026-07-02",
        }
      ];
      setReviews(defaults);
      localStorage.setItem(`inovamarket_reviews_${id}`, JSON.stringify(defaults));
    }
  };

  const checkPurchaseHistory = async () => {
    try {
      const response = await fetch("/api/orders/my-orders", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const myOrders: Order[] = await response.json();
        // Check if user has a paid or delivered order with this productId
        const bought = myOrders.some(
          (ord) => ord.productId === id && (ord.status === "pago" || ord.status === "enviado" || ord.status === "entregue")
        );
        setHasPurchased(bought);
      }
    } catch (err) {
      console.error("Error checking history:", err);
    }
  };

  const incrementQty = () => {
    if (product && quantity < product.stock) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.warning(res.message);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    if (!user) {
      toast.info("Faça login ou cadastre-se para finalizar sua compra.");
      navigate("/login?redirect=" + encodeURIComponent(`/produto/${product.id}`));
      return;
    }

    const res = addToCart(product, quantity);
    if (res.success) {
      toast.success("Adicionado! Redirecionando para finalização...");
      navigate("/minha-conta?tab=carrinho");
    } else {
      toast.warning(res.message);
    }
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error("O comentário é obrigatório.");
      return;
    }

    const newRev: Review = {
      productId: id!,
      userName: user?.fullName || "Cliente Verificado",
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split("T")[0],
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem(`inovamarket_reviews_${id}`, JSON.stringify(updated));
    
    toast.success("Avaliação enviada com sucesso!");
    setNewComment("");
    setShowReviewForm(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-6 bg-slate-200 w-1/4 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-slate-200 h-96 rounded-xl"></div>
          <div className="space-y-6">
            <div className="h-10 bg-slate-200 w-3/4 rounded"></div>
            <div className="h-6 bg-slate-200 w-1/4 rounded"></div>
            <div className="h-24 bg-slate-200 w-full rounded"></div>
            <div className="h-12 bg-slate-200 w-1/3 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const imagesList = product.images && product.images.length > 0 ? product.images : [selectedImage];

  return (
    <div className="min-h-screen bg-slate-50 py-12 font-sans">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 mb-8 transition-colors text-sm font-medium">
          <ChevronLeft className="w-5 h-5" />
          Voltar para a Vitrine
        </Link>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white rounded-2xl p-6 md:p-10 shadow-xs border border-slate-100">
          
          {/* Column Left: Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 h-96 sm:h-[480px] flex items-center justify-center">
              <img
                src={selectedImage}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnails */}
            {imagesList.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {imagesList.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-20 h-20 bg-slate-50 rounded-lg overflow-hidden border transition-all ${
                      selectedImage === imgUrl ? "border-orange-500 ring-2 ring-orange-100" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img src={imgUrl} alt="miniatura" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column Right: Information and buy block */}
          <div className="flex flex-col">
            <span className="text-orange-600 bg-orange-50 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full self-start">
              {product.category || "Geral"}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 mt-4 leading-tight">
              {product.title}
            </h1>

            {/* Rating Stars Summary */}
            <div className="flex items-center gap-1 mt-3">
              <div className="flex text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-slate-500 text-xs font-semibold ml-2">
                4.8 ({reviews.length} avaliações)
              </span>
            </div>

            {/* Price with promo and parceling */}
            <div className="border-y border-slate-100 py-6 my-6 space-y-2">
              {parseFloat(product.salePrice) < 300 && (
                <p className="text-slate-400 text-sm line-through">
                  De: {formatPrice(parseFloat(product.salePrice) * 1.35)}
                </p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-orange-500 font-display font-extrabold text-4xl">
                  {formatPrice(product.salePrice)}
                </span>
                <span className="text-slate-500 text-sm">à vista</span>
              </div>
              <p className="text-slate-600 text-sm">
                ou <span className="text-slate-900 font-semibold">12x de {formatPrice(parseFloat(product.salePrice) / 12)}</span> sem juros no cartão
              </p>
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock === 0 ? (
                <span className="bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                  Produto Esgotado
                </span>
              ) : product.stock <= 5 ? (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md animate-pulse">
                  Últimas Unidades ({product.stock})
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                  Em Estoque ({product.stock} unidades)
                </span>
              )}
            </div>

            {/* Quantity selection */}
            {product.stock > 0 && (
              <div className="space-y-3 mb-8">
                <p className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Quantidade</p>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200 self-start inline-flex">
                  <button
                    onClick={decrementQty}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-sans font-bold text-slate-800 text-sm w-8 text-center">{quantity}</span>
                  <button
                    onClick={incrementQty}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Buy and Add to Cart Buttons */}
            {product.stock > 0 ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 border border-orange-500 text-orange-600 font-semibold py-3.5 px-6 rounded-xl hover:bg-orange-50 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar ao Carrinho
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors shadow-xs"
                >
                  Comprar Agora
                </button>
              </div>
            ) : (
              <button
                disabled
                className="bg-slate-200 text-slate-400 py-3.5 rounded-xl font-semibold cursor-not-allowed"
              >
                Esgotado temporariamente
              </button>
            )}

            {/* Benefits info block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-start gap-2">
                <Truck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Frete rápido</h4>
                  <p className="text-slate-500 text-[10px]">Cálculo integrado com as melhores transportadoras.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Award className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Garantia total</h4>
                  <p className="text-slate-500 text-[10px]">Seu dinheiro de volta se o produto não agradar.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Description Section */}
        <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-100 shadow-xs mt-8">
          <h2 className="font-display text-xl font-bold text-slate-950 flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            Descrição Completa do Produto
          </h2>
          <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {product.description || "Nenhuma descrição disponível para este produto."}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-100 shadow-xs mt-8">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-6 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-950 flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500 fill-current" />
                Avaliações dos Clientes ({reviews.length})
              </h2>
              <p className="text-slate-500 text-xs mt-1">Veja os depoimentos de quem já adquiriu e testou o produto.</p>
            </div>

            {hasPurchased && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors shadow-xs"
              >
                {showReviewForm ? "Cancelar Avaliação" : "Avaliar Produto"}
              </button>
            )}
          </div>

          {/* New Review Form */}
          {showReviewForm && (
            <form onSubmit={handlePostReview} className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-8 max-w-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Sua avaliação do produto</h3>
              
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Nota (1 a 5 estrelas)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                        newRating >= star ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Seu Comentário</label>
                <textarea
                  placeholder="Escreva sobre sua experiência prática com o produto..."
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-5 rounded-lg text-xs transition-colors shadow-xs"
              >
                Enviar Avaliação
              </button>
            </form>
          )}

          {/* List of Reviews */}
          <div className="space-y-6">
            {reviews.map((rev, i) => (
              <div key={i} className="border-b border-slate-100 last:border-none pb-6 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-bold text-slate-800 text-sm">{rev.userName}</p>
                  <p className="text-slate-400 text-xs">{rev.date}</p>
                </div>
                <div className="flex text-amber-500 gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s < rev.rating ? "fill-current" : "text-slate-200"}`}
                    />
                  ))}
                </div>
                <p className="text-slate-600 text-xs mt-2.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100/50 inline-block max-w-3xl">
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
