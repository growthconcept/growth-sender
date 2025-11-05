import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Campaign = sequelize.define('Campaign', {
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
  template_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'message_templates',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'running', 'completed', 'paused', 'cancelled', 'error'),
    defaultValue: 'scheduled'
  },
  recipient_type: {
    type: DataTypes.ENUM('contacts', 'group'),
    defaultValue: 'contacts'
  },
  recipients: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '09:00:00'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '18:00:00'
  },
  allowed_days: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: false,
    defaultValue: [1, 2, 3, 4, 5] // Segunda a sexta
  },
  message_interval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30 // segundos
  },
  max_recipients: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  sent_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'campaigns',
  timestamps: true,
  underscored: true
});

export default Campaign;
