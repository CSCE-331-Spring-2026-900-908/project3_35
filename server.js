const express = require('express');
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
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false } 
});

// Update your Customer route to show REAL data
app.get('/api/menu', async (req, res) => {
    try {
        const result = await pool.query('SELECT name, price_per_unit, menu_item_category FROM menu_item ORDER BY menu_item_category');
        res.json(result.rows); // Sends the database rows as a JSON array
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database query failed" });
    }
});

// Testing on customer page with peak sales
app.get('/customer', async (req, res) => {
    try {
        const sql = `
            SELECT o.order_time::date AS day, SUM(o.price)::numeric(12,2) AS total_sales 
            FROM orders o 
            GROUP BY o.order_time::date 
            ORDER BY total_sales DESC 
            LIMIT 10
        `;
        
        const result = await pool.query(sql);
        
        let html = "<h1>MVP: Peak Sales Days (Live from DB)</h1><ul>";
        result.rows.forEach(row => {
            html += `<li>Date: ${row.day.toDateString()} | Sales: $${row.total_sales}</li>`;
        });
        html += "</ul><a href='/'>Back to Portal</a>";
        
        res.send(html);
    } 
    
    catch (err) {
        console.error(err);
        res.status(500).send("Database Error: Check server logs.");
    }
});