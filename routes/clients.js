const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getAllClients,
    getClient,
    createClient,
    updateClient,
    deleteClient
} = require('../controller/clientController');

router.use(authenticateToken);

router.get('/', getAllClients);

router.get('/:id', getClient);

router.post('/', createClient);

router.put('/:id', updateClient);

router.delete('/:id', deleteClient);

module.exports = router; 