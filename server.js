const express = require('express'); // Using express framework for the node js environment
const path = require('path');
const app = express();
const PORT = 3000; 
app.use(express.static('public'));

// ---- GET REQUESTS --------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/portal_page.html'));
});

app.get('/customer', (req, res) => {
    res.send('<h1>Customer Kiosk MVP</h1><p>Menu loading from DB soon...</p>');
});

app.get('/cashier', (req, res) => {
    res.send('<h1>Cashier MVP</h1><p>Menu loading from DB soon...</p>');
});

app.get('/manager', (req, res) => {
    res.send('<h1>Manager MVP</h1><p>Menu loading from DB soon...</p>');
});

app.get('/menu', (req, res) => {
    res.send('<h1>Menu MVP</h1><p>Menu loading from DB soon...</p>');
});

app.get('/kitchen', (req, res) => {
    res.send('<h1>Kitchen MVP</h1><p>Menu loading from DB soon...</p>');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// ---- DATABASE CONNECTION ---------
const { Pool } = require('pg'); //postgre database that the node.js environment will use
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false } 
});

