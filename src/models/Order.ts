import { ResultSetHeader } from "mysql2";
import { IOrder } from "./interfaces/IOrder";
import { IOrderItem } from "./interfaces/IOrderItem";
import { TransactionBase } from "./TransactionBase";

export class Order extends TransactionBase {
    constructor() {
        super("orders");
    }

    async create(data: Omit<IOrder, "id" | "created_at" | "total_price">, 
        items: IOrderItem[]): Promise<number> {
        const total_price = await this.calculateTotal(items);
        const sql = `
            INSERT INTO orders (customer_id, total_price, payment_status, payment_id, order_status)
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await this.db.query<ResultSetHeader>(sql, [
            data.customer_id, total_price, data.payment_status, data.payment_id, data.order_status

        ]);

        const orderId = result.insertId;

        for(const item of items) {
            await this.db.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
                VALUES (?, ?, ?, ?, ?)
                `,
                [orderId, item.product_id, item.product_name, item.quantity, item.unit_price]
            );
        }

        return orderId;


    }
}