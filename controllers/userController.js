const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const Collection = require('../models/Collection');
const Message = require('../models/Message');

exports.profile = async (req, res) => {
    console.log('📌 PROFILE - ID:', req.params.id);
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        
        if (!user || !user.is_active) {
            return res.status(404).render('404', { title: 'Usuario no encontrado' });
        }
        
        const posts = await Post.findByUser(userId);
        const followersCount = await User.getFollowersCount(userId);
        const followingCount = await User.getFollowingCount(userId);
        
        let isFollowing = false;
        if (req.session.userId && req.session.userId != userId) {
            isFollowing = await User.isFollowing(req.session.userId, userId);
        }
        
        res.render('users/profile', {
            title: `Perfil de ${user.username}`,
            profileUser: user,
            posts: posts || [],
            followersCount: followersCount || 0,
            followingCount: followingCount || 0,
            isFollowing: isFollowing,
            isOwnProfile: req.session.userId == userId
        });
    } catch (error) {
        console.error('❌ Error en profile:', error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.follow = async (req, res) => {
    console.log('📌 FOLLOW - ID a seguir:', req.params.id);
    try {
        const userIdToFollow = req.params.id;
        const user = await User.findById(req.session.userId);
        await user.follow(userIdToFollow);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error en follow:', error);
        res.status(400).json({ error: error.message || 'Error al seguir usuario' });
    }
};

exports.unfollow = async (req, res) => {
    console.log('📌 UNFOLLOW - ID a dejar de seguir:', req.params.id);
    try {
        const userIdToUnfollow = req.params.id;
        const user = await User.findById(req.session.userId);
        const result = await user.unfollow(userIdToUnfollow);
        res.json({ success: result });
    } catch (error) {
        console.error('❌ Error en unfollow:', error);
        res.status(500).json({ error: 'Error al dejar de seguir' });
    }
};

exports.notifications = async (req, res) => {
    console.log('📌 NOTIFICATIONS - Usuario:', req.session.userId);
    try {
        const notifications = await Notification.findByUser(req.session.userId);
        const unreadCount = notifications.filter(n => !n.is_read).length;
        
        res.render('users/notifications', {
            title: 'Notificaciones',
            notifications: notifications || [],
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('❌ Error en notifications:', error);
        res.render('users/notifications', {
            title: 'Notificaciones',
            notifications: [],
            unreadCount: 0
        });
    }
};

exports.markNotificationRead = async (req, res) => {
    console.log('📌 MARK NOTIFICATION READ - ID:', req.params.id);
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification || notification.user_id !== req.session.userId) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        await notification.markAsRead();
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error en markNotificationRead:', error);
        res.status(500).json({ error: 'Error al marcar como leída' });
    }
};

exports.markAllRead = async (req, res) => {
    console.log('📌 MARK ALL READ - Usuario:', req.session.userId);
    try {
        await Notification.markAllAsRead(req.session.userId);
        res.redirect('/users/notifications');
    } catch (error) {
        console.error('❌ Error en markAllRead:', error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.feed = async (req, res) => {
    console.log('📌 FEED - Usuario:', req.session.userId);
    try {
        const followingIds = await Follow.getFollowingIds(req.session.userId);
        console.log('   IDs seguidos:', followingIds);
        
        let posts = [];
        if (followingIds && followingIds.length > 0) {
            posts = await Post.findByUsers(followingIds);
            console.log('   Publicaciones encontradas:', posts.length);
        } else {
            console.log('   No sigue a nadie');
        }
        
        res.render('users/feed', {
            title: 'Publicaciones de usuarios que sigo',
            posts: posts || []
        });
    } catch (error) {
        console.error('❌ Error en feed:', error);
        res.render('users/feed', {
            title: 'Publicaciones de usuarios que sigo',
            posts: []
        });
    }
};

exports.collections = async (req, res) => {
    console.log('📌 COLLECTIONS - Usuario:', req.session.userId);
    try {
        const collections = await Collection.findByUser(req.session.userId);
        console.log('   Colecciones encontradas:', collections.length);
        
        res.render('users/collections', {
            title: 'Mis colecciones',
            collections: collections || []
        });
    } catch (error) {
        console.error('❌ Error en collections:', error);
        res.render('users/collections', {
            title: 'Mis colecciones',
            collections: []
        });
    }
};

exports.createCollection = async (req, res) => {
    console.log('📌 CREATE COLLECTION - Nombre:', req.body.name);
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'El nombre de la colección es requerido' });
        }
        await Collection.create(req.session.userId, name.trim());
        res.redirect('/users/collections');
    } catch (error) {
        console.error('❌ Error en createCollection:', error);
        res.status(500).json({ error: 'Error al crear colección' });
    }
};

exports.addToCollection = async (req, res) => {
    console.log('📌 ADD TO COLLECTION - Colección:', req.body.collectionId, 'Post:', req.body.postId);
    try {
        const { collectionId, postId } = req.body;
        const collection = await Collection.findById(collectionId);
        if (!collection || collection.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        await collection.addPost(postId);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error en addToCollection:', error);
        res.status(400).json({ error: error.message || 'Error al agregar a colección' });
    }
};

exports.removeFromCollection = async (req, res) => {
    console.log('📌 REMOVE FROM COLLECTION - Colección:', req.params.collectionId, 'Post:', req.params.postId);
    try {
        const collection = await Collection.findById(req.params.collectionId);
        if (!collection || collection.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        await collection.removePost(req.params.postId);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error en removeFromCollection:', error);
        res.status(500).json({ error: 'Error al eliminar de colección' });
    }
};

exports.messages = async (req, res) => {
    console.log('📌 MESSAGES - Usuario:', req.session.userId);
    try {
        const conversations = await Message.findByUser(req.session.userId);
        const unreadCount = await Message.getUnreadCount(req.session.userId);
        console.log('   Conversaciones:', conversations.length, 'No leídos:', unreadCount);
        
        res.render('users/messages', {
            title: 'Mensajes',
            conversations: conversations || [],
            unreadCount: unreadCount || 0
        });
    } catch (error) {
        console.error('❌ Error en messages:', error);
        res.render('users/messages', {
            title: 'Mensajes',
            conversations: [],
            unreadCount: 0
        });
    }
};

exports.sendMessage = async (req, res) => {
    console.log('📌 SEND MESSAGE - Para:', req.body.receiverId);
    try {
        const { receiverId, subject, content } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        await Message.create(req.session.userId, receiverId, subject || 'Sin asunto', content.trim());
        res.redirect('/users/messages');
    } catch (error) {
        console.error('❌ Error en sendMessage:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
};

exports.markMessageRead = async (req, res) => {
    console.log('📌 MARK MESSAGE READ - ID:', req.params.id);
    try {
        const message = await Message.findById(req.params.id);
        if (!message || message.receiver_id !== req.session.userId) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }
        await message.markAsRead();
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error en markMessageRead:', error);
        res.status(500).json({ error: 'Error al marcar como leído' });
    }
};

exports.conversation = async (req, res) => {
    console.log('📌 CONVERSATION - Con usuario:', req.params.userId);
    try {
        const otherUser = await User.findById(req.params.userId);
        if (!otherUser) {
            return res.status(404).render('404', { title: 'Usuario no encontrado' });
        }
        
        const messages = await Message.findConversation(req.session.userId, req.params.userId, 100);
        console.log('   Mensajes encontrados:', messages.length);
        
        if (messages && messages.length > 0) {
            for (const message of messages) {
                if (message.receiver_id === req.session.userId && !message.is_read) {
                    await message.markAsRead();
                }
            }
        }
        
        res.render('users/conversation', {
            title: `Conversación con ${otherUser.username}`,
            otherUser: otherUser,
            messages: messages || []
        });
    } catch (error) {
        console.error('❌ Error en conversation:', error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};