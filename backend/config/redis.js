const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    // Check if we're using Upstash Redis URL format
    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD;
    
    const options = {};
    
    // Handle Upstash Redis URL format
    if (redisUrl) {
      // If URL doesn't start with redis:// or rediss://, add the prefix
      if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
        options.url = `redis://${redisUrl}`;
      } else {
        options.url = redisUrl;
      }
    }
    
    // Add password if provided
    if (redisPassword) {
      options.password = redisPassword;
    }
    
    // Add connection retry strategy
    options.retry_strategy = (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error
        console.error('Redis server refused connection');
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        // End reconnecting with built in error
        return undefined;
      }
      // Reconnect after increasing delay
      return Math.min(options.attempt * 100, 3000);
    };

    // Create Redis client
    redisClient = redis.createClient(options);

    // Set up error handler
    redisClient.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    // Connect to Redis
    await redisClient.connect();
    console.log('Redis Connected');
    
    return redisClient;
  } catch (error) {
    console.error(`Redis Connection Error: ${error.message}`);
    // Don't exit the process, just return null so application can continue without Redis
    return null;
  }
};

/**
 * Get Redis client safely
 * @returns {object|null} - Redis client or null if not connected
 */
const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient }; 
module.exports = { connectRedis, getRedisClient: () => redisClient }; 