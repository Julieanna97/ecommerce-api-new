const fs = require("fs");
const mysql = require("mysql2/promise");
require("dotenv").config();

const sqlFilePath =
  process.argv[2] || "C:\\Users\\julie\\Downloads\\ecommerce_searchengine.sql";

const caFilePath =
  process.env.DB_SSL_CA_PATH || "C:\\Users\\julie\\Downloads\\ca.pem";

async function importSql() {
  console.log("Reading SQL file:", sqlFilePath);

  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found: ${sqlFilePath}`);
  }

  if (!fs.existsSync(caFilePath)) {
    throw new Error(`CA file not found: ${caFilePath}`);
  }

  const sql = fs.readFileSync(sqlFilePath, "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: {
      ca: fs.readFileSync(caFilePath),
    },
  });

  console.log("Connected to Aiven MySQL.");
  console.log("Preparing import...");

  await connection.query("SET SESSION sql_require_primary_key = 0;");
  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

  console.log("Importing SQL...");

  await connection.query(sql);

  await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("Import finished successfully!");

  const [products] = await connection.query(
    "SELECT id, name, price, stock, category, external_url FROM products;"
  );

  console.log("Products in Aiven:");
  console.table(products);

  await connection.end();
}

importSql().catch((error) => {
  console.error("Import failed:");
  console.error(error.message);
  process.exit(1);
});