const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const dotenv = require('dotenv');
const methodOverride = require('method-override');

dotenv.config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const apiAuthRoutes = require('./routes/api-auth');

const { setUserLocals } = require('./middlewares/authMiddleware');
const { verifyToken } = require('./middlewares/jwtAuth');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ========== CONFIGURACIÓN DE SESSION CON MYSQL (COMO EN API/INDEX.JS) ==========
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

app.use(session({
    secret: process.env.SESSION_SECRET || 'mi-secreto-super-seguro-para-fotaza2',
    store: sessionStore, 
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
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

// ========== RUTA PRINCIPAL CON USUARIO FORZADO (COMO EN API/INDEX.JS) ==========
app.get('/', async (req, res) => {
    console.log('🔍 === RUTA PRINCIPAL ===');
    console.log('🔍 session.userId:', req.session?.userId);
    
    // FORZAR RECARGA DEL USUARIO
    if (req.session?.userId) {
        const User = require('./models/User');
        const user = await User.findById(req.session.userId);
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
            console.log('✅ Usuario forzado en raíz:', user.username);
        }
    }
    
    try {
        const Post = require('./models/Post');
        const posts = await Post.findAllHome(20);
        res.render('index', { posts, title: 'Inicio' });
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

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;