import sequelize from '../config/database.js';
import User from './User.js';
import Connection from './Connection.js';
import MessageTemplate from './MessageTemplate.js';
import Campaign from './Campaign.js';
import MessageLog from './MessageLog.js';
import DailyLimit from './DailyLimit.js';

// Definir associações
User.hasMany(Connection, { foreignKey: 'user_id', as: 'connections' });
Connection.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(MessageTemplate, { foreignKey: 'user_id', as: 'templates' });
MessageTemplate.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Campaign, { foreignKey: 'user_id', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Connection.hasMany(Campaign, { foreignKey: 'connection_id', as: 'campaigns' });
Campaign.belongsTo(Connection, { foreignKey: 'connection_id', as: 'connection' });

MessageTemplate.hasMany(Campaign, { foreignKey: 'template_id', as: 'campaigns' });
Campaign.belongsTo(MessageTemplate, { foreignKey: 'template_id', as: 'template' });

Campaign.hasMany(MessageLog, { foreignKey: 'campaign_id', as: 'logs' });
MessageLog.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

User.hasMany(DailyLimit, { foreignKey: 'user_id', as: 'dailyLimits' });
DailyLimit.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Connection.hasMany(DailyLimit, { foreignKey: 'connection_id', as: 'dailyLimits' });
DailyLimit.belongsTo(Connection, { foreignKey: 'connection_id', as: 'connection' });

export {
  sequelize,
  User,
  Connection,
  MessageTemplate,
  Campaign,
  MessageLog,
  DailyLimit
};
