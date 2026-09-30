import express from 'express';
import { db } from '../db/init.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  db.all(
    `SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user_id],
    (err, campaigns) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        total: campaigns.length,
        campaigns,
      });
    }
  );
});

router.get('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT c.*, r.payment_per_1k_views FROM campaigns c
     LEFT JOIN rewards r ON c.reward_id = r.id
     WHERE c.id = ? AND c.user_id = ?`,
    [id, req.user_id],
    (err, campaign) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      db.all(
        `SELECT * FROM posts WHERE campaign_id = ?`,
        [id],
        (err, posts) => {
          campaign.posts = posts || [];
          res.json(campaign);
        }
      );
    }
  );
});

router.patch('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run(
    `UPDATE campaigns SET status = ? WHERE id = ? AND user_id = ?`,
    [status, id, req.user_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: 'Campaign updated',
        changes: this.changes,
      });
    }
  );
});

router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM campaigns WHERE id = ? AND user_id = ?`,
    [id, req.user_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: 'Campaign deleted',
        deleted: this.changes,
      });
    }
  );
});

export default router;
