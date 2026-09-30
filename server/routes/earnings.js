import express from 'express';
import { db } from '../db/init.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/dashboard', verifyToken, (req, res) => {
  db.get(
    `SELECT
       COUNT(DISTINCT campaign_id) as total_campaigns,
       SUM(views) as total_views,
       SUM(amount) as total_earned
     FROM earnings e
     JOIN posts p ON e.post_id = p.id
     JOIN campaigns c ON p.campaign_id = c.id
     WHERE c.user_id = ?`,
    [req.user_id],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.all(
        `SELECT e.*, p.views, p.platform FROM earnings e
         JOIN posts p ON e.post_id = p.id
         JOIN campaigns c ON p.campaign_id = c.id
         WHERE c.user_id = ?
         ORDER BY e.created_at DESC LIMIT 10`,
        [req.user_id],
        (err, recentEarnings) => {
          res.json({
            stats: stats || { total_campaigns: 0, total_views: 0, total_earned: 0 },
            recentEarnings: recentEarnings || [],
          });
        }
      );
    }
  );
});

router.get('/pending', verifyToken, (req, res) => {
  db.all(
    `SELECT SUM(amount) as pending_amount FROM earnings
     WHERE user_id = ? AND status = 'pending'`,
    [req.user_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        pending_amount: result?.[0]?.pending_amount || 0,
      });
    }
  );
});

router.get('/history', verifyToken, (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  db.all(
    `SELECT e.*, p.views, p.platform, c.id as campaign_id FROM earnings e
     JOIN posts p ON e.post_id = p.id
     JOIN campaigns c ON p.campaign_id = c.id
     WHERE c.user_id = ?
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user_id, parseInt(limit), parseInt(offset)],
    (err, earnings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        earnings: earnings || [],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }
  );
});

router.post('/request-payout', verifyToken, (req, res) => {
  db.get(
    `SELECT SUM(amount) as total FROM earnings WHERE user_id = ? AND status = 'pending'`,
    [req.user_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const totalAmount = result?.total || 0;

      if (totalAmount < 10) {
        return res.status(400).json({
          error: 'Minimum payout amount is $10',
          current_amount: totalAmount,
        });
      }

      db.run(
        `UPDATE earnings SET status = 'processing' WHERE user_id = ? AND status = 'pending'`,
        [req.user_id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            message: 'Payout requested',
            amount: totalAmount,
            status: 'processing',
          });
        }
      );
    }
  );
});

export default router;
