const express = require('express');
const router = express.Router();
const auth = require('../../middleware/App.middleware');

router.use('/get-my-info', auth, require('./info'));
router.use('/edit', auth, require('./info'));
router.use('/profile', require('./profile')); // Đặt trước route '/'
router.use('/statistics', auth, require('./statistics'));
router.use('/', require('./get')); // Route này phải đặt cuối
// router.use("/blocked", auth, require("./blocked"));
// router.use("/friend", auth, require("./friend"));
// router.use("/online", auth, require("./online"));

module.exports = router;
