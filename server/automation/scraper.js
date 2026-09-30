import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../db/init.js';

const REWARD_SOURCES = [
  'https://www.whop.com/rewards',
  'https://influencerdb.com/opportunities',
];

export async function scrapeRewards() {
  const rewards = [];

  for (const source of REWARD_SOURCES) {
    try {
      const response = await axios.get(source, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      $('[data-reward], .reward-item').each((i, elem) => {
        const title = $(elem).find('.title, h2').text().trim();
        const description = $(elem).find('.description, p').text().trim();
        const payment = $(elem).find('.payment, [data-payment]').text().trim();
        const category = $(elem).find('.category, [data-category]').text().trim();

        if (title) {
          rewards.push({
            title,
            description,
            reward_type: 'content_reward',
            content_category: category || 'general',
            payment_per_1k_views: parsePayment(payment),
            url: source,
          });
        }
      });
    } catch (error) {
      console.error(`Error scraping ${source}:`, error.message);
    }
  }

  for (const reward of rewards) {
    db.run(
      `INSERT OR IGNORE INTO rewards
       (title, description, reward_type, content_category, payment_per_1k_views, url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        reward.title,
        reward.description,
        reward.reward_type,
        reward.content_category,
        reward.payment_per_1k_views,
        reward.url,
      ],
      (err) => {
        if (!err) console.log(`✅ Scraped reward: ${reward.title}`);
      }
    );
  }

  console.log(`📥 Scraped ${rewards.length} rewards`);
  return rewards;
}

function parsePayment(text) {
  const match = text.match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : 1;
}
