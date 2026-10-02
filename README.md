# Diagnostic Test Booking API

Backend system for diagnostic test booking, authentication, simulated payments, and idempotent payment webhooks.

## Tech Stack

* Node.js
* Express.js
* PostgreSQL
* JWT
* bcrypt
* Jest
* Supertest

## Features

* User registration and login
* JWT-based authentication
* Password hashing with bcrypt
* Diagnostic centre management
* Diagnostic test management
* Centre-test mapping with test-specific pricing
* Authenticated test bookings
* Booking status management
* Simulated payment processing
* Payment webhook handling
* Idempotent webhook processing
* Booking cancellation
* API and edge-case tests

## Project Structure

```text
EveHealthCare_Assignment/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── centreController.js
│   │   ├── paymentController.js
│   │   └── testController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   └── schema.sql
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── centreRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── testRoutes.js
│   ├── app.js
│   └── server.js
├── tests/
│   └── api.test.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Database Design

The application uses PostgreSQL.

### Users

Stores registered users.

Main fields:

* `id`
* `name`
* `email`
* `password`
* `created_at`

Passwords are stored as bcrypt hashes rather than plaintext.

### Diagnostic Centres

Stores diagnostic centre information.

Main fields:

* `id`
* `name`
* `location`
* `created_at`

### Diagnostic Tests

Stores available diagnostic tests.

Main fields:

* `id`
* `name`
* `description`
* `created_at`

### Centre Tests

A many-to-many relationship between diagnostic centres and tests.

The table also stores the price of a test at a particular centre.

```text
diagnostic_centres
        |
        | 1 : many
        ↓
centre_tests
        ↑
        | many : 1
        |
diagnostic_tests
```

The combination of `centre_id` and `test_id` is unique.

### Bookings

Stores test booking information.

Important fields:

* `user_id`
* `test_id`
* `centre_id`
* `appointment_date`
* `appointment_time`
* `amount`
* `status`

Booking statuses:

```text
PENDING
CONFIRMED
FAILED
CANCELLED
```

The booking amount is obtained from the centre-test mapping rather than trusting an amount supplied by the client.

### Payments

Stores payment results associated with bookings.

Important fields:

* `booking_id`
* `amount`
* `status`
* `transaction_id`
* `webhook_event_id`

Payment statuses:

```text
SUCCESS
FAILED
```

`webhook_event_id` is unique and is used for webhook idempotency.

## Authentication Flow

### Register

```http
POST /api/auth/register
```

Example:

```json
{
  "name": "Nitin",
  "email": "nitin@example.com",
  "password": "password123"
}
```

The password is hashed using bcrypt before being stored.

A JWT is returned after successful registration.

### Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "nitin@example.com",
  "password": "password123"
}
```

The server verifies the password using bcrypt and returns a JWT.

Protected endpoints require:

```http
Authorization: Bearer <token>
```

## API Endpoints

### Authentication

| Method | Endpoint             | Auth |
| ------ | -------------------- | ---- |
| POST   | `/api/auth/register` | No   |
| POST   | `/api/auth/login`    | No   |

### Diagnostic Centres

| Method | Endpoint                       | Auth |
| ------ | ------------------------------ | ---- |
| POST   | `/api/centres`                 | Yes  |
| GET    | `/api/centres`                 | No   |
| GET    | `/api/centres/:id`             | No   |
| GET    | `/api/centres/:id/tests`       | No   |
| POST   | `/api/centres/:centreId/tests` | Yes  |

### Diagnostic Tests

| Method | Endpoint         | Auth |
| ------ | ---------------- | ---- |
| POST   | `/api/tests`     | Yes  |
| GET    | `/api/tests`     | No   |
| GET    | `/api/tests/:id` | No   |

### Bookings

| Method | Endpoint                   | Auth |
| ------ | -------------------------- | ---- |
| POST   | `/api/bookings`            | Yes  |
| GET    | `/api/bookings`            | Yes  |
| GET    | `/api/bookings/:id`        | Yes  |
| PATCH  | `/api/bookings/:id/cancel` | Yes  |

### Payments

| Method | Endpoint                | Auth |
| ------ | ----------------------- | ---- |
| POST   | `/api/payments`         | Yes  |
| POST   | `/api/payments/webhook` | No   |

## Booking Flow

A booking is created only when the selected test is available at the selected diagnostic centre.

The price is fetched from the database:

```text
Centre + Test
     ↓
centre_tests
     ↓
price
     ↓
Booking amount
```

A new booking starts with:

```text
PENDING
```

After a successful simulated payment:

```text
PENDING → CONFIRMED
```

A failed simulated payment results in:

