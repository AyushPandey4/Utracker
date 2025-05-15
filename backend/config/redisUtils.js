const { getRedisClient } = require('./redis');

/**
 * Set a key-value pair in Redis with optional expiration
 * @param {string} key - Redis key
 * @param {string|object} value - Value to store (objects will be JSON stringified)
 * @param {number} expireSeconds - Time in seconds after which the key will expire (optional)
 */
const setCache = async (key, value, expireSeconds = null) => {
  try {
    const client = getRedisClient();
    
    // If Redis is not available, just return without caching
    if (!client) {
      return;
    }
    
    // Convert objects to strings
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
    
    // Set the value in Redis
    await client.set(key, valueToStore);
    
    // Set expiration if provided
    if (expireSeconds) {
      await client.expire(key, expireSeconds);
    }
  } catch (error) {
    // Log error but don't throw to prevent app from crashing
    console.error(`Redis setCache error: ${error.message}`);
  }
};

/**
 * Get a value from Redis by key
 * @param {string} key - Redis key
 * @param {boolean} parseJSON - Whether to parse the value as JSON
 * @returns {Promise<any>} - The value or null if not found
 */
const getCache = async (key, parseJSON = true) => {
  try {
    const client = getRedisClient();
    
    // If Redis is not available, return null
    if (!client) {
      return null;
    }
    
    const value = await client.get(key);
    
    if (!value) return null;
    
    // Parse JSON if requested and possible
    if (parseJSON) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // If parsing fails, return the raw value
        return value;
      }
    }
    
    return value;
  } catch (error) {
    // Log error but don't throw to prevent app from crashing
    console.error(`Redis getCache error: ${error.message}`);
    return null;
  }
};

/**
 * Delete a key from Redis
 * @param {string} key - Redis key to delete
 */
const deleteCache = async (key) => {
  try {
    const client = getRedisClient();
    
    // If Redis is not available, just return
    if (!client) {
      return;
    }
    
    await client.del(key);
  } catch (error) {
    // Log error but don't throw to prevent app from crashing
    console.error(`Redis deleteCache error: ${error.message}`);
  }
};

module.exports = {
  setCache,
  getCache,
  deleteCache
}; 