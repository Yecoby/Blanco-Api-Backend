    const config = require('config.json');
    const mysql = require('mysql2/promise');
    const { Sequelize } = require('sequelize');

    module.exports = db = {};

    initialize();
    async function initialize() { 
        const { host, port, user, password, database } = config.database;
        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        
        await connection.end();

        const sequelize = new Sequelize(database, user, password, { host: 'localhost', dialect: 'mysql' });

    // Initialize models and add them to the exported `db` object
    db.User = require('../users/user.model')(sequelize);
    db.Order = require('../orders/order.model')(sequelize);
    db.Preferences = require('../models/preferences.model')(sequelize);  
    db.Product = require('../products/product.model')(sequelize);
    db.Inventory = require('../inventories/inventory.model')(sequelize);
    db.Branch = require('../branches/branch.model')(sequelize);
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.ActivityLog = require('../models/activitylog.model')(sequelize);
     
    db.Order.belongsTo(db.Account, { foreignKey: 'AccountId' });

    db.Product.hasMany(db.Order, { foreignKey: 'productId' });
    db.Order.belongsTo(db.Product, { foreignKey: 'productId' });
    // Define associations
    db.Branch.hasMany(db.Inventory, { foreignKey: 'branchId'/* , onDelete: 'CASCADE' */ });
    db.Inventory.belongsTo(db.Branch, { foreignKey: 'branchId' });

    db.Product.hasOne(db.Inventory, { as: 'inventory', foreignKey: 'productId' });
    db.Inventory.belongsTo(db.Product, { foreignKey: 'productId' });

    db.Branch.hasMany(db.Account, { onDelete: 'CASCADE' });
    db.Account.belongsTo(db.Branch);

    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    db.ActivityLog.belongsTo(db.Account, { foreignKey: 'AccountId' });
    db.Preferences.belongsTo(db.Account, { foreignKey: 'AccountId' });


        await sequelize.sync({ alter: true });
    } 