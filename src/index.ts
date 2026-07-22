import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { CorsOptions } from "cors";

import { Database } from "./config/Database";

import productRouter from "./routes/products";
import customerRouter from "./routes/customers";
import orderRouter from "./routes/orders";
import orderItemRouter from "./routes/orderItems";
import stripeRouter from "./routes/stripe";
import authRouter from "./routes/auth";

const app = express();
const db = Database.getInstance().getPool();

const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/$/, "");

const configuredOrigins = (
  process.env.CLIENT_URLS ??
  process.env.CLIENT_URL ??
  ""
)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...configuredOrigins,
]);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requests from tools such as Postman may not have an Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

// CORS must run before routes and request handlers.
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ecommerce-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    await db.query("SELECT 1 AS database_status");

    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      database: "unavailable",
    });
  }
});

app.get("/", (_req, res) => {
  res.json({
    message: "E-commerce API is running",
    status: "OK",
  });
});

app.use("/products", productRouter);
app.use("/customers", customerRouter);
app.use("/orders", orderRouter);
app.use("/order-items", orderItemRouter);
app.use("/stripe", stripeRouter);
app.use("/auth", authRouter);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`The server is running at http://localhost:${PORT}`);
  });
}

export default app;