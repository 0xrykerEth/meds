const express = require('express');
const router = express.Router();
const path = require('path');

// Home route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'home.html'));
});

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

router.get('/clients', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/clients.html'));
});

router.get('/invoices', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/invoices.html'));
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/signup.html'));
});

module.exports = router; 