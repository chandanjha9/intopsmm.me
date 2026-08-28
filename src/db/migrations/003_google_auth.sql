-- Google / Firebase sign-in support
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'google_id'
)
BEGIN
    ALTER TABLE users ADD google_id NVARCHAR(128) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_users_google_id' AND object_id = OBJECT_ID('users')
)
BEGIN
    CREATE INDEX idx_users_google_id ON users(google_id);
END;
GO

-- Google accounts have no local password; allow empty password_hash rows (already NOT NULL with '' default usage).
