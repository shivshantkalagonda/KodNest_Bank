const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = 'premium_banking_secret_123';

const authenticate = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify token exists in database (hasn't been logged out)
        db.get('SELECT * FROM tokens WHERE token = ?', [token], (err, row) => {
            if (err || !row) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            // Attach user_id to request
            req.userId = decoded.userId;
            next();
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token signature' });
    }
};

module.exports = { authenticate, JWT_SECRET };
