const User = require('../models/User');

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.redirect('/login');
}

function isNotAuthenticated(req, res, next) {
    if (!req.session || !req.session.userId) return next();
    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.userRole === 'admin') return next();
    res.status(403).render('403', { title: 'Acceso denegado' });
}

function isAdminOrValidator(req, res, next) {
    if (req.session && req.session.userId &&
        (req.session.userRole === 'admin' || req.session.userRole === 'validator')) return next();
    res.status(403).render('403', { title: 'Acceso denegado' });
}

function isActive(req, res, next) {
    if (req.session && req.session.userId && req.session.userActive !== false) return next();
    if (req.session) req.session = null;
    res.redirect('/login?error=Cuenta desactivada');
}

// ✅ Blindado: nunca cuelga, timeout 8s
async function setUserLocals(req, res, next) {
    res.locals.currentUser = null;
    res.locals.isAdmin = false;
    res.locals.isValidator = false;

    try {
        const userId = req.session && req.session.userId;
        if (!userId) return next();

        const user = await Promise.race([
            User.findById(userId),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('DB timeout en setUserLocals')), 8000)
            )
        ]);

        if (user) {
            res.locals.currentUser = {
                id: user.id, username: user.username, email: user.email,
                role: user.role, avatar: user.avatar, is_active: user.is_active
            };
            res.locals.isAdmin = user.role === 'admin';
            res.locals.isValidator = user.role === 'admin' || user.role === 'validator';
        }
    } catch (err) {
        console.error('❌ setUserLocals:', err.message);
    }
    next();
}

module.exports = {
    isAuthenticated, isNotAuthenticated, isAdmin,
    isAdminOrValidator, isActive, setUserLocals
};
