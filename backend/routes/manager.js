const express = require('express');
const router = express.Router();

// Skeleton code
router.get('/', (req, res) => {
    res.send('<h1>Manager Dashboard</h1><p>Status: Connected to Route Specialist</p>');
});

module.exports = router;