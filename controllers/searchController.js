const Post = require('../models/Post');
const User = require('../models/User');

exports.search = async (req, res) => {
    try {
        const { q, author, tag, page = 1 } = req.query;
        const limit = 20;
        const offset = (page - 1) * limit;
        
        let posts = [];
        let total = 0;
        
        if (q || author || tag) {
            const result = await Post.search({
                query: q,
                author,
                tag
            }, limit, offset);
            posts = result.posts;
            total = result.total;
        }
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('search/results', {
            title: 'Resultados de búsqueda',
            posts,
            query: { q, author, tag },
            currentPage: parseInt(page),
            totalPages,
            totalResults: total,
            hasResults: posts.length > 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        let users = [];
        
        if (q) {
            users = await User.search(q, 20);
        }
        
        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar usuarios' });
    }
};
