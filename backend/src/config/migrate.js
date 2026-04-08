import { sequelize } from '../models/index.js';

async function migrate() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');

    console.log('Running migrations...');
    
    // Adicionar 'supervisor' ao ENUM se não existir
    try {
      const [results] = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM pg_enum 
          WHERE enumlabel = 'supervisor' 
          AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'enum_users_role'
          )
        ) as exists;
      `);
      
      const exists = results[0]?.exists;
      
      if (!exists) {
        console.log('Adding "supervisor" to enum_users_role...');
        await sequelize.query(`
          ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'supervisor';
        `);
        console.log('✓ Added "supervisor" to enum_users_role');
      } else {
        console.log('✓ "supervisor" already exists in enum_users_role');
      }
    } catch (enumError) {
      // Se o ENUM não existir ainda, o sync vai criar
      console.log('Note: enum_users_role may not exist yet, sync will create it');
    }
    
    // Adicionar novos valores ao ENUM message_type de message_templates
    const newMessageTypes = ['interactive_menu', 'carousel'];
    for (const value of newMessageTypes) {
      try {
        const [results] = await sequelize.query(`
          SELECT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = '${value}'
            AND enumtypid = (
              SELECT oid
              FROM pg_type
              WHERE typname = 'enum_message_templates_message_type'
            )
          ) as exists;
        `);

        const exists = results[0]?.exists;

        if (!exists) {
          console.log(`Adding "${value}" to enum_message_templates_message_type...`);
          await sequelize.query(`
            ALTER TYPE enum_message_templates_message_type ADD VALUE IF NOT EXISTS '${value}';
          `);
          console.log(`✓ Added "${value}" to enum_message_templates_message_type`);
        } else {
          console.log(`✓ "${value}" already exists in enum_message_templates_message_type`);
        }
      } catch (enumError) {
        console.log(`Note: enum_message_templates_message_type may not exist yet, sync will create it`);
      }
    }

    await sequelize.sync({ alter: true });
    console.log('✓ Database synchronized successfully');

    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
