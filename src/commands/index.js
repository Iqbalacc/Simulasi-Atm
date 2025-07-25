// src/commands/index.js
const { prompt } = require('inquirer');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { setSession, getSession, clearSession } = require('../utils/session');
const { pool } = require('../utils/database');

async function loginPrompt() {
    const answers = await prompt([ // PERBAIKAN: Panggil 'prompt' langsung
        { type: 'input', name: 'name', message: 'Enter your account name:' },
        { type: 'password', name: 'pin', message: 'Enter your PIN:', mask: '*' }
    ]);
    const account = await Account.findByPin(answers.pin);
    if (account && account.name.toLowerCase() === answers.name.toLowerCase()) {
        setSession(account);
        console.log('Login successful!');
        return true;
    } else {
        console.log('Invalid name or PIN. Please try again.');
        return false;
    }
}

async function registerAccount() {
    const answers = await prompt([ // PERBAIKAN: Panggil 'prompt' langsung
        { type: 'input', name: 'name', message: 'Enter your desired account name:', validate: (input) => input.trim() !== '' ? true : 'Account name cannot be empty.' },
        { type: 'password', name: 'pin', message: 'Create your 6-digit PIN:', mask: '*', validate: (input) => input.length === 6 && /^\d+$/.test(input) ? true : 'PIN must be exactly 6 digits.' },
        { type: 'input', name: 'initialBalance', message: 'Enter initial deposit amount (optional, default 0):', default: '0', validate: (input) => !isNaN(parseFloat(input)) && parseFloat(input) >= 0 ? true : 'Please enter a valid non-negative number.' }
    ]);
    const existingAccount = await Account.findByPin(answers.pin);
    if (existingAccount) {
        console.log('Error: An account with this PIN already exists. Please choose a different PIN.');
        return null;
    }
    try {
        const newAccount = await Account.create(answers.name, answers.pin, parseFloat(answers.initialBalance));
        console.log(`Account "${newAccount.name}" created successfully with ID: ${newAccount.id}`);
        return newAccount;
    } catch (error) {
        console.error('Error registering account:', error.message);
        return null;
    }
}

async function checkBalance() {
    console.log('DEBUG: Masuk ke fungsi checkBalance.'); // Debug 1
    const account = getSession();
    if (account) {
        console.log(`DEBUG: Sesi akun ditemukan: ${account.name} (ID: ${account.id})`); // Debug 2
        try {
            const updatedAccount = await Account.findById(account.id);
            if (updatedAccount) {
                console.log('DEBUG: Akun berhasil diambil dari DB.'); // Debug 3
                const currentBalance = parseFloat(updatedAccount.balance);
                console.log(`\n--- Account Balance ---`);
                console.log(`Account Name: ${updatedAccount.name}`);
                console.log(`Current Balance: Rp ${currentBalance.toFixed(3)}`);
                console.log(`-----------------------\n`);
                console.log('DEBUG: Selesai menampilkan saldo.'); // Debug 4
            } else {
                console.log('DEBUG: Akun tidak ditemukan di DB (setelah findById).'); // Debug 3a
                console.log('Could not fetch account details. Account might be deleted.');
            }
        } catch (error) {
            console.error('DEBUG: Error saat mengambil saldo:', error.message); // Debug Error
        }
    } else {
        console.log('DEBUG: Tidak ada sesi akun. Mohon login.'); // Debug 2a
        console.log('Please log in first.'); // Seharusnya tidak tercapai karena menu sudah terkontrol
    }
    console.log('DEBUG: Keluar dari fungsi checkBalance.'); // Debug 5
}

async function deposit() {
    const account = getSession();
    if (!account) { return; }
    const answers = await prompt([{ type: 'input', name: 'amount', message: 'Enter deposit amount:', validate: (input) => !isNaN(parseFloat(input)) && parseFloat(input) > 0 ? true : 'Please enter a valid positive amount.' }]);
    const amount = parseFloat(answers.amount);
    const updatedAccount = await Account.findById(account.id);
    const currentBalance = parseFloat(updatedAccount.balance);
    const newBalance = currentBalance + amount;
    try {
        await Account.updateBalance(account.id, newBalance);
        await Transaction.create(account.id, 'deposit', amount);
        setSession({...account, balance: newBalance });
        console.log(`Deposit successful! New balance: Rp ${newBalance.toFixed(3)}`);
    } catch (error) { console.error('Error during deposit:', error.message); }
}

