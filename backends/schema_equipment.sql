CREATE DATABASE IF NOT EXISTS campus_central_db;
USE campus_central_db;

CREATE TABLE IF NOT EXISTS equipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    deposit_amount DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 1,
    available_quantity INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rental_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    equipment_id INT NOT NULL,
    borrow_date DATETIME NOT NULL,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    deposit_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Borrowed', 'Late', 'Returned') DEFAULT 'Borrowed',
    late_fee DECIMAL(10,2) DEFAULT 0.00,
    days_overdue INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rental_user
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_equipment
        FOREIGN KEY (equipment_id) REFERENCES equipments(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
