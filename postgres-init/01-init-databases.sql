-- =============================================================
-- AI Career Pipeline Manager — PostgreSQL Initialization Script
-- Runs automatically when the postgres container first starts.
-- Creates 3 isolated databases, one per service.
-- =============================================================

-- Auth Service database
CREATE DATABASE auth_db;

-- Application Service database  
CREATE DATABASE application_db;

-- Analytics Service database
CREATE DATABASE analytics_db;

-- Grant all privileges on each database to the postgres user
GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE application_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO postgres;