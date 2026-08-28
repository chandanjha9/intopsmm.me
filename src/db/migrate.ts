import fs from "fs";
import path from "path";
import sql from "mssql";
import * as dotenv from "dotenv";

dotenv.config();

const config: sql.config = {
  server: process.env.SQLSERVER_HOST || "localhost",
  port: Number(process.env.SQLSERVER_PORT) || 1433,
  user: process.env.SQLSERVER_USER || "",
  password: process.env.SQLSERVER_PASSWORD || "",
  database: process.env.SQLSERVER_DATABASE || "",
  options: {
    encrypt: process.env.SQLSERVER_ENCRYPT === "true",
    trustServerCertificate: true,
  },
};

async function runMigration() {
  console.log("Connecting to SQL Server...");
  const pool = await sql.connect(config);
  console.log("Connected successfully!");

  const migrationPath = path.join(process.cwd(), "src", "db", "migrations", "001_initial.sql");
  const sqlContent = fs.readFileSync(migrationPath, "utf-8");

  // Split by GO batches if any
  const batches = sqlContent
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  for (let i = 0; i < batches.length; i++) {
    console.log(`Executing batch ${i + 1}/${batches.length}...`);
    await pool.request().batch(batches[i]);
  }

  console.log("Migration executed successfully!");
  await pool.close();
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
