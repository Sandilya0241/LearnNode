const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerConfig');
const { handleUpload } = require('../controllers/uploadController');

router.post('/', upload.single('file'), handleUpload);

module.exports = router;