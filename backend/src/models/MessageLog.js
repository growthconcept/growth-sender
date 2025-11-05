import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MessageLog = sequelize.define('MessageLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id'
    }
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('sent', 'error', 'pending'),
    defaultValue: 'pending'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'message_logs',
  timestamps: true,
  underscored: true
});

export default MessageLog;
