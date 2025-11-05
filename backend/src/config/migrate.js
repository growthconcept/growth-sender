import { sequelize } from '../models/index.js';

async function migrate() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');

    console.log('Running migrations...');
    await sequelize.sync({ alter: true });
    console.log('✓ Database synchronized successfully');

    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
