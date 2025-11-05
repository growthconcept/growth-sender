import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MessageTemplate = sequelize.define('MessageTemplate', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'document'),
    defaultValue: 'text'
  },
  text_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  media_url: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'message_templates',
  timestamps: true,
  underscored: true
});

export default MessageTemplate;
