const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const methodOverride = require('method-override');
require('dotenv').config();
const cookieParser = require('cookie-parser');

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

// Configuración de vistas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '../views'));

app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '../public')));

// Configurar MySQL Store para sesiones
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

// Configuración de sesión con store
app.use(session({
    secret: process.env.SESSION_SECRET || 'mi-secreto-super-seguro',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
    }
}));

app.use(verifyToken);
app.use(setUserLocals);

// Rutas
app.use('/', authRoutes);
app.use('/posts', postRoutes);
app.use('/users', userRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/auth', apiAuthRoutes);

// Ruta principal
app.get('/', async (req, res) => {
    try {
        const Post = require('../models/Post');
        const posts = await Post.findAllHome(20);
        res.render('index', { posts, title: 'Inicio' });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
});

// Manejador 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

// Manejador de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500', { title: 'Error del servidor' });
});

module.exports = app;