import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DailyLimit = sequelize.define('DailyLimit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  connection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'connections',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  campaigns_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'daily_limits',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'connection_id', 'date']
    }
  ]
});

export default DailyLimit;
