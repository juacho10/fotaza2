const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const methodOverride = require('method-override');
require('dotenv').config();

const authRoutes = require('../routes/auth');
const postRoutes = require('../routes/posts');
const userRoutes = require('../routes/users');
const searchRoutes = require('../routes/search');
const adminRoutes = require('../routes/admin');
const apiRoutes = require('../routes/api');
const apiAuthRoutes = require('../routes/api-auth');

const { setUserLocals } = require('../middlewares/authMiddleware');
const { verifyToken } = require('../middlewares/jwtAuth');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '../views'));

app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '../public')));

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 10153,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});

// ========== MIDDLEWARE DE DEBUG ==========
app.use((req, res, next) => {
    console.log('🍪 Cookie recibida:', req.headers.cookie);
    console.log('📝 Session ID:', req.sessionID);
    console.log('👤 Session userId:', req.session?.userId);
    next();
});

// ========== CONFIGURACIÓN DE SESIÓN CORREGIDA ==========
app.use(session({
    secret: process.env.SESSION_SECRET || 'mi-secreto-super-seguro',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: 'none'  
    }
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

// ========== RUTA PRINCIPAL ==========
app.get('/', async (req, res) => {
    console.log('🔍 === RUTA PRINCIPAL ===');
    console.log('🔍 session.userId:', req.session?.userId);
    
    let user = null;
    if (req.session?.userId) {
        const User = require('../models/User');
        user = await User.findById(req.session.userId);
        console.log('🔍 Usuario cargado:', user?.username);
    }
    
    try {
        const Post = require('../models/Post');
        const posts = await Post.findAllHome(20);
        res.render('index', { 
            posts, 
            title: 'Inicio',
            currentUser: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500', { title: 'Error del servidor' });
});

module.exports = app;