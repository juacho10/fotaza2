const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { isAuthenticated, isActive } = require('../middlewares/authMiddleware');

router.use(isAuthenticated);
router.use(isActive);

router.get('/create', postController.showCreate);
router.post('/', postController.create);
router.get('/:id/edit', postController.edit);
router.put('/:id', postController.update);
router.delete('/:id', postController.delete);
router.post('/:id/comments', postController.addComment);
router.delete('/comments/:commentId', postController.deleteComment);
router.post('/:id/comments/toggle', postController.toggleComments);
router.post('/images/:imageId/rate', postController.rateImage);
router.post('/images/:imageId/interest', postController.markInterest);
router.post('/:id/report', postController.reportPost);
router.post('/comments/:commentId/report', postController.reportComment);

router.get('/:id', postController.show);

module.exports = router;
