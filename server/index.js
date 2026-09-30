import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/init.js';
import { startAutomationEngine } from './automation/engine.js';
import authRoutes from './routes/auth.js';
import rewardsRoutes from './routes/rewards.js';
import campaignsRoutes from './routes/campaigns.js';
import earningsRoutes from './routes/earnings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/earnings', earningsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Content Rewards Automation Engine Running' });
});

startAutomationEngine();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📊 Automation engine active');
});
