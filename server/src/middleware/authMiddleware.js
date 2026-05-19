const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super_secret_final_year_project_key'; // Use env variable in production

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ message: 'No token provided.' });

    const bearer = token.split(' ');
    const tokenValue = bearer.length === 2 ? bearer[1] : token;

    // Check if token value is empty or undefined
    if (!tokenValue) {
        return res.status(401).json({ message: 'Invalid token format.' });
    }

    jwt.verify(tokenValue, SECRET_KEY, (err, decoded) => {
        if (err) {
            // Return 401 Unauthorized, not 500 Server Error
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

// NEW: Role-Based Access Control Middleware
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.userRole || !allowedRoles.includes(req.userRole)) {
            return res.status(403).json({ 
                message: `Access Denied. You need to be one of: ${allowedRoles.join(', ')}` 
            });
        }
        next();
    };
};

module.exports = { verifyToken, SECRET_KEY ,checkRole };