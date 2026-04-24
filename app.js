const express = require('express');
const session = require('express-session');
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

const { setUserLocals } = require('./middlewares/authMiddleware');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'mi-secreto-super-seguro-para-fotaza2',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

app.use(setUserLocals);

app.use('/', authRoutes);
app.use('/posts', postRoutes);
app.use('/users', userRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.get('/', async (req, res) => {
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
