module.exports = errorHandler;

function errorHandler(err, req, res, next) {
    switch (true) {
        case typeof err === 'string':
            const is404 = err.toLowerCase().endsWith('not found');
            const statusCode = is404 ? 404 : 400;
            return res.status(statusCode).json({ message: err });
        case err.message && err.message.toLowerCase().includes('deactivated'):
            return res.status(403).json({ message: 'deactivated' });
        case err.name === 'UnauthorizedError':
            return res.status(401).json({ message: 'Unauthorized error-handler' });
        default:
            return res.status(500).json({ message: err.message });
    }
}
