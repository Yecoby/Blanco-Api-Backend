const express = require('express');
const router = express.Router();
const inventoryService = require('../inventories/inventory.service');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');

// Existing routes
router.get('/', authorize([Role.Admin, Role.Staff]), getInventory);
router.post('/', authorize([Role.Admin, Role.Staff]), updateStock);

// New routes
router.post('/reorder-point', authorize([Role.Admin, Role.Staff]), setReorderPoint);
router.get('/low-stock', authorize([Role.Admin, Role.Staff]), getLowStock);
router.get('/availability/:id', authorize([Role.Admin, Role.Staff]), checkAvailability);

module.exports = router;

// Existing functions
function getInventory(req, res, next) {
    inventoryService.getInventory()
        .then(inventory => res.json(inventory))
        .catch(next);
}

function updateStock(req, res, next) {
    const { productId, quantity } = req.body;
    inventoryService.updateStock(productId, quantity)
        .then(() => res.json({ message: 'Stock updated' }))
        .catch(next);
}

// New handler functions
function setReorderPoint(req, res, next) {
    const { productId, reorderPoint } = req.body;
    inventoryService.setReorderPoint(productId, reorderPoint)
        .then(inventory => res.json(inventory))
        .catch(next);
}

function getLowStock(req, res, next) {
    inventoryService.checkLowStock()
        .then(items => res.json(items))
        .catch(next);
}

function checkAvailability(req, res, next) {
    inventoryService.checkAvailability(req.params.id)
        .then(availability => res.json(availability))
        .catch(next);
}