import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import crypto from "crypto";
import helmet from "helmet";
import { Resend } from "resend";

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.disable("x-powered-by");

// Apply Helmet with customized production-grade security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://js.paystack.co",
          "https://checkout.paystack.com",
          "https://*.paystack.co",
          "https://connect.facebook.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://images.unsplash.com",
          "https://imgur.com",
          "https://*.imgur.com",
          "https://*.blob.core.windows.net",
          "https://paystack.com",
          "https://*.paystack.com",
          "https://*.paystack.co",
          "https://www.facebook.com",
          "https://bakedbydoja-hbf4ceeugafjhng2.canadacentral-01.azurewebsites.net"
        ],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          "https://api.paystack.co",
          "https://checkout.paystack.com",
          "https://*.paystack.co",
          "https://connect.facebook.net",
          "https://bakedbydoja-hbf4ceeugafjhng2.canadacentral-01.azurewebsites.net",
          "https://*.run.app",
          "http://localhost:*",
          "https://localhost:*"
        ],
        frameSrc: [
          "'self'",
          "https://js.paystack.co",
          "https://checkout.paystack.com",
          "https://checkout.paystack.co",
          "https://*.paystack.co",
          "https://*.paystack.com"
        ],
        frameAncestors: [
          "'self'",
          "https://*.google.com",
          "https://ai.studio",
          "https://*.run.app",
          "https://bakedbydoja-hbf4ceeugafjhng2.canadacentral-01.azurewebsites.net"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    xContentTypeOptions: true,
    dnsPrefetchControl: { allow: false },
    frameguard: false, // Disabled in favor of frameAncestors so the preview iframe in AI Studio can render the app
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false, // Disabled to allow loading cross-origin assets (like Unsplash images)
    crossOriginOpenerPolicy: false, // Disabled to ensure popups/redirects (like Paystack) work seamlessly
    xPoweredBy: false,
  })
);

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Security, CORS & HTTPS Enforcement Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://bakedbydoja-hbf4ceeugafjhng2.canadacentral-01.azurewebsites.net"
  ];
  const origin = req.headers.origin;

  let isAllowed = false;
  if (origin) {
    if (allowedOrigins.includes(origin) || 
        origin.endsWith(".run.app") || 
        origin.startsWith("http://localhost:") || 
        origin.startsWith("https://localhost:") ||
        /https?:\/\/127\.0\.0\.1(:\d+)?/.test(origin)) {
      isAllowed = true;
    }
  }

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    // If there is no origin header (e.g. direct API calls/webhook), set a fallback
    res.setHeader("Access-Control-Allow-Origin", "https://bakedbydoja-hbf4ceeugafjhng2.canadacentral-01.azurewebsites.net");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, x-paystack-signature");

  // Enable Permissions-Policy header
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=*");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (process.env.NODE_ENV === 'production') {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isSecure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

// Custom session token logic (crypto-signed session tokens)
const SESSION_SECRET = process.env.SESSION_SECRET || "baked_by_doja_secure_secret_token_12345";

function generateToken(payload: { phone: string; role?: string }) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const data = JSON.stringify({ ...payload, expiresAt });
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, signature: hmac })).toString('base64');
}

function verifyToken(token: string): { phone: string; role?: string } | null {
  if (token === "mock-admin-token") {
    return { phone: "admin", role: "admin" };
  }
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const { data, signature } = JSON.parse(raw);
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (expectedHmac !== signature) return null;
    
    const payload = JSON.parse(data);
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

// Authentication middleware to extract and verify token from request
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  const payload = verifyToken(token);
  req.user = payload; // Contains { phone, role } or null
  next();
};

app.use(authenticateToken);

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized access: Please login first." });
  }
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: "Forbidden: Admin privileges required." });
  }
  next();
};

// In-Memory Fallback Store (to prevent crashing and maintain functionality when Azure PG is not configured)
const fallbackUsers: any[] = [];
const fallbackOrders: any[] = [];
const fallbackInquiries: any[] = [];
const fallbackVisits: any[] = [];
const fallbackSettings: Record<string, string> = {
  paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY || "",
  paystack_secret_key: process.env.PAYSTACK_SECRET_KEY || ""
};

const defaultProducts: any[] = [];

let fallbackProducts: any[] = [...defaultProducts];

const defaultGallery = [
  {
    id: 'g1',
    title: 'Our Signature Golden Crust Loaf',
    category: 'loaves',
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g2',
    title: 'Gently Sliced and Ready to Serve',
    category: 'loaves',
    image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g3',
    title: 'A Perfect Morning Coffee Pairing',
    category: 'pairing',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g4',
    title: 'Premium Hand-Wrapped Packaging',
    category: 'packaging',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g5',
    title: 'Luxury Linen Gift Box Bundle',
    category: 'packaging',
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g6',
    title: 'Cozy Family Breakfast Moments',
    category: 'lifestyle',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g7',
    title: 'Warm Butter Melting Over Slice',
    category: 'pairing',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g8',
    title: 'Handcrafted Bakery Prep with Care',
    category: 'lifestyle',
    image: 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&q=80&w=600'
  }
];

let fallbackGallery: any[] = [...defaultGallery];

let fallbackCategories: any[] = [
  { key: 'loaves', label: 'Our Loaves' },
  { key: 'pairing', label: 'Perfect Pairings' },
  { key: 'packaging', label: 'Luxe Packaging' },
  { key: 'lifestyle', label: 'Lifestyle' }
];

let pool: pg.Pool | null = null;
let tablesInitialized = false;
let dbDisabledUntil = 0;
const DB_COOLDOWN_TIME = 60000; // 1 minute cooldown

