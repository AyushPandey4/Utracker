# YouTube Playlist Tracker Backend

Backend service for the YouTube Playlist Tracker application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root of the `backend` directory with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/utracker
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   REDIS_URL=redis://localhost:6379
   REDIS_PASSWORD=your_redis_password_here_if_needed
   YOUTUBE_API_KEY=your_youtube_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Run the development server:
   ```
   npm run dev
   ```

## Environment Variables

- `PORT`: The port on which the server will run (default: 5000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `REDIS_URL`: Redis URL (must begin with `redis://` or `rediss://`)
- `REDIS_PASSWORD`: Redis password (optional, required if your Redis instance needs authentication)
- `YOUTUBE_API_KEY`: YouTube Data API v3 key
- `OPENAI_API_KEY`: OpenAI API key for AI summary generation

### Redis Configuration

For local development, you can use:
```
REDIS_URL=redis://localhost:6379
```

For Upstash Redis, use the URL from your Upstash dashboard:
```
REDIS_URL=redis://your-upstash-url.upstash.io:12345
REDIS_PASSWORD=your-upstash-password
```

The application will continue to function even if Redis is unavailable, but caching functionality will be disabled.

## API Endpoints

### Authentication
- `POST /api/auth/google`: Authenticate with Google OAuth
- `GET /api/auth/user`: Get the current user's profile (requires authentication)

### User Settings
- `POST /api/user/category`: Create a new category (requires authentication)
  ```json
  {
    "category": "string"
  }
  ```
- `GET /api/user/categories`: Fetch all categories for the current user (requires authentication)
- `POST /api/user/daily-goal`: Set or update current daily goal (requires authentication)
  ```json
  {
    "dailyGoal": "string"
  }
  ```
- `GET /api/user/daily-goal`: Fetch current daily goal (requires authentication)

### Playlist Management
- `POST /api/playlist/add`: Add a new YouTube playlist (requires authentication)
  ```json
  {
    "ytPlaylistUrl": "https://www.youtube.com/playlist?list=PLAYLIST_ID",
    "name": "Custom Playlist Name",
    "category": "Category Name"
  }
  ```
- `GET /api/playlist`: Get all playlists for the current user with progress stats (requires authentication)
- `GET /api/playlist/:id`: Get details of a specific playlist with all videos (requires authentication)
- `DELETE /api/playlist/:id`: Delete a playlist and all its videos (requires authentication)

### Video Management
- `GET /api/video/:id`: Get details of a specific video (requires authentication)
- `PATCH /api/video/:id/status`: Update video status (requires authentication)
  ```json
  {
    "status": "to-watch | in-progress | completed"
  }
  ```
- `PATCH /api/video/:id/note`: Update video notes (requires authentication)
  ```json
  {
    "note": "Your notes about the video"
  }
  ```
- `PATCH /api/video/:id/time`: Update time spent on video (requires authentication)
  ```json
  {
    "timeSpent": 300
  }
  ```
- `PATCH /api/video/:id/ai-summary`: Save AI-generated summary (requires authentication)
  ```json
  {
    "summary": "AI-generated summary content"
  }
  ```
- `POST /api/video/:id/summary-to-note`: Copy AI summary to notes (requires authentication)
- `POST /api/video/:id/generate-summary`: Generate AI summary from YouTube transcript (requires authentication)

### Badge Management
- `GET /api/badge/my-badges`: Fetch all badges earned by the user (requires authentication)
- `POST /api/badge/check-badges`: Evaluate user progress and assign new badges (requires authentication)
- `GET /api/badge/all`: Get a list of all possible badges in the system (requires authentication)

## Technology Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- Upstash Redis for caching
- JWT for authentication
- Google OAuth for login
- YouTube Data API v3
- OpenAI API for transcript summarization 