# E-commerce REST API

A backend API for an e-commerce system built with **TypeScript**, **Node.js**, **Express**, and **MySQL**.

The API includes product management, customer records, order handling, order items, authentication, and Stripe checkout session integration.

## Tech Stack

- TypeScript
- Node.js
- Express
- MySQL
- XAMPP / phpMyAdmin for local database management
- JWT authentication
- Stripe checkout integration
- Vercel deployment support

## Features

- REST API endpoints for products
- REST API endpoints for customers
- REST API endpoints for orders
- Order item update and delete routes
- User registration and login
- JWT-based authentication
- Stripe checkout session routes
- MySQL database connection using environment variables
- Local development with XAMPP and phpMyAdmin

## API Routes

### General

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API welcome route |
| GET | `/health` | Health check route |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | Get all products |
| GET | `/products/:id` | Get one product |
| POST | `/products` | Create a product |
| PATCH | `/products/:id` | Update a product |
| DELETE | `/products/:id` | Delete a product |

### Customers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/customers` | Get all customers |
| GET | `/customers/:id` | Get one customer |
| GET | `/customers/email/:email` | Get customer by email |
| POST | `/customers` | Create a customer |
| PATCH | `/customers/:id` | Update a customer |
| DELETE | `/customers/:id` | Delete a customer |

### Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders` | Get all orders |
| GET | `/orders/:id` | Get one order |
| GET | `/orders/payment/:id` | Get order by payment id |
| POST | `/orders` | Create an order |
| PATCH | `/orders/:id` | Update an order |
| DELETE | `/orders/:id` | Delete an order |

### Order Items

| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/order-items/:id` | Update an order item |
| DELETE | `/order-items/:id` | Delete an order item |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Log in a user |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/clear-token` | Clear auth token |

### Stripe

| Method | Endpoint | Description |
|---|---|---|
| POST | `/stripe/create-checkout-session-hosted` | Create hosted Stripe checkout session |
| POST | `/stripe/create-checkout-session-embedded` | Create embedded Stripe checkout session |
| POST | `/stripe/webhook` | Stripe webhook route |

## Local Setup

### 1. Clone the repository

```bash
git clone YOUR_REPO_URL
cd ecommerce-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start XAMPP

Open XAMPP and start:

- MySQL
- Apache, only if you want to use phpMyAdmin

phpMyAdmin should be available at:

```text
http://localhost/phpmyadmin
```

### 4. Create the database

In phpMyAdmin, create or use a database named:

```text
e-commerce
```

Make sure the required tables exist:

- users
- customers
- products
- orders
- order_items

### 5. Create a `.env` file

Create a `.env` file in the root of the project:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=e-commerce
DB_PORT=3306

STRIPE_SECRET_KEY=sk_test_dummy
ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

For local XAMPP, the MySQL user is usually `root` and the password is usually empty.

### 6. Run the project

```bash
npm run dev
```

The API should run at:

```text
http://localhost:3000
```

## Example Response

Request:

```http
GET /products
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Product name",
    "description": "Product description",
    "price": 199,
    "stock": 10
  }
]
```

## Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST` | Database host |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_PORT` | Database port |
| `STRIPE_SECRET_KEY` | Stripe secret key for checkout sessions |
| `ACCESS_TOKEN_SECRET` | Secret used for signing JWT tokens |

Do not commit the real `.env` file to GitHub.

Create a safe `.env.example` file instead.

## Deployment Notes

This project can be deployed as an Express API on Vercel, but the local XAMPP database will not work online because XAMPP only runs on your own computer.

For a live deployment, use a hosted MySQL-compatible database such as PlanetScale, Aiven, Railway, or another cloud database provider.

Then add the cloud database credentials to your Vercel Environment Variables.

## Portfolio Notes

This project is best presented as a backend/API project instead of a visual frontend app.

Good screenshots to include:

- The API welcome route
- `/products` returning JSON data
- A Postman or Thunder Client request
- phpMyAdmin showing the database tables
- VS Code project structure

## Future Improvements

- Add Swagger/OpenAPI documentation
- Add stronger validation for request bodies
- Add better error handling
- Add unit/integration tests
- Add role-based authentication
- Add pagination and filtering for products
- Add a hosted cloud database for live deployment
