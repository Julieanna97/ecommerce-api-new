import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { Database } from "../config/Database";
import { getShippingFee } from "../constants/checkout";
import { logError } from "../utilities/logger";

const db = Database.getInstance().getPool();

interface OrderDetailsRow extends RowDataPacket {
  order_id: number;
  customer_id: number;
  total_price: number | string;
  payment_status: string;
  payment_id: string | null;
  order_status: string;
  orders_created_at: string;

  firstname: string;
  lastname: string;
  email: string;
  password: string | null;
  phone: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  customers_created_at: string;

  order_item_id: number | null;
  product_id: number | null;
  product_name: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
}

interface CreateOrderItemInput {
  product_id: number;
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
}

interface CreateOrderBody {
  customer_id: number;
  payment_status: string;
  payment_id: string | null;
  order_status: string;
  order_items: CreateOrderItemInput[];
}

interface UpdateOrderBody {
  payment_status: string;
  payment_id: string | null;
  order_status: string;
}

interface OrderItemWithOrderId extends CreateOrderItemInput {
  order_id: number;
}

export const getOrders = async (
  _req: Request,
  res: Response,
) => {
  try {
    const sql = `
      SELECT
        orders.id AS id,
        orders.customer_id,
        orders.total_price,
        orders.payment_status,
        orders.payment_id,
        orders.order_status,
        orders.created_at,
        customers.firstname AS customer_firstname,
        customers.lastname AS customer_lastname,
        customers.email AS customer_email,
        customers.phone AS customer_phone,
        customers.street_address AS customer_street_address,
        customers.postal_code AS customer_postal_code,
        customers.city AS customer_city,
        customers.country AS customer_country,
        customers.created_at AS customers_created_at
      FROM orders
      LEFT JOIN customers
        ON orders.customer_id = customers.id
    `;

    const [rows] = await db.query<RowDataPacket[]>(sql);

    res.json(rows);
  } catch (error: unknown) {
    res.status(500).json({
      error: logError(error),
    });
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
) => {
  const id = String(req.params.id);

  try {
    const sql = `
      SELECT
        orders.id AS order_id,
        orders.customer_id,
        orders.total_price,
        orders.payment_status,
        orders.payment_id,
        orders.order_status,
        orders.created_at AS orders_created_at,

        customers.firstname,
        customers.lastname,
        customers.email,
        customers.password,
        customers.phone,
        customers.street_address,
        customers.postal_code,
        customers.city,
        customers.country,
        customers.created_at AS customers_created_at,

        order_items.id AS order_item_id,
        order_items.product_id,
        order_items.product_name,
        order_items.quantity,
        order_items.unit_price
      FROM orders
      LEFT JOIN customers
        ON orders.customer_id = customers.id
      LEFT JOIN order_items
        ON orders.id = order_items.order_id
      WHERE orders.id = ?
    `;

    const [rows] = await db.query<OrderDetailsRow[]>(
      sql,
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({
        message: "Order not found",
      });

      return;
    }

    res.json(formatOrderDetails(rows));
  } catch (error: unknown) {
    res.status(500).json({
      error: logError(error),
    });
  }
};

export const getOrderByPaymentId = async (
  req: Request,
  res: Response,
) => {
  const paymentId = String(req.params.id);

  try {
    const sql = `
      SELECT
        orders.id AS order_id,
        orders.customer_id,
        orders.total_price,
        orders.payment_status,
        orders.payment_id,
        orders.order_status,
        orders.created_at AS orders_created_at,

        customers.firstname,
        customers.lastname,
        customers.email,
        customers.password,
        customers.phone,
        customers.street_address,
        customers.postal_code,
        customers.city,
        customers.country,
        customers.created_at AS customers_created_at,

        order_items.id AS order_item_id,
        order_items.product_id,
        order_items.product_name,
        order_items.quantity,
        order_items.unit_price
      FROM orders
      LEFT JOIN customers
        ON orders.customer_id = customers.id
      LEFT JOIN order_items
        ON orders.id = order_items.order_id
      WHERE orders.payment_id = ?
    `;

    const [rows] = await db.query<OrderDetailsRow[]>(
      sql,
      [paymentId],
    );

    if (rows.length === 0) {
      res.status(404).json({
        message: "Order not found",
      });

      return;
    }

    res.json(formatOrderDetails(rows));
  } catch (error: unknown) {
    res.status(500).json({
      error: logError(error),
    });
  }
};

const formatOrderDetails = (
  rows: OrderDetailsRow[],
) => {
  const firstRow = rows[0];

  return {
    id: firstRow.order_id,
    customer_id: firstRow.customer_id,
    total_price: firstRow.total_price,
    payment_status: firstRow.payment_status,
    payment_id: firstRow.payment_id,
    order_status: firstRow.order_status,
    created_at: firstRow.orders_created_at,

    customer_firstname: firstRow.firstname,
    customer_lastname: firstRow.lastname,
    customer_email: firstRow.email,
    customer_password: firstRow.password,
    customer_phone: firstRow.phone,
    customer_street_address: firstRow.street_address,
    customer_postal_code: firstRow.postal_code,
    customer_city: firstRow.city,
    customer_country: firstRow.country,
    customers_created_at: firstRow.customers_created_at,

    order_items: rows
      .filter((row) => row.order_item_id !== null)
      .map((row) => ({
        id: row.order_item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        unit_price: row.unit_price,
      })),
  };
};

export const createOrder = async (
  req: Request,
  res: Response,
) => {
  const {
    customer_id,
    payment_status,
    payment_id,
    order_status,
    order_items,
  } = req.body as CreateOrderBody;

  if (!Array.isArray(order_items) || order_items.length === 0) {
    res.status(400).json({
      message: "At least one order item is required.",
    });

    return;
  }

  const hasInvalidItem = order_items.some((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    return (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    );
  });

  if (hasInvalidItem) {
    res.status(400).json({
      message: "Order contains an invalid quantity or unit price.",
    });

    return;
  }

  try {
    const subtotal = order_items.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      return sum + quantity * unitPrice;
    }, 0);

    const shippingFee = getShippingFee(subtotal);
    const totalPrice = subtotal + shippingFee;

    const sql = `
      INSERT INTO orders (
        customer_id,
        total_price,
        payment_status,
        payment_id,
        order_status
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      customer_id,
      totalPrice,
      payment_status,
      payment_id,
      order_status,
    ];

    const [result] = await db.query<ResultSetHeader>(
      sql,
      params,
    );

    const orderId = result.insertId;

    for (const orderItem of order_items) {
      await createOrderItem({
        ...orderItem,
        order_id: orderId,
      });
    }

    res.status(201).json({
      message: "Order created",
      id: orderId,
      subtotal,
      shipping_fee: shippingFee,
      total_price: totalPrice,
    });
  } catch (error: unknown) {
    res.status(500).json({
      error: logError(error),
    });
  }
};

const createOrderItem = async (
  data: OrderItemWithOrderId,
) => {
  const {
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
  } = data;

  const sql = `
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  const params = [
    order_id,
    product_id,
    product_name,
    Number(quantity),
    Number(unit_price),
  ];

  await db.query<ResultSetHeader>(sql, params);
};

export const updateOrder = async (
  req: Request,
  res: Response,
) => {
  const id = String(req.params.id);

  const {
    payment_status,
    payment_id,
    order_status,
  } = req.body as UpdateOrderBody;

  try {
    const sql = `
      UPDATE orders
      SET
        payment_status = ?,
        payment_id = ?,
        order_status = ?
      WHERE id = ?
    `;

    const params = [
      payment_status,
      payment_id,
      order_status,
      id,
    ];

    const [result] = await db.query<ResultSetHeader>(
      sql,
      params,
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        message: "Order not found",
      });

      return;
    }

    res.json({
      message: "Order updated",
    });
  } catch (error: unknown) {
    res.status(500).json({
      error: logError(error),
    });
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
) => {
  const id = String(req.params.id);

  try {
    const sql = `
      DELETE FROM orders
      WHERE id = ?
    `;

    const [result] = await db.query<ResultSetHeader>(
      sql,
      [id],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        message: "Order not found",
      });

      return;
    }

    res.json({
      message: "Order deleted",
    });
  } catch (error: unknown) {
    res.status(500).json({
      error: logError(error),
    });
  }
};