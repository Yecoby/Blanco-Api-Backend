const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const Role = require('_helpers/role');
const userService = require('./user.service');

router.get('/', getAll); 
router.get('/search', search);
router.get('/searchAll',searchAll);  
router.get('/:id', getById);
router.post('/',createSchema, create);
router.put('/:id',updateSchema, update);
router.delete('/:id',_delete);

router.put('/:id/role', updateRoleSchema, updateRole);

router.get('/:id/preferences', getPreferences);
router.put('/:id/preferences',updatePreferences);

router.put('/:id/password', changePassSchema, changePass);

router.post('/login', loginSchema, login);
router.post('/logout',  logout, logoutSchema);
router.get('/:id/activity', getActivities);

router.put('/:id/deactivate', deactivateUser);
router.put('/:id/reactivate', reactivateUser);

router.get('/:id/permission', getPermission);
router.post('/:id/permission', createPermission);


module.exports = router;

function getAll(req, res, next) {
    userService.getAll()
        .then(users => res.json(users))
        .catch(next);
}
function getById(req, res, next) {
    userService.getById(req.params.id)
        .then(user => res.json(user))
        .catch(next);
}
function create(req, res, next) {
    userService.create(req.body)
        .then(() => res.json({ message: 'User created' }))
        .catch(next);
}
function update(req, res, next) {
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const browserInfo = req.headers['user-agent'] || 'Unknown Browser';

    userService.update(req.params.id, { 
        ...req.body, 
        ipAddress, 
        browserInfo 
    })
    .then(() => res.json({ message: 'User updated' }))
    .catch(next);
}
function _delete(req, res, next) {
    userService.delete(req.params.id)
        .then(() => res.json({ message: 'User deleted' }))
        .catch(next);
}
function createSchema(req, res, next) {
        const schema = Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        role: Joi.string().valid(Role.Admin, Role.User).required(),
        email: Joi.string().email().required(),
        userName: Joi.string().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        profilePic: Joi.string().required()
    });
    validateRequest(req, next, schema);

}
function updateSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string().empty(''),
        firstName: Joi.string().empty(''),
        userName: Joi.string().empty(''),
        lastName: Joi.string().empty(''),
        email: Joi.string().email().empty(''),
        password: Joi.string().min(6).empty(''),
        confirmPassword: Joi.string().valid(Joi.ref('password')).empty(''),
        profilePic: Joi.string().empty('')
    }).with('password', 'confirmPassword');
    validateRequest(req, next, schema);
}

//====================Update role route===============================================
function updateRole(req, res, next) {
    userService.update(req.params.id, req.body)
    .then(() => res.json({ message: 'Role updated' }))
    .catch(next);
}
function updateRoleSchema(req, res, next) {
    const schema = Joi.object({
        role: Joi.string().valid(Role.Admin, Role.User).empty('')
    })
    validateRequest(req, next, schema);
}
//====================Preferences Router Function=========================
function getPreferences(req, res, next) {
    userService.getPreferences(req.params.id)
        .then(preferences => res.json(preferences))
        .catch(next);
}
function updatePreferences(req, res, next) {
    userService.updatePreferences(req.params.id, req.body)
        .then(() => res.json({ message: 'Preferences updated successfully' }))
        .catch(next);
}
//===================Change Password Function=======================================
function changePass(req, res, next) {
    // Add IP address and browser info to the request body if available
    req.body.ipAddress = req.ip || 'Unknown IP';
    req.body.browserInfo = req.get('User-Agent') || 'Unknown Browser';

    userService.changePass(req.params.id, req.body)
        .then(() => res.json({ message: 'Password updated successfully' }))
        .catch(next);
}
function changePassSchema(req, res, next) {
    const schema = Joi.object({
        currentPassword: Joi.string().min(6).required(),
        newPassword: Joi.string().min(6).empty('').required(),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).empty('').required()
    })
    validateRequest(req, next, schema);
}
//====================Login with Token Function=========================
function login(req, res, next) {
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const browserInfo = req.headers['user-agent'] || 'Unknown Browser';

    userService.login({ ...req.body, ipAddress, browserInfo })
    .then(({ token }) => res.json({ token }))
    .catch(next);
}
function loginSchema(req, res, next) {
    const schema = Joi.object({
        userName: Joi.string().empty(),
        email: Joi.string().email().empty(),
        password: Joi.string().required()
    }).xor('userName', 'email') 
        .messages({
        'object.missing': 'Either email or userName must be provided.',
        'object.xor': 'Both email and userName cannot be provided at the same time.'
    })

    validateRequest(req, next, schema);
}
//====================Logout Function=========================
function logout(req, res, next) {// Assuming the user is authenticated and the `authenticate` middleware has added user info to `req.user`
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const browserInfo = req.headers['user-agent'] || 'Unknown Browser';

    userService.logout({
        id: req.user.id, // Use the authenticated user's ID from the token
        ipAddress,
        browserInfo
    })
    .then(response => res.json(response))
    .catch(next);

}

function logoutSchema(req, res, next) {
    const schema = Joi.object({
    });
    validateRequest(req, next, schema);
}

//====================Deactivate & Reactivate Function=========================
function deactivateUser(req, res, next) {
    userService.deactivate(req.params.id)
        .then(() => res.json({ message: 'User deactivated successfully' }))
        .catch(next);
}
function reactivateUser(req, res, next) {
    userService.reactivate(req.params.id)
        .then(() => res.json({ message: 'User reactivated successfully' }))
        .catch(next);
}
//===================Logging Function=======================================
function getActivities(req, res, next) {
    const filters = {
        actionType: req.query.actionType,
        startDate: req.query.startDate,
        endDate: req.query.endDate
    };
    userService.getUserActivities(req.params.id, filters)
        .then(activities => res.json(activities))
        .catch(next);
}
//===================Search Route========================================
function search(req, res, next) {
    const { email, title, firstName, lastName, role, fullName, status, dateCreated, lastDateLogin} = req.query;

    if (!email && !title && !firstName && !lastName && !role && !fullName && !status && !dateCreated && !lastDateLogin) {
        return res.status(400).json({ message: 'At least one search term is required' });
    }

    userService.search({ email, title, firstName, lastName, role, fullName, status, dateCreated, lastDateLogin})
        .then(users => res.json(users))  // 'users' will now include 'fullName'
        .catch(next);
}
function searchAll(req, res, next) {
    const query = req.query.query; 
    
    if (!query) {
        return res.status(400).json({ message: 'Search term is required' });
    }

    userService.searchAll(query)
        .then(users => res.json(users))
        .catch(next);
}
//===================Permission Route========================================
function getPermission(req, res, next) {
    userService.getPermission(req.params.id)
        .then(permission => res.json(permission))
        .catch(next);
}
function createPermission(req, res, next) {
    userService.updatePreferences(req.params.id, req.body)
        .then(() => res.json({ message: 'Access confirm' }))
        .catch(next);
}