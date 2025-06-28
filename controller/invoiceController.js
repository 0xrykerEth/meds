const { Invoice, InvoiceItem, Client, User } = require('../models');
const { Op } = require('sequelize');
const pdfService = require('../services/pdfService');

const generateInvoiceNumber = async (userId) => {
    const count = await Invoice.count({ where: { user_id: userId } });
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};


const getAllInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = { user_id: req.user.userId };
        
        if (status) {
            whereClause.status = status;
        }

        if (search) {
            whereClause[Op.or] = [
                { invoice_number: { [Op.like]: `%${search}%` } },
                { '$client.name$': { [Op.like]: `%${search}%` } }
            ];
        }

        const invoices = await Invoice.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Client,
                    as: 'client',
                    attributes: ['id', 'name', 'email', 'company']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: {
                invoices: invoices.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(invoices.count / limit),
                    total_items: invoices.count,
                    items_per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoices',
            error: error.message
        });
    }
};

const getInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId },
            include: [
                {
                    model: Client,
                    as: 'client',
                    attributes: ['id', 'name', 'email', 'phone', 'address', 'company', 'tax_id']
                },
                {
                    model: InvoiceItem,
                    as: 'items',
                    order: [['created_at', 'ASC']]
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            data: { invoice }
        });

    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoice',
            error: error.message
        });
    }
};

const createInvoice = async (req, res) => {
    try {
        const {
            client_id,
            issue_date,
            due_date,
            tax_rate = 0,
            discount_rate = 0,
            notes,
            terms_conditions,
            payment_terms,
            items
        } = req.body;

        const client = await Client.findOne({
            where: { id: client_id, user_id: req.user.userId, is_active: true }
        });

        if (!client) {
            return res.status(400).json({
                success: false,
                message: 'Invalid client'
            });
        }

        const invoice_number = await generateInvoiceNumber(req.user.userId);

        let subtotal = 0;
        let total_tax = 0;
        let total_discount = 0;

        if (items && items.length > 0) {
            items.forEach(item => {
                const itemTotal = item.quantity * item.unit_price;
                subtotal += itemTotal;
            });
        }

        total_tax = (subtotal * tax_rate) / 100;
        total_discount = (subtotal * discount_rate) / 100;
        const total_amount = subtotal + total_tax - total_discount;

        const invoice = await Invoice.create({
            user_id: req.user.userId,
            client_id,
            invoice_number,
            issue_date,
            due_date,
            tax_rate,
            tax_amount: total_tax,
            discount_rate,
            discount_amount: total_discount,
            subtotal,
            total_amount,
            notes,
            terms_conditions,
            payment_terms
        });

        if (items && items.length > 0) {
            for (const item of items) {
                await InvoiceItem.create({
                    invoice_id: invoice.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate || 0,
                    discount_rate: item.discount_rate || 0,
                    notes: item.notes
                });
            }
        }

        const completeInvoice = await Invoice.findOne({
            where: { id: invoice.id },
            include: [
                {
                    model: Client,
                    as: 'client'
                },
                {
                    model: InvoiceItem,
                    as: 'items'
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: { invoice: completeInvoice }
        });

    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create invoice',
            error: error.message
        });
    }
};

const updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            client_id,
            issue_date,
            due_date,
            tax_rate,
            discount_rate,
            notes,
            terms_conditions,
            payment_terms,
            items
        } = req.body;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        await invoice.update({
            client_id: client_id || invoice.client_id,
            issue_date: issue_date || invoice.issue_date,
            due_date: due_date || invoice.due_date,
            tax_rate: tax_rate !== undefined ? tax_rate : invoice.tax_rate,
            discount_rate: discount_rate !== undefined ? discount_rate : invoice.discount_rate,
            notes: notes || invoice.notes,
            terms_conditions: terms_conditions || invoice.terms_conditions,
            payment_terms: payment_terms || invoice.payment_terms
        });

        if (items && items.length > 0) {
            await InvoiceItem.destroy({ where: { invoice_id: id } });

            for (const item of items) {
                await InvoiceItem.create({
                    invoice_id: id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate || 0,
                    discount_rate: item.discount_rate || 0,
                    notes: item.notes
                });
            }
        }

        const updatedItems = await InvoiceItem.findAll({ where: { invoice_id: id } });
        let subtotal = 0;
        updatedItems.forEach(item => {
            subtotal += item.amount;
        });

        const total_tax = (subtotal * invoice.tax_rate) / 100;
        const total_discount = (subtotal * invoice.discount_rate) / 100;
        const total_amount = subtotal + total_tax - total_discount;

        await invoice.update({
            subtotal,
            tax_amount: total_tax,
            discount_amount: total_discount,
            total_amount
        });

        const updatedInvoice = await Invoice.findOne({
            where: { id },
            include: [
                {
                    model: Client,
                    as: 'client'
                },
                {
                    model: InvoiceItem,
                    as: 'items'
                }
            ]
        });

        res.json({
            success: true,
            message: 'Invoice updated successfully',
            data: { invoice: updatedInvoice }
        });

    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice',
            error: error.message
        });
    }
};

