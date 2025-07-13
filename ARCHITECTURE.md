# Golf Leaderboard Application - Architecture Overview

## System Overview

The Golf Leaderboard Application is a full-stack web application for managing golf tournament drafts and displaying live leaderboards. The system consists of a React frontend, Flask backend, Firebase/Firestore database, and integrations with external golf data APIs.

## Architecture Components

### Frontend (React)
- **Location**: `/src/`
- **Main Framework**: React with hooks (useState, useEffect, useMemo, useCallback)
- **Key Features**: Tournament selection, draft board, leaderboard display, team management
- **Styling**: CSS with responsive design
- **State Management**: Local React state with custom hooks

### Backend (Flask)
- **Location**: `/leaderboard-backend/app.py`
- **Framework**: Flask with CORS enabled
- **Database**: Firebase/Firestore for tournament and team data
- **Caching**: In-memory cache with 5-minute TTL
- **External APIs**: RapidAPI (golf leaderboard), SportsData.io (player odds)

### Database (Firebase/Firestore)
- **Collections**: 
  - `tournaments` - Tournament metadata, teams, draft status
- **Real-time**: Supports real-time updates for draft status
- **Security**: Firebase Admin SDK for server-side operations

### External APIs
- **RapidAPI (live-golf-data)**: Live tournament leaderboard data
- **SportsData.io**: Player odds and tournament information

## Application Flow

### 1. Tournament Lifecycle
```
Create Tournament → Set Up Teams → Start Draft → Lock Odds → Complete Draft → View Leaderboard
```

### 2. Draft States
- **Not Started**: Basic tournament info display
- **Started + Not Locked**: Waiting for odds to be locked
- **Started + Locked + Not Complete**: Draft board active
- **Complete**: Leaderboard display

### 3. Data Flow
```
Frontend ←→ Flask Backend ←→ External APIs
    ↓              ↓
Local Cache    Server Cache
    ↓              ↓
    Firebase/Firestore
```

## Key Design Patterns

### 1. Custom Hooks
- `useGolfLeaderboard`: Handles live tournament data fetching and processing
- Encapsulates complex data transformation logic
- Manages loading states and error handling

### 2. Caching Strategy (Multi-Layer)
- **Frontend Cache**: Session-based for completed tournaments
- **Backend Cache**: 5-minute TTL for all API responses
- **Smart Cache Usage**: Instant switching between completed tournaments

### 3. State Management
- **Local State**: React hooks for UI state
- **Derived State**: useMemo for computed values
- **Effect Management**: useEffect with proper dependency arrays

### 4. Error Handling
- **API Level**: Try-catch with fallback responses
- **UI Level**: Error states and user-friendly messages
- **Graceful Degradation**: Partial functionality when APIs fail

## File Structure

### Frontend Key Files
```
src/
├── App.js                 # Main application logic and routing
├── useGolfLeaderboard.js   # Custom hook for tournament data
├── components/
│   ├── DraftBoard.js      # Draft board display component
│   └── TeamManagement.js  # Team creation and management
└── apiConfig.js           # API endpoint configurations
```

### Backend Key Files
```
leaderboard-backend/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
└── .env                   # Environment variables (not in repo)
```

## Security Considerations

### API Keys
- Stored in environment variables
- Never exposed to frontend
- Rate-limited through backend caching

### Database Access
- Firebase Admin SDK with service account
- Server-side only database operations
- Proper error handling for unauthorized access

### CORS Configuration
- Configured for specific origins in production
- Allows necessary HTTP methods and headers

## Performance Optimizations

### Frontend
- **Memoization**: useMemo and useCallback for expensive operations
- **Preloading**: Background loading of completed tournament data
- **Conditional Rendering**: Efficient re-renders with dependency arrays

### Backend
- **Response Caching**: 5-minute TTL reduces external API calls
- **Efficient Queries**: Optimized Firebase queries
- **Error Recovery**: Graceful handling of API failures

### Network
- **Batch Operations**: Multiple tournament status checks
- **Smart Polling**: Only refresh when necessary
- **Compression**: Gzipped responses for large datasets

## Scalability Considerations

### Current Limits
- In-memory backend cache (single server)
- Session-based frontend cache
- Rate limits from external APIs

### Future Improvements
- Redis for distributed caching
- CDN for static assets
- Database indexing optimization
- Horizontal scaling with load balancers

## Development Workflow

### Local Development
1. Start Flask backend on port 8080
2. Start React frontend on port 3000
3. Configure environment variables
4. Test with development APIs

### Deployment
- Frontend: Static hosting (Netlify, Vercel)
- Backend: Cloud hosting (Heroku, GCP, AWS)
- Database: Firebase hosting
- Environment: Production API keys and endpoints

## Monitoring and Logging

### Backend Logging
- Request/response logging
- Error tracking with stack traces
- API usage monitoring

### Frontend Monitoring
- Console logging for development
- Error boundaries for production
- Performance monitoring

## Dependencies

### Frontend
- React 18+
- Modern browser support (ES6+)

### Backend
- Python 3.8+
- Flask
- Firebase Admin SDK
- Requests library

### External Services
- Firebase/Firestore
- RapidAPI subscription
- SportsData.io subscription
