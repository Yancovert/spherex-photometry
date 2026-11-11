// serverless entrypoint for vercel
process.env.VERCEL = '1';
import app from '../srv/dist/main.js';

export default app;
