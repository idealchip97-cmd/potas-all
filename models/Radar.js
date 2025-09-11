const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Radar = sequelize.define('Radar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100]
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Physical location within the factory'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIP: true
    }
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  speedLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    comment: 'Speed limit in km/h for this radar location'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
    defaultValue: 'active'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  installationDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastMaintenance: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ftpPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'FTP path for receiving data from this radar'
  }
}, {
  tableName: 'radars',
  timestamps: true
});

module.exports = Radar;
