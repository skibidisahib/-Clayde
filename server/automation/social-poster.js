import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export async function postToSocialMedia(clip, platforms, campaignId) {
  const results = [];

  for (const platform of platforms) {
    try {
      let result;

      switch (platform) {
        case 'instagram':
          result = await postToInstagram(clip, campaignId);
          break;
        case 'tiktok':
          result = await postToTikTok(clip, campaignId);
          break;
        case 'youtube':
          result = await postToYoutube(clip, campaignId);
          break;
        default:
          continue;
      }

      if (result.success) {
        results.push({
          platform,
          post_id: result.post_id,
          url: result.url,
        });
        console.log(`✅ Posted to ${platform}: ${result.url}`);
      }
    } catch (error) {
      console.error(`❌ Error posting to ${platform}:`, error.message);
    }
  }

  return results[0] || { platform: 'unknown', post_id: 'pending' };
}

async function postToInstagram(clip, campaignId) {
  try {
    const igToken = process.env.INSTAGRAM_TOKEN;
    const igUserId = process.env.INSTAGRAM_USER_ID;

    if (!igToken || !igUserId) {
      console.warn('⚠️ Instagram credentials not configured');
      return {
        success: false,
        error: 'Credentials missing',
      };
    }

    const caption = `Check out this amazing content! 🎬 Campaign #${campaignId} #ContentRewards`;

    const uploadResponse = await axios.post(
      `https://graph.instagram.com/${igUserId}/media`,
      {
        media_type: 'VIDEO',
        video_url: clip.filepath,
        caption,
        access_token: igToken,
      }
    );

    const mediaId = uploadResponse.data.id;

    const publishResponse = await axios.post(
      `https://graph.instagram.com/${igUserId}/media_publish`,
      {
        creation_id: mediaId,
        access_token: igToken,
      }
    );

    return {
      success: true,
      post_id: publishResponse.data.id,
      url: `https://instagram.com/p/${publishResponse.data.id}`,
    };
  } catch (error) {
    console.error('Instagram API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function postToTikTok(clip, campaignId) {
  try {
    const tikTokToken = process.env.TIKTOK_TOKEN;

    if (!tikTokToken) {
      console.warn('⚠️ TikTok credentials not configured');
      return {
        success: false,
        error: 'Credentials missing',
      };
    }

    const caption = `🎬 Content Rewards #${campaignId} #ContentMonetization`;

    const formData = new FormData();
    formData.append('video', fs.createReadStream(clip.filepath));
    formData.append('caption', caption);

    const response = await axios.post('https://open.tiktok.com/v1/video/upload/', formData, {
      headers: {
        Authorization: `Bearer ${tikTokToken}`,
        ...formData.getHeaders(),
      },
    });

    return {
      success: true,
      post_id: response.data.data.video_id,
      url: `https://tiktok.com/@user/video/${response.data.data.video_id}`,
    };
  } catch (error) {
    console.error('TikTok API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function postToYoutube(clip, campaignId) {
  try {
    const youtubeToken = process.env.YOUTUBE_TOKEN;

    if (!youtubeToken) {
      console.warn('⚠️ YouTube credentials not configured');
      return {
        success: false,
        error: 'Credentials missing',
      };
    }

    const title = `Automated Content - Campaign ${campaignId}`;
    const description = `Auto-generated content from Content Rewards Platform #Monetization`;
    const tags = ['content', 'rewards', 'monetization'];

    const response = await axios.post(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
      {
        snippet: {
          title,
          description,
          tags,
          categoryId: '24',
        },
        status: {
          privacyStatus: 'public',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${youtubeToken}`,
        },
      }
    );

    return {
      success: true,
      post_id: response.data.id,
      url: `https://youtube.com/watch?v=${response.data.id}`,
    };
  } catch (error) {
    console.error('YouTube API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