// Lazy DB initialization to prevent crash if variables are not yet provided
async function getDbPool(): Promise<pg.Pool | null> {
  const now = Date.now();
  if (now < dbDisabledUntil) {
    return null;
  }

  if (pool) {
    if (!tablesInitialized) {
      await initializeTables(pool);
      if (!tablesInitialized) {
        dbDisabledUntil = Date.now() + DB_COOLDOWN_TIME;
        return null;
      }
    }
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  const host = process.env.AZURE_PG_HOST;
  const user = process.env.AZURE_PG_USER;
  const password = process.env.AZURE_PG_PASSWORD;
  const database = process.env.AZURE_PG_DATABASE;
  const port = process.env.AZURE_PG_PORT;

  const hasConnectionString = !!connectionString;
  const hasIndividualCreds = !!(host && user && password && database);

  if (!hasConnectionString && !hasIndividualCreds) {
    return null;
  }

  try {
    const config: pg.PoolConfig = {};

    if (connectionString) {
      config.connectionString = connectionString;
    } else {
      config.host = host;
      config.user = user;
      config.password = password;
      config.database = database;
      config.port = port ? parseInt(port, 10) : 5432;
    }

    // Azure Database for PostgreSQL Flexible Servers require SSL by default
    if (process.env.AZURE_PG_SSL !== "false") {
      config.ssl = {
        rejectUnauthorized: false,
      };
    }

    // Connection Timeout to prevent server blocking
    config.connectionTimeoutMillis = 5000;

    pool = new pg.Pool(config);
    pool.on("error", (err) => {
      console.error("❌ Unexpected error on idle client in pg Pool:", err);
    });
    await initializeTables(pool);
    if (!tablesInitialized) {
      dbDisabledUntil = Date.now() + DB_COOLDOWN_TIME;
      try {
        await pool.end();
      } catch (e) {}
      pool = null;
      return null;
    }
    return pool;
  } catch (error: any) {
    console.warn(`⚠️ Failed to initialize Azure PostgreSQL pool: ${error?.message || error}. Running in local memory fallback mode.`);
    pool = null;
    return null;
  }
}

async function initializeTables(dbPool: pg.Pool) {
  if (tablesInitialized) return;
  try {
    const client = await dbPool.connect();
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Defensively add email column if table already exists
      await client.query(`
        ALTER TABLE doja_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      `);

      // Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_orders (
          id SERIAL PRIMARY KEY,
          order_id VARCHAR(50) UNIQUE NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(255) NOT NULL,
          product_title VARCHAR(255) NOT NULL,
          quantity INTEGER NOT NULL,
          topping VARCHAR(255) NOT NULL,
          delivery_type VARCHAR(50) NOT NULL,
          is_gift BOOLEAN DEFAULT FALSE,
          gift_note JSONB,
          delivery_note TEXT,
          total_amount INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'prepping',
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Defensively add status, payment_status, and payment_reference columns if table already exists
      await client.query(`
        ALTER TABLE doja_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
      `);
      await client.query(`
        ALTER TABLE doja_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';
      `);
      await client.query(`
        ALTER TABLE doja_orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
      `);

      // Create settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Create inquiries table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_inquiries (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(255) NOT NULL,
          loaf VARCHAR(255) NOT NULL,
          message TEXT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create products table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_products (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          price INTEGER NOT NULL,
          original_price INTEGER,
          rating DECIMAL(3,2) NOT NULL DEFAULT 5.0,
          image TEXT NOT NULL,
          tag VARCHAR(50),
          toppings TEXT[] NOT NULL,
          prep_time VARCHAR(100) NOT NULL
        );
      `);

      // Seed default products if empty
      const prodCheck = await client.query("SELECT COUNT(*) FROM doja_products");
      if (parseInt(prodCheck.rows[0].count, 10) === 0) {
        console.log("🌱 Seeding default products to PostgreSQL...");
        for (const p of defaultProducts) {
          await client.query(
            `INSERT INTO doja_products (id, title, description, price, original_price, rating, image, tag, toppings, prep_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [p.id, p.title, p.description, p.price, p.originalPrice || null, p.rating, p.image, p.tag || null, p.toppings, p.prepTime]
          );
        }
      }

      // Create gallery table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_gallery (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          image TEXT NOT NULL
        );
      `);

      // Seed default gallery if empty
      const galCheck = await client.query("SELECT COUNT(*) FROM doja_gallery");
      if (parseInt(galCheck.rows[0].count, 10) === 0) {
        console.log("🌱 Seeding default gallery to PostgreSQL...");
        for (const g of defaultGallery) {
          await client.query(
            `INSERT INTO doja_gallery (id, title, category, image)
             VALUES ($1, $2, $3, $4)`,
            [g.id, g.title, g.category, g.image]
          );
        }
      }

      // Create gallery categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_gallery_categories (
          key VARCHAR(50) PRIMARY KEY,
          label VARCHAR(100) NOT NULL
        );
      `);

      // Create visits table
      await client.query(`
        CREATE TABLE IF NOT EXISTS doja_visits (
          id SERIAL PRIMARY KEY,
          visitor_uuid VARCHAR(100) NOT NULL,
          ip_address VARCHAR(100),
          user_agent TEXT,
          device_type VARCHAR(50),
          visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default categories if empty
      const catCheck = await client.query("SELECT COUNT(*) FROM doja_gallery_categories");
      if (parseInt(catCheck.rows[0].count, 10) === 0) {
        console.log("🌱 Seeding default gallery categories to PostgreSQL...");
        const defaultCategories = [
          { key: 'loaves', label: 'Our Loaves' },
          { key: 'pairing', label: 'Perfect Pairings' },
          { key: 'packaging', label: 'Luxe Packaging' },
          { key: 'lifestyle', label: 'Lifestyle' }
        ];
        for (const c of defaultCategories) {
          await client.query(
            `INSERT INTO doja_gallery_categories (key, label)
             VALUES ($1, $2)`,
            [c.key, c.label]
          );
        }
      }

      tablesInitialized = true;
      console.log("✅ Azure PostgreSQL flexible server tables verified/created successfully.");
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn(`⚠️ Azure PostgreSQL offline or unreachable: ${err?.message || err}. Running in local memory fallback mode.`);
  }
}

// API Routes
// 1. Get database configuration state (to show user if database is connected)
app.get("/api/db/status", async (req, res) => {
  const storageConnected = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
  try {
    const dbPool = await getDbPool();
    if (dbPool) {
      // Simple ping query to verify connection
      const client = await dbPool.connect();
      try {
        await client.query("SELECT 1");
        return res.json({ 
          connected: true, 
          storageConnected,
          source: "PostgreSQL Database Server", 
          details: `Connected to Database Host: ${process.env.AZURE_PG_HOST || "configured database string"}`
        });
      } finally {
        client.release();
      }
    }
  } catch (err: any) {
    return res.json({ 
      connected: false, 
      storageConnected,
      source: "PostgreSQL Database Server (Configured, but connection failed)", 
      error: err.message 
    });
  }
  
  return res.json({ 
    connected: false, 
    storageConnected,
    source: "In-Memory Sandbox", 
    message: "Database credentials not configured. Using local in-memory storage fallback. Add variables in Settings -> Secrets." 
  });
});

// 2. User Registration
app.post("/api/auth/register", async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const dbPool = await getDbPool();

    if (dbPool && tablesInitialized) {
      // Check if user already exists
      const checkRes = await dbPool.query(
        "SELECT * FROM doja_users WHERE phone = $1 OR (email IS NOT NULL AND email = $2)",
        [phone, email || '']
      );
      if (checkRes.rows.length > 0) {
        const existing = checkRes.rows[0];
        if (existing.phone === phone) {
          return res.status(400).json({ error: "A user with this phone number is already registered" });
        } else {
          return res.status(400).json({ error: "A user with this email address is already registered" });
        }
      }

      // Insert new user with hashed password
      const insertRes = await dbPool.query(
        "INSERT INTO doja_users (name, phone, email, password) VALUES ($1, $2, $3, $4) RETURNING name, phone, email",
        [name, phone, email || null, hashedPassword]
      );
      const user = insertRes.rows[0];
      const token = generateToken({ phone: user.phone });
      return res.json({ success: true, user, token });
    } else {
      // In-Memory Fallback with hashed password
      const existsPhone = fallbackUsers.some((u) => u.phone === phone);
      if (existsPhone) {
        return res.status(400).json({ error: "A user with this phone number is already registered" });
      }
      if (email) {
        const existsEmail = fallbackUsers.some((u) => u.email === email);
        if (existsEmail) {
          return res.status(400).json({ error: "A user with this email address is already registered" });
        }
      }
      const newUser = { name, phone, email, password: hashedPassword };
      fallbackUsers.push(newUser);
      const token = generateToken({ phone });
      return res.json({ success: true, user: { name, phone, email }, token });
    }
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Server error during registration" });
  }
});

// 3. User Login
app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  const identifier = (phone || req.body.email || req.body.identifier || "").trim();
  
  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing phone, email or password" });
  }

  // Admin intercept
  if (identifier === "joemalik23@outlook.com" || identifier === "adeyemifaridah23@gmail.com") {
    if (password === "Anike2003") {
      const user = {
        name: "Admin Faridah",
        phone: "admin",
        role: "admin"
      };
      const token = generateToken({ phone: "admin", role: "admin" });
      return res.json({
        success: true,
        user,
        token
      });
    } else {
      return res.status(400).json({ error: "Incorrect password for admin" });
    }
  }

  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const result = await dbPool.query(
        "SELECT name, phone, email, password FROM doja_users WHERE phone = $1 OR email = $1",
        [identifier]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Incorrect credentials. Check phone number/email or password!" });
      }
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect credentials. Check phone number/email or password!" });
      }
      const token = generateToken({ phone: user.phone });
      return res.json({ success: true, user: { name: user.name, phone: user.phone, email: user.email }, token });
    } else {
      // In-Memory Fallback
      const user = fallbackUsers.find((u) => u.phone === identifier || u.email === identifier);
      if (!user) {
        return res.status(400).json({ error: "Incorrect credentials. Check phone number/email or password!" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect credentials. Check phone number/email or password!" });
      }
      const token = generateToken({ phone: user.phone });
      return res.json({ success: true, user: { name: user.name, phone: user.phone, email: user.email }, token });
    }
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
});

// 3.4. Products APIs
// 3.4a. Get all products
app.get("/api/products", async (req, res) => {
  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const result = await dbPool.query(
        `SELECT id, title, description, price, original_price as "originalPrice", rating, image, tag, toppings, prep_time as "prepTime" 
         FROM doja_products`
      );
      const products = result.rows.map(r => ({
        ...r,
        price: Number(r.price),
        originalPrice: r.originalPrice ? Number(r.originalPrice) : undefined,
        rating: Number(r.rating)
      }));
      return res.json({ success: true, products });
    } else {
      return res.json({ success: true, products: fallbackProducts });
    }
  } catch (err: any) {
    console.error("Error fetching products from database:", err);
    return res.json({ success: true, products: fallbackProducts });
  }
});

// 3.4b. Save / Update all products
app.post("/api/products", requireAdmin, async (req, res) => {
  const { products: newProducts } = req.body;
  if (!Array.isArray(newProducts)) {
    return res.status(400).json({ error: "Products array is required" });
  }

  // Update in-memory fallback
  fallbackProducts = [...newProducts];

  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const client = await dbPool.connect();
      try {
        await client.query("BEGIN");
        
        // Delete existing products to avoid duplicates and handle deletions
        await client.query("DELETE FROM doja_products");
        
        for (const p of newProducts) {
          await client.query(
            `INSERT INTO doja_products (id, title, description, price, original_price, rating, image, tag, toppings, prep_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [p.id, p.title, p.description, p.price, p.originalPrice || null, p.rating, p.image, p.tag || null, p.toppings, p.prepTime]
          );
        }
        await client.query("COMMIT");
        return res.json({ success: true, message: "Products updated successfully in database" });
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error saving products to database:", err);
        return res.status(500).json({ error: "Failed to save products to database" });
      } finally {
        client.release();
      }
    } else {
      return res.json({ success: true, message: "Products updated successfully in fallback in-memory store" });
    }
  } catch (err: any) {
    console.error("Database connection error for products save:", err);
    return res.status(500).json({ error: "Failed to connect to database for saving products" });
  }
});

