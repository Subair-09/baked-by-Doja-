import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-Memory Fallback Store (to prevent crashing and maintain functionality when Azure PG is not configured)
const fallbackUsers: any[] = [];
const fallbackOrders: any[] = [];
const fallbackInquiries: any[] = [];
const fallbackSettings: Record<string, string> = {
  paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY || "",
  paystack_secret_key: process.env.PAYSTACK_SECRET_KEY || ""
};

let pool: pg.Pool | null = null;
let tablesInitialized = false;

// Lazy DB initialization to prevent crash if variables are not yet provided
async function getDbPool(): Promise<pg.Pool | null> {
  if (pool) {
    if (!tablesInitialized) {
      await initializeTables(pool);
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
    return pool;
  } catch (error) {
    console.error("❌ Failed to initialize Azure PostgreSQL pool:", error);
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
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

      tablesInitialized = true;
      console.log("✅ Azure PostgreSQL flexible server tables verified/created successfully.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Failed to initialize tables in Azure PostgreSQL database:", err);
  }
}

// API Routes
// 1. Get database configuration state (to show user if database is connected)
app.get("/api/db/status", async (req, res) => {
  try {
    const dbPool = await getDbPool();
    if (dbPool) {
      // Simple ping query to verify connection
      const client = await dbPool.connect();
      try {
        await client.query("SELECT 1");
        return res.json({ 
          connected: true, 
          source: "Azure Database for PostgreSQL", 
          details: `Connected to Host: ${process.env.AZURE_PG_HOST || "configured connection string"}`
        });
      } finally {
        client.release();
      }
    }
  } catch (err: any) {
    return res.json({ 
      connected: false, 
      source: "Azure Database for PostgreSQL (Configured, but connection failed)", 
      error: err.message 
    });
  }
  
  return res.json({ 
    connected: false, 
    source: "In-Memory Sandbox", 
    message: "Azure Database for PostgreSQL credentials not configured. Using local in-memory storage fallback. Add variables in Settings -> Secrets." 
  });
});

// 2. User Registration
app.post("/api/auth/register", async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const dbPool = await getDbPool();

    if (dbPool && tablesInitialized) {
      // Check if user already exists
      const checkRes = await dbPool.query("SELECT * FROM doja_users WHERE phone = $1", [phone]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: "A user with this phone number is already registered" });
      }

      // Insert new user with hashed password
      const insertRes = await dbPool.query(
        "INSERT INTO doja_users (name, phone, password) VALUES ($1, $2, $3) RETURNING name, phone",
        [name, phone, hashedPassword]
      );
      return res.json({ success: true, user: insertRes.rows[0] });
    } else {
      // In-Memory Fallback with hashed password
      const exists = fallbackUsers.some((u) => u.phone === phone);
      if (exists) {
        return res.status(400).json({ error: "A user with this phone number is already registered" });
      }
      const newUser = { name, phone, password: hashedPassword };
      fallbackUsers.push(newUser);
      return res.json({ success: true, user: { name, phone } });
    }
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Server error during registration" });
  }
});

// 3. User Login
app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Missing phone or password" });
  }

  // Admin intercept
  if (phone === "adeyemifaridah23@gmail.com") {
    if (password === "Anike2003") {
      return res.json({
        success: true,
        user: {
          name: "Admin Faridah",
          phone: "admin",
          role: "admin"
        }
      });
    } else {
      return res.status(400).json({ error: "Incorrect password for admin" });
    }
  }

  try {
    const dbPool = await getDbPool();
    if (dbPool && tablesInitialized) {
      const result = await dbPool.query(
        "SELECT name, phone, password FROM doja_users WHERE phone = $1",
        [phone]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Incorrect phone number or password" });
      }
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect phone number or password" });
      }
      return res.json({ success: true, user: { name: user.name, phone: user.phone } });
    } else {
      // In-Memory Fallback
      const user = fallbackUsers.find((u) => u.phone === phone);
      if (!user) {
        return res.status(400).json({ error: "Incorrect phone number or password" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect phone number or password" });
      }
      return res.json({ success: true, user: { name: user.name, phone: user.phone } });
    }
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
});

// 3.5. Get All Users (Admin Only)
app.get("/api/users", async (req, res) => {
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
    return res.json({ success: true, orderId });
  }
});

