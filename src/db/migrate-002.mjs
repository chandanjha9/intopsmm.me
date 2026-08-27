import sql from "mssql";
import { config } from "dotenv";
config();

const dbConfig = {
  server: process.env.SQLSERVER_HOST,
  port: parseInt(process.env.SQLSERVER_PORT || "1433"),
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  database: process.env.SQLSERVER_DATABASE,
  options: {
    encrypt: process.env.SQLSERVER_ENCRYPT === "true",
    trustServerCertificate: true,
  },
};

async function run() {
  const pool = await sql.connect(dbConfig);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'password_reset_tokens')
    BEGIN
      CREATE TABLE password_reset_tokens (
        id            UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
        user_id       UNIQUEIDENTIFIER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash    NVARCHAR(255)     NOT NULL UNIQUE,
        expires_at    DATETIMEOFFSET    NOT NULL,
        used          BIT               NOT NULL DEFAULT 0,
        created_at    DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET()
      );
      CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token_hash);
      CREATE INDEX idx_password_reset_tokens_user  ON password_reset_tokens(user_id);
      PRINT 'Created password_reset_tokens table.';
    END
    ELSE
    BEGIN
      PRINT 'password_reset_tokens table already exists.';
    END
  `);
  console.log("Migration complete: password_reset_tokens table ready.");
  await pool.close();
}

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
