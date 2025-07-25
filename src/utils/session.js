// src/utils/session.js
let currentAccount = null; // Menyimpan objek akun yang sedang login

const setSession = (account) => {
    currentAccount = account;
    console.log(`User ${account.name} logged in.`);
};

const getSession = () => {
    return currentAccount;
};

const clearSession = () => {
    currentAccount = null;
    console.log('User logged out.');
};

module.exports = {
    setSession,
    getSession,
    clearSession
};