import { IOrderItem } from "./interfaces/IOrderItem";
import { TransactionBase } from "./TransactionBase";

export class Cart extends TransactionBase {
    constructor() {
        super("cart_items");
    }

    async getCartItems(userId: number): Promise<IOrderItem[]> {
        const [rows] = await this.db.query<IOrderItem[]>(`
            SELECT * FROM cart_items WHERE user_id = ?
            `, [userId]);
            return rows;
    }

    async addItem(userId: number, item: Omit<IOrderItem, "id" | "order_id" | "created_at">): Promise<void> {
        await this.db.query(`
            INSERT INTO cart_items (user_id, product_id, product_name, quantity, unit_price)
            VALUES (?, ?, ?, ?, ?)
            `, [userId, item.product_id, item.product_name, item.quantity, item.unit_price]);

    }

    async clearCart(userId: number): Promise<void> {
        await this.db.query(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);
    }
}