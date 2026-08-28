import * as dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const host = process.env.SQLSERVER_HOST || "";
const database = process.env.SQLSERVER_DATABASE || "growmesmm";

// Configure connection pool
export const pool = new sql.ConnectionPool({
  server: host || "localhost",
  port: Number(process.env.SQLSERVER_PORT) || 1433,
  user: process.env.SQLSERVER_USER || "",
  password: process.env.SQLSERVER_PASSWORD || "",
  database,
  options: {
    encrypt: process.env.SQLSERVER_ENCRYPT === "true",
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

export const poolConnect: Promise<sql.ConnectionPool> = pool
  .connect()
  .catch((err) => {
    console.error("SQL Server Connection Failed:", err.message);
    return pool;
  });

export default sql;

// Initialize Render keep-alive heartbeat engine
import("@/lib/keep-alive.server").then((m) => m.initKeepAlive()).catch(() => {});
