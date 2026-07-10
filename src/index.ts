import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import productRouter from "./routes/products";
import customerRouter from "./routes/customers";
import orderRouter from "./routes/orders";
import orderItemRouter from "./routes/orderItems";
import stripeRouter from "./routes/stripe";
import authRouter from "./routes/auth";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Homepage / API overview route
app.get("/", (req, res) => {
  res.json({
    message: "E-commerce API is running",
    project: "E-commerce REST API",
    description:
      "A backend API built with TypeScript, Express, MySQL, JWT authentication, and Stripe checkout integration.",
    status: "OK",
    documentation:
      "This is a backend API project. Use the routes below to test the API.",
    endpoints: {
      products: {
        getAll: "GET /products",
        getOne: "GET /products/:id",
        create: "POST /products",
        update: "PATCH /products/:id",
        delete: "DELETE /products/:id",
      },
      customers: {
        getAll: "GET /customers",
        getOne: "GET /customers/:id",
        getByEmail: "GET /customers/email/:email",
        create: "POST /customers",
        update: "PATCH /customers/:id",
        delete: "DELETE /customers/:id",
      },
      orders: {
        getAll: "GET /orders",
        getOne: "GET /orders/:id",
        getByPaymentId: "GET /orders/payment/:id",
        create: "POST /orders",
        update: "PATCH /orders/:id",
        delete: "DELETE /orders/:id",
      },
      orderItems: {
        update: "PATCH /order-items/:id",
        delete: "DELETE /order-items/:id",
      },
      auth: {
        register: "POST /auth/register",
        login: "POST /auth/login",
        refreshToken: "POST /auth/refresh-token",
        clearToken: "POST /auth/clear-token",
      },
      stripe: {
        hostedCheckout: "POST /stripe/create-checkout-session-hosted",
        embeddedCheckout: "POST /stripe/create-checkout-session-embedded",
        webhook: "POST /stripe/webhook",
      },
    },
    exampleRoutes: ["/products", "/customers", "/orders"],
  });
});

// API routes
app.use("/products", productRouter);
app.use("/customers", customerRouter);
app.use("/orders", orderRouter);
app.use("/order-items", orderItemRouter);
app.use("/stripe", stripeRouter);
app.use("/auth", authRouter);

// 404 fallback route
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    availableRoutes: [
      "/",
      "/products",
      "/customers",
      "/orders",
      "/order-items",
      "/auth",
      "/stripe",
    ],
  });
});

// Start Express server locally only
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`The server is running at http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;