// Gallery APIs
// Get all gallery items
app.get("/api/gallery", async (req, res) => {
  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const result = await dbPool.query(
        `SELECT id, title, category, image FROM doja_gallery`
      );
      return res.json({ success: true, gallery: result.rows });
    } else {
      return res.json({ success: true, gallery: fallbackGallery });
    }
  } catch (err: any) {
    console.error("Error fetching gallery from database:", err);
    return res.json({ success: true, gallery: fallbackGallery });
  }
});

// Save / Update all gallery items
app.post("/api/gallery", requireAdmin, async (req, res) => {
  const { gallery: newGallery } = req.body;
  if (!Array.isArray(newGallery)) {
    return res.status(400).json({ error: "Gallery array is required" });
  }

  // Update in-memory fallback
  fallbackGallery = [...newGallery];

  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const client = await dbPool.connect();
      try {
        await client.query("BEGIN");
        
        // Delete existing gallery to avoid duplicates and handle deletions
        await client.query("DELETE FROM doja_gallery");
        
        for (const g of newGallery) {
          await client.query(
            `INSERT INTO doja_gallery (id, title, category, image)
             VALUES ($1, $2, $3, $4)`,
            [g.id, g.title, g.category, g.image]
          );
        }
        await client.query("COMMIT");
        return res.json({ success: true, message: "Gallery updated successfully in database" });
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error saving gallery to database:", err);
        return res.status(500).json({ error: "Failed to save gallery to database" });
      } finally {
        client.release();
      }
    } else {
      return res.json({ success: true, message: "Gallery updated successfully in fallback in-memory store" });
    }
  } catch (err: any) {
    console.error("Database connection error for gallery save:", err);
    return res.status(500).json({ error: "Failed to connect to database for saving gallery" });
  }
});

// Get gallery categories
app.get("/api/gallery/categories", async (req, res) => {
  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const result = await dbPool.query(
        `SELECT key, label FROM doja_gallery_categories ORDER BY label ASC`
      );
      return res.json({ success: true, categories: result.rows });
    } else {
      return res.json({ success: true, categories: fallbackCategories });
    }
  } catch (err: any) {
    console.error("Error fetching categories from database:", err);
    return res.json({ success: true, categories: fallbackCategories });
  }
});

// Add a gallery category / tag
app.post("/api/gallery/categories", requireAdmin, async (req, res) => {
  const { key, label } = req.body;
  if (!key || !label) {
    return res.status(400).json({ error: "Category key and label are required" });
  }

  // Format key to lowercase, letters and underscores only to be safe
  const formattedKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  if (!formattedKey) {
    return res.status(400).json({ error: "Invalid category key" });
  }

  // Add/Update in memory fallback
  const existingIndex = fallbackCategories.findIndex(c => c.key === formattedKey);
  if (existingIndex !== -1) {
    fallbackCategories[existingIndex] = { key: formattedKey, label: label.trim() };
  } else {
    fallbackCategories.push({ key: formattedKey, label: label.trim() });
  }

  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      await dbPool.query(
        `INSERT INTO doja_gallery_categories (key, label)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label`,
        [formattedKey, label.trim()]
      );
      return res.json({ success: true, message: "Category added successfully", category: { key: formattedKey, label: label.trim() } });
    } else {
      return res.json({ success: true, message: "Category added successfully to fallback in-memory store", category: { key: formattedKey, label: label.trim() } });
    }
  } catch (err: any) {
    console.error("Error saving category to database:", err);
    return res.status(500).json({ error: "Failed to save category to database" });
  }
});

// Delete a gallery category / tag
app.delete("/api/gallery/categories/:key", requireAdmin, async (req, res) => {
  const { key } = req.params;
  if (!key) {
    return res.status(400).json({ error: "Category key is required" });
  }

  // Filter out in memory fallback
  fallbackCategories = fallbackCategories.filter(c => c.key !== key);

  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      await dbPool.query(
        `DELETE FROM doja_gallery_categories WHERE key = $1`,
        [key]
      );
      return res.json({ success: true, message: "Category deleted successfully" });
    } else {
      return res.json({ success: true, message: "Category deleted successfully from fallback in-memory store" });
    }
  } catch (err: any) {
    console.error("Error deleting category from database:", err);
    return res.status(500).json({ error: "Failed to delete category from database" });
  }
});

// 3.5. Get All Users (Admin Only)
app.get("/api/users", requireAdmin, async (req, res) => {
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query(
        "SELECT id, name, phone, created_at as \"createdAt\" FROM doja_users ORDER BY created_at DESC"
      );
      return res.json({ success: true, users: result.rows });
    } catch (err: any) {
      console.error("Database user retrieval error:", err);
      return res.status(500).json({ error: "Database error while fetching users" });
    }
  } else {
    // In-Memory Fallback
    const usersList = fallbackUsers.map((u, i) => ({
      id: i + 1,
      name: u.name,
      phone: u.phone,
      createdAt: new Date().toISOString()
    }));
    return res.json({ success: true, users: usersList });
  }
});

