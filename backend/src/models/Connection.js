import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Connection = sequelize.define('Connection', {
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
  instance_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  instance_key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('connected', 'disconnected', 'error'),
    defaultValue: 'disconnected'
  },
  profile_pic_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'connections',
  timestamps: true,
  underscored: true
});

export default Connection;
