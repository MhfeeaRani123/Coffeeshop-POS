const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/orders', require('./routes/OrderRoutes'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = error.type === 'entity.too.large'
    ? 413
    : error instanceof SyntaxError && error.status === 400
      ? 400
      : 500;
  const message = status === 413
    ? 'Request is too large. Product photos must be optimized before upload.'
    : status === 400
      ? 'Request body contains invalid JSON.'
      : 'An unexpected server error occurred.';
  if (status === 500) console.error('Unhandled request error:', error);
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});