// 5. Get User Orders
app.get("/api/orders", async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Missing user phone query parameter" });
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
app.put("/api/orders/:orderId/status", async (req, res) => {
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

// 5c. Delete Order (Admin Only)
app.delete("/api/orders/:orderId", async (req, res) => {
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
app.post("/api/settings", async (req, res) => {
  const { paystack_public_key, paystack_secret_key } = req.body;

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
      return res.json({ success: true, message: "Settings saved successfully." });
    } catch (err: any) {
      console.error("Database settings insert error:", err);
      return res.status(500).json({ error: "Failed to save settings." });
    }
  } else {
    // Memory fallback
    fallbackSettings['paystack_public_key'] = paystack_public_key || '';
    fallbackSettings['paystack_secret_key'] = paystack_secret_key || '';
    return res.json({ success: true, message: "Settings saved to in-memory fallback store." });
  }
});

// 5e. Get Paystack Settings (Admin Only)
app.get("/api/settings", async (req, res) => {
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
        paystack_secret_key: settingsMap['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || ''
      });
    } catch (err: any) {
      console.error("Database settings query error:", err);
      return res.status(500).json({ error: "Failed to fetch settings." });
    }
  } else {
    return res.json({
      success: true,
      paystack_public_key: fallbackSettings['paystack_public_key'] || process.env.PAYSTACK_PUBLIC_KEY || '',
      paystack_secret_key: fallbackSettings['paystack_secret_key'] || process.env.PAYSTACK_SECRET_KEY || ''
    });
  }
});

// 5f. Get Public Paystack Key (Public Access)
app.get("/api/settings/public", async (req, res) => {
  const dbPool = await getDbPool();
  if (dbPool && tablesInitialized) {
    try {
      const result = await dbPool.query("SELECT value FROM doja_settings WHERE key = 'paystack_public_key'");
      const val = result.rows[0]?.value || process.env.PAYSTACK_PUBLIC_KEY || '';
      return res.json({ success: true, paystack_public_key: val });
    } catch (err: any) {
      console.error("Database settings query error:", err);
      return res.status(500).json({ error: "Failed to fetch public key." });
    }
  } else {
    return res.json({ success: true, paystack_public_key: fallbackSettings['paystack_public_key'] || process.env.PAYSTACK_PUBLIC_KEY || '' });
  }
});

// 5g. Verify Paystack Payment
app.post("/api/payments/initialize", async (req, res) => {
  const { email, amount, orderId, callbackUrl } = req.body;

  if (!email || !amount || !orderId) {
    return res.status(400).json({ success: false, message: "Missing required initialize fields" });
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
        callback_url: callbackUrl
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

// 5g. Verify Paystack Payment
app.get("/api/payments/verify/:reference", async (req, res) => {
  const { reference } = req.params;
  const { orderId } = req.query;

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
      if (orderId) {
        await updateOrderPayment(orderId as string, 'paid', reference);
      }
      return res.json({
        success: true,
        status: "success",
        data: data.data
      });
    } else {
      return res.json({
        success: false,
        message: data.message || "Paystack verification unsuccessful.",
        status: data.data?.status || "failed"
      });
    }
  } catch (err: any) {
    console.error("❌ Paystack Verification Error:", err);
    return res.status(500).json({ error: "Failed to verify transaction." });
  }
});

// 6. Submit Contact Inquiry
app.post("/api/inquiries", async (req, res) => {
  const { name, email, phone, loaf, message } = req.body;
  if (!name || !phone || !loaf) {
    return res.status(400).json({ error: "Missing required inquiry fields" });
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
      await containerClient.createIfNotExists();

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
        source: "Azure Blob Storage (Private + Proxied)",
        message: "Successfully uploaded to private Azure Blob Storage container."
      });
    } catch (err: any) {
      console.error("❌ Azure Storage Upload Error:", err);
      // Fallback to base64 if upload fails, to prevent broken admin flow
      const base64Data = req.file.buffer.toString("base64");
      const fallbackUrl = `data:${req.file.mimetype};base64,${base64Data}`;
      return res.json({
        success: true,
        url: fallbackUrl,
        source: "In-Memory Base64 Fallback (Azure failed)",
        error: err.message,
        message: `Azure upload failed: ${err.message}. Used fallback data URL instead so your changes aren't lost!`
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
      message: "Azure Storage Connection String not configured. Created a local Data URL image fallback. To use real Azure Storage, add AZURE_STORAGE_CONNECTION_STRING to your Secrets."
    });
  }
});

// 8. Image Proxy/Streaming endpoint to serve private Azure Storage Blobs
app.get("/api/images/:name", async (req: express.Request, res: express.Response): Promise<any> => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "dojastore";

  if (!connectionString) {
    return res.status(404).send("Azure Storage not configured.");
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
    console.error("❌ Error serving image from Azure Storage:", err);
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
    return res.json({ success: true, message: "Azure Storage is not configured, skipped deleting local/base64 fallback image." });
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
            ? `Successfully deleted image '${blobName}' from Azure Blob Storage.` 
            : `Image '${blobName}' was already deleted or did not exist.`
        });
      } catch (err: any) {
        console.error("❌ Azure Storage Delete Error:", err);
        return res.status(500).json({ success: false, error: "Failed to delete image from Azure Storage.", details: err.message });
      }
    }
  }

  return res.json({ success: true, message: "Image is not stored in Azure Blob Storage, skipped deletion." });
});

// Setup Vite Dev Server / Static Assets Route
async function startServer() {
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
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
