import { Request, Response } from "express";
import {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";
import dotenv from "dotenv";
import { Database } from "../config/Database";
import {
  getShippingCountryName,
  getShippingFee,
  isShippingCountryCode,
  normalizeShippingCountryCode,
} from "../constants/checkout";

dotenv.config();

const db = Database.getInstance().getPool();

const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY,
);

interface CartRequestItem {
  id: number;
  quantity: number;
}

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  price: number | string;
  stock: number;
}

interface CustomerRow extends RowDataPacket {
  id: number;
}

interface ValidatedCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

class CheckoutValidationError extends Error {}

const getClientUrl = () => {
  const clientUrl =
    process.env.CLIENT_URL || "http://localhost:5173";

  return clientUrl.endsWith("/")
    ? clientUrl.slice(0, -1)
    : clientUrl;
};

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const checkoutSessionHosted = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const cartItems = Array.isArray(req.body?.cartItems)
    ? (req.body.cartItems as CartRequestItem[])
    : [];

  const customerInfo = req.body?.customerInfo;

  if (cartItems.length === 0 || !customerInfo) {
    res.status(400).json({
      error: "Cart items and customer information are required.",
    });

    return;
  }

  const firstname = cleanText(customerInfo.firstname);
  const lastname = cleanText(customerInfo.lastname);
  const email = cleanText(customerInfo.email).toLowerCase();
  const phone = cleanText(customerInfo.phone);
  const streetAddress = cleanText(customerInfo.street_address);
  const postalCode = cleanText(customerInfo.postal_code);
  const city = cleanText(customerInfo.city);
  const countryCode = cleanText(customerInfo.country);

  if (
    !firstname ||
    !lastname ||
    !email ||
    !phone ||
    !streetAddress ||
    !postalCode ||
    !city ||
    !countryCode
  ) {
    res.status(400).json({
      error: "All delivery fields are required.",
    });

    return;
  }

  if (!isShippingCountryCode(countryCode)) {
    res.status(400).json({
      error: "The selected delivery country is not supported.",
    });

    return;
  }

  const countryName = getShippingCountryName(countryCode);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const quantitiesByProductId = new Map<number, number>();

    for (const item of cartItems) {
      const productId = Number(item.id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new CheckoutValidationError(
          "The cart contains an invalid product or quantity.",
        );
      }

      quantitiesByProductId.set(
        productId,
        (quantitiesByProductId.get(productId) || 0) + quantity,
      );
    }

    const productIds = Array.from(
      quantitiesByProductId.keys(),
    );

    const placeholders = productIds
      .map(() => "?")
      .join(", ");

    const [productRows] =
      await connection.query<ProductRow[]>(
        `
          SELECT id, name, price, stock
          FROM products
          WHERE id IN (${placeholders})
          FOR UPDATE
        `,
        productIds,
      );

    if (productRows.length !== productIds.length) {
      throw new CheckoutValidationError(
        "One or more products no longer exist.",
      );
    }

    const productMap = new Map(
      productRows.map((product) => [
        Number(product.id),
        product,
      ]),
    );

    const validatedItems: ValidatedCartItem[] =
      productIds.map((productId) => {
        const product = productMap.get(productId);
        const quantity =
          quantitiesByProductId.get(productId) || 0;

        if (!product) {
          throw new CheckoutValidationError(
            "A product could not be found.",
          );
        }

        const stock = Number(product.stock) || 0;
        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
          throw new CheckoutValidationError(
            `${product.name} has an invalid price.`,
          );
        }

        if (quantity > stock) {
          throw new CheckoutValidationError(
            `Only ${stock} of ${product.name} are currently available.`,
          );
        }

        return {
          id: productId,
          name: product.name,
          price,
          quantity,
        };
      });

    const subtotal = validatedItems.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0,
    );

    const shippingFee = getShippingFee(subtotal);
    const totalPrice = subtotal + shippingFee;

    const [existingCustomerRows] =
      await connection.query<CustomerRow[]>(
        `
          SELECT id
          FROM customers
          WHERE email = ?
          LIMIT 1
          FOR UPDATE
        `,
        [email],
      );

    let customerId: number;

    if (existingCustomerRows.length > 0) {
      customerId = Number(existingCustomerRows[0].id);

      await connection.execute(
        `
          UPDATE customers
          SET
            firstname = ?,
            lastname = ?,
            phone = ?,
            street_address = ?,
            postal_code = ?,
            city = ?,
            country = ?
          WHERE id = ?
        `,
        [
          firstname,
          lastname,
          phone,
          streetAddress,
          postalCode,
          city,
          countryName,
          customerId,
        ],
      );
    } else {
      const [createCustomerResult] =
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO customers (
              firstname,
              lastname,
              email,
              phone,
              street_address,
              postal_code,
              city,
              country
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            firstname,
            lastname,
            email,
            phone,
            streetAddress,
            postalCode,
            city,
            countryName,
          ],
        );

      customerId = createCustomerResult.insertId;
    }

    const [orderResult] =
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO orders (
            customer_id,
            total_price,
            payment_status,
            payment_id,
            order_status
          )
          VALUES (?, ?, 'Unpaid', '', 'Pending')
        `,
        [customerId, totalPrice],
      );

    const orderId = orderResult.insertId;

    for (const item of validatedItems) {
      await connection.execute(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.id,
          item.name,
          item.quantity,
          item.price,
        ],
      );

      const [stockResult] =
        await connection.execute<ResultSetHeader>(
          `
            UPDATE products
            SET stock = stock - ?
            WHERE id = ?
              AND stock >= ?
          `,
          [
            item.quantity,
            item.id,
            item.quantity,
          ],
        );

      if (stockResult.affectedRows !== 1) {
        throw new CheckoutValidationError(
          `${item.name} no longer has enough stock.`,
        );
      }
    }

    const lineItems = validatedItems.map((item) => ({
      price_data: {
        currency: "sek",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const clientUrl = getClientUrl();

    const shippingDisplayName =
      shippingFee === 0
        ? "Free standard shipping"
        : "Standard shipping";

    const session =
      await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        customer_email: email,

        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: shippingDisplayName,

              fixed_amount: {
                amount: Math.round(shippingFee * 100),
                currency: "sek",
              },

              delivery_estimate: {
                minimum: {
                  unit: "business_day",
                  value: 2,
                },
                maximum: {
                  unit: "business_day",
                  value: 5,
                },
              },
            },
          },
        ],

        success_url:
          `${clientUrl}/order-confirmation` +
          "?session_id={CHECKOUT_SESSION_ID}",

        cancel_url: `${clientUrl}/checkout`,

        client_reference_id: orderId.toString(),

        metadata: {
          orderId: orderId.toString(),
          customerId: customerId.toString(),
          subtotalSek: subtotal.toFixed(2),
          shippingSek: shippingFee.toFixed(2),
          countryCode,
        },

        payment_intent_data: {
          metadata: {
            orderId: orderId.toString(),
          },
        },
      });

    await connection.execute(
      `
        UPDATE orders
        SET
          payment_id = ?,
          order_status = 'Pending',
          payment_status = 'Unpaid'
        WHERE id = ?
      `,
      [session.id, orderId],
    );

    await connection.commit();

    res.json({
      checkout_url: session.url,
      subtotal,
      shipping: shippingFee,
      total: totalPrice,
    });
  } catch (error) {
    await connection.rollback();

    if (error instanceof CheckoutValidationError) {
      res.status(400).json({
        error: error.message,
      });

      return;
    }

    console.error("Stripe session error:", error);

    res.status(500).json({
      error: "An error occurred while creating the checkout session.",
    });
  } finally {
    connection.release();
  }
};

export const checkoutSessionEmbedded = async (
  _req: Request,
  res: Response,
) => {
  res.status(501).json({
    message: "Not implemented yet",
  });
};

export const webhook = async (
  _req: Request,
  res: Response,
) => {
  res.status(501).json({
    message: "Webhook handler not implemented yet",
  });
};