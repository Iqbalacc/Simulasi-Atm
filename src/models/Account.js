// src/models/Account.js
const { pool } = require('../utils/database');

class Account {
    static async create(name, pin, initialBalance = 0) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO accounts (name, pin, balance) VALUES (?, ?, ?)', [name, pin, initialBalance]
            );
            return { id: result.insertId, name, pin, balance: initialBalance };
        } catch (error) {
            console.error('Error creating account:', error.message);
            throw error;
        }
    }

    static async findByPin(pin) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM accounts WHERE pin = ?', [pin]
            );
            return rows[0] || null; // Mengembalikan akun pertama atau null jika tidak ditemukan
        } catch (error) {
            console.error('Error finding account by PIN:', error.message);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM accounts WHERE id = ?', [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding account by ID:', error.message);
            throw error;
        }
    }

    static async updateBalance(accountId, newBalance) {
        try {
            await pool.execute(
                'UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]
            );
            return true;
        } catch (error) {
            console.error('Error updating balance:', error.message);
            throw error;
        }
    }
}

module.exports = Account;