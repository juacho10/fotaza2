const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isNotAuthenticated } = require('../middlewares/authMiddleware');

router.get('/login', isNotAuthenticated, authController.showLogin);
router.post('/login', authController.login);
router.get('/register', isNotAuthenticated, authController.showRegister);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

module.exports = router;
