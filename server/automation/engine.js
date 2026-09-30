import cron from 'node-cron';
import { db } from '../db/init.js';
import { scrapeRewards } from './scraper.js';
import { findMatchingCreators } from './creator-finder.js';
import { generateClips } from './clip-generator.js';
import { postToSocialMedia } from './social-poster.js';
import { trackEarnings } from './earnings-tracker.js';

export function startAutomationEngine() {
  console.log('🤖 Starting Content Automation Engine...');

  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Running reward scraper...');
    try {
      await scrapeRewards();
    } catch (error) {
      console.error('❌ Scraper error:', error);
    }
  });

  cron.schedule('0 */4 * * *', async () => {
    console.log('⏰ Processing campaigns & generating clips...');
    try {
      await processPendingCampaigns();
    } catch (error) {
      console.error('❌ Campaign processor error:', error);
    }
  });

  cron.schedule('0 */2 * * *', async () => {
    console.log('⏰ Checking view counts & calculating earnings...');
    try {
      await trackEarnings();
    } catch (error) {
      console.error('❌ Earnings tracking error:', error);
    }
  });

  cron.schedule('0 0 * * 0', async () => {
    console.log('⏰ Weekly payout processing...');
    try {
      await processPayouts();
    } catch (error) {
      console.error('❌ Payout error:', error);
    }
  });

  console.log('✅ Automation engine active. Running scheduled tasks.');
}

function processPendingCampaigns() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM campaigns WHERE status = 'draft' LIMIT 5`,
      async (err, campaigns) => {
        if (err) return reject(err);

        for (const campaign of campaigns) {
          try {
            const creators = await findMatchingCreators(campaign.reward_id);

            for (const creator of creators.slice(0, 3)) {
              const clips = await generateClips(creator.content_source, campaign.reward_id);

              for (const clip of clips) {
                const posted = await postToSocialMedia(
                  clip,
                  ['instagram', 'tiktok', 'youtube'],
                  campaign.id
                );

                db.run(
                  `INSERT INTO posts (campaign_id, platform, post_id, posted_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                  [campaign.id, posted.platform, posted.post_id]
                );
              }

              db.run(
                `UPDATE campaigns SET status = 'active', generated_clips = generated_clips + ? WHERE id = ?`,
                [clips.length, campaign.id]
              );
            }
          } catch (error) {
            console.error(`Error processing campaign ${campaign.id}:`, error);
          }
        }
        resolve();
      }
    );
  });
}

function processPayouts() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM earnings WHERE status = 'pending' AND amount > 10`,
      async (err, earnings) => {
        if (err) return reject(err);

        for (const earning of earnings) {
          db.run(
            `UPDATE earnings SET status = 'paid', payout_date = CURRENT_TIMESTAMP WHERE id = ?`,
            [earning.id]
          );
          console.log(`💰 Payout processed: $${earning.amount} to user ${earning.user_id}`);
        }
        resolve();
      }
    );
  });
}
