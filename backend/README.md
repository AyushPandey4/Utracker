# LearnLoop Backend

LearnLoop is a powerful YouTube video tracking and organization platform. This is the backend service that powers the LearnLoop application.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Redis (for caching)
- JWT Authentication
- Google OAuth2

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis
- Google OAuth2 credentials

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
REDIS_URL=your_redis_url
OPENAI_API_KEY=your_openai_api_key_here
PORT=your_port
REDIS_PASSWORD=your_redis_password
REDIS_URL=your_redis_url
YOUTUBE_API_KEY=your_youtube_api_key
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the server:
```bash
npm start
```

## API Routes

### Authentication Routes

#### POST /api/auth/google
- Authenticates user with Google OAuth
- Returns JWT token and user data
- Request body: `{ tokenId, userData }`

#### GET /api/auth/user
- Gets authenticated user data
- Requires JWT token in Authorization header
- Returns user profile data

### User Routes

#### POST /api/user/category
- Creates a new category
- Request body: `{ category: string }`

#### GET /api/user/categories
- Fetches all user categories

#### PUT /api/user/category
- Renames a category
- Request body: `{ oldCategory: string, newCategory: string }`

#### DELETE /api/user/category/:categoryName
- Deletes a category
- Query params: `deleteAssociatedPlaylists` (boolean)

#### POST /api/user/daily-goal
- Sets/updates user's daily goal
- Request body: `{ dailyGoal: string }`

#### GET /api/user/daily-goal
- Fetches user's current daily goal

### Playlist Routes

#### POST /api/playlist
- Creates a new playlist
- Request body: `{ title: string, category: string, description?: string }`

#### GET /api/playlist
- Fetches all playlists for the user
- Query params: `category` (optional)

#### GET /api/playlist/:id
- Fetches a specific playlist by ID

#### PUT /api/playlist/:id
- Updates a playlist
- Request body: `{ title?: string, category?: string, description?: string }`

#### DELETE /api/playlist/:id
- Deletes a playlist and its associated videos

### Video Routes

#### POST /api/video
- Adds a new video to a playlist
- Request body: `{ playlistId: string, videoId: string, title: string, thumbnail: string }`

#### GET /api/video
- Fetches videos for a playlist
- Query params: `playlistId: string`

#### PUT /api/video/:id
- Updates video details
- Request body: `{ title?: string, notes?: string, watched?: boolean }`

#### DELETE /api/video/:id
- Removes a video from a playlist

### Badge Routes

#### GET /api/badge
- Fetches all badges for the user

#### POST /api/badge
- Awards a new badge to the user
- Request body: `{ type: string, name: string }`

## Caching

The backend implements Redis caching for:
- User data
- Categories
- Playlists
- Daily goals

Cache duration is set to 24 hours by default.

## Error Handling

All routes implement proper error handling with appropriate HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

## Security

- JWT-based authentication
- Google OAuth2 integration
- Protected routes using middleware
- Input validation
- Rate limiting (implemented in production)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 