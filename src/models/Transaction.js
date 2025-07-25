// src/models/Transaction.js
const { pool } = require('../utils/database');

class Transaction {
    static async create(accountId, type, amount, targetId = null) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO transactions (account_id, type, amount, target_id) VALUES (?, ?, ?, ?)', [accountId, type, amount, targetId]
            );
            return { id: result.insertId, account_id: accountId, type, amount, target_id: targetId };
        } catch (error) {
            console.error('Error creating transaction:', error.message);
            throw error;
        }
    }

    static async getTransactionsByAccountId(accountId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM transactions WHERE account_id = ? ORDER BY created_at DESC', [accountId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching transactions:', error.message);
            throw error;
        }
    }
}

module.exports = Transaction;