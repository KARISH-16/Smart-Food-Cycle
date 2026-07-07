require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Food Cycle API is running.'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

async function startServer() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI.');
    console.error('Copy backend/.env.example to backend/.env and set MONGODB_URI to your MongoDB Atlas connection string.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB Atlas successfully.');

    app.listen(PORT, () => {
      console.log(`Smart Food Cycle backend is running on http://localhost:${PORT}`);
      console.log(`API endpoints are available under http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error.message);
    console.error('Check that MONGODB_URI is correct and that your current IP address is allow-listed in Atlas Network Access.');
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down Smart Food Cycle backend...');
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
