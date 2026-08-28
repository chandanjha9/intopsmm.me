import sql from "mssql";

const sqlConfig = {
  user: process.env.SQLSERVER_USER || "wspl",
  password: process.env.SQLSERVER_PASSWORD || "TE-B}x]u",
  server: process.env.SQLSERVER_SERVER || "180.151.91.194",
  port: Number(process.env.SQLSERVER_PORT || 50210),
  database: process.env.SQLSERVER_DATABASE || "WaydineQA",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function checkColumns() {
  const pool = await sql.connect(sqlConfig);
  const res = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME IN ('profiles', 'users', 'payment_orders')
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  console.log("Columns:", res.recordset);
  await pool.close();
}

checkColumns();
