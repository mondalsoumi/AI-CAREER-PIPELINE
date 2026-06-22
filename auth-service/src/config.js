const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env or the service directory .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '8001', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET
};

if (!config.databaseUrl) {
  console.error('Configuration Error: DATABASE_URL is not defined in the environment variables.');
  process.exit(1);
}

if (!config.jwtSecret) {
  console.error('Configuration Error: JWT_SECRET is not defined in the environment variables.');
  process.exit(1);
}

module.exports = config;