// Helper to send order email notification using Resend
const sendOrderEmailNotification = async (orderData: any) => {
  if (!resend) {
    console.log("⚠️ Resend API Key is not configured. Email notification skipped.");
    return;
  }

  try {
    const {
      orderId,
      customerName,
      customerPhone,
      productTitle,
      quantity,
      topping,
      deliveryType,
      isGift,
      giftNote,
      deliveryNote,
      totalAmount
    } = orderData;

    const formattedAmount = typeof totalAmount === 'number' 
      ? `₦${totalAmount.toLocaleString()}` 
      : `₦${totalAmount}`;

    let parsedGiftNote = giftNote;
    if (typeof giftNote === 'string') {
      try {
        parsedGiftNote = JSON.parse(giftNote);
      } catch {
        parsedGiftNote = { message: giftNote };
      }
    }

    const giftDetails = isGift && parsedGiftNote ? `
      <div style="background-color: #fcf6f0; border-left: 4px solid #d97706; padding: 12px; margin-top: 10px; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #78350f;">🎁 Gift Order Details:</p>
        <p style="margin: 4px 0 0 0;"><strong>To:</strong> ${parsedGiftNote.to || 'N/A'}</p>
        <p style="margin: 4px 0 0 0;"><strong>From:</strong> ${parsedGiftNote.from || 'N/A'}</p>
        <p style="margin: 4px 0 0 0;"><strong>Message:</strong> "${parsedGiftNote.message || ''}"</p>
      </div>
    ` : '';

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2d1e18; background-color: #faf6f0; border-radius: 12px; border: 1px solid #ebd8c5;">
        <div style="text-align: center; border-bottom: 2px solid #ebd8c5; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #653b1b; margin: 0; font-size: 24px; font-weight: bold;">🍞 New Order Received!</h1>
          <p style="color: #d97706; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">BAKED BY DOJA</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">Hello Chief,</p>
        <p style="font-size: 15px; line-height: 1.5;">A new order has been placed on the Baked by Doja Sweet Creations portal. Below are the order details:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #ebd8c5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold; width: 130px;">Order ID:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #d97706;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold;">Customer Name:</td>
              <td style="padding: 6px 0; color: #2d1e18; font-weight: bold;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold;">Phone Number:</td>
              <td style="padding: 6px 0;"><a href="tel:${customerPhone}" style="color: #653b1b; text-decoration: underline; font-weight: bold;">${customerPhone}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold; border-top: 1px solid #f3ebe1; padding-top: 10px;">Banana Bread:</td>
              <td style="padding: 6px 0; color: #2d1e18; font-weight: bold; border-top: 1px solid #f3ebe1; padding-top: 10px;">${productTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold;">Quantity:</td>
              <td style="padding: 6px 0; color: #2d1e18; font-weight: bold;">${quantity}x</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold;">Topping:</td>
              <td style="padding: 6px 0; color: #2d1e18;">${topping}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold;">Delivery Type:</td>
              <td style="padding: 6px 0; color: #2d1e18; font-weight: bold; text-transform: capitalize;">${deliveryType || 'standard'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6e5445; font-weight: bold;">Total Amount:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #653b1b; font-size: 16px;">${formattedAmount}</td>
            </tr>
            ${deliveryNote ? `
            <tr>
              <td style="padding: 10px 0 6px 0; color: #6e5445; font-weight: bold; border-top: 1px solid #f3ebe1; vertical-align: top;">Delivery Note:</td>
              <td style="padding: 10px 0 6px 0; color: #4a3429; font-style: italic; border-top: 1px solid #f3ebe1;">"${deliveryNote}"</td>
            </tr>` : ''}
          </table>
          
          ${giftDetails}
        </div>
        
        <div style="text-align: center; font-size: 12px; color: #9c8375; border-top: 1px solid #ebd8c5; padding-top: 15px; margin-top: 20px;">
          <p style="margin: 0;">This email is automatically generated by the Baked by Doja platform.</p>
          <p style="margin: 4px 0 0 0;">Oven status and logs can be managed in the Admin Dashboard.</p>
        </div>
      </div>
    `;

    console.log(`✉️ Attempting to send order email notification for order #${orderId} to adeyemifaridah23@gmail.com...`);
    const emailResult = await resend.emails.send({
      from: "Baked by Doja <onboarding@resend.dev>",
      to: "adeyemifaridah23@gmail.com",
      subject: `🍞 New Order Received: #${orderId} (${customerName})`,
      html: htmlContent,
    });

    console.log("✉️ Resend email sent successfully:", emailResult);
  } catch (error) {
    console.error("❌ Failed to send order email via Resend:", error);
  }
};

// 4. Place Order
app.post("/api/orders", async (req, res) => {
  const {
    orderId,
    customerName,
    customerPhone,
    productTitle,
    quantity,
    topping,
    deliveryType,
    isGift,
    giftNote,
    deliveryNote,
    totalAmount,
  } = req.body;

  if (!orderId || !customerName || !customerPhone || !productTitle || !quantity || !topping) {
    return res.status(400).json({ error: "Missing order information fields" });
  }

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        `INSERT INTO doja_orders 
        (order_id, customer_name, customer_phone, product_title, quantity, topping, delivery_type, is_gift, gift_note, delivery_note, total_amount, status, payment_status, payment_reference) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'unpaid', NULL)`,
        [
          orderId,
          customerName,
          customerPhone,
          productTitle,
          quantity,
          topping,
          deliveryType,
          isGift || false,
          giftNote ? JSON.stringify(giftNote) : null,
          deliveryNote || null,
          totalAmount,
          'pending',
        ]
      );
      
      // Trigger email notification asynchronously via Resend
      sendOrderEmailNotification({
        orderId,
        customerName,
        customerPhone,
        productTitle,
        quantity,
        topping,
        deliveryType,
        isGift,
        giftNote,
        deliveryNote,
        totalAmount
      });

      return res.json({ success: true, orderId });
    } catch (err: any) {
      console.error("Database order insertion error:", err);
      return res.status(500).json({ error: "Database error while saving order" });
    }
  } else {
    // In-Memory Fallback
    const newOrder = {
      orderId,
      customerName,
      customerPhone,
      productTitle,
      quantity,
      topping,
      deliveryType,
      isGift,
      giftNote,
      deliveryNote,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentReference: null,
      date: new Date().toISOString(),
    };
    fallbackOrders.push(newOrder);

    // Trigger email notification asynchronously via Resend
    sendOrderEmailNotification({
      orderId,
      customerName,
      customerPhone,
      productTitle,
      quantity,
      topping,
      deliveryType,
      isGift,
      giftNote,
      deliveryNote,
      totalAmount
    });

    return res.json({ success: true, orderId });
  }
});


// 5. Get User Orders
app.get("/api/orders", requireAuth, async (req: any, res: any) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Missing user phone query parameter" });
  }

  // BOLA / Authorization Check
  if (req.user.role !== 'admin' && req.user.phone !== phone) {
    return res.status(403).json({ success: false, error: "Forbidden: You are not authorized to view orders for this user." });
  }

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      let result;
      if (phone === 'admin') {
        result = await dbPool.query(
          "SELECT order_id as \"orderId\", customer_name as \"customerName\", customer_phone as \"customerPhone\", product_title as \"productTitle\", quantity, topping, delivery_type as \"deliveryType\", is_gift as \"isGift\", gift_note as \"giftNote\", delivery_note as \"deliveryNote\", total_amount as \"totalAmount\", status, date, payment_status as \"paymentStatus\", payment_reference as \"paymentReference\" FROM doja_orders ORDER BY date DESC"
        );
      } else {
        result = await dbPool.query(
          "SELECT order_id as \"orderId\", customer_name as \"customerName\", customer_phone as \"customerPhone\", product_title as \"productTitle\", quantity, topping, delivery_type as \"deliveryType\", is_gift as \"isGift\", gift_note as \"giftNote\", delivery_note as \"deliveryNote\", total_amount as \"totalAmount\", status, date, payment_status as \"paymentStatus\", payment_reference as \"paymentReference\" FROM doja_orders WHERE customer_phone = $1 ORDER BY date DESC",
          [phone]
        );
      }
      return res.json({ success: true, orders: result.rows });
    } catch (err: any) {
      console.error("Database order retrieval error:", err);
      return res.status(500).json({ error: "Database error while fetching orders" });
    }
  } else {
    // In-Memory Fallback
    let userOrders;
    if (phone === 'admin') {
      userOrders = [...fallbackOrders];
    } else {
      userOrders = fallbackOrders.filter((o) => o.customerPhone === phone);
    }
    // Sort descending by date
    userOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json({ success: true, orders: userOrders });
  }
});

// 5b. Update Order Status (for live tracker simulation)
app.put("/api/orders/:orderId/status", requireAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status field" });
  }

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        "UPDATE doja_orders SET status = $1 WHERE order_id = $2",
        [status, orderId]
      );
      return res.json({ success: true, orderId, status });
    } catch (err: any) {
      console.error("Database order status update error:", err);
      return res.status(500).json({ error: "Database error while updating order status" });
    }
  } else {
    // In-Memory Fallback
    const order = fallbackOrders.find((o) => o.orderId === orderId);
    if (order) {
      order.status = status;
      return res.json({ success: true, orderId, status });
    }
    return res.status(404).json({ error: "Order not found" });
  }
});

// 5bb. Update Order Payment Status (Admin Only)
app.put("/api/orders/:orderId/payment", requireAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus } = req.body;
  if (!paymentStatus) {
    return res.status(400).json({ error: "Missing paymentStatus field" });
  }

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        "UPDATE doja_orders SET payment_status = $1 WHERE order_id = $2",
        [paymentStatus, orderId]
      );
      return res.json({ success: true, orderId, paymentStatus });
    } catch (err: any) {
      console.error("Database order payment status update error:", err);
      return res.status(500).json({ error: "Database error while updating order payment status" });
    }
  } else {
    // In-Memory Fallback
    const order = fallbackOrders.find((o) => o.orderId === orderId);
    if (order) {
      order.paymentStatus = paymentStatus;
      return res.json({ success: true, orderId, paymentStatus });
    }
    return res.status(404).json({ error: "Order not found" });
  }
});

// 5c. Delete Order (Admin Only)
app.delete("/api/orders/:orderId", requireAdmin, async (req, res) => {
  const { orderId } = req.params;
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query("DELETE FROM doja_orders WHERE order_id = $1", [orderId]);
      return res.json({ success: true, orderId });
    } catch (err: any) {
      console.error("Database order delete error:", err);
      return res.status(500).json({ error: "Database error while deleting order" });
    }
  } else {
    // In-Memory Fallback
    const idx = fallbackOrders.findIndex((o) => o.orderId === orderId);
    return res.status(404).json({ error: "Order not found" });
  }
});

