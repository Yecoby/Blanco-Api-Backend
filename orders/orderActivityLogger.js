const db = require('_helpers/db');
const { Op } = require('sequelize');

module.exports = {
    logOrderActivity,
    getOrderActivities
};

async function logOrderActivity(AccountId, orderId, actionType, actionDetails = '', ipAddress = 'Unknown IP', browserInfo = 'Unknown Browser') {
    try {
        // Create activity log entry
        await db.ActivityLog.create({
            AccountId,
            actionType: `order_${actionType}`,
            actionDetails: `Order ID: ${orderId}, IP: ${ipAddress}, Browser: ${browserInfo}, Details: ${actionDetails}`,
            timestamp: new Date()
        });

        // Count logs for the user
        const logCount = await db.ActivityLog.count({ 
            where: { 
                AccountId,
                actionType: { [Op.like]: 'order_%' } 
            } 
        });

        // Keep only the latest 50 order-related logs per user
        if (logCount > 50) {
            const logsToDelete = await db.ActivityLog.findAll({
                where: { 
                    AccountId,
                    actionType: { [Op.like]: 'order_%' }
                },
                order: [['timestamp', 'ASC']],
                limit: logCount - 50
            });

            if (logsToDelete.length > 0) {
                const logIdsToDelete = logsToDelete.map(log => log.id);
                await db.ActivityLog.destroy({
                    where: {
                        id: { [Op.in]: logIdsToDelete }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error logging order activity:', error);
        // Don't throw the error to prevent disrupting the main operation
    }
}

async function getOrderActivities(AccountId, orderId = null, filters = {}) {
    try {
        let whereClause = {
            AccountId,
            actionType: { [Op.like]: 'order_%' }
        };

        if (orderId) {
            whereClause.actionDetails = { [Op.like]: `%Order ID: ${orderId},%` };
        }

        if (filters.startDate || filters.endDate) {
            whereClause.timestamp = {
                [Op.between]: [
                    filters.startDate ? new Date(filters.startDate) : new Date(0),
                    filters.endDate ? new Date(filters.endDate) : new Date()
                ]
            };
        }

        return await db.ActivityLog.findAll({
            where: whereClause,
            order: [['timestamp', 'DESC']],
            limit: 100
        });
    } catch (error) {
        console.error('Error retrieving order activities:', error);
        throw new Error('Failed to retrieve order activities');
    }
}