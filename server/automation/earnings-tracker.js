import axios from 'axios';
import { db } from '../db/init.js';

export async function trackEarnings() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM posts WHERE views < 100000`, async (err, posts) => {
      if (err) return reject(err);

      for (const post of posts) {
        try {
          const views = await fetchViewCount(post.platform, post.post_id);
          const reward = await getRewardAmount(post.campaign_id);

          const newViews = views - post.views;
          const earnings = (newViews / 1000) * reward.payment_per_1k_views;

          db.run(
            `UPDATE posts SET views = ?, engagement = engagement + ? WHERE id = ?`,
            [views, Math.floor(newViews * 0.05), post.id]
          );

          if (earnings > 0) {
            db.run(
              `INSERT INTO earnings (post_id, user_id, amount, status)
               SELECT ?, campaigns.user_id, ?, 'pending' FROM campaigns WHERE id = ?`,
              [post.id, earnings, post.campaign_id]
            );

            console.log(`💰 Tracked earnings: $${earnings.toFixed(2)} from ${views} views`);
          }
        } catch (error) {
          console.error(`Error tracking earnings for post ${post.id}:`, error.message);
        }
      }
      resolve();
    });
  });
}

async function fetchViewCount(platform, postId) {
  try {
    switch (platform) {
      case 'instagram':
        return await getInstagramViews(postId);
      case 'tiktok':
        return await getTikTokViews(postId);
      case 'youtube':
        return await getYoutubeViews(postId);
      default:
        return 0;
    }
  } catch (error) {
    console.error(`Error fetching views for ${platform}:`, error.message);
    return 0;
  }
}

async function getInstagramViews(mediaId) {
  try {
    const token = process.env.INSTAGRAM_TOKEN;
    const response = await axios.get(
      `https://graph.instagram.com/${mediaId}?fields=insights.metric(impressions)&access_token=${token}`
    );

    return response.data.insights?.data?.[0]?.values?.[0]?.value || 0;
  } catch (error) {
    console.error('Instagram insights error:', error.message);
    return 0;
  }
}

async function getTikTokViews(videoId) {
  try {
    const token = process.env.TIKTOK_TOKEN;
    const response = await axios.get(`https://open.tiktok.com/v1/video/query/`, {
      params: { video_id: videoId },
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data?.video?.statistics?.view_count || 0;
  } catch (error) {
    console.error('TikTok API error:', error.message);
    return 0;
  }
}

async function getYoutubeViews(videoId) {
  try {
    const token = process.env.YOUTUBE_TOKEN;
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&access_token=${token}`
    );

    return parseInt(response.data.items?.[0]?.statistics?.viewCount) || 0;
  } catch (error) {
    console.error('YouTube API error:', error.message);
    return 0;
  }
}

function getRewardAmount(campaignId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT payment_per_1k_views FROM rewards r
       JOIN campaigns c ON r.id = c.reward_id WHERE c.id = ?`,
      [campaignId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || { payment_per_1k_views: 1 });
      }
    );
  });
}
