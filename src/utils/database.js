// src/utils/database.js
require('dotenv').config(); // Memuat variabel dari .env
const mysql = require('mysql2/promise'); // Menggunakan promise API untuk async/await

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mesin_atm',
    port: process.env.DB_PORT || 3306, // Pastikan port juga disertakan
    waitForConnections: true,
    connectionLimit: 10, // Jumlah maksimum koneksi yang dapat dibuka di pool
    queueLimit: 0 // Jumlah permintaan yang di-queue saat connectionLimit tercapai
});

// Fungsi untuk menguji koneksi database saat aplikasi dimulai
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database!');
        connection.release(); // Lepaskan koneksi kembali ke pool
    } catch (error) {
        console.error('Failed to connect to the database:', error.message);
        console.error('Please check your .env file and MySQL server status.');
        process.exit(1); // Keluar dari aplikasi jika koneksi gagal
    }
}

// Mengekspor pool dan fungsi pengujian
module.exports = {
    pool,
    testConnection
};