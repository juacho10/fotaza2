const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const pool = require('../config/db');

exports.pendingReports = async (req, res) => {
    try {
        const reports = await Report.findPending();
        
        res.render('admin/reports', {
            title: 'Denuncias pendientes',
            reports
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.reviewReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        
        if (!report) {
            return res.status(404).render('404', { title: 'Denuncia no encontrada' });
        }
        
        let post = null;
        let comment = null;
        
        if (report.post_id) {
            post = await Post.findById(report.post_id);
        } else if (report.comment_id) {
            comment = await Comment.findById(report.comment_id);
        }
        
        res.render('admin/review', {
            title: 'Revisar denuncia',
            report,
            post,
            comment
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.approveReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        
        if (!report) {
            return res.status(404).json({ error: 'Denuncia no encontrada' });
        }
        
        if (report.post_id) {
            const post = await Post.findById(report.post_id);
            if (post) {
                await post.ban();
                const user = await User.findById(post.user_id);
                await user.incrementBannedPosts();
                
                await Notification.create(
                    post.user_id,
                    'system',
                    req.session.userId,
                    null,
                    post.id,
                    null,
                    'Tu publicación ha sido eliminada por violar las normas'
                );
            }
        } else if (report.comment_id) {
            const comment = await Comment.findById(report.comment_id);
            if (comment) {
                await comment.ban();
                
                await Notification.create(
                    comment.user_id,
                    'system',
                    req.session.userId,
                    null,
                    null,
                    null,
                    'Tu comentario ha sido eliminado por violar las normas'
                );
            }
        }
        
        await report.markAsReviewed('approved', req.session.userId);
        res.redirect('/admin/reports');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al aprobar denuncia' });
    }
};

exports.dismissReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        
        if (!report) {
            return res.status(404).json({ error: 'Denuncia no encontrada' });
        }
        
        await report.markAsReviewed('dismissed', req.session.userId);
        res.redirect('/admin/reports');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al desestimar denuncia' });
    }
};

exports.bannedUsers = async (req, res) => {
    try {
        const users = await User.findInactive();
        
        res.render('admin/banned-users', {
            title: 'Usuarios inactivos',
            users
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.reactivateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        await user.reactivate();
        res.redirect('/admin/banned-users');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al reactivar usuario' });
    }
};

exports.stats = async (req, res) => {
    try {
        const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
        const [postCount] = await pool.query('SELECT COUNT(*) as count FROM posts WHERE deleted_at IS NULL AND is_banned = FALSE');
        const [reportCount] = await pool.query('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');
        const [commentCount] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE deleted_at IS NULL');
        
        res.render('admin/stats', {
            title: 'Estadísticas',
            stats: {
                users: userCount[0].count,
                posts: postCount[0].count,
                pendingReports: reportCount[0].count,
                comments: commentCount[0].count
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};
