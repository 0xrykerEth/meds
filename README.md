# InvoiceGen - Professional Invoice Generator

A complete invoice generation system built with Node.js, Express, Sequelize ORM, MySQL, and JWT authentication.

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 👥 **Client Management** - Store and manage client information
- 📄 **Invoice Generation** - Create professional invoices with line items
- 💰 **Payment Tracking** - Track invoice status (draft, sent, paid, overdue)
- 🎨 **Professional Templates** - Clean and professional invoice design
- 📊 **Dashboard** - Overview of invoices and clients
- 🔒 **User Isolation** - Each user can only access their own data

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Frontend**: HTML, CSS, JavaScript

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd invoicegen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=invoicegen
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Create MySQL database**
   ```sql
   CREATE DATABASE invoicegen;
   ```

5. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Register a new account or login with existing credentials

## Database Schema

### Users Table
- `id` - Primary key
- `name` - Full name
- `email` - Unique email address
- `password` - Hashed password
- `company_name` - Company name
- `phone` - Phone number
- `address` - Address
- `is_active` - Account status
- `created_at`, `updated_at` - Timestamps

### Clients Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `name` - Client name
- `email` - Client email
- `phone` - Client phone
- `address` - Client address
- `company` - Client company
- `tax_id` - Tax identification number
- `notes` - Additional notes
- `is_active` - Client status
- `created_at`, `updated_at` - Timestamps

### Invoices Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `client_id` - Foreign key to clients
- `invoice_number` - Unique invoice number
- `issue_date` - Invoice issue date
- `due_date` - Payment due date
- `status` - Invoice status (draft, sent, paid, overdue, cancelled)
- `subtotal` - Subtotal amount
- `tax_rate` - Tax rate percentage
- `tax_amount` - Tax amount
- `discount_rate` - Discount rate percentage
- `discount_amount` - Discount amount
- `total_amount` - Total amount
- `notes` - Invoice notes
- `terms_conditions` - Terms and conditions
- `payment_terms` - Payment terms
- `paid_date` - Date when paid
- `payment_method` - Payment method used
- `created_at`, `updated_at` - Timestamps

### Invoice Items Table
- `id` - Primary key
- `invoice_id` - Foreign key to invoices
- `description` - Item description
- `quantity` - Item quantity
- `unit_price` - Unit price
- `amount` - Line item amount
- `tax_rate` - Item tax rate
- `tax_amount` - Item tax amount
- `discount_rate` - Item discount rate
- `discount_amount` - Item discount amount
- `total_amount` - Item total amount
- `notes` - Item notes
- `created_at`, `updated_at` - Timestamps

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile (requires auth)
- `PUT /api/profile` - Update user profile (requires auth)
- `PUT /api/change-password` - Change password (requires auth)

### Clients
- `GET /api/clients` - Get all clients (requires auth)
- `GET /api/clients/:id` - Get single client (requires auth)
- `POST /api/clients` - Create new client (requires auth)
- `PUT /api/clients/:id` - Update client (requires auth)
- `DELETE /api/clients/:id` - Delete client (requires auth)

### Invoices
- `GET /api/invoices` - Get all invoices (requires auth)
- `GET /api/invoices/:id` - Get single invoice (requires auth)
- `POST /api/invoices` - Create new invoice (requires auth)
- `PUT /api/invoices/:id` - Update invoice (requires auth)
- `PATCH /api/invoices/:id/status` - Update invoice status (requires auth)
- `DELETE /api/invoices/:id` - Delete invoice (requires auth)

## Authentication

All API endpoints (except register and login) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Example API Usage

### Register a new user
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "company_name": "Acme Corp",
    "phone": "+1234567890",
    "address": "123 Main St, City, State"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create a client
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@client.com",
    "phone": "+1987654321",
    "address": "456 Client Ave, City, State",
    "company": "Client Corp"
  }'
```

### Create an invoice
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "client_id": 1,
    "issue_date": "2024-01-15",
    "due_date": "2024-02-15",
    "tax_rate": 10,
    "discount_rate": 5,
    "notes": "Thank you for your business",
    "items": [
      {
        "description": "Web Development Services",
        "quantity": 40,
        "unit_price": 75.00,
        "tax_rate": 10,
        "discount_rate": 0
      },
      {
        "description": "Domain Registration",
        "quantity": 1,
        "unit_price": 15.00,
        "tax_rate": 0,
        "discount_rate": 0
      }
    ]
  }'
```

## Project Structure

```
invoicegen/
├── config/
│   └── database.js          # Database configuration
├── controller/
│   ├── authController.js    # Authentication logic
│   ├── clientController.js  # Client management
│   └── invoiceController.js # Invoice management
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── models/
│   ├── User.js             # User model
│   ├── Client.js           # Client model
│   ├── Invoice.js          # Invoice model
│   ├── InvoiceItem.js      # Invoice item model
│   └── index.js            # Model associations
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── clients.js          # Client routes
│   └── invoices.js         # Invoice routes
├── views/
│   ├── home.html           # Landing page
│   ├── login.html          # Login page
│   └── signup.html         # Registration page
├── app.js                  # Main application file
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Security Features

- **Password Hashing**: All passwords are hashed using bcryptjs
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Using Sequelize ORM with parameterized queries
- **User Isolation**: Users can only access their own data
- **CORS Protection**: Cross-origin resource sharing protection

## Future Enhancements

- [ ] Email notifications for invoice status changes
- [ ] PDF invoice generation
- [ ] Invoice templates customization
- [ ] Payment gateway integration
- [ ] Dashboard with charts and analytics
- [ ] Multi-currency support
- [ ] Invoice reminders and follow-ups
- [ ] Bulk operations (import/export)
- [ ] Mobile responsive dashboard
- [ ] API rate limiting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository. 