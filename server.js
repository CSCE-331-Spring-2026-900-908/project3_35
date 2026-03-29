const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000; 
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/portal_page.html'));
});

// Get requests for views
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