const User = require('../models/User');

// Verifica si el usuario está autenticado
function isAuthenticated(req, res, next) {
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

// Pasa el usuario actual a todas las vistas
async function setUserLocals(req, res, next) {
    if (req.session.userId) {
        const user = await User.findById(req.session.userId);
        res.locals.currentUser = user;
        res.locals.isAdmin = user && user.role === 'admin';
        res.locals.isValidator = user && (user.role === 'admin' || user.role === 'validator');
        
        req.session.userRole = user ? user.role : null;
        req.session.userActive = user ? user.is_active : null;
    } else {
        res.locals.currentUser = null;
        res.locals.isAdmin = false;
        res.locals.isValidator = false;
    }
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
