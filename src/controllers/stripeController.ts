import { Request, Response } from "express";
import { db } from "../config/db";
import { STRIPE_SECRET_KEY } from "../constants/env";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import dotenv from 'dotenv';
dotenv.config();

console.log("✅ STRIPE_SECRET_KEY from stripeController.ts:", process.env.STRIPE_SECRET_KEY);

const stripe = require('stripe')(STRIPE_SECRET_KEY);

export const checkoutSessionHosted = async (req: Request, res: Response) => {
  const { cartItems, customerInfo } = req.body;

  if (!cartItems || !customerInfo) {
    return res.status(400).json({ error: "Cart items and customer info are required." });
  }

  try {
    // ✅ Check if customer exists
    const [existingCustomerRows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM customers WHERE email = ?",
      [customerInfo.email]
    );

    let customerId: number;
    if (existingCustomerRows.length > 0) {
      customerId = existingCustomerRows[0].id as number;
    } else {
      const [createResult] = await db.query<ResultSetHeader>(
        `INSERT INTO customers (firstname, lastname, email, phone, street_address, postal_code, city, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerInfo.firstname,
          customerInfo.lastname,
          customerInfo.email,
          customerInfo.phone,
          customerInfo.street_address,
          customerInfo.postal_code,
          customerInfo.city,
          customerInfo.country,
        ]
      );
      customerId = createResult.insertId;
    }

    // ✅ Create order in database
    const totalPrice = cartItems.reduce(
      (total: number, item: any) => total + item.price * item.quantity,
      0
    );

    const [orderResult] = await db.query<ResultSetHeader>(
      `INSERT INTO orders (customer_id, total_price, payment_status, payment_id, order_status)
       VALUES (?, ?, 'Unpaid', '', 'Pending')`,
      [customerId, totalPrice]
    );

    const orderId = orderResult.insertId;

    // ✅ Insert order items and reduce stock
    for (const item of cartItems) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.quantity, item.price]
      );

      // ✅ Update stock
      await db.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.id]
      );
    }

    // ✅ Prepare Stripe line items
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "SEK",
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: "https://client-mocha-omega.vercel.app/order-confirmation?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://client-mocha-omega.vercel.app/checkout",
      client_reference_id: customerId.toString(),
    });

    // ✅ Update order with Stripe session ID
    await db.query(
      `UPDATE orders SET payment_id = ?, order_status = 'Pending', payment_status = 'Unpaid' WHERE id = ?`,
      [session.id, orderId]
    );

    res.json({ checkout_url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "An error occurred creating checkout session" });
  }
};

// Optional if you want later
export const checkoutSessionEmbedded = async (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented yet" });
};

export const webhook = async (req: Request, res: Response) => {
  res.status(501).json({ message: "Webhook handler not implemented yet" });
};
