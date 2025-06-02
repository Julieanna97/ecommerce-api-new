import { ResultSetHeader } from "mysql2";
import { BaseModel } from "./BaseModel";
import { IProduct } from "./interfaces/IProduct";

export class Product extends BaseModel {
    constructor() {
        super("products");
    }

    async create(data: Omit<IProduct, "id" | "created_at">): Promise<number> {
        const { name, description, price, stock, category, image } = data;
        const sql = `
            INSERT INTO products (name, description, price, stock, category, image)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await this.db.query<ResultSetHeader>(sql, [
            name, description, price, stock, category, image
        ]);
        return result.insertId;
    }

    async update(id: number, data: Partial<IProduct>) {
        const fields = Object.entries(data).map(([key, _]) => 
            `${key} = ?`).join(', ');
        const values = Object.values(data);
        const sql = `UPDATE products SET ${fields} WHERE id = ?`;
        await this.db.query(sql, [...values, id]);
    }
}