```text
PENDING → FAILED
```

A user can also cancel a booking.

## Simulated Payment

The assignment requires a simulated payment flow rather than a real payment gateway.

Example:

```http
POST /api/payments
Authorization: Bearer <token>
```

```json
{
  "bookingId": 1,
  "result": "SUCCESS"
}
```

The backend does not accept the payment amount from the client. It retrieves the booking amount from the database and stores that amount in the payment record.

This simulated endpoint does not deduct real money.

## Payment Webhook

The webhook represents a notification that would normally be sent by an external payment provider after processing a payment.

Example:

```http
POST /api/payments/webhook
```

```json
{
  "eventId": "evt_test_001",
  "bookingId": 2,
  "status": "SUCCESS",
  "transactionId": "txn_test_001"
}
```

The webhook processing:

1. Validates the request.
2. Checks whether the webhook event was already processed.
3. Locks the related booking during payment processing.
4. Creates the payment record.
5. Updates the booking status.
6. Commits both operations in a database transaction.

### Idempotency

Payment webhooks can be delivered more than once.

For example:

```text
evt_test_001
evt_test_001
evt_test_001
```

The `webhook_event_id` column has a unique constraint.

Therefore, after the first successful processing, repeated requests with the same event ID are treated as already processed and do not create duplicate payment records.

The database transaction and booking row lock also help prevent inconsistent concurrent updates.

## Error and Edge-Case Handling

The implementation handles cases including:

* Missing authentication token
* Invalid JWT
* Invalid registration/login data
* Duplicate user registration
* Invalid appointment date
* Invalid appointment time
* Test unavailable at selected centre
* Nonexistent booking
* Unauthorized access to another user's booking
* Already cancelled booking
* Invalid payment result
* Payment for an already processed booking
* Invalid webhook status
* Nonexistent booking in webhook
* Repeated webhook event
* Duplicate webhook event arriving concurrently

## Running the Project

### 1. Install dependencies

```bash
npm install
```

### 2. Create PostgreSQL database

Create a PostgreSQL database named:

```text
eve_healthcare
```

### 3. Configure environment variables

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=eve_healthcare

JWT_SECRET=your_super_secret_key
```

Do not commit the `.env` file.

### 4. Create database tables

Run the SQL file:

```text
src/models/schema.sql
```

For PostgreSQL CLI:

```sql
\i 'path/to/src/models/schema.sql'
```

### 5. Start the development server

```bash
npm run dev
```

The API runs on:

```text
http://localhost:5000
```

## Running Tests

Run:

```bash
npm test
```

The tests cover authentication requirements, booking creation, invalid booking data, simulated payments, and payment edge cases.

## Testing the Webhook

A webhook can be tested manually using Postman.

First create a fresh pending booking.

Then send:

```json
{
  "eventId": "evt_test_001",
  "bookingId": 2,
  "status": "SUCCESS",
  "transactionId": "txn_test_001"
}
```

Sending the exact same event again should return an already-processed response rather than creating another payment record.

## Design Decisions

### Why PostgreSQL?

PostgreSQL provides relational constraints, foreign keys, unique constraints, transactions, and row-level locking, which are useful for bookings and payment state management.

### Why database transactions for payments?

Payment creation and booking status updates represent one logical operation. They should either both succeed or both fail.

Therefore the payment processing logic uses a PostgreSQL transaction.

### Why use the database amount instead of the request amount?

The client should not be trusted to determine the amount payable for a booking.

The backend retrieves the amount associated with the selected centre and test and stores that value with the booking.

### Why is the webhook endpoint separate?

In a real payment integration, the payment provider's server sends the webhook notification independently of the user's browser.

Keeping the webhook as a separate endpoint models this provider-to-backend communication boundary.

## Assumptions

* Payment processing is simulated because no real payment gateway is integrated.
* The webhook endpoint represents a payment provider notification.
* Authentication is JWT based.
* Diagnostic centre and test management are authenticated operations.
* No real money is transferred by the application.
* Payment-provider webhook signature verification is outside the scope of this assignment.

## Future Improvements

Possible production improvements include:

* Integrating Razorpay or Stripe
* Verifying payment-provider webhook signatures
* Adding refresh tokens
* Adding role-based administration
* Adding pagination
* Adding rate limiting
* Adding structured logging
* Adding API documentation with OpenAPI/Swagger
* Adding Docker-based deployment
* Adding Redis for caching and distributed workloads
* Adding more comprehensive integration tests
* Adding payment retry handling

## Conclusion

The project demonstrates a backend workflow covering authentication, relational database design, diagnostic test discovery, booking management, simulated payments, database transactions, and idempotent webhook processing.