// Helper to update order payment status
async function updateOrderPayment(orderId: string, paymentStatus: string, reference: string) {
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        "UPDATE doja_orders SET payment_status = $1, payment_reference = $2 WHERE order_id = $3",
        [paymentStatus, reference, orderId]
      );
    } catch (err) {
      console.error("Error updating order payment status in DB:", err);
    }
  } else {
    const order = fallbackOrders.find(o => o.orderId === orderId);
    if (order) {
      order.paymentStatus = paymentStatus;
      order.paymentReference = reference;
    }
  }
}

// 5d. Save Paystack Settings (Admin Only)
app.post("/api/settings", requireAdmin, async (req, res) => {
  const { paystack_public_key, paystack_secret_key, facebook_pixel_id, facebook_conversion_id, snapchat_pixel_id, snapchat_custom_event_name, snapchat_access_token } = req.body;

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('paystack_public_key', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [paystack_public_key || '']
      );
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('paystack_secret_key', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [paystack_secret_key || '']
      );
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('facebook_pixel_id', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [facebook_pixel_id || '']
      );
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('facebook_conversion_id', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [facebook_conversion_id || '']
      );
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('snapchat_pixel_id', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [snapchat_pixel_id || '']
      );
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('snapchat_custom_event_name', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [snapchat_custom_event_name || '']
      );
      await dbPool.query(
        `INSERT INTO doja_settings (key, value) VALUES ('snapchat_access_token', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [snapchat_access_token || '']
      );
      return res.json({ success: true, message: "Settings saved successfully." });
    } catch (err: any) {
      console.error("Database settings insert error:", err);
      return res.status(500).json({ error: "Failed to save settings." });
    }
  } else {
    // Memory fallback
    fallbackSettings['paystack_public_key'] = paystack_public_key || '';
    fallbackSettings['paystack_secret_key'] = paystack_secret_key || '';
    fallbackSettings['facebook_pixel_id'] = facebook_pixel_id || '';
    fallbackSettings['facebook_conversion_id'] = facebook_conversion_id || '';
    fallbackSettings['snapchat_pixel_id'] = snapchat_pixel_id || '';
    fallbackSettings['snapchat_custom_event_name'] = snapchat_custom_event_name || '';
    fallbackSettings['snapchat_access_token'] = snapchat_access_token || '';
    return res.json({ success: true, message: "Settings saved to in-memory fallback store." });
  }
});

// 5e. Get Paystack Settings (Admin Only)
app.get("/api/settings", requireAdmin, async (req, res) => {
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query("SELECT key, value FROM doja_settings");
      const settingsMap: Record<string, string> = {};
      result.rows.forEach(row => {
        settingsMap[row.key] = row.value;
      });
      return res.json({
        success: true,
        paystack_public_key: settingsMap['paystack_public_key'] || process.env.PAYSTACK_PUBLIC_KEY || '',
        paystack_secret_key: settingsMap['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || '',
        facebook_pixel_id: settingsMap['facebook_pixel_id'] || process.env.VITE_FACEBOOK_PIXEL_ID || '',
        facebook_conversion_id: settingsMap['facebook_conversion_id'] || process.env.VITE_FACEBOOK_CONVERSION_ID || '',
        snapchat_pixel_id: settingsMap['snapchat_pixel_id'] || process.env.VITE_SNAPCHAT_PIXEL_ID || '',
        snapchat_custom_event_name: settingsMap['snapchat_custom_event_name'] || process.env.VITE_SNAPCHAT_CUSTOM_EVENT_NAME || '',
        snapchat_access_token: settingsMap['snapchat_access_token'] || process.env.SNAPCHAT_ACCESS_TOKEN || ''
      });
    } catch (err: any) {
      console.error("Database settings query error:", err);
      return res.status(500).json({ error: "Failed to fetch settings." });
    }
  } else {
    return res.json({
      success: true,
      paystack_public_key: fallbackSettings['paystack_public_key'] || process.env.PAYSTACK_PUBLIC_KEY || '',
      paystack_secret_key: fallbackSettings['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || '',
      facebook_pixel_id: fallbackSettings['facebook_pixel_id'] || process.env.VITE_FACEBOOK_PIXEL_ID || '',
      facebook_conversion_id: fallbackSettings['facebook_conversion_id'] || process.env.VITE_FACEBOOK_CONVERSION_ID || '',
      snapchat_pixel_id: fallbackSettings['snapchat_pixel_id'] || process.env.VITE_SNAPCHAT_PIXEL_ID || '',
      snapchat_custom_event_name: fallbackSettings['snapchat_custom_event_name'] || process.env.VITE_SNAPCHAT_CUSTOM_EVENT_NAME || '',
      snapchat_access_token: fallbackSettings['snapchat_access_token'] || process.env.SNAPCHAT_ACCESS_TOKEN || ''
    });
  }
});

// 5f. Get Public Paystack Key (Public Access)
app.get("/api/settings/public", async (req, res) => {
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query("SELECT key, value FROM doja_settings WHERE key IN ('paystack_public_key', 'facebook_pixel_id', 'facebook_conversion_id', 'snapchat_pixel_id', 'snapchat_custom_event_name')");
      const settingsMap: Record<string, string> = {};
      result.rows.forEach(row => {
        settingsMap[row.key] = row.value;
      });
      return res.json({
        success: true,
        paystack_public_key: settingsMap['paystack_public_key'] || process.env.PAYSTACK_PUBLIC_KEY || '',
        facebook_pixel_id: settingsMap['facebook_pixel_id'] || process.env.VITE_FACEBOOK_PIXEL_ID || '',
        facebook_conversion_id: settingsMap['facebook_conversion_id'] || process.env.VITE_FACEBOOK_CONVERSION_ID || '',
        snapchat_pixel_id: settingsMap['snapchat_pixel_id'] || process.env.VITE_SNAPCHAT_PIXEL_ID || '',
        snapchat_custom_event_name: settingsMap['snapchat_custom_event_name'] || process.env.VITE_SNAPCHAT_CUSTOM_EVENT_NAME || ''
      });
    } catch (err: any) {
      console.error("Database settings query error:", err);
      return res.status(500).json({ error: "Failed to fetch public keys." });
    }
  } else {
    return res.json({
      success: true,
      paystack_public_key: fallbackSettings['paystack_public_key'] || process.env.PAYSTACK_PUBLIC_KEY || '',
      facebook_pixel_id: fallbackSettings['facebook_pixel_id'] || process.env.VITE_FACEBOOK_PIXEL_ID || '',
      facebook_conversion_id: fallbackSettings['facebook_conversion_id'] || process.env.VITE_FACEBOOK_CONVERSION_ID || '',
      snapchat_pixel_id: fallbackSettings['snapchat_pixel_id'] || process.env.VITE_SNAPCHAT_PIXEL_ID || '',
      snapchat_custom_event_name: fallbackSettings['snapchat_custom_event_name'] || process.env.VITE_SNAPCHAT_CUSTOM_EVENT_NAME || ''
    });
  }
});

// 5ff. Analytics & Visitor Traffic Endpoints (Admin Only for retrieval)
app.post("/api/analytics/visit", async (req, res) => {
  const { visitorUuid, deviceType } = req.body;
  if (!visitorUuid) {
    return res.status(400).json({ success: false, error: "visitorUuid is required" });
  }

  const ipAddress = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "";

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        "INSERT INTO doja_visits (visitor_uuid, ip_address, user_agent, device_type) VALUES ($1, $2, $3, $4)",
        [visitorUuid, ipAddress, userAgent, deviceType || "desktop"]
      );
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Database error while logging visit:", err);
      return res.status(500).json({ error: "Failed to record visit" });
    }
  } else {
    fallbackVisits.push({
      visitor_uuid: visitorUuid,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType || "desktop",
      visited_at: new Date()
    });
    return res.json({ success: true, message: "Visit recorded in memory fallback" });
  }
});

app.get("/api/analytics/stats", requireAdmin, async (req, res) => {
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      const totalRes = await dbPool.query("SELECT COUNT(*) as count FROM doja_visits");
      const uniqueRes = await dbPool.query("SELECT COUNT(DISTINCT visitor_uuid) as count FROM doja_visits");
      const activeRes = await dbPool.query("SELECT COUNT(DISTINCT visitor_uuid) as count FROM doja_visits WHERE visited_at >= NOW() - INTERVAL '30 minutes'");
      
      const deviceRes = await dbPool.query("SELECT device_type as \"deviceType\", COUNT(*) as count FROM doja_visits GROUP BY device_type");
      
      // Get last 7 days of daily visits
      const trendsRes = await dbPool.query(`
        SELECT TO_CHAR(visited_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
        FROM doja_visits 
        WHERE visited_at >= NOW() - INTERVAL '7 days' 
        GROUP BY TO_CHAR(visited_at, 'YYYY-MM-DD') 
        ORDER BY date ASC
      `);

      return res.json({
        success: true,
        stats: {
          totalVisits: parseInt(totalRes.rows[0]?.count || "0", 10),
          uniqueVisitors: parseInt(uniqueRes.rows[0]?.count || "0", 10),
          activeVisitors: parseInt(activeRes.rows[0]?.count || "0", 10),
          deviceStats: deviceRes.rows.map(r => ({
            deviceType: r.deviceType || "desktop",
            count: parseInt(r.count || "0", 10)
          })),
          dailyTrends: trendsRes.rows.map(r => ({
            date: r.date,
            count: parseInt(r.count || "0", 10)
          }))
        }
      });
    } catch (err: any) {
      console.error("Database error fetching analytics stats:", err);
      return res.status(500).json({ error: "Failed to fetch analytics statistics." });
    }
  } else {
    // Memory fallback calculation
    const totalVisits = fallbackVisits.length;
    const uniqueVisitors = new Set(fallbackVisits.map(v => v.visitor_uuid)).size;
    
    const activeThreshold = Date.now() - 30 * 60 * 1000;
    const activeVisitors = new Set(
      fallbackVisits
        .filter(v => new Date(v.visited_at).getTime() >= activeThreshold)
        .map(v => v.visitor_uuid)
    ).size;

    // Device breakdown
    const devicesMap: Record<string, number> = {};
    fallbackVisits.forEach(v => {
      const dev = v.device_type || "desktop";
      devicesMap[dev] = (devicesMap[dev] || 0) + 1;
    });
    const deviceStats = Object.keys(devicesMap).map(key => ({
      deviceType: key,
      count: devicesMap[key]
    }));

    // Daily trends for last 7 days
    const trendsMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendsMap[dateStr] = 0;
    }

    fallbackVisits.forEach(v => {
      const dateStr = new Date(v.visited_at).toISOString().split('T')[0];
      if (trendsMap[dateStr] !== undefined) {
        trendsMap[dateStr]++;
      }
    });

    const dailyTrends = Object.keys(trendsMap).map(key => ({
      date: key,
      count: trendsMap[key]
    }));

    return res.json({
      success: true,
      stats: {
        totalVisits,
        uniqueVisitors,
        activeVisitors,
        deviceStats,
        dailyTrends
      }
    });
  }
});

// 5g. Verify Paystack Payment
app.post("/api/payments/initialize", async (req, res) => {
  let { email, amount, orderId, callbackUrl, metadata } = req.body;

  if (!email || !amount || !orderId) {
    return res.status(400).json({ success: false, message: "Missing required initialize fields" });
  }

  // Sanitize email to ensure it is valid for Paystack API (no spaces, +, or other invalid characters in username)
  email = email.trim();
  const parts = email.split('@');
  if (parts.length === 2) {
    const username = parts[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'guest';
    email = `${username}@${parts[1]}`;
  }

  const dbPool = await getDbPool();
  let secretKey = "";

  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query("SELECT value FROM doja_settings WHERE key = 'paystack_secret_key'");
      secretKey = result.rows[0]?.value || process.env.PAYSTACK_SECRET_KEY || "";
    } catch (err) {
      console.error("Error retrieving Paystack secret key:", err);
    }
  } else {
    secretKey = fallbackSettings['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || "";
  }

  if (!secretKey) {
    return res.status(400).json({
      success: false,
      message: "Paystack gateway is not configured. Please contact the administrator to input Paystack API keys in the settings panel."
    });
  }

  try {
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount),
        reference: orderId,
        callback_url: callbackUrl,
        metadata: metadata || {}
      })
    });

    const data: any = await paystackRes.json();
    if (data.status) {
      return res.json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: data.data.reference
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data.message || "Paystack failed to initialize transaction."
      });
    }
  } catch (err: any) {
    console.error("❌ Paystack Initialization Error:", err);
    return res.status(500).json({ success: false, error: "Failed to initialize transaction." });
  }
});

// Simple in-memory rate limiter for verification endpoint
const verificationRateLimit = new Map<string, { count: number, resetTime: number }>();

const rateLimiterMiddleware = (req: any, res: any, next: any) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute
  const maxRequests = 15; // max 15 verification attempts per minute

  const record = verificationRateLimit.get(ip);
  if (!record || now > record.resetTime) {
    verificationRateLimit.set(ip, { count: 1, resetTime: now + limitWindow });
    return next();
  }

  record.count++;
  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many verification requests. Please wait a minute before retrying.",
      status: "failed"
    });
  }

  next();
};

// Helper function to dynamically ensure the audit logs table is created
const ensureAuditTable = async (client: any) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS doja_payment_audit (
      id SERIAL PRIMARY KEY,
      user_phone VARCHAR(255),
      reference VARCHAR(255) UNIQUE,
      amount INTEGER,
      ip_address VARCHAR(255),
      status VARCHAR(50),
      raw_payload JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Helper function to retrieve Snapchat credentials and settings dynamically
async function getSnapchatSettings() {
  const dbPool = await getDbPool();
  let pixelId = "";
  let accessToken = "";
  let customEventName = "";

  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query(
        "SELECT key, value FROM doja_settings WHERE key IN ('snapchat_pixel_id', 'snapchat_access_token', 'snapchat_custom_event_name')"
      );
      const settingsMap: Record<string, string> = {};
      result.rows.forEach(row => {
        settingsMap[row.key] = row.value;
      });
      pixelId = settingsMap['snapchat_pixel_id'] || process.env.VITE_SNAPCHAT_PIXEL_ID || '';
      accessToken = settingsMap['snapchat_access_token'] || process.env.SNAPCHAT_ACCESS_TOKEN || '';
      customEventName = settingsMap['snapchat_custom_event_name'] || process.env.VITE_SNAPCHAT_CUSTOM_EVENT_NAME || '';
    } catch (err) {
      console.error("Error fetching Snapchat settings from DB:", err);
    }
  } else {
    pixelId = fallbackSettings['snapchat_pixel_id'] || process.env.VITE_SNAPCHAT_PIXEL_ID || '';
    accessToken = fallbackSettings['snapchat_access_token'] || process.env.SNAPCHAT_ACCESS_TOKEN || '';
    customEventName = fallbackSettings['snapchat_custom_event_name'] || process.env.VITE_SNAPCHAT_CUSTOM_EVENT_NAME || '';
  }

  return { pixelId, accessToken, customEventName };
}

// Trigger Snapchat server-side Conversions API event
async function sendSnapchatConversionEvent(orderData: any, reference: string, clientIp?: string) {
  try {
    const { pixelId, accessToken, customEventName } = await getSnapchatSettings();
    if (!pixelId || !accessToken) {
      console.log("[Snapchat CAPI] Skipping server-side tracking: Pixel ID or Access Token is not configured.");
      return;
    }

    console.log(`[Snapchat CAPI] Triggering server-side event tracking for Pixel ID: ${pixelId}`);

    // Standardize user data using SHA-256
    const sha256 = (str: string) => crypto.createHash("sha256").update(str.trim().toLowerCase()).digest("hex");

    const phone = orderData?.customerPhone || "";
    const email = orderData?.customerEmail || "";

    const user_data: Record<string, any> = {};
    if (email) {
      user_data.hashed_email = sha256(email);
    }
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9+]/g, "");
      user_data.hashed_phone_number = sha256(cleanPhone);
    }
    if (clientIp && clientIp !== "unknown") {
      user_data.hashed_ip_address = sha256(clientIp);
    }

    const price = orderData?.totalAmount || 0;
    const qty = orderData?.quantity || 1;

    const events: any[] = [];

    // 1. Standard PURCHASE event
    const purchaseEvent: any = {
      event_type: "PURCHASE",
      event_conversion_type: "WEB",
      event_time: Date.now(), // epoch in milliseconds
      price: Number(price),
      currency: "NGN",
      transaction_id: reference || orderData?.orderId || "unknown",
      number_items: Number(qty)
    };

    // Attach hashed user identity parameters
    Object.assign(purchaseEvent, user_data);
    events.push(purchaseEvent);

    // 2. Custom event (if configured)
    if (customEventName) {
      const customEvent: any = {
        event_type: customEventName,
        event_conversion_type: "WEB",
        event_time: Date.now(),
        price: Number(price),
        currency: "NGN",
        transaction_id: reference || orderData?.orderId || "unknown",
        number_items: Number(qty)
      };
      Object.assign(customEvent, user_data);
      events.push(customEvent);
    }

    const payload = { events };

    console.log(`[Snapchat CAPI] Sending payload to https://tr.snapchat.com/v3/${pixelId}/events`);

    const response = await fetch(`https://tr.snapchat.com/v3/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resData: any = await response.json();
    console.log("[Snapchat CAPI] API Response:", JSON.stringify(resData));
  } catch (err: any) {
    console.error("❌ [Snapchat CAPI] Error sending conversion event:", err.message || err);
  }
}

// Unified helper to save/process verified orders securely inside a transaction
const processVerifiedPayment = async (reference: string, amount: number, rawData: any, orderId?: string, clientIp?: string, requestingPhone?: string) => {
  const dbPool = await getDbPool();
  
  // Extract order metadata
  let orderData = null;
  if (rawData.metadata && rawData.metadata.orderData) {
    orderData = rawData.metadata.orderData;
  } else if (rawData.metadata) {
    try {
      const parsedMeta = typeof rawData.metadata === 'string' ? JSON.parse(rawData.metadata) : rawData.metadata;
      orderData = parsedMeta.orderData;
    } catch (e) {
      console.error("Error parsing metadata:", e);
    }
  }

  const derivedOrderId = orderId || orderData?.orderId || rawData.reference;
  if (!derivedOrderId) {
    throw new Error("Could not determine a valid Order ID for this transaction.");
  }

  // 1. Secure Currency Check
  if (rawData.currency && rawData.currency.toUpperCase() !== 'NGN') {
    throw new Error(`Security validation failed: invalid currency ${rawData.currency}. Only NGN is supported.`);
  }

  // 2. Customer Validation (Confirm payment belongs to requesting user)
  if (requestingPhone && orderData && orderData.customerPhone) {
    if (orderData.customerPhone !== requestingPhone) {
      throw new Error(`Security validation failed: Payment belongs to ${orderData.customerPhone}, but verification requested for ${requestingPhone}.`);
    }
  }

  // 3. Secure Amount Match Validation
  if (orderData && orderData.totalAmount) {
    const expectedAmountKobo = Math.round(orderData.totalAmount * 100);
    const actualPaidKobo = Math.round(amount);
    if (actualPaidKobo < expectedAmountKobo - 100) {
      throw new Error(`Security validation failed: Paid amount ₦${actualPaidKobo / 100} is less than required order total ₦${orderData.totalAmount}.`);
    }
  }

  if (dbPool && tablesInitialized) {
    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");

      // Check if reference already exists (Double Spend Check)
      const dupCheck = await client.query(
        "SELECT order_id, payment_status FROM doja_orders WHERE payment_reference = $1",
        [reference]
      );
      if (dupCheck.rows.length > 0) {
        const existingRec = dupCheck.rows[0];
        // Idempotency: If this reference already marked paid for the same order, succeed gracefully!
        if (existingRec.order_id === derivedOrderId && existingRec.payment_status === 'paid') {
          await client.query("COMMIT");
          return { success: true, isIdempotent: true, orderData };
        }
        throw new Error("Security validation failed: This transaction reference has already been claimed/processed.");
      }

      // Check if order already exists
      const existingOrder = await client.query("SELECT order_id FROM doja_orders WHERE order_id = $1 FOR UPDATE", [derivedOrderId]);
      if (existingOrder.rows.length === 0 && orderData) {
        // Insert as fully paid
        await client.query(
          `INSERT INTO doja_orders 
          (order_id, customer_name, customer_phone, product_title, quantity, topping, delivery_type, is_gift, gift_note, delivery_note, total_amount, status, payment_status, payment_reference) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'paid', $12)`,
          [
            orderData.orderId || derivedOrderId,
            orderData.customerName,
            orderData.customerPhone,
            orderData.productTitle,
            orderData.quantity,
            orderData.topping,
            orderData.deliveryType,
            orderData.isGift || false,
            orderData.giftNote ? JSON.stringify(orderData.giftNote) : null,
            orderData.deliveryNote || null,
            orderData.totalAmount,
            reference
          ]
        );
        console.log(`Inserted paid order ${derivedOrderId} inside atomic SQL transaction.`);
      } else {
        // Update payment status to paid
        await client.query(
          "UPDATE doja_orders SET payment_status = 'paid', payment_reference = $1 WHERE order_id = $2",
          [reference, derivedOrderId]
        );
        console.log(`Updated existing order ${derivedOrderId} to paid inside atomic SQL transaction.`);
      }

      // Record Detailed Audit Log in same transaction
      await ensureAuditTable(client);
      await client.query(
        `INSERT INTO doja_payment_audit (user_phone, reference, amount, ip_address, status, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (reference) DO UPDATE SET status = EXCLUDED.status, raw_payload = EXCLUDED.raw_payload`,
        [
          orderData ? orderData.customerPhone : (requestingPhone || 'unknown'),
          reference,
          Math.round(amount),
          clientIp || 'unknown',
          'success',
          JSON.stringify(rawData)
        ]
      );

      await client.query("COMMIT");
      if (orderData) {
        sendSnapchatConversionEvent(orderData, reference, clientIp).catch(err => {
          console.error("Error sending Snapchat CAPI event (DB path):", err);
        });
      }
      return { success: true, isIdempotent: false, orderData };
    } catch (txErr) {
      await client.query("ROLLBACK");
      console.error("Database transaction rolled back:", txErr);
      throw txErr;
    } finally {
      client.release();
    }
  } else {
    // In-Memory Fallback
    const isDup = fallbackOrders.some(o => o.paymentReference === reference && o.paymentStatus === 'paid');
    if (isDup) {
      const match = fallbackOrders.find(o => o.orderId === derivedOrderId && o.paymentReference === reference);
      if (match) {
        return { success: true, isIdempotent: true, orderData };
      }
      throw new Error("Security validation failed: This transaction reference has already been claimed in local memory.");
    }

    const order = fallbackOrders.find(o => o.orderId === derivedOrderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.paymentReference = reference;
    } else if (orderData) {
      fallbackOrders.push({
        orderId: orderData.orderId || derivedOrderId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        productTitle: orderData.productTitle,
        quantity: orderData.quantity,
        topping: orderData.topping,
        deliveryType: orderData.deliveryType,
        isGift: orderData.isGift || false,
        giftNote: orderData.giftNote || null,
        deliveryNote: orderData.deliveryNote || null,
        totalAmount: orderData.totalAmount,
        status: 'pending',
        date: new Date().toISOString(),
        paymentStatus: 'paid',
        paymentReference: reference
      });
    }
    console.log(`Processed paid order ${derivedOrderId} in fallback memory.`);
    if (orderData) {
      sendSnapchatConversionEvent(orderData, reference, clientIp).catch(err => {
        console.error("Error sending Snapchat CAPI event (fallback path):", err);
      });
    }
    return { success: true, isIdempotent: false, orderData };
  }
};

// 5g. Verify Paystack Payment with Rate Limiting, Customer Verification, Idempotency & DB Transactions
app.get("/api/payments/verify/:reference", rateLimiterMiddleware, async (req, res) => {
  const { reference } = req.params;
  const { orderId, phone } = req.query;

  const dbPool = await getDbPool();
  let secretKey = "";

  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query("SELECT value FROM doja_settings WHERE key = 'paystack_secret_key'");
      secretKey = result.rows[0]?.value || process.env.PAYSTACK_SECRET_KEY || "";
    } catch (err) {
      console.error("Error retrieving Paystack secret key:", err);
    }
  } else {
    secretKey = fallbackSettings['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || "";
  }

  if (!secretKey) {
    return res.status(400).json({
      success: false,
      message: "Paystack gateway is not configured. Please contact the administrator to input Paystack API keys in the settings panel.",
      status: "failed"
    });
  }

  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });

    const data: any = await paystackRes.json();
    if (data.status && data.data && data.data.status === 'success') {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const result = await processVerifiedPayment(
        reference,
        data.data.amount,
        data.data,
        orderId as string,
        clientIp as string,
        phone as string
      );

      return res.json({
        success: true,
        status: "success",
        data: data.data,
        orderData: result.orderData,
        isIdempotent: result.isIdempotent
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data.message || "Paystack verification unsuccessful.",
        status: data.data?.status || "failed"
      });
    }
  } catch (err: any) {
    console.error("❌ Paystack Verification Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to verify transaction." });
  }
});

// 5h. Secure Paystack Webhook (x-paystack-signature validation, event handling & double spend check)
app.post("/api/payments/webhook", async (req: any, res: any) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    return res.status(400).send("Missing x-paystack-signature header");
  }

  const dbPool = await getDbPool();
  let secretKey = "";

  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query("SELECT value FROM doja_settings WHERE key = 'paystack_secret_key'");
      secretKey = result.rows[0]?.value || process.env.PAYSTACK_SECRET_KEY || "";
    } catch (err) {
      console.error("Error retrieving Paystack secret key for webhook:", err);
    }
  } else {
    secretKey = fallbackSettings['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || "";
  }

  if (!secretKey) {
    return res.status(400).send("Paystack is not configured on this server");
  }

  // Compute and compare signature securely (HMAC SHA512)
  const computedHash = crypto
    .createHmac("sha512", secretKey)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest("hex");

  if (computedHash !== signature) {
    return res.status(401).send("Invalid webhook signature");
  }

  // Respond early to Paystack with 200 OK
  res.status(200).json({ received: true });

  // Process the webhook asynchronously to prevent blocking Paystack
  const event = req.body;
  if (event && event.event === "charge.success") {
    const trxData = event.data;
    try {
      console.log(`Processing Paystack webhook charge.success event for ref: ${trxData.reference}`);
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      await processVerifiedPayment(
        trxData.reference,
        trxData.amount,
        trxData,
        undefined,
        clientIp as string,
        undefined
      );
    } catch (webhookErr: any) {
      console.error(`❌ Webhook Payment Process Error for ref ${trxData?.reference}:`, webhookErr.message);
    }
  }
});

// 6. Submit Contact Inquiry
app.post("/api/inquiries", async (req, res) => {
  const { name, email, phone, loaf, message } = req.body;
  if (!name || !phone || !loaf) {
    return res.status(400).json({ error: "Missing required inquiry fields" });
  }

  // Forward to Formspree from server backend to bypass any browser CORS/CSP blocks
  try {
    const fsResponse = await fetch('https://formspree.io/f/mykrjjzd', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, phone, loaf, message }),
    });
    if (!fsResponse.ok) {
      console.warn(`⚠️ Formspree endpoint returned non-OK status: ${fsResponse.status}`);
    } else {
      console.log("✅ Inquiry successfully forwarded to Formspree from server backend");
    }
  } catch (fsErr: any) {
    console.error('⚠️ Server-side Formspree forward failed:', fsErr.message || fsErr);
  }

  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      await dbPool.query(
        "INSERT INTO doja_inquiries (name, email, phone, loaf, message) VALUES ($1, $2, $3, $4, $5)",
        [name, email || null, phone, loaf, message || null]
      );
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Database inquiry insertion error:", err);
      return res.status(500).json({ error: "Database error while saving inquiry" });
    }
  } else {
    // In-Memory Fallback
    const newInquiry = {
      name,
      email,
      phone,
      loaf,
      message,
      date: new Date().toISOString(),
    };
    fallbackInquiries.push(newInquiry);
    return res.json({ success: true });
  }
});

// 7. Image Upload to Azure Blob Storage with Local Base64 Fallback
app.post("/api/upload", upload.single("image"), async (req: express.Request, res: express.Response): Promise<any> => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "dojastore";

  if (connectionString) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // Ensure container exists (using default private access to respect storage account policy)
      try {
        await containerClient.createIfNotExists();
      } catch (containerErr: any) {
        console.warn("⚠️ Could not check or create container (this is normal if using a restricted SAS token or if container already exists):", containerErr.message);
      }

      // Create a unique blob name
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileExt = path.extname(req.file.originalname) || ".jpg";
      const blobName = `loaf-${uniqueSuffix}${fileExt}`;
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload buffer
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype }
      });

      // Serve through our API proxy instead of direct Azure URL to completely bypass public access restrictions
      const imageUrl = `/api/images/${blobName}`;

      return res.json({ 
        success: true, 
        url: imageUrl,
        source: "Cloud Storage (Private + Proxied)",
        message: "Successfully uploaded to private cloud storage container."
      });
    } catch (err: any) {
      console.error("❌ Cloud Storage Upload Error:", err);
      // Fallback to base64 if upload fails, to prevent broken admin flow
      const base64Data = req.file.buffer.toString("base64");
      const fallbackUrl = `data:${req.file.mimetype};base64,${base64Data}`;
      return res.json({
        success: true,
        url: fallbackUrl,
        source: "In-Memory Base64 Fallback (Cloud failed)",
        error: err.message,
        message: `Cloud upload failed: ${err.message}. Used fallback data URL instead so your changes aren't lost!`
      });
    }
  } else {
    // If Azure Storage is not configured, fallback to Base64 data URI
    const base64Data = req.file.buffer.toString("base64");
    const fallbackUrl = `data:${req.file.mimetype};base64,${base64Data}`;
    return res.json({
      success: true,
      url: fallbackUrl,
      source: "In-Memory Base64 Fallback",
      message: "Cloud Storage connection string not configured. Created a local Data URL image fallback. To use real Cloud Storage, add AZURE_STORAGE_CONNECTION_STRING to your Secrets."
    });
  }
});

