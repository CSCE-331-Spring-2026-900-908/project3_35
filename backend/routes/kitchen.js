const express = require('express');
const router = express.Router();

// Skeleton code
router.get('/', (req, res) => {
    res.send('<h1>Kitchen Display System</h1><p>Status: Connected to Route Specialist</p>');
});

module.exports = router;