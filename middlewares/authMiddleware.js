const User = require('../models/User');

// Verifica si el usuario está autenticado
function isAuthenticated(req, res, next) {
    console.log('🔍 isAuthenticated - userId:', req.session.userId);
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Verifica si el usuario NO está autenticado (para login/register)
function isNotAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return next();
    }
    res.redirect('/');
}

// Verifica si el usuario es administrador
function isAdmin(req, res, next) {
    if (req.session.userId && req.session.userRole === 'admin') {
        return next();
    }
    res.status(403).render('403', { title: 'Acceso denegado' });
}

// Verifica si el usuario es administrador o validador
function isAdminOrValidator(req, res, next) {
    if (req.session.userId && (req.session.userRole === 'admin' || req.session.userRole === 'validator')) {
        return next();
    }
    res.status(403).render('403', { title: 'Acceso denegado' });
}

// Verifica si la cuenta del usuario está activa
function isActive(req, res, next) {
    if (req.session.userId && req.session.userActive !== false) {
        return next();
    }
    req.session.destroy();
    res.redirect('/login?error=Cuenta desactivada');
}

// ========== FUNCIÓN CORREGIDA PARA setUserLocals ==========
async function setUserLocals(req, res, next) {
    console.log('🔍 ===== setUserLocals ejecutándose =====');
    console.log('🔍 URL:', req.url);
    console.log('🔍 session.userId:', req.session?.userId);
    console.log('🔍 sessionID:', req.sessionID);
    
    // Intentar obtener usuario de la sesión
    let userId = req.session?.userId;
    
    // Si no hay sesión pero hay token JWT en cookie, intentar con eso
    if (!userId && req.headers.cookie) {
        console.log('🔍 Buscando token en cookies...');
        const tokenMatch = req.headers.cookie.match(/token=([^;]+)/);
        if (tokenMatch) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
                userId = decoded.id;
                console.log('🔍 Token válido, usuario ID:', userId);
                // Restaurar sesión
                req.session.userId = userId;
            } catch (e) {
                console.log('🔍 Token inválido o expirado');
            }
        }
    }
    
    if (userId) {
        const user = await User.findById(userId);
        console.log('🔍 Usuario encontrado:', user ? user.username : 'NO ENCONTRADO');
        
        if (user) {
            res.locals.currentUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                is_active: user.is_active
            };
            res.locals.isAdmin = user.role === 'admin';
            res.locals.isValidator = user.role === 'admin' || user.role === 'validator';
            
            // Actualizar sesión
            req.session.userId = user.id;
            req.session.userRole = user.role;
            req.session.userActive = user.is_active;
            
            console.log('✅ Usuario en locals:', res.locals.currentUser?.username);
        } else {
            res.locals.currentUser = null;
            res.locals.isAdmin = false;
            res.locals.isValidator = false;
        }
    } else {
        console.log('🔍 No hay usuario en sesión');
        res.locals.currentUser = null;
        res.locals.isAdmin = false;
        res.locals.isValidator = false;
    }
    
    console.log('🔍 currentUser al final:', res.locals.currentUser?.username || 'null');
    next();
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    isAdmin,
    isAdminOrValidator,
    isActive,
    setUserLocals
};