const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const attributes = {
        productId: { type: DataTypes.INTEGER, allowNull: false },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        reorderPoint: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10,
        },
        lastReorderAlert: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    };

    return sequelize.define('Inventory', attributes);
};