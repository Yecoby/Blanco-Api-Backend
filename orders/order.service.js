const db = require('_helpers/db');
const { Sequelize } = require('sequelize');
const { logOrderActivity } = require('./orderActivityLogger');

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    cancelOrder,
    trackOrderStatus,
    processOrder,
    shipOrder,
    deliverOrder,
    getOrderActivities
};

async function getAllOrders(role, accountId) {
    const whereCondition = role === 'User'
        ? {
            AccountId: accountId,
            orderStatus: { [Sequelize.Op.not]: 'cancelled' }
          }
        : { orderStatus: ['pending', 'processing', 'shipped', 'delivered'] };

    return await db.Order.findAll({
        where: whereCondition,
        attributes: ['id', 'totalAmount', 'orderStatus', 'shippingAddress', 'createdAt', 'AccountId', 'quantity'],
        include: [
            ...(role !== 'User' ? [{
                model: db.Account,
                attributes: ['id', 'email'],
            }] : []),
            {
                model: db.Product,
                attributes: ['id', 'name', 'price'],
            },
        ],
        order: [['createdAt', 'DESC']],
    });
}

async function getOrderById(id) {
    return await db.Order.findByPk(id);
}


async function createOrder(params) {
    // Validate that the AccountId exists
    const account = await db.Account.findByPk(params.AccountId);
    if (!account) throw 'Account not found';

    // Validate that the Product exists and is active
    const product = await db.Product.findByPk(params.productId);
    if (!product) throw 'Product not found';
    if (product.productStatus !== 'active') throw 'Product is not available';

    // Check product inventory
    const inventory = await db.Inventory.findOne({ where: { productId: product.id } });
    if (!inventory) throw 'Inventory not found for this product';

    // Validate requested quantity against available inventory
    const requestedQuantity = params.quantity || 1; // Default to 1 if not specified
    if (requestedQuantity > inventory.quantity) {
        throw `Insufficient stock. Only ${inventory.quantity} items available.`;
    }

    // Calculate total amount based on product price and quantity
    const totalAmount = product.price * requestedQuantity;

    // Create order with calculated total amount and quantity
    const order = new db.Order({
        ...params,
        quantity: requestedQuantity,
        totalAmount: totalAmount,
        productId: product.id,
        AccountId: account.id
    });
    
    // Save the order
    await order.save();
 // Log order creation
 await logOrderActivity(
    account.id,
    order.id,
    'created',
    `Created order for ${requestedQuantity} units of product ${product.name}`,
    params.ipAddress,
    params.browserInfo
);
    // Reduce inventory quantity
    inventory.quantity -= requestedQuantity;
    await inventory.save();
    
    // Fetch the order with detailed information
    const createdOrder = await db.Order.findByPk(order.id, {
        include: [
            { model: db.Account, attributes: ['id', 'email']},
            { model: db.Product, attributes: ['id', 'name', 'price',] }
        ]
    });
    
    return createdOrder;
}

async function updateOrder(id, params , AccountId, ipAddress, browserInfo) {
    const order = await db.Order.findByPk(id);
    if (!order) throw 'Order not found';
    if (order.orderStatus === 'cancelled') throw 'Cannot update a cancelled order';
    
    const oldStatus = order.orderStatus; // Save the old status before updating
    Object.assign(order, params);
    await order.save();
      // Log order update
      await logOrderActivity(
        AccountId,
        order.id,
        'updated',
        `Updated order. Status changed from '${oldStatus}' to '${order.orderStatus}'`,
        ipAddress,
        browserInfo
    );
    return order;
}

async function cancelOrder(id, AccountId, ipAddress, browserInfo) {
    const order = await getOrderById(id);

    if (!order) throw 'Order not found';

    // Check if the order is already cancelled
    if (order.orderStatus === 'cancelled') {
        throw 'Order is already cancelled';
    }

    // Only allow cancellation for pending or processing orders
    if (['shipped', 'delivered'].includes(order.orderStatus)) {
        throw 'Cannot cancel order that has been shipped or delivered';
    }
    const oldStatus = order.orderStatus; // Save the old status before canceling
    // Set status to 'cancelled' and save the order
    order.orderStatus = 'cancelled';
    await order.save();

    await logOrderActivity(
        AccountId,
        order.id,
        'cancelled',
        `Cancelled order. Previous status: ${oldStatus}`,
        ipAddress,
        browserInfo
    );

    // Find the associated product and deactivate it if needed
    const product = await db.Product.findByPk(order.productId);
    if (product) {
        product.isAvailable = false;
        await product.save();
    }

    return order;
}

async function trackOrderStatus(id, accountId) {
    const order = await db.Order.findOne({
        where: { id, AccountId: accountId }, // Ensure the order belongs to the authenticated user
        attributes: ['orderStatus'],
    });
    if (!order) throw 'Order not found or unauthorized access';
    return order.orderStatus;
}

async function processOrder(id, AccountId, ipAddress, browserInfo) {
    const order = await getOrderById(id);
    if (!order) throw 'Order not found';
    if (order.orderStatus === 'cancelled') throw 'Cannot process a cancelled order';

    const oldStatus = order.orderStatus; // Save the old status before updating
    order.orderStatus = 'processing';
    await order.save();

      // Log order processing activity
      await logOrderActivity(
        AccountId,
        order.id,
        'processed',
        `Processed order. Status changed from '${oldStatus}' to 'processing'`,
        ipAddress,
        browserInfo
    );
}

async function shipOrder(id) {
    const order = await getOrderById(id);
    if (!order) throw 'Order not found';
    if (order.orderStatus === 'cancelled') throw 'Cannot ship a cancelled order';

    order.orderStatus = 'shipped';
    await order.save();
}

async function deliverOrder(id) {
    const order = await getOrderById(id);
    if (!order) throw 'Order not found';
    if (order.orderStatus === 'cancelled') throw 'Cannot deliver a cancelled order';

    order.orderStatus = 'delivered';
    await order.save();
}
async function getOrderActivities(orderId, AccountId, filters = {}) {
    const order = await getOrderById(orderId);
    if (!order) throw 'Order not found';
    
    return await orderActivityLogger.getOrderActivities(AccountId, orderId, filters);
}