const express = require('express');
const app = express();
const uploadRoute = require('../routes/uploadRoute');
const healthRoute = require('../routes/healthRoute');

app.use(express.json());
app.use('/upload', uploadRoute);
app.use('/health', healthRoute);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));