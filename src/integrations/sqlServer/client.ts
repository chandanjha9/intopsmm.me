import * as dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const host = process.env.SQLSERVER_HOST || "180.151.91.194";
const port = Number(process.env.SQLSERVER_PORT) || 50210;
const user = process.env.SQLSERVER_USER || "wspl";
const password = process.env.SQLSERVER_PASSWORD || "TE-B}x]u";
const database = process.env.SQLSERVER_DATABASE || "WaydineQA";

// Configure connection pool
export const pool = new sql.ConnectionPool({
  server: host,
  port,
  user,
  password,
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
  .then((p) => {
    console.log(`✅ SQL Server Connected successfully to [${host}:${port}/${database}]`);
    return p;
  })
  .catch((err) => {
    console.error("SQL Server Connection Failed:", err.message);
    return pool;
  });

export default sql;

// Initialize Render keep-alive heartbeat engine
import("@/lib/keep-alive.server").then((m) => m.initKeepAlive()).catch(() => {});
