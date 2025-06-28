const { Client } = require('../models');

const getAllClients = async (req, res) => {
    try {
        const clients = await Client.findAll({
            where: { user_id: req.user.userId, is_active: true },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: { clients }
        });

    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get clients',
            error: error.message
        });
    }
};

const getClient = async (req, res) => {
    try {
        const { id } = req.params;
        
        const client = await Client.findOne({
            where: { id, user_id: req.user.userId, is_active: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            data: { client }
        });

    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get client',
            error: error.message
        });
    }
};

const createClient = async (req, res) => {
    try {
        const { name, email, phone, address, company, tax_id, notes } = req.body;

        const client = await Client.create({
            user_id: req.user.userId,
            name,
            email,
            phone,
            address,
            company,
            tax_id,
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            data: { client }
        });

    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create client',
            error: error.message
        });
    }
};

const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, company, tax_id, notes } = req.body;

        const client = await Client.findOne({
            where: { id, user_id: req.user.userId, is_active: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        await client.update({
            name: name || client.name,
            email: email || client.email,
            phone: phone || client.phone,
            address: address || client.address,
            company: company || client.company,
            tax_id: tax_id || client.tax_id,
            notes: notes || client.notes
        });

        res.json({
            success: true,
            message: 'Client updated successfully',
            data: { client }
        });

    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update client',
            error: error.message
        });
    }
};

const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await Client.findOne({
            where: { id, user_id: req.user.userId, is_active: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        await client.update({ is_active: false });

        res.json({
            success: true,
            message: 'Client deleted successfully'
        });

    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete client',
            error: error.message
        });
    }
};

module.exports = {
    getAllClients,
    getClient,
    createClient,
    updateClient,
    deleteClient
}; 