const generatePDF = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId },
            include: [
                {
                    model: Client,
                    as: 'client'
                },
                {
                    model: InvoiceItem,
                    as: 'items'
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const user = await User.findByPk(req.user.userId);

        const pdfData = await pdfService.generateAndSavePDF(invoice, user, invoice.client);

        await invoice.update({
            pdf_url: pdfData.pdf_url,
            pdf_filename: pdfData.pdf_filename,
            pdf_public_id: pdfData.pdf_public_id
        });

        if (pdfData.error) {
            return res.json({
                success: true,
                message: 'PDF generated and saved locally. Cloudinary upload failed.',
                warning: pdfData.error,
                data: {
                    pdf_url: pdfData.pdf_url,
                    view_url: `/api/invoices/${id}/view-pdf`
                }
            });
        }

        res.json({
            success: true,
            message: 'PDF generated and saved successfully',
            data: {
                pdf_url: pdfData.pdf_url,
                view_url: `/api/invoices/${id}/view-pdf`
            }
        });

    } catch (error) {
        console.error('Generate PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: error.message
        });
    }
};

const viewPDF = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        console.log('Invoice PDF data:', {
            id: invoice.id,
            pdf_url: invoice.pdf_url,
            pdf_filename: invoice.pdf_filename,
            has_cloudinary_url: invoice.pdf_url && invoice.pdf_url.includes('cloudinary'),
            pdf_url_length: invoice.pdf_url ? invoice.pdf_url.length : 0
        });

        if (invoice.pdf_url && invoice.pdf_url.includes('cloudinary')) {
            console.log('Redirecting to Cloudinary URL:', invoice.pdf_url);
            return res.redirect(invoice.pdf_url);
        } else if (invoice.pdf_url && invoice.pdf_url.startsWith('http')) {
            console.log('Redirecting to external URL:', invoice.pdf_url);
            return res.redirect(invoice.pdf_url);
        } else if (invoice.pdf_filename) {
            const fileExists = await pdfService.pdfExists(invoice.pdf_filename);
            
            if (!fileExists) {
                return res.status(404).json({
                    success: false,
                    message: 'PDF file not found on server',
                    data: {
                        invoice_id: invoice.id,
                        pdf_filename: invoice.pdf_filename,
                        suggestion: 'Try generating the PDF again'
                    }
                });
            }

            const filePath = pdfService.getPDFFilePath(invoice.pdf_filename);
            console.log('Serving local PDF file:', filePath);
            res.sendFile(filePath);
        } else {
            return res.status(404).json({
                success: false,
                message: 'PDF not found. Please generate PDF first.',
                data: {
                    invoice_id: invoice.id,
                    has_pdf_url: !!invoice.pdf_url,
                    has_pdf_filename: !!invoice.pdf_filename,
                    pdf_url: invoice.pdf_url,
                    pdf_filename: invoice.pdf_filename
                }
            });
        }

    } catch (error) {
        console.error('View PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to view PDF',
            error: error.message
        });
    }
};

const servePDFDirect = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        if (invoice.pdf_filename) {
            const fileExists = await pdfService.pdfExists(invoice.pdf_filename);
            
            if (fileExists) {
                const filePath = pdfService.getPDFFilePath(invoice.pdf_filename);
                console.log('Serving PDF directly from local file:', filePath);
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
                
                return res.sendFile(filePath);
            }
        }

        return res.status(404).json({
            success: false,
            message: 'PDF not found locally. Please generate PDF first.'
        });

    } catch (error) {
        console.error('Serve PDF direct error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to serve PDF',
            error: error.message
        });
    }
};

const updateInvoiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        await invoice.update({ 
            status,
            paid_date: status === 'paid' ? new Date() : null
        });

        res.json({
            success: true,
            message: 'Invoice status updated successfully',
            data: { invoice }
        });

    } catch (error) {
        console.error('Update invoice status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice status',
            error: error.message
        });
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        await InvoiceItem.destroy({ where: { invoice_id: id } });

        await invoice.destroy();

        res.json({
            success: true,
            message: 'Invoice deleted successfully'
        });

    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invoice',
            error: error.message
        });
    }
};

const checkPDFStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const hasPDF = !!(invoice.pdf_url || invoice.pdf_filename);
        const isCloudinary = invoice.pdf_url && invoice.pdf_url.includes('cloudinary');

        res.json({
            success: true,
            data: {
                invoice_id: invoice.id,
                has_pdf: hasPDF,
                is_cloudinary: isCloudinary,
                pdf_url: invoice.pdf_url,
                pdf_filename: invoice.pdf_filename,
                generate_url: `/api/invoices/${id}/generate-pdf`,
                view_url: `/api/invoices/${id}/view-pdf`
            }
        });

    } catch (error) {
        console.error('Check PDF status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check PDF status',
            error: error.message
        });
    }
};

const debugInvoicePDF = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        let localFileExists = false;
        if (invoice.pdf_filename) {
            localFileExists = await pdfService.pdfExists(invoice.pdf_filename);
        }

        res.json({
            success: true,
            data: {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                pdf_url: invoice.pdf_url,
                pdf_filename: invoice.pdf_filename,
                pdf_public_id: invoice.pdf_public_id,
                has_cloudinary_url: invoice.pdf_url && invoice.pdf_url.includes('cloudinary'),
                local_file_exists: localFileExists,
                pdf_url_length: invoice.pdf_url ? invoice.pdf_url.length : 0,
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
            }
        });

    } catch (error) {
        console.error('Debug invoice PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to debug invoice PDF',
            error: error.message
        });
    }
};

const testPDFGeneration = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await Invoice.findOne({
            where: { id, user_id: req.user.userId },
            include: [
                {
                    model: Client,
                    as: 'client'
                },
                {
                    model: InvoiceItem,
                    as: 'items'
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const user = await User.findByPk(req.user.userId);

        console.log('Testing PDF generation for invoice:', invoice.invoice_number);

        const html = await pdfService.createInvoiceHTML(invoice, user, invoice.client);
        console.log('HTML generated, length:', html.length);

        const pdfBuffer = await pdfService.generatePDF(html);
        console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

        const fileInfo = await pdfService.savePDFLocally(pdfBuffer, invoice.invoice_number);
        console.log('PDF saved locally:', fileInfo.fileName);

        const cloudinaryResult = await pdfService.uploadToCloudinary(pdfBuffer, invoice.invoice_number);
        console.log('Cloudinary upload result:', cloudinaryResult);

        await invoice.update({
            pdf_url: cloudinaryResult.secure_url,
            pdf_filename: fileInfo.fileName,
            pdf_public_id: cloudinaryResult.public_id
        });

        res.json({
            success: true,
            message: 'PDF generation and upload test completed successfully',
            data: {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                html_length: html.length,
                pdf_size: pdfBuffer.length,
                local_file: fileInfo.fileName,
                cloudinary_url: cloudinaryResult.secure_url,
                cloudinary_public_id: cloudinaryResult.public_id,
                test_url: cloudinaryResult.secure_url
            }
        });

    } catch (error) {
        console.error('Test PDF generation error:', error);
        res.status(500).json({
            success: false,
            message: 'PDF generation test failed',
            error: error.message,
            stack: error.stack
        });
    }
};

module.exports = {
    getAllInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    generatePDF,
    viewPDF,
    servePDFDirect,
    updateInvoiceStatus,
    deleteInvoice,
    checkPDFStatus,
    debugInvoicePDF,
    testPDFGeneration
}; 