async function withdraw() {
    const account = getSession();
    if (!account) { return; }
    const answers = await prompt([{ type: 'input', name: 'amount', message: 'Enter withdrawal amount:', validate: (input) => !isNaN(parseFloat(input)) && parseFloat(input) > 0 ? true : 'Please enter a valid positive amount.' }]);
    const amount = parseFloat(answers.amount);
    const updatedAccount = await Account.findById(account.id);
    const currentBalance = parseFloat(updatedAccount.balance);
    if (amount > currentBalance) { console.log('Insufficient funds!'); return; }
    const newBalance = currentBalance - amount;
    try {
        await Account.updateBalance(account.id, newBalance);
        await Transaction.create(account.id, 'withdraw', amount);
        setSession({...account, balance: newBalance });
        console.log(`Withdrawal successful! New balance: Rp ${newBalance.toFixed(3)}`);
    } catch (error) { console.error('Error during withdrawal:', error.message); }
}

async function transfer() {
    const account = getSession();
    if (!account) { return; }
    const answers = await prompt([{ type: 'input', name: 'targetPin', message: 'Enter recipient account PIN:' }, { type: 'input', name: 'amount', message: 'Enter transfer amount:', validate: (input) => !isNaN(parseFloat(input)) && parseFloat(input) > 0 ? true : 'Please enter a valid positive amount.' }]);
    const amount = parseFloat(answers.amount);
    const targetPin = answers.targetPin;
    const updatedSenderAccount = await Account.findById(account.id);
    const senderCurrentBalance = parseFloat(updatedSenderAccount.balance);
    if (amount > senderCurrentBalance) { console.log('Insufficient funds!'); return; }
    if (targetPin === updatedSenderAccount.pin) { console.log('Cannot transfer to your own account.'); return; }
    let targetAccount;
    try { targetAccount = await Account.findByPin(targetPin); } catch (error) { console.error('Error finding target account:', error.message); return; }
    if (!targetAccount) { console.log('Recipient account not found.'); return; }
    const targetCurrentBalance = parseFloat(targetAccount.balance);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const senderNewBalance = senderCurrentBalance - amount;
        await connection.execute('UPDATE accounts SET balance = ? WHERE id = ?', [senderNewBalance, account.id]);
        await Transaction.create(account.id, 'transfer_out', amount, targetAccount.id);
        const recipientNewBalance = targetCurrentBalance + amount;
        await connection.execute('UPDATE accounts SET balance = ? WHERE id = ?', [recipientNewBalance, targetAccount.id]);
        await Transaction.create(targetAccount.id, 'transfer_in', amount, account.id);
        await connection.commit();
        setSession({...account, balance: senderNewBalance });
        console.log(`Transfer successful! New balance: Rp ${senderNewBalance.toFixed(3)}`);
    } catch (error) {
        await connection.rollback();
        console.error('Error during transfer:', error.message);
    } finally { connection.release(); }
}

async function viewTransactions() {
    console.log('DEBUG: Masuk ke fungsi viewTransactions.'); // Debug 1
    const account = getSession();
    if (account) {
        console.log(`DEBUG: Sesi akun ditemukan: ${account.name} (ID: ${account.id})`); // Debug 2
        try {
            const transactions = await Transaction.getTransactionsByAccountId(account.id);
            console.log(`DEBUG: Transaksi berhasil diambil dari DB. Jumlah: ${transactions.length}`); // Debug 3
            console.log('\n--- Transaction History ---');
            if (transactions.length === 0) {
                console.log('No transactions found for this account.'); // Lebih jelas
            } else {
                transactions.forEach(t => {
                    console.log(`DEBUG: Memproses transaksi ID: ${t.id}`); // Debug 4
                    const type = t.type.padEnd(12);
                    const amount = `Rp ${parseFloat(t.amount).toFixed(3)}`;
                    const date = new Date(t.created_at).toLocaleString('en-GB');
                    let detail = '';
                    if (t.type === 'transfer_out' && t.target_id) {
                        detail = ` to Acc ID: ${t.target_id}`;
                    } else if (t.type === 'transfer_in' && t.target_id) {
                        detail = ` from Acc ID: ${t.target_id}`;
                    }
                    console.log(`${date} | Type: ${type} | Amount: ${amount}${detail}`);
                });
            }
            console.log('---------------------------\n');
            console.log('DEBUG: Selesai menampilkan riwayat transaksi.');
        } catch (error) {
            console.error('DEBUG: Error saat mengambil transaksi:', error.message); // Debug Error
        }
    } else {
        console.log('DEBUG: Tidak ada sesi akun. Mohon login.'); // Debug 2a
        console.log('Please log in first.'); // Seharusnya tidak tercapai karena menu sudah terkontrol
    }
    console.log('DEBUG: Keluar dari fungsi viewTransactions.'); // Debug 6
}

function logout() {
    clearSession();
    console.log('You have been logged out.');
}

module.exports = { loginPrompt, registerAccount, checkBalance, deposit, withdraw, transfer, viewTransactions, logout };