const User = require('../models/User');

exports.showLogin = (req, res) => {
    const error = req.query.error;
    res.render('auth/login', { title: 'Iniciar sesión', error });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    
    if (user && await user.verifyPassword(password)) {
        if (!user.is_active) {
            return res.render('auth/login', { 
                title: 'Iniciar sesión', 
                error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' 
            });
        }
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.userActive = user.is_active;
        res.redirect('/');
    } else {
        res.render('auth/login', { title: 'Iniciar sesión', error: 'Email o contraseña incorrectos' });
    }
};

exports.showRegister = (req, res) => {
    res.render('auth/register', { title: 'Registrarse' });
};

exports.register = async (req, res) => {
    const { username, email, password, confirm_password } = req.body;
    
    if (password !== confirm_password) {
        return res.render('auth/register', { title: 'Registrarse', error: 'Las contraseñas no coinciden' });
    }
    
    if (password.length < 6) {
        return res.render('auth/register', { title: 'Registrarse', error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    try {
        await User.create({ username, email, password });
        res.redirect('/login');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.render('auth/register', { title: 'Registrarse', error: 'El email o nombre de usuario ya existe' });
        } else {
            console.error(error);
            res.render('auth/register', { title: 'Registrarse', error: 'Error al registrar usuario' });
        }
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};
