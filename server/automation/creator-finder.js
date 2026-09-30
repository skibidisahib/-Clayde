import axios from 'axios';
import { db } from '../db/init.js';

export async function findMatchingCreators(rewardId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM rewards WHERE id = ?`,
      [rewardId],
      async (err, reward) => {
        if (err) return reject(err);

        const creators = [];

        try {
          const response = await axios.get('https://www.youtube.com/results', {
            params: {
              search_query: `${reward.content_category} content creator`,
              sp: 'mAEBiAI%3D',
            },
          });

          const creatorList = parseYoutubeResults(response.data);
          resolve(creatorList.slice(0, 10));
        } catch (error) {
          console.error('Error finding creators:', error.message);
          resolve(creators);
        }
      }
    );
  });
}

function parseYoutubeResults(html) {
  const creators = [];

  const channelMatches = html.match(/\/channel\/([^"]+)/g) || [];

  for (let i = 0; i < Math.min(channelMatches.length, 10); i++) {
    const channelId = channelMatches[i].replace('/channel/', '');
    creators.push({
      content_source: `https://www.youtube.com/channel/${channelId}`,
      platform: 'youtube',
      channel_id: channelId,
    });
  }

  return creators;
}

export async function getCreatorContent(creator) {
  try {
    const videos = await axios.get(
      `https://www.youtube.com/channel/${creator.channel_id}/videos`
    );
    return parseVideos(videos.data);
  } catch (error) {
    console.error('Error fetching creator content:', error.message);
    return [];
  }
}

function parseVideos(html) {
  const videos = [];
  const videoMatches = html.match(/\/watch\?v=([^"]+)/g) || [];

  for (let i = 0; i < Math.min(videoMatches.length, 5); i++) {
    const videoId = videoMatches[i].replace('/watch?v=', '');
    videos.push({
      video_id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return videos;
}
