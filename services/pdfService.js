const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');
const cloudinary = require('../config/cloudinary');

class PDFService {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/invoice-template.hbs');
        this.uploadsDir = path.join(__dirname, '../uploads/pdfs');
        this.ensureUploadsDirectory();
    }

    async ensureUploadsDirectory() {
        try {
            await fs.ensureDir(this.uploadsDir);
        } catch (error) {
            console.error('Error creating uploads directory:', error);
        }
    }

    async createInvoiceHTML(invoice, user, client) {
        const template = await fs.readFile(this.templatePath, 'utf-8');
        
        const compiledTemplate = handlebars.compile(template, {
            allowProtoPropertiesByDefault: true,
            allowProtoMethodsByDefault: true
        });
        
        const invoiceData = {
            ...invoice.toJSON(),
            issue_date: new Date(invoice.issue_date).toLocaleDateString(),
            due_date: new Date(invoice.due_date).toLocaleDateString(),
            subtotal: parseFloat(invoice.subtotal).toFixed(2),
            tax_amount: parseFloat(invoice.tax_amount).toFixed(2),
            discount_amount: parseFloat(invoice.discount_amount).toFixed(2),
            total_amount: parseFloat(invoice.total_amount).toFixed(2)
        };

        const userData = user.toJSON();
        const clientData = client.toJSON();
        
        const items = (invoice.items || []).map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price).toFixed(2),
            amount: parseFloat(item.amount).toFixed(2)
        }));

        const data = {
            invoice: invoiceData,
            user: userData,
            client: clientData,
            items: items,
            generated_date: new Date().toLocaleDateString()
        };

        return compiledTemplate(data);
    }

    async generatePDF(html) {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdf = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                },
                printBackground: true
            });

            if (!pdf || pdf.length === 0) {
                throw new Error('Generated PDF is empty');
            }

            console.log('PDF generated successfully, size:', pdf.length, 'bytes');
            
            const pdfHeader = pdf.toString('ascii', 0, 4);
            if (pdfHeader !== '%PDF') {
                throw new Error('Generated file is not a valid PDF');
            }

            return pdf;
        } finally {
            await browser.close();
        }
    }

    async savePDFLocally(pdfBuffer, invoiceNumber) {
        const fileName = `invoice-${invoiceNumber}-${Date.now()}.pdf`;
        const filePath = path.join(this.uploadsDir, fileName);
        
        await fs.writeFile(filePath, pdfBuffer);
        
        return {
            fileName: fileName,
            filePath: filePath,
            relativePath: `/uploads/pdfs/${fileName}`
        };
    }

    async uploadToCloudinary(pdfBuffer, invoiceNumber) {
        return new Promise((resolve, reject) => {
            console.log('Starting Cloudinary upload for invoice:', invoiceNumber);
            console.log('PDF buffer size:', pdfBuffer.length, 'bytes');
            
            if (!pdfBuffer || pdfBuffer.length === 0) {
                reject(new Error('PDF buffer is empty or invalid'));
                return;
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    format: 'pdf',
                    public_id: `invoices/${invoiceNumber}`,
                    folder: 'invoicegen',
                    overwrite: true, 
                    invalidate: true
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    } else {
                        const directUrl = result.secure_url.replace('/upload/', '/upload/fl_attachment/');
                        
                        console.log('Cloudinary upload successful:', {
                            secure_url: result.secure_url,
                            direct_url: directUrl,
                            public_id: result.public_id,
                            format: result.format,
                            resource_type: result.resource_type,
                            bytes: result.bytes
                        });
                        
                        resolve({
                            ...result,
                            secure_url: directUrl
                        });
                    }
                }
            );

            uploadStream.on('error', (error) => {
                console.error('Upload stream error:', error);
                reject(new Error(`Upload stream error: ${error.message}`));
            });

            uploadStream.end(pdfBuffer);
        });
    }

    async generateAndSavePDF(invoice, user, client) {
        try {
            console.log('Starting PDF generation for invoice:', invoice.invoice_number);
            
            const html = await this.createInvoiceHTML(invoice, user, client);
            console.log('HTML generated successfully');
            
            const pdfBuffer = await this.generatePDF(html);
            console.log('PDF buffer generated, size:', pdfBuffer.length);
            
            const fileInfo = await this.savePDFLocally(pdfBuffer, invoice.invoice_number);
            console.log('PDF saved locally:', fileInfo.fileName);
            
            console.log('Uploading to Cloudinary...');
            const cloudinaryResult = await this.uploadToCloudinary(pdfBuffer, invoice.invoice_number);
            console.log('Cloudinary upload successful:', cloudinaryResult.secure_url);
            
            return {
                pdf_url: cloudinaryResult.secure_url,
                pdf_filename: fileInfo.fileName,
                pdf_public_id: cloudinaryResult.public_id
            };
        } catch (error) {
            console.error('PDF generation error:', error);
            
            if (error.message.includes('Cloudinary') || error.message.includes('upload')) {
                console.log('Cloudinary upload failed, returning local file only');
                return {
                    pdf_url: null,
                    pdf_filename: `invoice-${invoice.invoice_number}-${Date.now()}.pdf`,
                    pdf_public_id: null,
                    error: 'Cloudinary upload failed, PDF saved locally only'
                };
            }
            
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    getPDFFilePath(fileName) {
        return path.join(this.uploadsDir, fileName);
    }

    async pdfExists(fileName) {
        const filePath = this.getPDFFilePath(fileName);
        return await fs.pathExists(filePath);
    }
}

module.exports = new PDFService(); 