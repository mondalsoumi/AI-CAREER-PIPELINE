const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Mount the authentication routes under /auth to match Gateway routing
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'auth-service', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred' });
});

app.listen(config.port, () => {
  console.log(`Auth Service successfully started and listening on port ${config.port}`);
});
