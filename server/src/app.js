const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');
const clientRoutes = require('./routes/client.routes');
const foundationRoutes = require('./routes/foundation.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
);
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/foundations', foundationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
