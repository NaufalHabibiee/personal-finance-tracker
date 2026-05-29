// Vercel serverless entry. Wraps the Express app from /backend.
// Every /api/* request is rewritten to this function via vercel.json.
const { createApp } = require('../backend/src/app');

const app = createApp();

module.exports = (req, res) => app(req, res);
