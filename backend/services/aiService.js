const { OpenAI } = require('openai');
const YouTubeTranscript = require('youtube-transcript');
const { setCache, getCache } = require('../config/redisUtils');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Fetch transcript for a YouTube video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string>} - Combined transcript text
 */
const getYouTubeTranscript = async (videoId) => {
  try {
    // Check cache first
    const cacheKey = `transcript:${videoId}`;
    const cachedTranscript = await getCache(cacheKey);
    
    if (cachedTranscript) {
      return cachedTranscript;
    }
    
    // Fetch transcript if not in cache
    const transcript = await YouTubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video');
    }
    
    // Combine transcript segments into one text
    const transcriptText = transcript.map(item => item.text).join(' ');
    
    // Cache the transcript for 7 days (since transcripts rarely change)
    await setCache(cacheKey, transcriptText, 7 * 24 * 60 * 60);
    
    return transcriptText;
  } catch (error) {
    console.error(`Error fetching transcript for ${videoId}:`, error);
    throw error;
  }
};

/**
 * Generate a summary from transcript text using OpenAI
 * @param {string} transcript - Video transcript
 * @param {string} videoTitle - Video title for context
 * @returns {Promise<string>} - Generated summary
 */
const generateSummaryFromTranscript = async (transcript, videoTitle) => {
  try {
    // Check if transcript is too long and truncate if needed
    // GPT models have token limits, so we may need to truncate
    const maxLength = 12000; // Approximate token count for GPT-4
    const truncatedTranscript = transcript.length > maxLength 
      ? transcript.substring(0, maxLength) + '...' 
      : transcript;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Can use gpt-4 for better summaries but more expensive
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates concise, informative summaries of educational videos. Focus on the key concepts, examples, and takeaways. Format your summary with bullet points for main topics followed by brief explanations. Keep your summary under 400 words.'
        },
        {
          role: 'user',
          content: `Please summarize this transcript from a video titled "${videoTitle}":\n\n${truncatedTranscript}`
        }
      ],
      max_tokens: 700,
      temperature: 0.5 // More deterministic output
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    throw error;
  }
};

/**
 * Generate AI summary for a YouTube video
 * @param {string} videoId - YouTube video ID
 * @param {string} videoTitle - Video title
 * @returns {Promise<string>} - Generated summary
 */
const generateVideoSummary = async (videoId, videoTitle) => {
  try {
    // Check if summary is cached
    const cacheKey = `summary:${videoId}`;
    const cachedSummary = await getCache(cacheKey);
    
    if (cachedSummary) {
      return cachedSummary;
    }
    
    // Get transcript
    const transcript = await getYouTubeTranscript(videoId);
    
    // Generate summary
    const summary = await generateSummaryFromTranscript(transcript, videoTitle);
    
    // Cache the summary for 30 days
    await setCache(cacheKey, summary, 30 * 24 * 60 * 60);
    
    return summary;
  } catch (error) {
    console.error(`Error generating summary for ${videoId}:`, error);
    throw error;
  }
};

module.exports = {
  generateVideoSummary
}; 