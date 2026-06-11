const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_jwt_secret_super_seguro_para_fotaza2';

function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            email: user.email,
            role: user.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
    );
}

function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1] || req.headers['x-access-token'];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            req.user = null;
            return next();
        }
        req.user = decoded;
        next();
    });
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Token no válido o expirado' });
    }
    next();
}

module.exports = { generateToken, verifyToken, requireAuth };