// atm.js
const { prompt } = require('inquirer'); // <-- PASTIKAN BARIS INI BENAR
const { initializeDatabase, pool, testConnection } = require('./src/utils/database');
const { getSession, clearSession } = require('./src/utils/session');
const {
    loginPrompt,
    registerAccount,
    checkBalance,
    deposit,
    withdraw,
    transfer,
    viewTransactions,
    logout
} = require('./src/commands');

async function main() {
    await testConnection();
    // await initializeDatabase(); // Biasanya hanya saat setup awal

    while (true) {
        const currentAccount = getSession();
        let action;

        if (!currentAccount) { // Belum login (menu logged out)
            console.log('\n--- ATM CLI ---');
            const { initialAction } = await prompt({ // <-- PASTIKAN INI HANYA 'prompt'
                type: 'list',
                name: 'initialAction',
                message: 'Welcome! Please choose an option:',
                choices: [
                    { name: 'Login to Account', value: 'login' },
                    { name: 'Register New Account', value: 'register' },
                    { name: 'Exit', value: 'exit' }
                ]
            });
            action = initialAction;

            if (action === 'login') {
                const loggedIn = await loginPrompt();
                if (!loggedIn) {
                    continue;
                }
            } else if (action === 'register') {
                await registerAccount();
                continue;
            }

        } else { // Sudah login (menu logged in)
            console.log(`\n--- ATM CLI (Logged In as ${currentAccount.name}) ---`);
            const { loggedInAction } = await prompt({ // <-- PASTIKAN INI HANYA 'prompt'
                type: 'list',
                name: 'loggedInAction',
                message: `What would you like to do, ${currentAccount.name}?`,
                choices: [
                    { name: 'Check Balance', value: 'balance' },
                    { name: 'Deposit Funds', value: 'deposit' },
                    { name: 'Withdraw Funds', value: 'withdraw' },
                    { name: 'Transfer Funds', value: 'transfer' },
                    { name: 'View Transaction History', value: 'transactions' },
                    { name: 'Logout', value: 'logout' },
                    { name: 'Exit', value: 'exit' }
                ]
            });
            action = loggedInAction;
        }

        switch (action) {
            case 'login':
                break;
            case 'register':
                break;
            case 'balance':
                await checkBalance();
                break;
            case 'deposit':
                await deposit();
                break;
            case 'withdraw':
                await withdraw();
                break;
            case 'transfer':
                await transfer();
                break;
            case 'transactions':
                await viewTransactions();
                break;
            case 'logout':
                logout();
                break;
            case 'exit':
                console.log('Thank you for using the ATM CLI. Goodbye!');
                await pool.end();
                process.exit(0);
            default:
                console.log('Invalid option.');
        }
    }
}

main().catch(error => {
    console.error('An unhandled error occurred:', error);
    if (pool) {
        pool.end();
    }
    process.exit(1);
});