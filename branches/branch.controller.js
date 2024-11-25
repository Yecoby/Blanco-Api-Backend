const express = require('express');
const router = express.Router();
const Joi = require('joi');
const branchService = require('./branch.service');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');

router.get('/', authorize (Role. Admin),getAllBranch);
router.get('/:id',authorize([Role.Admin,Role.Staff]),getBranchById);
router.delete('/:id', authorize (Role. Admin), _deleteBranch);
router.post('/create', authorize (Role. Admin),createBranchSchema, createBranch);

router.put('/:id', authorize (Role. Admin), updateBranchSchema, updateBranch);
router.post('/:id/assign/:AccountId', authorize (Role. Admin),assignUser);
router.post('/:id/remove/:AccountId', authorize (Role. Admin),removeUserFromBranch);

router.put('/:id/deactivate', authorize (Role. Admin), deactivateBranch);
router.put('/:id/reactivate', authorize (Role. Admin), reactivateBranch);
// New routes with validation

router.put('/:id/role', authorize (Role. Admin), updateRoleSchema, updateRole);


module.exports = router;

// Route handlers
function getAllBranch(req, res, next) {
    branchService.getAllBranch()
        .then(branches => res.json(branches))
        .catch(next);
}

function getBranchById(req, res, next) {
    const branchId = req.params.id;

    // Check if the user is an admin or assigned to the branch
    if (req.user.role !== Role.Admin && req.user.BranchId !== Number(branchId)) {
        return res.status(403).json({ message: 'Access to this branch is forbidden' });
    }

    branchService.getBranchById(branchId)
        .then(branch => branch ? res.json(branch) : res.sendStatus(404))
        .catch(next);
}

function createBranch(req, res, next) {
    branchService.createBranch(req.body)
        .then(() => res.json({ message: 'Branch created' }))
        .catch(next);
}
function createBranchSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(100),
        location: Joi.string().required().max(255)
    });
    validateRequest(req, next, schema);
}

function updateBranch(req, res, next) {
    branchService.updateBranch(req.params.id, req.body)
        .then(() => res.json({ message: 'Branch updated' }))
        .catch(next);
}

function updateBranchSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().min(3).max(100).empty(''),
        location: Joi.string().max(255).empty('')
    });
    validateRequest(req, next, schema);
}

//====================Update role route===============================================
function updateRole(req, res, next) {
    branchService.update(req.params.id, req.body)
    .then(() => res.json({ message: 'Role updated' }))
    .catch(next);
}
function updateRoleSchema(req, res, next) {
    const schema = Joi.object({
        role: Joi.string().valid(Role.Admin, Role.User, Role.Staff).empty('')
    })
    validateRequest(req, next, schema);
}

function _deleteBranch(req, res, next) {
    branchService.deleteBranch(req.params.id)
        .then(() => res.json({ message: 'Branch deleted' }))
        .catch(next);
}

function assignUser(req, res, next) {
    branchService.assignUser(req.params.id, req.params.AccountId)
        .then(() => res.json({ message: 'User assigned to branch' }))
        .catch(next);
}

function removeUserFromBranch(req, res, next) {
    branchService.removeUserFromBranch(req.params.id, req.params.AccountId)
        .then(() => res.json({ message: 'User removed from branch' }))
        .catch(next);
} 

//=======================================================================================================

function deactivateBranch(req, res, next) {
    branchService.deactivateBranch(req.params.id)
        .then(() => res.json({ message: 'User deactivated successfully' }))
        .catch(next);
}
function reactivateBranch(req, res, next) {
    branchService.reactivateBranch(req.params.id)
        .then(() => res.json({ message: 'User reactivated successfully' }))
        .catch(next);
}
