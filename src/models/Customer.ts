import { ResultSetHeader } from "mysql2";
import { BaseModel } from "./BaseModel";
import { ICustomer } from "./interfaces/ICustomer";

export class Customer extends BaseModel {
    constructor() {
        super("customers");
    }

    async create(data: Omit<ICustomer, "id" | "created_at">): Promise<number> {
        const sql = `
        INSERT INTO customers (firstname, lastname, email, password, phone, street_address, postal_code, city, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await this.db.query<ResultSetHeader>(sql, [
            data.firstname, data.lastname, data.email, data.password,
            data.phone, data.street_address, data.postal_code, data.city, data.country
        ]);
        return result.insertId;
    }
}