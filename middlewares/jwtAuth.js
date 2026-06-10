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
    // Buscar token en múltiples lugares
    let token = req.headers['authorization']?.split(' ')[1] || req.headers['x-access-token'];
    
    // Si no hay token en headers, buscar en cookies
    if (!token && req.headers.cookie) {
        const tokenMatch = req.headers.cookie.match(/token=([^;]+)/);
        if (tokenMatch) {
            token = tokenMatch[1];
            console.log('🔍 Token encontrado en cookie');
        }
    }
    
    if (!token) {
        console.log('🔍 No hay token, continuando sin autenticación');
        req.user = null;
        return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            req.user = null;
            return next();
        }
        console.log('✅ Token válido para usuario:', decoded.username);
        req.user = decoded;
        next();
    });
}