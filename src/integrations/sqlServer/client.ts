import * as dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const host = process.env.SQLSERVER_HOST || "localhost";
const database = process.env.SQLSERVER_DATABASE || "growmesmm";
const isLocalDb = host.toLowerCase().includes("(localdb)");

let connectionPool: sql.ConnectionPool;

if (isLocalDb) {
  const msnodesql = await import("mssql/msnodesqlv8.js");
  const sqlDriver = msnodesql.default || msnodesql;
  connectionPool = new sqlDriver.ConnectionPool({
    connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${host};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  });
} else {
  connectionPool = new sql.ConnectionPool({
    server: host,
    port: Number(process.env.SQLSERVER_PORT) || 1433,
    user: process.env.SQLSERVER_USER || "",
    password: process.env.SQLSERVER_PASSWORD || "",
    database: database,
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
}

export const pool = connectionPool;
export const poolConnect = pool.connect().catch((err) => {
  console.error("SQL Server Connection Failed:", err);
  throw err;
});

export default sql;
