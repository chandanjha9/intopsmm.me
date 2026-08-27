-- =====================================================================
-- Migration: Add password_reset_tokens table
-- Run this script against the SQL Server database
-- =====================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'password_reset_tokens')
BEGIN
    CREATE TABLE password_reset_tokens (
        id            UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
        user_id       UNIQUEIDENTIFIER  NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        token_hash    NVARCHAR(255)     NOT NULL UNIQUE,
        expires_at    DATETIMEOFFSET    NOT NULL,
        used          BIT               NOT NULL DEFAULT 0,
        created_at    DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token_hash);
    CREATE INDEX idx_password_reset_tokens_user  ON password_reset_tokens(user_id);
END;
GO
