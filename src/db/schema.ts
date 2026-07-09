import { pgTable, uuid, text, numeric, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// =========================================================================
// 🗄️ FALLBACK SCHEMA (EP-CALM-RECIPE)
// =========================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"), // 'admin' | 'user'
  phone: text("phone"),
  document: text("document"), // CPF
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(), // using text key for maximum compatibility with both DBs
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  costPrice: numeric("cost_price").notNull(),
  salePrice: numeric("sale_price").notNull(),
  stock: integer("stock").notNull().default(0),
  images: text("images").array(), // Text array for image URLs
  status: text("status").notNull().default("active"), // 'active' | 'inactive' | 'archived'
  storeVisible: boolean("store_visible").notNull().default(true),
  sku: text("sku"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  productId: uuid("product_id"),
  salePrice: numeric("sale_price").notNull(),
  costPrice: numeric("cost_price").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  trackingCode: text("tracking_code"),
  status: text("status").notNull().default("aguardando_pagamento"), // 'aguardando_pagamento' | 'pago' | 'enviado' | 'entregue' | 'cancelado'
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminChatSessions = pgTable("admin_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id"),
  title: text("title"), // stores chat subject or user full name
  provider: text("provider"), // stores client user_id as a string
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const adminChatMessages = pgTable("admin_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id"),
  role: text("role"), // 'user' | 'admin'
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


// =========================================================================
// 🗄️ OFFICIAL REQUESED SCHEMA (EP-HIDDEN-VIOLET)
// =========================================================================

export const usuario = pgTable("usuario", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  nome: text("nome").notNull(),
  role: text("role").notNull().default("user"), // 'admin' | 'user'
  ativo: boolean("ativo").notNull().default(true),
});

export const sales = pgTable("sales", {
  id: text("id").primaryKey(),
  productTitle: text("product_title").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price").notNull(),
  grossAmount: numeric("gross_amount").notNull(),
  status: text("status").notNull().default("aguardando_pagamento"),
  orderDate: text("order_date").notNull(), // format YYYY-MM-DD
  companyId: text("company_id").notNull().default("company-1"),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  amount: numeric("amount").notNull(),
  category: text("category").notNull(),
  referenceMonth: text("reference_month").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
});

export const incomes = pgTable("incomes", {
  id: text("id").primaryKey(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  receivedAt: text("received_at").notNull(),
  isReceived: boolean("is_received").notNull().default(false),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  messages: jsonb("messages").notNull().default([]),
});
