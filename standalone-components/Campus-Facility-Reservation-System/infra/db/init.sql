-- infra/db/init.sql
-- Run once on first-time local setup:
--   mysql -u root -p < infra/db/init.sql

CREATE DATABASE IF NOT EXISTS campus_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'campus_user'@'localhost'
    IDENTIFIED BY 'yourpassword';

GRANT ALL PRIVILEGES ON campus_db.* TO 'campus_user'@'localhost';

FLUSH PRIVILEGES;

SELECT 'Database and user created successfully.' AS status;
