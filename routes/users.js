const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isActive } = require('../middlewares/authMiddleware');

router.get('/feed', isAuthenticated, isActive, userController.feed);
router.get('/notifications', isAuthenticated, isActive, userController.notifications);
router.post('/notifications/mark-all', isAuthenticated, isActive, userController.markAllRead);
router.post('/notifications/:id/read', isAuthenticated, isActive, userController.markNotificationRead);
router.get('/collections', isAuthenticated, isActive, userController.collections);
router.post('/collections', isAuthenticated, isActive, userController.createCollection);
router.post('/collections/add', isAuthenticated, isActive, userController.addToCollection);
router.delete('/collections/:collectionId/posts/:postId', isAuthenticated, isActive, userController.removeFromCollection);
router.get('/messages', isAuthenticated, isActive, userController.messages);
router.post('/messages', isAuthenticated, isActive, userController.sendMessage);
router.post('/messages/:id/read', isAuthenticated, isActive, userController.markMessageRead);
router.get('/messages/:userId', isAuthenticated, isActive, userController.conversation);


router.post('/:id/follow', isAuthenticated, isActive, userController.follow);
router.post('/:id/unfollow', isAuthenticated, isActive, userController.unfollow);


router.get('/:id', userController.profile);

module.exports = router;