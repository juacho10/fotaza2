const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdminOrValidator, isActive } = require('../middlewares/authMiddleware');

router.use(isAuthenticated);
router.use(isActive);
router.use(isAdminOrValidator);

router.get('/reports', adminController.pendingReports);
router.get('/reports/:id', adminController.reviewReport);
router.post('/reports/:id/approve', adminController.approveReport);
router.post('/reports/:id/dismiss', adminController.dismissReport);
router.get('/banned-users', adminController.bannedUsers);
router.post('/users/:id/reactivate', adminController.reactivateUser);
router.get('/stats', adminController.stats);

module.exports = router;
