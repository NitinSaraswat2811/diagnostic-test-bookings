CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagnostic_centres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagnostic_tests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE centre_tests (
    centre_id INTEGER NOT NULL REFERENCES diagnostic_centres(id) ON DELETE CASCADE,
    test_id INTEGER NOT NULL REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (centre_id, test_id)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    test_id INTEGER NOT NULL REFERENCES diagnostic_tests(id),
    centre_id INTEGER NOT NULL REFERENCES diagnostic_centres(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('SUCCESS', 'FAILED')),
    transaction_id VARCHAR(100) UNIQUE,
    webhook_event_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);