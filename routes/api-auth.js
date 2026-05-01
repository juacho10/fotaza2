const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken, requireAuth } = require('../middlewares/jwtAuth');

// Login con JWT
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    
    if (user && await user.verifyPassword(password)) {
        if (!user.is_active) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }
        
        const token = generateToken(user);
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } else {
        res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
});

// Verificar token
router.get('/verify', verifyToken, requireAuth, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;