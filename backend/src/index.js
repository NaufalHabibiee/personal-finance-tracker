require('dotenv').config();
const { createApp } = require('./app');

const app = createApp();
const port = parseInt(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
