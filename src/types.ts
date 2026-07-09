export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  salePrice: string; // From database (string/numeric)
  costPrice: string; // From database (string/numeric)
  stock: number;
  images: string[] | null;
  status: string; // 'active' | 'inactive' | 'archived'
  storeVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string; // 'admin' | 'user'
  phone?: string;
  document?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  salePrice: string;
  costPrice: string;
  customerName: string;
  customerEmail: string;
  trackingCode?: string;
  status: 'aguardando_pagamento' | 'pago' | 'enviado' | 'entregue' | 'cancelado';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  productTitle?: string;
  productImages?: string[] | null;
}

export interface TrainingLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'admin';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  adminId?: string;
  title: string;
  provider: string; // user_id of user
  model: string;
  createdAt: string;
  updatedAt: string;
}