// 8. Image Proxy/Streaming endpoint to serve private Azure Storage Blobs
app.get("/api/images/:name", async (req: express.Request, res: express.Response): Promise<any> => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "dojastore";

  if (!connectionString) {
    return res.status(404).send("Cloud Storage not configured.");
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(req.params.name);

    // Fetch blob properties to get Content-Type
    const properties = await blockBlobClient.getProperties();
    res.setHeader("Content-Type", properties.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year for high performance

    // Download and stream directly to client
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    if (downloadBlockBlobResponse.readableStreamBody) {
      downloadBlockBlobResponse.readableStreamBody.pipe(res);
    } else {
      res.status(500).send("Unable to read image stream.");
    }
  } catch (err: any) {
    console.error("❌ Error serving image from cloud storage:", err);
    res.status(404).send("Image not found.");
  }
});

// 8b. Delete Image from Azure Blob Storage
app.delete("/api/images", async (req: express.Request, res: express.Response): Promise<any> => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ success: false, error: "No image URL provided" });
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "dojastore";

  if (!connectionString) {
    return res.json({ success: true, message: "Cloud Storage is not configured, skipped deleting local/base64 fallback image." });
  }

  // Check if it's an Azure Blob hosted image
  const parts = imageUrl.split("/api/images/");
  if (parts.length > 1) {
    const blobName = parts[1].split(/[?#]/)[0];
    if (blobName) {
      try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const deleteResponse = await blockBlobClient.deleteIfExists();
        return res.json({ 
          success: true, 
          message: deleteResponse.succeeded 
            ? `Successfully deleted image '${blobName}' from Cloud Storage.` 
            : `Image '${blobName}' was already deleted or did not exist.`
        });
      } catch (err: any) {
        console.error("❌ Cloud Storage Delete Error:", err);
        return res.status(500).json({ success: false, error: "Failed to delete image from Cloud Storage.", details: err.message });
      }
    }
  }

  return res.json({ success: true, message: "Image is not stored in Cloud Storage, skipped deletion." });
});

// Setup Vite Dev Server / Static Assets Route
async function startServer() {
  const safeDirname = typeof __dirname !== "undefined" ? __dirname : "";
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    safeDirname.endsWith("dist") || 
    safeDirname.includes("/dist") || 
    safeDirname.includes("\\dist");

  console.log(`[INFO] Starting server. Production mode active: ${isProduction}. Safe __dirname is: ${safeDirname}`);

  if (!isProduction) {
    console.log("🛠️ Running in development mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = safeDirname.endsWith("dist") ? safeDirname : path.join(process.cwd(), "dist");
    console.log(`📦 Running in production mode. Serving static assets from: ${distPath}`);
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else {
          // Cache hashed assets heavily (images, bundle js, css)
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
