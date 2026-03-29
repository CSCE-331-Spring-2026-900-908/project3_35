const express = require('express');
const router = express.Router();

// Skeleton code
router.get('/', (req, res) => {
    res.send('<h1>Digital Menu Board</h1><p>Status: Connected to Route Specialist</p>');
});

module.exports = router;