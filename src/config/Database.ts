import fs from "fs";
import mysql from "mysql2/promise";

export class Database {
  private static instance: Database;
  private pool: mysql.Pool;

  private constructor() {
    const useSSL = process.env.DB_SSL === "true";

    const caFromEnv = process.env.DB_CA_CERT?.replace(/\\n/g, "\n");
    const caPath = process.env.DB_SSL_CA_PATH;

    let caCertificate: string | undefined = caFromEnv;

    if (!caCertificate && caPath && fs.existsSync(caPath)) {
      caCertificate = fs.readFileSync(caPath, "utf8");
    }

    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,

      // Fail instead of waiting indefinitely.
      connectTimeout: 8_000,
      waitForConnections: false,

      // A small pool is safer for a serverless function.
      connectionLimit: 3,
      maxIdle: 3,
      idleTimeout: 30_000,
      queueLimit: 0,

      enableKeepAlive: true,
      keepAliveInitialDelay: 0,

      ssl: useSSL
        ? {
            rejectUnauthorized: true,
            ca: caCertificate,
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

  public getPool(): mysql.Pool {
    return this.pool;
  }
}