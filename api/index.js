const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const methodOverride = require('method-override');
require('dotenv').config();


['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME','SESSION_SECRET','JWT_SECRET'].forEach(k => {
    if (!process.env[k]) console.error(`❌ FALTA ENV: ${k}`);
});

const authRoutes      = require('../routes/auth');
const postRoutes      = require('../routes/posts');
const userRoutes      = require('../routes/users');
const searchRoutes    = require('../routes/search');
const adminRoutes     = require('../routes/admin');
const apiRoutes       = require('../routes/api');
const apiAuthRoutes   = require('../routes/api-auth');

const { setUserLocals } = require('../middlewares/authMiddleware');
const { verifyToken }   = require('../middlewares/jwtAuth');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '../views'));
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '../public')));


app.use(cookieSession({
    name: 'fotaza2_session',
    keys: [process.env.SESSION_SECRET || 'mi-secreto-super-seguro'],
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
    signed: true
}));

app.use(verifyToken);
app.use(setUserLocals);

app.use('/', authRoutes);
app.use('/posts', postRoutes);
app.use('/users', userRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/auth', apiAuthRoutes);


app.get('/', async (req, res) => {
    try {
        const Post = require('../models/Post');
        const posts = await Post.findAllHome(20);
        res.render('index', { posts, title: 'Inicio' });
    } catch (error) {
        console.error('❌ Error en /:', error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('❌ Error global:', err.stack);
    res.status(500).render('500', { title: 'Error del servidor' });
});

module.exports = app;
