import express from 'express';
import { db } from '../db/init.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { category, sort } = req.query;

  let query = `SELECT * FROM rewards WHERE 1=1`;
  const params = [];

  if (category) {
    query += ` AND content_category = ?`;
    params.push(category);
  }

  if (sort === 'newest') {
    query += ` ORDER BY scrape_date DESC`;
  } else if (sort === 'highest_pay') {
    query += ` ORDER BY payment_per_1k_views DESC`;
  }

  db.all(query, params, (err, rewards) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      total: rewards.length,
      rewards,
    });
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM rewards WHERE id = ?`, [id], (err, reward) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json(reward);
  });
});

router.post('/:id/create-campaign', verifyToken, (req, res) => {
  const { id } = req.params;
  const { content_source } = req.body;

  if (!content_source) {
    return res.status(400).json({ error: 'content_source required' });
  }

  db.run(
    `INSERT INTO campaigns (user_id, reward_id, content_source, status)
     VALUES (?, ?, ?, 'draft')`,
    [req.user_id, id, content_source],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: 'Campaign created',
        campaign_id: this.lastID,
      });
    }
  );
});

export default router;
