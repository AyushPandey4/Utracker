// Parse timestamps from video description
const parseTimestamps = (description) => {
  if (!description) return [];
  
  const timestamps = [];
  
  // Common timestamp patterns:
  // 1. HH:MM:SS - Topic
  // 2. MM:SS - Topic
  // 3. Topic - HH:MM:SS
  // 4. Topic - MM:SS
  const patterns = [
    /(\d{1,2}:\d{2}:\d{2})\s*[-–—]\s*(.+)/g,  // HH:MM:SS - Topic
    /(\d{1,2}:\d{2})\s*[-–—]\s*(.+)/g,        // MM:SS - Topic
    /(.+?)\s*[-–—]\s*(\d{1,2}:\d{2}:\d{2})/g, // Topic - HH:MM:SS
    /(.+?)\s*[-–—]\s*(\d{1,2}:\d{2})/g        // Topic - MM:SS
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const [_, time, topic] = match;
      // Normalize time format to HH:MM:SS
      const normalizedTime = time.includes(':') ? 
        (time.split(':').length === 2 ? `00:${time}` : time) : 
        time;
      
      timestamps.push({
        time: normalizedTime,
        topic: topic.trim()
      });
    }
  });
  
  // Sort timestamps by time
  return timestamps.sort((a, b) => {
    const timeA = a.time.split(':').reduce((acc, val) => acc * 60 + parseInt(val), 0);
    const timeB = b.time.split(':').reduce((acc, val) => acc * 60 + parseInt(val), 0);
    return timeA - timeB;
  });
};

module.exports = {
  parseTimestamps
}; 