require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { PORT, SEED_DEFAULT_ADMIN } = require('./config/constants');
const { migrateCollections } = require('./services/migration.service');
const { seedProducts, seedAdminUser } = require('./services/seed.service');

const startServer = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    await migrateCollections();
    await seedProducts();
    if (SEED_DEFAULT_ADMIN) {
      await seedAdminUser();
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

startServer();
