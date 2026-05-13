const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../models/User');

// Configurar almacenamiento para avatares en Cloudinary
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fotaza2/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' }
        ]
    }
});

const uploadAvatar = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extname = allowed.test(file.mimetype);
        if (extname) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
        }
    }
}).single('avatar');

// Mostrar formulario para editar perfil
exports.showEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('users/edit-profile', { 
            title: 'Editar perfil', 
            user 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

// Actualizar perfil (nombre, email y avatar)
exports.updateProfile = async (req, res) => {
    uploadAvatar(req, res, async (err) => {
        if (err) {
            const user = await User.findById(req.session.userId);
            return res.render('users/edit-profile', {
                title: 'Editar perfil',
                user: user,
                error: err.message
            });
        }
        
        try {
            const user = await User.findById(req.session.userId);
            const { username, email } = req.body;
            
            // Actualizar nombre y email
            await user.updateProfile({ username, email });
            
            // Actualizar avatar si se subió uno
            if (req.file) {
                await user.updateAvatar(req.file.path);
            }
            
            res.redirect(`/users/${user.id}`);
        } catch (error) {
            console.error(error);
            const user = await User.findById(req.session.userId);
            res.render('users/edit-profile', {
                title: 'Editar perfil',
                user: user,
                error: 'Error al actualizar perfil'
            });
        }
    });
};