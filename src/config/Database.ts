// Import and access enironmental variables
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
dotenv.config()

export class Database {
  private static instance: Database;
  private pool;

  private constructor() {
    this.pool = mysql.createPool({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || "3306")

    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  getPool() {
    return this.pool;
  }
}
