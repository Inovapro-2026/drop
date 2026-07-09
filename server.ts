import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { dbHelper } from "./src/db/index.ts";

const JWT_SECRET = process.env.JWT_SECRET || "algum_secret_muito_seguro_e_longo_123";
const PORT = 3000;

// Path to store trainings locally
const TRAININGS_FILE = path.join(process.cwd(), "trainings.json");

// Ensure trainings.json exists
if (!fs.existsSync(TRAININGS_FILE)) {
  fs.writeFileSync(
    TRAININGS_FILE,
    JSON.stringify([
      {
        id: "1",
        title: "Como vender mais no INOVADROP",
        description: "Aprenda as principais estratégias de marketing digital para alavancar suas vendas de infoprodutos e físicos.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        title: "Configurando sua Loja de Dropshipping",
        description: "Nesta aula você verá o passo a passo completo para integrar seu estoque e configurar suas margens de lucro.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        createdAt: new Date().toISOString(),
      }
    ], null, 2)
  );
}

// User types for Request
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Middleware to authenticate JWT
  const authenticateToken = (req: AuthRequest, res: express.Response, next: express.NextFunction): void => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Acesso não autorizado. Token ausente." });
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(403).json({ error: "Sessão expirada ou token inválido." });
        return;
      }
      req.user = decoded as { id: string; email: string; role: string };
      next();
    });
  };

  // Middleware to check if user is admin
  const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction): void => {
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({ error: "Permissão negada. Apenas administradores." });
      return;
    }
    next();
  };

  // =========================================================================
  // 🔐 AUTH ROUTES
  // =========================================================================

  // POST /api/auth/register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, fullName, phone, document, cep, street, number, complement, neighborhood, city, state } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes (email, password, fullName)." });
    }

    try {
      const existingUser = await dbHelper.getUsuarioByEmail(email);

      if (existingUser) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado em nossa plataforma." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();

      await dbHelper.createUsuario({
        id: userId,
        email: email.toLowerCase().trim(),
        senhaHash: passwordHash,
        nome: fullName,
        role: "user",
        ativo: true,
        phone,
        document,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });

      const token = jwt.sign(
        { id: userId, email: email.toLowerCase().trim(), role: "user" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        token,
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          fullName,
          role: "user",
          phone,
          document,
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
        },
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    try {
      const user = await dbHelper.getUsuarioByEmail(email);

      if (!user) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      if (!user.ativo) {
        return res.status(403).json({ error: "Sua conta está bloqueada ou inativa. Entre em contato com o suporte." });
      }

      const isMatch = await bcrypt.compare(password, user.senha);
      if (!isMatch) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.nome,
          role: user.role,
          phone: user.phone || "",
          document: user.document || "",
          cep: user.cep || "",
          street: user.street || "",
          number: user.number || "",
          complement: user.complement || "",
          neighborhood: user.neighborhood || "",
          city: user.city || "",
          state: user.state || "",
        },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Erro interno ao processar login." });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await dbHelper.getUsuarioById(req.user!.id);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.nome,
          role: user.role,
          phone: user.phone || "",
          document: user.document || "",
          cep: user.cep || "",
          street: user.street || "",
          number: user.number || "",
          complement: user.complement || "",
          neighborhood: user.neighborhood || "",
          city: user.city || "",
          state: user.state || "",
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar perfil." });
    }
  });

  // PUT /api/auth/profile
  app.put("/api/auth/profile", authenticateToken, async (req: AuthRequest, res) => {
    const { fullName, phone, document, cep, street, number, complement, neighborhood, city, state } = req.body;

    try {
      await dbHelper.updateUsuario(req.user!.id, {
        nome: fullName,
        phone,
        document,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });

      const updatedUser = await dbHelper.getUsuarioById(req.user!.id);

      res.json({
        user: {
          id: updatedUser?.id,
          email: updatedUser?.email,
          fullName: updatedUser?.nome,
          role: updatedUser?.role,
          phone: updatedUser?.phone || "",
          document: updatedUser?.document || "",
          cep: updatedUser?.cep || "",
          street: updatedUser?.street || "",
          number: updatedUser?.number || "",
          complement: updatedUser?.complement || "",
          neighborhood: updatedUser?.neighborhood || "",
          city: updatedUser?.city || "",
          state: updatedUser?.state || "",
        }
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Erro ao atualizar perfil." });
    }
  });


  // =========================================================================
  // 🛒 PRODUCTS ROUTES
  // =========================================================================

  // GET /api/products (Public & Admin filters)
  app.get("/api/products", async (req, res) => {
    const showHidden = req.query.admin === "true";
    const search = req.query.search as string;
    const category = req.query.category as string;

    try {
      const products = await dbHelper.getProducts({
        search,
        category,
        showHidden,
      });
      res.json(products);
    } catch (err) {
      console.error("Products error:", err);
      res.status(500).json({ error: "Erro ao listar produtos." });
    }
  });

  // GET /api/products/:id
  app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const product = await dbHelper.getProductById(id);

      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }

      res.json(product);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar produto." });
    }
  });

  // POST /api/products (Admin Only)
  app.post("/api/products", authenticateToken, requireAdmin, async (req, res) => {
    const { title, description, category, salePrice, costPrice, stock, images, status, storeVisible } = req.body;

    if (!title || salePrice === undefined || costPrice === undefined || stock === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes (title, salePrice, costPrice, stock)." });
    }

    try {
      const id = "prod-" + Date.now();
      const sku = "SKU-" + Math.floor(100000 + Math.random() * 900000);
      const values = {
        id,
        title,
        description: description || "",
        category: category || "Geral",
        price: String(salePrice),
        cost: String(costPrice),
        stock: parseInt(stock),
        images: images || [],
        status: status || "active",
        storeVisible: storeVisible !== undefined ? storeVisible : true,
        sku,
      };

      await dbHelper.createProduct(values);
      const created = await dbHelper.getProductById(id);
      res.status(201).json(created);
    } catch (err) {
      console.error("Create product error:", err);
      res.status(500).json({ error: "Erro ao criar produto." });
    }
  });

  // PUT /api/products/:id (Admin Only)
  app.put("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, category, salePrice, costPrice, stock, images, status, storeVisible } = req.body;

    try {
      await dbHelper.updateProduct(id, {
        title,
        description,
        category,
        price: salePrice !== undefined ? String(salePrice) : undefined,
        cost: costPrice !== undefined ? String(costPrice) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        images,
        status,
        storeVisible,
      });

      const updatedProduct = await dbHelper.getProductById(id);

      if (!updatedProduct) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }

      res.json(updatedProduct);
    } catch (err) {
      console.error("Update product error:", err);
      res.status(500).json({ error: "Erro ao atualizar produto." });
    }
  });


  // =========================================================================
  // 🛍️ ORDERS ROUTES
  // =========================================================================

  // POST /api/orders (Create Order / Checkout)
  app.post("/api/orders", authenticateToken, async (req: AuthRequest, res) => {
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "O carrinho de compras está vazio." });
    }

    try {
      const orderResults = [];

      for (const item of items) {
        const product = await dbHelper.getProductById(item.productId);

        if (!product) {
          return res.status(404).json({ error: `Produto não encontrado.` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Estoque insuficiente para o produto: ${product.title}. Disponível: ${product.stock}` });
        }

        // Deduct stock
        const newStock = product.stock - item.quantity;
        await dbHelper.updateProduct(product.id, { stock: newStock });

        const orderId = crypto.randomUUID();
        const grossAmount = String(parseFloat(product.price) * item.quantity);

        await dbHelper.createSale({
          id: orderId,
          productTitle: product.title,
          quantity: item.quantity,
          unitPrice: product.price,
          grossAmount,
          status: "aguardando_pagamento",
          orderDate: new Date().toISOString().split("T")[0],
          userId: req.user!.id,
        });

        orderResults.push({
          id: orderId,
          productId: product.id,
          productTitle: product.title,
          salePrice: grossAmount,
          quantity: item.quantity,
          status: "aguardando_pagamento",
          notes: notes || `Quantidade: ${item.quantity}`,
          productImages: product.images,
        });
      }

      res.status(201).json({ message: "Compra realizada com sucesso!", orders: orderResults });
    } catch (err) {
      console.error("Order creation error:", err);
      res.status(500).json({ error: "Erro interno ao processar a finalização do pedido." });
    }
  });

  // GET /api/orders/my-orders (Client Orders list)
  app.get("/api/orders/my-orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const mySales = await dbHelper.getSalesByUserId(req.user!.id);
      res.json(mySales);
    } catch (err) {
      console.error("Get orders error:", err);
      res.status(500).json({ error: "Erro ao buscar seus pedidos." });
    }
  });

  // GET /api/orders/all (Admin only)
  app.get("/api/orders/all", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const allSales = await dbHelper.getSales();
      res.json(allSales);
    } catch (err) {
      console.error("Get all orders error:", err);
      res.status(500).json({ error: "Erro ao listar todos os pedidos." });
    }
  });

  // PUT /api/orders/:id/status (Admin Only)
  app.put("/api/orders/:id/status", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, trackingCode } = req.body;

    try {
      await dbHelper.updateSaleStatus(id, status, trackingCode);
      const updated = await dbHelper.getSaleById(id);

      if (!updated) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }

      res.json(updated);
    } catch (err) {
      console.error("Update order error:", err);
      res.status(500).json({ error: "Erro ao atualizar status do pedido." });
    }
  });


  // =========================================================================
  // 💬 CHAT / SUPPORT ROUTES
  // =========================================================================

  // GET or CREATE support session for client
  app.get("/api/support/session", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const sessionId = req.user!.id; // Use userId directly as sessionId for simpler user-scoped support!
      let session = await dbHelper.getConversationById(sessionId);

      if (!session) {
        const user = await dbHelper.getUsuarioById(req.user!.id);
        const title = user?.nome || "Suporte";
        await dbHelper.saveMessage(sessionId, "admin", "Olá! Como posso ajudar você hoje?", title);
        session = await dbHelper.getConversationById(sessionId);
      }

      res.json(session);
    } catch (err) {
      console.error("Support session error:", err);
      res.status(500).json({ error: "Erro ao gerenciar sessão de suporte." });
    }
  });

  // GET all active sessions (Admin Only)
  app.get("/api/support/sessions/all", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const sessions = await dbHelper.getConversations();
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar sessões de suporte." });
    }
  });

  // GET messages for a session
  app.get("/api/support/messages/:sessionId", authenticateToken, async (req, res) => {
    const { sessionId } = req.params;
    try {
      const convo = await dbHelper.getConversationById(sessionId);
      if (!convo) {
        return res.json([]);
      }
      res.json(convo.messages);
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar mensagens do suporte." });
    }
  });

  // POST message to a session
  app.post("/api/support/messages/:sessionId", authenticateToken, async (req: AuthRequest, res) => {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    try {
      const sender = req.user!.role === "admin" ? "admin" : "user";
      await dbHelper.saveMessage(sessionId, sender, content.trim());
      
      const convo = await dbHelper.getConversationById(sessionId);
      const lastMsg = convo?.messages[convo.messages.length - 1];

      res.status(201).json(lastMsg);
    } catch (err) {
      console.error("Send message error:", err);
      res.status(500).json({ error: "Erro ao enviar mensagem." });
    }
  });


  // =========================================================================
  // 🎓 TRAININGS ROUTES (File-based Storage)
  // =========================================================================

  app.get("/api/trainings", authenticateToken, (req, res) => {
    try {
      const data = fs.readFileSync(TRAININGS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: "Erro ao carregar treinamentos." });
    }
  });

  app.post("/api/trainings", authenticateToken, requireAdmin, (req, res) => {
    const { title, description, videoUrl } = req.body;

    if (!title || !description || !videoUrl) {
      return res.status(400).json({ error: "Todos os campos da aula são obrigatórios." });
    }

    try {
      const data = fs.readFileSync(TRAININGS_FILE, "utf-8");
      const trainings = JSON.parse(data);

      const newLesson = {
        id: String(Date.now()),
        title,
        description,
        videoUrl,
        createdAt: new Date().toISOString(),
      };

      trainings.unshift(newLesson);
      fs.writeFileSync(TRAININGS_FILE, JSON.stringify(trainings, null, 2));

      res.status(201).json(newLesson);
    } catch (err) {
      res.status(500).json({ error: "Erro ao salvar aula." });
    }
  });


  // =========================================================================
  // 📊 DASHBOARD AND FINANCE ANALYTICS
  // =========================================================================

  app.get("/api/finance/dashboard", authenticateToken, async (req: AuthRequest, res) => {
    const isAdmin = req.user!.role === "admin";

    try {
      if (isAdmin) {
        const allSales = await dbHelper.getSales();
        const expenses = await dbHelper.getExpenses();
        const incomes = await dbHelper.getIncomes();

        let totalSales = 0;
        let totalCosts = 0;
        let totalPending = 0;
        let totalPaid = 0;
        const monthlyStatsMap: Record<string, { month: string; vendas: number; despesas: number; lucro: number }> = {};

        for (const sale of allSales) {
          const saleVal = parseFloat(sale.grossAmount || "0");
          const costVal = parseFloat(sale.unitPrice || "0") * sale.quantity * 0.5; // cost is 50% of unit price as fallback estimate

          if (sale.status === "pago" || sale.status === "enviado" || sale.status === "entregue") {
            totalSales += saleVal;
            totalCosts += costVal;
            totalPaid += 1;
          } else if (sale.status === "aguardando_pagamento") {
            totalPending += 1;
          }

          const dateStr = sale.orderDate || new Date().toISOString().split("T")[0];
          const monthKey = dateStr.substr(0, 7); // "YYYY-MM"

          if (!monthlyStatsMap[monthKey]) {
            monthlyStatsMap[monthKey] = {
              month: monthKey,
              vendas: 0,
              despesas: 0,
              lucro: 0,
            };
          }

          if (sale.status !== "cancelado") {
            monthlyStatsMap[monthKey].vendas += saleVal;
            monthlyStatsMap[monthKey].despesas += costVal;
            monthlyStatsMap[monthKey].lucro = monthlyStatsMap[monthKey].vendas - monthlyStatsMap[monthKey].despesas;
          }
        }

        // Add additional incomes and expenses if they are from the official DB
        for (const exp of expenses) {
          const monthKey = exp.referenceMonth;
          if (!monthlyStatsMap[monthKey]) {
            monthlyStatsMap[monthKey] = { month: monthKey, vendas: 0, despesas: 0, lucro: 0 };
          }
          if (exp.isPaid) {
            monthlyStatsMap[monthKey].despesas += parseFloat(exp.amount || "0");
            monthlyStatsMap[monthKey].lucro = monthlyStatsMap[monthKey].vendas - monthlyStatsMap[monthKey].despesas;
          }
        }

        for (const inc of incomes) {
          const monthKey = (inc.receivedAt || "").substr(0, 7);
          if (monthKey) {
            if (!monthlyStatsMap[monthKey]) {
              monthlyStatsMap[monthKey] = { month: monthKey, vendas: 0, despesas: 0, lucro: 0 };
            }
            if (inc.isReceived) {
              monthlyStatsMap[monthKey].vendas += parseFloat(inc.amount || "0");
              monthlyStatsMap[monthKey].lucro = monthlyStatsMap[monthKey].vendas - monthlyStatsMap[monthKey].despesas;
            }
          }
        }

        const chartData = Object.values(monthlyStatsMap).sort((a, b) => a.month.localeCompare(b.month));

        res.json({
          totalSales,
          totalCosts,
          totalProfit: totalSales - totalCosts,
          ordersCount: allSales.length,
          paidCount: totalPaid,
          pendingCount: totalPending,
          chartData,
        });

      } else {
        // Client gets their personal shopping stats
        const mySales = await dbHelper.getSalesByUserId(req.user!.id);

        let totalSpent = 0;
        let totalOrders = mySales.length;
        const monthlyStatsMap: Record<string, { month: string; compras: number; quantidade: number }> = {};

        for (const sale of mySales) {
          const saleVal = parseFloat(sale.grossAmount || "0");

          if (sale.status !== "cancelado") {
            totalSpent += saleVal;
          }

          const dateStr = sale.orderDate || new Date().toISOString().split("T")[0];
          const monthKey = dateStr.substr(0, 7); // "YYYY-MM"

          if (!monthlyStatsMap[monthKey]) {
            monthlyStatsMap[monthKey] = {
              month: monthKey,
              compras: 0,
              quantidade: 0,
            };
          }

          if (sale.status !== "cancelado") {
            monthlyStatsMap[monthKey].compras += saleVal;
            monthlyStatsMap[monthKey].quantidade += 1;
          }
        }

        const chartData = Object.values(monthlyStatsMap).sort((a, b) => a.month.localeCompare(b.month));

        res.json({
          totalSpent,
          totalOrders,
          averageValue: totalOrders > 0 ? (totalSpent / totalOrders) : 0,
          chartData,
        });
      }
    } catch (err) {
      console.error("Dashboard calculation error:", err);
      res.status(500).json({ error: "Erro ao gerar estatísticas financeiras." });
    }
  });


  // =========================================================================
  // VITE DEVELOPMENT SERVER OR STATIC SERVING IN PRODUCTION
  // =========================================================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] INOVADROP full-stack server running on port ${PORT}`);
  });
}

startServer();
