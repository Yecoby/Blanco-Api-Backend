const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const productService = require('../products/product.service');
const inventoryService = require('../inventories/inventory.service');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');

router.get('/', authorize([Role.Admin, Role.Staff, Role.User]), getProduct);
router.get('/:id', authorize([Role.Admin, Role.Staff, Role.User]), getProductById);
router.post('/', authorize([Role.Admin, Role.Staff]), createProductSchema, createProduct);
router.put('/:id', authorize([Role.Admin, Role.Staff]), updateProductSchema, updateProduct);
router.get('/:productId/availability', authorize([Role.User]),  checkAvailability);

router.put('/:id/deactivateProduct', authorize([Role.Admin, Role.Staff]), deactivateProduct);
router.put('/:id/reactivateProduct', authorize([Role.Admin, Role.Staff]), reactivateProduct);

module.exports = router;

function getProduct(req, res, next) {
    productService.getProduct(req.user.role)
        .then(products => res.json(products))
        .catch(next);
}
function getProductById(req, res, next) {
    productService.getProductById(req.params.id)
        .then(product => res.json(product))
        .catch(next);
}
function createProduct(req, res, next) {
    productService.createProduct(req.body)
        .then(() => res.json({ message: 'Product created' }))
        .catch(next);
}
// Schema validation middleware
function createProductSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(100),
        description: Joi.string().required().min(3).max(100),
        price: Joi.number().required().min(0),
        quantity: Joi.number().integer().min(0)
    });
    validateRequest(req, next, schema);
}

function updateProductSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().min(3).max(100).empty(''),
        description: Joi.string().min(3).max(100).empty(''),
        price: Joi.number().min(0).empty(''),
        quantity: Joi.number().integer().min(0).empty(''),
        productStatus: Joi.string().valid('active', 'deactivated').optional()
    });
    validateRequest(req, next, schema);
}
function updateProduct(req, res, next) {
    productService.updateProduct(req.params.id, req.body)
        .then(() => res.json({ message: 'Product updated' }))
        .catch(next);
}
function deactivateProduct(req, res, next) {
    productService.deactivate(req.params.id)
        .then(() => res.json({ message: 'Product deactivated successfully' }))
        .catch(next); // Pass error to errorHandler
}

function reactivateProduct(req, res, next) {
    productService.reactivate(req.params.id)
        .then(() => res.json({ message: 'Product reactivated successfully' }))
        .catch(next); // Pass error to errorHandler
}
// Modified checkAvailability function
async function checkAvailability(req, res, next) {
    const productId = req.params.productId;

    try {
        const product = await productService.getProductById(productId);

        // No need to check if active here; already checked in getProductById
        const inventory = await inventoryService.checkAvailability(productId);
        const available = inventory && inventory.quantity > 0;

        res.json({
            product: product.name,
            available,
            quantity: inventory ? inventory.quantity : 0
        });
    } catch (error) {
        if (error.message === 'Invalid product ID') {
            return res.status(404).json({ message: 'Product not found or ID is invalid' });
        }
        next(error);
    }
}
