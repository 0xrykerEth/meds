const sequelize = require('../config/database');

const User = require('./User');
const Client = require('./Client');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');

User.hasMany(Client, { foreignKey: 'user_id', as: 'clients' });
Client.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Invoice, { foreignKey: 'user_id', as: 'invoices' });
Invoice.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Client.hasMany(Invoice, { foreignKey: 'client_id', as: 'invoices' });
Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synchronized successfully');
    } catch (error) {
        console.error('Database sync failed:', error);
    }
};

module.exports = {
    User,
    Client,
    Invoice,
    InvoiceItem,
    sequelize,
    syncDatabase
}; 