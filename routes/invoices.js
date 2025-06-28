const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
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
} = require('../controller/invoiceController');

router.use(authenticateToken);

router.get('/', getAllInvoices);

router.post('/:id/test-pdf', testPDFGeneration);

router.get('/:id/debug-pdf', debugInvoicePDF);

router.get('/:id/pdf-status', checkPDFStatus);

router.post('/:id/generate-pdf', generatePDF);

router.get('/:id/view-pdf', viewPDF);

router.get('/:id/serve-pdf', servePDFDirect);

router.patch('/:id/status', updateInvoiceStatus);

router.get('/:id', getInvoice);

router.post('/', createInvoice);

router.put('/:id', updateInvoice);

router.delete('/:id', deleteInvoice);

module.exports = router; 