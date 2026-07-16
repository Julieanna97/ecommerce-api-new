import { Request, Response } from "express";
import { Database } from "../config/Database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = Database.getInstance().getPool();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getClientUrl = () => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  return clientUrl.endsWith("/")
    ? clientUrl.slice(0, -1)
    : clientUrl;
};

export const checkoutSessionHosted = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { cartItems, customerInfo } = req.body;

  if (!cartItems || !customerInfo) {
    res.status(400).json({
      error: "Cart items and customer info are required.",
    });
    return;
  }

  try {
    const [existingCustomerRows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM customers WHERE email = ?",
      [customerInfo.email]
    );

    let customerId: number;

    if (existingCustomerRows.length > 0) {
      customerId = existingCustomerRows[0].id as number;
    } else {
      const [createResult] = await db.query<ResultSetHeader>(
        `INSERT INTO customers 
        (firstname, lastname, email, phone, street_address, postal_code, city, country)
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

    const totalPrice = cartItems.reduce((total: number, item: any) => {
      return total + Number(item.price) * Number(item.quantity);
    }, 0);

    const [orderResult] = await db.query<ResultSetHeader>(
      `INSERT INTO orders 
      (customer_id, total_price, payment_status, payment_id, order_status)
      VALUES (?, ?, 'Unpaid', '', 'Pending')`,
      [customerId, totalPrice]
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await db.query(
        `INSERT INTO order_items 
        (order_id, product_id, product_name, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.id,
          item.name,
          Number(item.quantity),
          Number(item.price),
        ]
      );

      await db.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [Number(item.quantity), item.id]
      );
    }

    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "sek",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: Number(item.quantity),
    }));

    const clientUrl = getClientUrl();

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${clientUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout`,
      client_reference_id: customerId.toString(),
      metadata: {
        orderId: orderId.toString(),
      },
    });

    await db.query(
      `UPDATE orders 
      SET payment_id = ?, order_status = 'Pending', payment_status = 'Unpaid' 
      WHERE id = ?`,
      [session.id, orderId]
    );

    res.json({ checkout_url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);

    res.status(500).json({
      error: "An error occurred creating checkout session",
    });
  }
};

export const checkoutSessionEmbedded = async (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented yet" });
};

export const webhook = async (_req: Request, res: Response) => {
  res.status(501).json({ message: "Webhook handler not implemented yet" });
};