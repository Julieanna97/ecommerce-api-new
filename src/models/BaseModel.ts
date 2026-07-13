import { RowDataPacket } from "mysql2";
import { Database } from "../config/Database";

export abstract class BaseModel {
    protected db = Database.getInstance().getPool();
    protected tableName: string;

    constructor (tableName: string) {
        this.tableName = tableName;
    }

    async findAll<T extends RowDataPacket>(): Promise<T[]> {
        const [rows] = await this.db.query<T[]>(`SELECT * FROM ${this.tableName}`);
        return rows;
    }

    async findById<T extends RowDataPacket>(id: number): Promise<T | null> {
        const [rows] = await this.db.query<T[]>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
        return rows[0] || null;
    }

    async deleteById(id: number) {
        const [result] = await this.db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id])
        return result;
    }

}