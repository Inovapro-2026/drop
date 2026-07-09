import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";
import "dotenv/config";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import fs from "fs";
import path from "path";

const officialUrl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("ep-hidden-violet") ? process.env.DATABASE_URL : undefined;
const fallbackUrl = "postgresql://neondb_owner:npg_BMSrJpjC7Uh3@ep-calm-recipe-atf28lyd-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let activeUrl = officialUrl || fallbackUrl;
let isOfficial = true;

export let pool = new pg.Pool({
  connectionString: activeUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export let db = drizzle(pool, { schema });

let checkPromise: Promise<boolean> | null = null;

// File-based store for extra user details (profile/address) when using official DB
const USER_DETAILS_FILE = path.join(process.cwd(), "user_details.json");

if (!fs.existsSync(USER_DETAILS_FILE)) {
  fs.writeFileSync(USER_DETAILS_FILE, JSON.stringify({}, null, 2));
}

function getStoredDetails(userId: string) {
  try {
    const data = fs.readFileSync(USER_DETAILS_FILE, "utf-8");
    const json = JSON.parse(data);
    return json[userId] || {};
  } catch {
    return {};
  }
}

function saveStoredDetails(userId: string, details: any) {
  try {
    const data = fs.readFileSync(USER_DETAILS_FILE, "utf-8");
    const json = JSON.parse(data);
    json[userId] = { ...json[userId], ...details };
    fs.writeFileSync(USER_DETAILS_FILE, JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Failed to save user details to json file", err);
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (checkPromise) return checkPromise;

  checkPromise = (async () => {
    if (!officialUrl) {
      console.log("[DB] No official DATABASE_URL specified. Falling back to CALM-RECIPE.");
      isOfficial = false;
      try {
        await pool.end().catch(() => {});
        pool = new pg.Pool({
          connectionString: fallbackUrl,
          ssl: { rejectUnauthorized: false },
        });
        db = drizzle(pool, { schema });
      } catch (err) {
        console.error("[DB] Failed to initialize fallback pool", err);
      }
      return false;
    }

    const testClient = new pg.Client({
      connectionString: officialUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await testClient.connect();
      console.log("[DB] Successfully connected to official DB!");
      await testClient.end();
      isOfficial = true;
      return true;
    } catch (err) {
      console.log("[DB] Using fallback CALM-RECIPE database.");
      isOfficial = false;
      try {
        await pool.end().catch(() => {});
        pool = new pg.Pool({
          connectionString: fallbackUrl,
          ssl: { rejectUnauthorized: false },
        });
        db = drizzle(pool, { schema });
      } catch (poolErr) {
        console.log("[DB] Handled pool recreation.");
      }
      return false;
    }
  })();

  return checkPromise;
}

// Unified Database Helper
export const dbHelper = {
  isOfficial: () => isOfficial,

  // 📦 PRODUCTS HELPERS
  getProducts: async (filters?: { search?: string; category?: string; showHidden?: boolean }) => {
    await checkDatabaseConnection();
    const search = filters?.search?.trim();
    const category = filters?.category;
    const showHidden = filters?.showHidden ?? false;

    if (isOfficial) {
      try {
        let queryStr = "SELECT * FROM products WHERE 1=1";
        const params: any[] = [];

        if (!showHidden) {
          queryStr += " AND store_visible = true AND status = 'active'";
        }
        if (category && category !== "All") {
          params.push(category);
          queryStr += ` AND category = $${params.length}`;
        }
        if (search) {
          params.push(`%${search}%`);
          queryStr += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }

        queryStr += " ORDER BY id DESC";
        const res = await pool.query(queryStr, params);

        return res.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description || "",
          price: row.price ? String(row.price) : "0",
          cost: row.cost ? String(row.cost) : "0",
          stock: Number(row.stock || 0),
          category: row.category || "Geral",
          images: Array.isArray(row.images) ? row.images : (typeof row.images === 'string' ? JSON.parse(row.images) : []),
          storeVisible: row.store_visible !== false,
          status: row.status || "active",
          sku: row.sku || "",
        }));
      } catch (err) {
        console.error("Official getProducts query failed", err);
        return [];
      }
    } else {
      try {
        let conditions = [];
        if (!showHidden) {
          conditions.push(eq(schema.products.storeVisible, true));
          conditions.push(eq(schema.products.status, "active"));
        }
        if (category && category !== "All") {
          conditions.push(eq(schema.products.category, category));
        }
        if (search) {
          const searchPattern = `%${search}%`;
          conditions.push(
            or(
              ilike(schema.products.title, searchPattern),
              ilike(schema.products.description, searchPattern)
            )
          );
        }

        const items = await db.query.products.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          orderBy: [desc(schema.products.createdAt)],
        });

        return items.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description || "",
          price: String(p.salePrice),
          cost: String(p.costPrice),
          stock: p.stock,
          category: p.category || "Geral",
          images: p.images || [],
          storeVisible: p.storeVisible,
          status: p.status,
          sku: p.sku || "",
        }));
      } catch (err) {
        console.error("Fallback getProducts failed", err);
        return [];
      }
    }
  },

  getProductById: async (id: string) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          id: row.id,
          title: row.title,
          description: row.description || "",
          price: row.price ? String(row.price) : "0",
          cost: row.cost ? String(row.cost) : "0",
          stock: Number(row.stock || 0),
          category: row.category || "Geral",
          images: Array.isArray(row.images) ? row.images : (typeof row.images === 'string' ? JSON.parse(row.images) : []),
          storeVisible: row.store_visible !== false,
          status: row.status || "active",
          sku: row.sku || "",
        };
      } catch (err) {
        console.error("Official getProductById failed", err);
        return null;
      }
    } else {
      try {
        const p = await db.query.products.findFirst({
          where: eq(schema.products.id, id),
        });
        if (!p) return null;
        return {
          id: p.id,
          title: p.title,
          description: p.description || "",
          price: String(p.salePrice),
          cost: String(p.costPrice),
          stock: p.stock,
          category: p.category || "Geral",
          images: p.images || [],
          storeVisible: p.storeVisible,
          status: p.status,
          sku: p.sku || "",
        };
      } catch (err) {
        console.error("Fallback getProductById failed", err);
        return null;
      }
    }
  },

  updateProduct: async (id: string, values: Partial<{ price: string; cost: string; stock: number; storeVisible: boolean; status: string; title: string; description: string; category: string; sku: string; images: string[] }>) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const fields: string[] = [];
        const params: any[] = [id];
        
        if (values.price !== undefined) {
          params.push(values.price);
          fields.push(`price = $${params.length}`);
        }
        if (values.cost !== undefined) {
          params.push(values.cost);
          fields.push(`cost = $${params.length}`);
        }
        if (values.stock !== undefined) {
          params.push(values.stock);
          fields.push(`stock = $${params.length}`);
        }
        if (values.storeVisible !== undefined) {
          params.push(values.storeVisible);
          fields.push(`store_visible = $${params.length}`);
        }
        if (values.status !== undefined) {
          params.push(values.status);
          fields.push(`status = $${params.length}`);
        }
        if (values.title !== undefined) {
          params.push(values.title);
          fields.push(`title = $${params.length}`);
        }
        if (values.description !== undefined) {
          params.push(values.description);
          fields.push(`description = $${params.length}`);
        }
        if (values.category !== undefined) {
          params.push(values.category);
          fields.push(`category = $${params.length}`);
        }
        if (values.sku !== undefined) {
          params.push(values.sku);
          fields.push(`sku = $${params.length}`);
        }
        if (values.images !== undefined) {
          params.push(JSON.stringify(values.images));
          fields.push(`images = $${params.length}`);
        }

        if (fields.length > 0) {
          await pool.query(`UPDATE products SET ${fields.join(", ")} WHERE id = $1`, params);
        }
        return true;
      } catch (err) {
        console.error("Official updateProduct failed", err);
        throw err;
      }
    } else {
      try {
        const updateObj: any = {};
        if (values.price !== undefined) updateObj.salePrice = values.price;
        if (values.cost !== undefined) updateObj.costPrice = values.cost;
        if (values.stock !== undefined) updateObj.stock = values.stock;
        if (values.storeVisible !== undefined) updateObj.storeVisible = values.storeVisible;
        if (values.status !== undefined) updateObj.status = values.status;
        if (values.title !== undefined) updateObj.title = values.title;
        if (values.description !== undefined) updateObj.description = values.description;
        if (values.category !== undefined) updateObj.category = values.category;
        if (values.sku !== undefined) updateObj.sku = values.sku;
        if (values.images !== undefined) updateObj.images = values.images;

        await db.update(schema.products).set(updateObj).where(eq(schema.products.id, id));
        return true;
      } catch (err) {
        console.error("Fallback updateProduct failed", err);
        throw err;
      }
    }
  },

  createProduct: async (values: { id: string; title: string; description: string; price: string; cost: string; stock: number; category: string; images: string[]; status: string; storeVisible: boolean; sku: string }) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        await pool.query(
          `INSERT INTO products (id, title, description, price, cost, stock, category, images, status, store_visible, sku)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            values.id,
            values.title,
            values.description,
            values.price,
            values.cost,
            values.stock,
            values.category,
            JSON.stringify(values.images),
            values.status,
            values.storeVisible,
            values.sku
          ]
        );
        return true;
      } catch (err) {
        console.error("Official createProduct failed", err);
        throw err;
      }
    } else {
      try {
        await db.insert(schema.products).values({
          id: values.id,
          title: values.title,
          description: values.description,
          salePrice: values.price,
          costPrice: values.cost,
          stock: values.stock,
          category: values.category,
          images: values.images,
          status: values.status,
          storeVisible: values.storeVisible,
          sku: values.sku,
        });
        return true;
      } catch (err) {
        console.error("Fallback createProduct failed", err);
        throw err;
      }
    }
  },

  // 👤 USER HELPERS
  getUsuarioByEmail: async (email: string) => {
    await checkDatabaseConnection();
    const cleanEmail = email.toLowerCase().trim();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM usuario WHERE email = $1", [cleanEmail]);
        if (res.rows.length === 0) return null;
        const u = res.rows[0];
        const extra = getStoredDetails(u.id);
        return {
          id: u.id,
          email: u.email,
          senha: u.senha,
          nome: u.nome,
          role: u.role || "user",
          ativo: u.ativo !== false,
          phone: extra.phone || "",
          document: extra.document || "",
          cep: extra.cep || "",
          street: extra.street || "",
          number: extra.number || "",
          complement: extra.complement || "",
          neighborhood: extra.neighborhood || "",
          city: extra.city || "",
          state: extra.state || "",
        };
      } catch (err) {
        console.error("Official getUsuarioByEmail failed", err);
        return null;
      }
    } else {
      try {
        const u = await db.query.users.findFirst({
          where: eq(schema.users.email, cleanEmail),
        });
        if (!u) return null;
        return {
          id: u.id,
          email: u.email,
          senha: u.passwordHash,
          nome: u.fullName,
          role: u.role || "user",
          ativo: !u.isBlocked,
          phone: u.phone || "",
          document: u.document || "",
          cep: u.cep || "",
          street: u.street || "",
          number: u.number || "",
          complement: u.complement || "",
          neighborhood: u.neighborhood || "",
          city: u.city || "",
          state: u.state || "",
        };
      } catch (err) {
        console.error("Fallback getUsuarioByEmail failed", err);
        return null;
      }
    }
  },

  getUsuarioById: async (id: string) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM usuario WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        const u = res.rows[0];
        const extra = getStoredDetails(u.id);
        return {
          id: u.id,
          email: u.email,
          senha: u.senha,
          nome: u.nome,
          role: u.role || "user",
          ativo: u.ativo !== false,
          phone: extra.phone || "",
          document: extra.document || "",
          cep: extra.cep || "",
          street: extra.street || "",
          number: extra.number || "",
          complement: extra.complement || "",
          neighborhood: extra.neighborhood || "",
          city: extra.city || "",
          state: extra.state || "",
        };
      } catch (err) {
        console.error("Official getUsuarioById failed", err);
        return null;
      }
    } else {
      try {
        const u = await db.query.users.findFirst({
          where: eq(schema.users.id, id),
        });
        if (!u) return null;
        return {
          id: u.id,
          email: u.email,
          senha: u.passwordHash,
          nome: u.fullName,
          role: u.role || "user",
          ativo: !u.isBlocked,
          phone: u.phone || "",
          document: u.document || "",
          cep: u.cep || "",
          street: u.street || "",
          number: u.number || "",
          complement: u.complement || "",
          neighborhood: u.neighborhood || "",
          city: u.city || "",
          state: u.state || "",
        };
      } catch (err) {
        console.error("Fallback getUsuarioById failed", err);
        return null;
      }
    }
  },

  createUsuario: async (values: { id: string; email: string; senhaHash: string; nome: string; role?: string; ativo?: boolean; phone?: string; document?: string; cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }) => {
    await checkDatabaseConnection();
    const cleanEmail = values.email.toLowerCase().trim();
    const role = values.role || "user";
    const ativo = values.ativo ?? true;

    if (isOfficial) {
      try {
        await pool.query(
          `INSERT INTO usuario (id, email, senha, nome, role, ativo) VALUES ($1, $2, $3, $4, $5, $6)`,
          [values.id, cleanEmail, values.senhaHash, values.nome, role, ativo]
        );
        // Store metadata file-based
        saveStoredDetails(values.id, {
          phone: values.phone || "",
          document: values.document || "",
          cep: values.cep || "",
          street: values.street || "",
          number: values.number || "",
          complement: values.complement || "",
          neighborhood: values.neighborhood || "",
          city: values.city || "",
          state: values.state || "",
        });
        return true;
      } catch (err) {
        console.error("Official createUsuario failed", err);
        throw err;
      }
    } else {
      try {
        await db.insert(schema.users).values({
          id: values.id,
          email: cleanEmail,
          passwordHash: values.senhaHash,
          fullName: values.nome,
          role: role,
          isBlocked: !ativo,
          phone: values.phone,
          document: values.document,
          cep: values.cep,
          street: values.street,
          number: values.number,
          complement: values.complement,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state,
        });
        return true;
      } catch (err) {
        console.error("Fallback createUsuario failed", err);
        throw err;
      }
    }
  },

  updateUsuario: async (id: string, values: Partial<{ nome: string; phone: string; document: string; cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string }>) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        if (values.nome) {
          await pool.query("UPDATE usuario SET nome = $1 WHERE id = $2", [values.nome, id]);
        }
        // Save metadata to file
        saveStoredDetails(id, values);
        return true;
      } catch (err) {
        console.error("Official updateUsuario failed", err);
        throw err;
      }
    } else {
      try {
        const updateObj: any = {};
        if (values.nome) updateObj.fullName = values.nome;
        if (values.phone !== undefined) updateObj.phone = values.phone;
        if (values.document !== undefined) updateObj.document = values.document;
        if (values.cep !== undefined) updateObj.cep = values.cep;
        if (values.street !== undefined) updateObj.street = values.street;
        if (values.number !== undefined) updateObj.number = values.number;
        if (values.complement !== undefined) updateObj.complement = values.complement;
        if (values.neighborhood !== undefined) updateObj.neighborhood = values.neighborhood;
        if (values.city !== undefined) updateObj.city = values.city;
        if (values.state !== undefined) updateObj.state = values.state;

        await db.update(schema.users).set(updateObj).where(eq(schema.users.id, id));
        return true;
      } catch (err) {
        console.error("Fallback updateUsuario failed", err);
        throw err;
      }
    }
  },

  // 🛍️ SALES & ORDERS HELPERS
  getSales: async () => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM sales ORDER BY id DESC");
        return res.rows.map(row => ({
          id: row.id,
          productTitle: row.product_title,
          quantity: Number(row.quantity || 1),
          unitPrice: String(row.unit_price),
          grossAmount: String(row.gross_amount),
          status: row.status,
          orderDate: row.order_date,
          companyId: row.company_id || "company-1",
        }));
      } catch (err) {
        console.error("Official getSales failed", err);
        return [];
      }
    } else {
      try {
        const items = await db.query.orders.findMany({
          orderBy: [desc(schema.orders.createdAt)],
        });
        return items.map(o => ({
          id: o.id,
          productTitle: o.notes || "Pedido de Compra",
          quantity: 1,
          unitPrice: String(o.salePrice),
          grossAmount: String(o.salePrice),
          status: o.status,
          orderDate: new Date(o.createdAt).toISOString().split("T")[0],
          companyId: "company-1",
          customerName: o.customerName || "Cliente",
          customerEmail: o.customerEmail || "",
          trackingCode: o.trackingCode || "",
        }));
      } catch (err) {
        console.error("Fallback getSales failed", err);
        return [];
      }
    }
  },

  getSalesByUserId: async (userId: string) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        // Since sales doesn't have a user_id, we associate it by matching the customer's email or reading from a local map!
        // To be highly robust: we read the customer's email from the user profile, then query sales with that name or we can store a mapping of sales to userIds.
        // Let's get the user email first:
        const user = await dbHelper.getUsuarioById(userId);
        if (!user) return [];
        const email = user.email.toLowerCase().trim();

        const res = await pool.query("SELECT * FROM sales ORDER BY id DESC");
        // Filter by company-1 and match by mock orders for this user
        // Or store user-sales mappings in a file!
        // To make it completely reliable, let's keep a mapping of sale_id to user_id in user_details.json!
        const stored = getStoredDetails(userId);
        const orderIds = stored.orderIds || [];

        return res.rows
          .filter(row => orderIds.includes(row.id))
          .map(row => ({
            id: row.id,
            productTitle: row.product_title,
            quantity: Number(row.quantity || 1),
            unitPrice: String(row.unit_price),
            grossAmount: String(row.gross_amount),
            status: row.status,
            orderDate: row.order_date,
            companyId: row.company_id || "company-1",
          }));
      } catch (err) {
        console.error("Official getSalesByUserId failed", err);
        return [];
      }
    } else {
      try {
        const items = await db.query.orders.findMany({
          where: eq(schema.orders.userId, userId),
          orderBy: [desc(schema.orders.createdAt)],
        });
        return items.map(o => ({
          id: o.id,
          productTitle: o.notes || "Pedido de Compra",
          quantity: 1,
          unitPrice: String(o.salePrice),
          grossAmount: String(o.salePrice),
          status: o.status,
          orderDate: new Date(o.createdAt).toISOString().split("T")[0],
          companyId: "company-1",
          customerName: o.customerName || "Cliente",
          customerEmail: o.customerEmail || "",
          trackingCode: o.trackingCode || "",
        }));
      } catch (err) {
        console.error("Fallback getSalesByUserId failed", err);
        return [];
      }
    }
  },

  createSale: async (values: { id: string; productTitle: string; quantity: number; unitPrice: string; grossAmount: string; status: string; orderDate: string; companyId?: string; userId: string }) => {
    await checkDatabaseConnection();
    const companyId = values.companyId || "company-1";
    if (isOfficial) {
      try {
        await pool.query(
          `INSERT INTO sales (id, product_title, quantity, unit_price, gross_amount, status, order_date, company_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [values.id, values.productTitle, values.quantity, values.unitPrice, values.grossAmount, values.status, values.orderDate, companyId]
        );
        // Associate sale ID with this user
        const stored = getStoredDetails(values.userId);
        const orderIds = stored.orderIds || [];
        orderIds.push(values.id);
        saveStoredDetails(values.userId, { orderIds });
        return true;
      } catch (err) {
        console.error("Official createSale failed", err);
        throw err;
      }
    } else {
      try {
        const user = await dbHelper.getUsuarioById(values.userId);
        await db.insert(schema.orders).values({
          id: values.id,
          userId: values.userId,
          salePrice: values.grossAmount,
          costPrice: String(Number(values.unitPrice) * 0.5),
          customerName: user?.nome || "Cliente InovaDrop",
          customerEmail: user?.email || "cliente@inovadrop.com.br",
          notes: values.productTitle,
          status: values.status,
        });
        return true;
      } catch (err) {
        console.error("Fallback createSale failed", err);
        throw err;
      }
    }
  },

  updateSaleStatus: async (id: string, status: string, trackingCode?: string) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        await pool.query("UPDATE sales SET status = $1 WHERE id = $2", [status, id]);
        if (trackingCode !== undefined) {
          // Store tracking code in metadata
          const details = getStoredDetails("tracking_" + id);
          details.trackingCode = trackingCode;
          saveStoredDetails("tracking_" + id, details);
        }
        return true;
      } catch (err) {
        console.error("Official updateSaleStatus failed", err);
        throw err;
      }
    } else {
      try {
        await db.update(schema.orders).set({ 
          status,
          trackingCode: trackingCode || undefined,
        }).where(eq(schema.orders.id, id));
        return true;
      } catch (err) {
        console.error("Fallback updateSaleStatus failed", err);
        throw err;
      }
    }
  },

  getSaleById: async (id: string) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM sales WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        const trackingDetails = getStoredDetails("tracking_" + id);
        return {
          id: row.id,
          productTitle: row.product_title,
          quantity: Number(row.quantity || 1),
          unitPrice: String(row.unit_price),
          grossAmount: String(row.gross_amount),
          status: row.status,
          orderDate: row.order_date,
          companyId: row.company_id || "company-1",
          trackingCode: trackingDetails.trackingCode || "",
        };
      } catch (err) {
        console.error("Official getSaleById failed", err);
        return null;
      }
    } else {
      try {
        const o = await db.query.orders.findFirst({
          where: eq(schema.orders.id, id),
        });
        if (!o) return null;
        return {
          id: o.id,
          productTitle: o.notes || "Pedido de Compra",
          quantity: 1,
          unitPrice: String(o.salePrice),
          grossAmount: String(o.salePrice),
          status: o.status,
          orderDate: new Date(o.createdAt).toISOString().split("T")[0],
          companyId: "company-1",
          trackingCode: o.trackingCode || "",
          customerName: o.customerName || "Cliente",
          customerEmail: o.customerEmail || "",
        };
      } catch (err) {
        console.error("Fallback getSaleById failed", err);
        return null;
      }
    }
  },

  // 📊 FINANCIALS HELPERS (EXPENSES & INCOMES)
  getExpenses: async () => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM expenses ORDER BY id DESC");
        return res.rows.map(row => ({
          id: row.id || String(Math.random()),
          amount: String(row.amount),
          category: row.category,
          referenceMonth: row.reference_month,
          isPaid: row.is_paid !== false,
        }));
      } catch (err) {
        console.error("Official getExpenses failed", err);
        return [];
      }
    } else {
      return [
        { id: "exp-1", amount: "1200.00", category: "Marketing Ads", referenceMonth: "2026-07", isPaid: true },
        { id: "exp-2", amount: "450.00", category: "Servidor e Infra", referenceMonth: "2026-07", isPaid: true },
        { id: "exp-3", amount: "3500.00", category: "Compra Fornecedor", referenceMonth: "2026-07", isPaid: false },
      ];
    }
  },

  createExpense: async (values: { amount: string; category: string; referenceMonth: string; isPaid: boolean }) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const id = "exp-" + Date.now();
        await pool.query(
          "INSERT INTO expenses (id, amount, category, reference_month, is_paid) VALUES ($1, $2, $3, $4, $5)",
          [id, values.amount, values.category, values.referenceMonth, values.isPaid]
        );
        return true;
      } catch (err) {
        console.error("Official createExpense failed", err);
        throw err;
      }
    } else {
      console.log("Mock createExpense success");
      return true;
    }
  },

  getIncomes: async () => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM incomes ORDER BY id DESC");
        return res.rows.map(row => ({
          id: row.id || String(Math.random()),
          amount: String(row.amount),
          description: row.description || "",
          receivedAt: row.received_at,
          isReceived: row.is_received !== false,
        }));
      } catch (err) {
        console.error("Official getIncomes failed", err);
        return [];
      }
    } else {
      try {
        const ordersList = await db.query.orders.findMany({
          where: eq(schema.orders.status, "pago"),
        });
        return [
          { id: "inc-1", amount: "4200.00", description: "Vendas Diretas", receivedAt: "2026-07-01", isReceived: true },
          ...ordersList.map((o, idx) => ({
            id: `inc-ord-${idx}`,
            amount: String(o.salePrice),
            description: `Venda ${o.notes || "Produto"}`,
            receivedAt: new Date(o.createdAt).toISOString().split("T")[0],
            isReceived: true,
          }))
        ];
      } catch {
        return [
          { id: "inc-1", amount: "4200.00", description: "Vendas Diretas", receivedAt: "2026-07-01", isReceived: true }
        ];
      }
    }
  },

  createIncome: async (values: { amount: string; description: string; receivedAt: string; isReceived: boolean }) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const id = "inc-" + Date.now();
        await pool.query(
          "INSERT INTO incomes (id, amount, description, received_at, is_received) VALUES ($1, $2, $3, $4, $5)",
          [id, values.amount, values.description, values.receivedAt, values.isReceived]
        );
        return true;
      } catch (err) {
        console.error("Official createIncome failed", err);
        throw err;
      }
    } else {
      console.log("Mock createIncome success");
      return true;
    }
  },

  // 💬 CONVERSATIONS / CHAT HELPERS
  getConversations: async () => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM conversations ORDER BY id DESC");
        return res.rows.map(row => ({
          id: row.id,
          title: row.title || "Suporte Geral",
          messages: Array.isArray(row.messages) ? row.messages : (typeof row.messages === 'string' ? JSON.parse(row.messages) : []),
        }));
      } catch (err) {
        console.error("Official getConversations failed", err);
        return [];
      }
    } else {
      try {
        const sessions = await db.query.adminChatSessions.findMany({
          orderBy: [desc(schema.adminChatSessions.createdAt)],
        });
        
        const conversationsList = [];
        for (const s of sessions) {
          const msgs = await db.query.adminChatMessages.findMany({
            where: eq(schema.adminChatMessages.sessionId, s.id),
            orderBy: [schema.adminChatMessages.createdAt],
          });
          conversationsList.push({
            id: s.id,
            title: s.title || "Suporte",
            messages: msgs.map(m => ({
              sender: m.role || "user",
              text: m.content,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })),
          });
        }
        return conversationsList;
      } catch (err) {
        console.error("Fallback getConversations failed", err);
        return [];
      }
    }
  },

  getConversationById: async (id: string) => {
    await checkDatabaseConnection();
    if (isOfficial) {
      try {
        const res = await pool.query("SELECT * FROM conversations WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          id: row.id,
          title: row.title || "Suporte Geral",
          messages: Array.isArray(row.messages) ? row.messages : (typeof row.messages === 'string' ? JSON.parse(row.messages) : []),
        };
      } catch (err) {
        console.error("Official getConversationById failed", err);
        return null;
      }
    } else {
      try {
        const s = await db.query.adminChatSessions.findFirst({
          where: eq(schema.adminChatSessions.id, id),
        });
        if (!s) return null;
        const msgs = await db.query.adminChatMessages.findMany({
          where: eq(schema.adminChatMessages.sessionId, s.id),
          orderBy: [schema.adminChatMessages.createdAt],
        });
        return {
          id: s.id,
          title: s.title || "Suporte",
          messages: msgs.map(m => ({
            sender: m.role || "user",
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })),
        };
      } catch (err) {
        console.error("Fallback getConversationById failed", err);
        return null;
      }
    }
  },

  saveMessage: async (convoId: string, sender: "user" | "admin", text: string, title?: string) => {
    await checkDatabaseConnection();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMessage = { sender, text, time };

    if (isOfficial) {
      try {
        const existing = await pool.query("SELECT * FROM conversations WHERE id = $1", [convoId]);
        if (existing.rows.length === 0) {
          const finalTitle = title || "Suporte Geral";
          await pool.query(
            "INSERT INTO conversations (id, title, messages) VALUES ($1, $2, $3)",
            [convoId, finalTitle, JSON.stringify([newMessage])]
          );
        } else {
          const messages = Array.isArray(existing.rows[0].messages)
            ? existing.rows[0].messages
            : JSON.parse(existing.rows[0].messages || "[]");
          messages.push(newMessage);
          await pool.query(
            "UPDATE conversations SET messages = $1 WHERE id = $2",
            [JSON.stringify(messages), convoId]
          );
        }
        return true;
      } catch (err) {
        console.error("Official saveMessage failed", err);
        throw err;
      }
    } else {
      try {
        let s = await db.query.adminChatSessions.findFirst({
          where: eq(schema.adminChatSessions.id, convoId),
        });
        if (!s) {
          const finalTitle = title || "Suporte";
          await db.insert(schema.adminChatSessions).values({
            id: convoId,
            title: finalTitle,
            provider: convoId,
          });
        }
        await db.insert(schema.adminChatMessages).values({
          sessionId: convoId,
          role: sender,
          content: text,
        });
        // Update session updatedAt timestamp
        await db.update(schema.adminChatSessions).set({
          updatedAt: new Date()
        }).where(eq(schema.adminChatSessions.id, convoId));
        return true;
      } catch (err) {
        console.error("Fallback saveMessage failed", err);
        throw err;
      }
    }
  }
};
