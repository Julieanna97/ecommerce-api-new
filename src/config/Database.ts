import mysql from "mysql2/promise";

export class Database {
  private static instance: Database;
  private pool: mysql.Pool;

  private constructor() {
    const useSSL = process.env.DB_SSL === "true";

    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: useSSL
        ? {
            rejectUnauthorized: true,
            ca: process.env.DB_CA_CERT?.replace(/\\n/g, "\n"),
          }
        : undefined,
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }

    return Database.instance;
  }

  public getPool() {
    return this.pool;
  }
}