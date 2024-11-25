// inventory.service.js
const db = require('_helpers/db');
const { Op, Sequelize } = require('sequelize');  // Added Sequelize import

module.exports = {
    getInventory,
    updateStock,
    checkAvailability,
    setReorderPoint,
    checkLowStock,
};

async function getInventory() {
    return await db.Inventory.findAll({ 
        include: [{
            model: db.Product,
            where: { productStatus: 'active' }
        }]
    });
}

async function updateStock(productId, quantity) {
    if (!productId) {
        throw new Error('Product ID is required');
    }

    const inventory = await db.Inventory.findOne({ 
        where: { productId },
        include: [{
            model: db.Product,
            where: { productStatus: 'active' }
        }]
    });

    if (!inventory) {
        throw new Error('Inventory not found for this product');
    }

    inventory.quantity = quantity;
    await inventory.save();
    
    return inventory;
}

async function setReorderPoint(productId, reorderPoint) {
    const inventory = await db.Inventory.findOne({ where: { productId } });
    
    if (!inventory) {
        throw new Error('Inventory not found for this product');
    }

    inventory.reorderPoint = reorderPoint;
    return await inventory.save();
}

async function checkLowStock() {
    return await db.Inventory.findAll({
        where: {
            quantity: {
                [Op.lte]: Sequelize.col('reorderPoint')  // Fixed: Using Sequelize.col instead of sequelize.col
            }
        },
        include: [{
            model: db.Product,
            where: { productStatus: 'active' }
        }]
    });
}
async function checkAvailability(productId) {
    const product = await db.Product.findByPk(productId, {
        include: [{
            model: db.Inventory,
            as: 'inventory',
            attributes: ['quantity', 'reorderPoint']
        }],
        where: { productStatus: 'active' }
    });

    return product ? {
        name: product.name,
        quantity: product.inventory ? product.inventory.quantity : 0,
        reorderPoint: product.inventory ? product.inventory.reorderPoint : null,
        reorderStatus: product.inventory ? product.inventory.reorderStatus : null
    } : null;
}