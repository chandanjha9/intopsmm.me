import * as dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const host = process.env.SQLSERVER_HOST || "";
const database = process.env.SQLSERVER_DATABASE || "growmesmm";

// If no host is configured, skip connection (e.g. on Render without DB env vars)
let connectionPool: sql.ConnectionPool | null = null;
let poolConnect: Promise<sql.ConnectionPool> | null = null;

if (host) {
  connectionPool = new sql.ConnectionPool({
    server: host,
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

  poolConnect = connectionPool.connect().catch((err) => {
    console.error("SQL Server Connection Failed:", err.message);
    // Do not throw — let the app run; DB-dependent routes will fail gracefully
    return connectionPool as sql.ConnectionPool;
  });
} else {
  console.warn(
    "SQLSERVER_HOST is not set. Database features will be unavailable."
  );
}

export const pool = connectionPool;
export { poolConnect };
export default sql;
