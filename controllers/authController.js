const User = require('../models/User');

exports.showLogin = (req, res) => {
    const error = req.query.error;
    res.render('auth/login', { title: 'Iniciar sesión', error });
};


exports.login = async (req, res) => {
    console.log('🔍 ===== LOGIN =====');
    console.log('🔍 Email:', req.body.email);
    
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    
    if (user && await user.verifyPassword(password)) {
        if (!user.is_active) {
            return res.render('auth/login', { 
                title: 'Iniciar sesión', 
                error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' 
            });
        }
        
        console.log('✅ Usuario autenticado:', user.id, user.username);
        
        // Generar token JWT
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'mi_jwt_secret_super_seguro_para_fotaza2',
            { expiresIn: '30d' }
        );
        
        // Guardar en sesión
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.userActive = user.is_active;
        
        // Guardar token en cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
        });
        
        // Guardar sesión explícitamente
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error guardando sesión:', err);
                return res.render('auth/login', { 
                    title: 'Iniciar sesión', 
                    error: 'Error al iniciar sesión. Intenta nuevamente.' 
                });
            }
            console.log('✅ Sesión guardada correctamente');
            console.log('✅ Token guardado en cookie');
            res.redirect('/');
        });
    } else {
        console.log('❌ Credenciales inválidas');
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
    req.session.destroy((err) => {
        if (err) console.error('Error destruyendo sesión:', err);
        res.redirect('/');
    });
};