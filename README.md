# Webtoon Tracker

A full-stack web application for tracking webtoon reading progress, built with React, Vite, Firebase, and Firebase Cloud Functions.

## Features

- **User Authentication**: Sign up and login with email/password
- **Webtoon Library**: Add and manage your webtoon collection
- **Progress Tracking**: Track your reading progress and see friends' progress on the same webtoons
- **Auto-fill from URL**: Scrape webtoon information from URLs using Firebase Cloud Functions
- **Social Features**: Follow other users and see their activity in your feed
- **Search**: Find other users by display name
- **Rating System**: Rate webtoons with 1-5 stars
- **Status Tracking**: Mark webtoons as "Ongoing" or "Completed"

## Tech Stack

- **Frontend**: React 19, Vite 8, TailwindCSS 4
- **Backend**: Firebase Cloud Functions
- **Database**: Firestore
- **Authentication**: Firebase Auth
- **HTTP Client**: Axios (for scraping)
- **Web Scraping**: Cheerio

## Getting Started

### Prerequisites

- Node.js 22+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd webtoon-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Install Firebase Functions dependencies:
```bash
cd functions
npm install
cd ..
```

4. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your Firebase project configuration values.

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password provider)
3. Create a Firestore database
4. Copy your Firebase config values to the `.env` file

### Running the Application

#### Development Mode (Production Firebase Services)

The application is configured to use production Firebase services by default:

1. Start the Vite dev server:
```bash
npm run dev
```

2. Open [http://localhost:5173](http://localhost:5173) in your browser

#### Development Mode (with Firebase Emulators)

If you prefer to use local Firebase emulators for development:

1. Uncomment the emulator connection lines in `src/firebase.js`:
```javascript
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
```

2. Update the function URLs in `src/pages/AddWebtoon.jsx` and `src/pages/Home.jsx` to use the emulator endpoint:
```
http://127.0.0.1:5001/webtoon-tracker-demo/us-central1/scrapeWebtoon
```

3. Start Firebase emulators:
```bash
firebase emulators:start
```

4. In a new terminal, start the Vite dev server:
```bash
npm run dev
```

#### Production Build

1. Build the application:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

### Firebase Deployment

To deploy to Firebase:

1. Build the functions:
```bash
cd functions
npm run build
cd ..
```

2. Deploy to Firebase:
```bash
firebase deploy
```

## Project Structure

```
webtoon-tracker/
├── functions/              # Firebase Cloud Functions
│   ├── index.js           # Scraping function
│   └── package.json       # Functions dependencies
├── src/
│   ├── components/        # React components
│   │   ├── Navbar.jsx
│   │   ├── StarRating.jsx
│   │   └── WebtoonCard.jsx
│   ├── pages/            # Page components
│   │   ├── Account.jsx
│   │   ├── AddWebtoon.jsx
│   │   ├── Auth.jsx
│   │   ├── Detail.jsx
│   │   ├── Feed.jsx
│   │   ├── Home.jsx
│   │   └── Search.jsx
│   ├── App.jsx           # Main app component
│   ├── firebase.js       # Firebase configuration
│   └── main.jsx          # React entry point
├── public/               # Static assets
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
└── package.json          # Project dependencies
```

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

The following environment variables should be set in `.env`:

- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID

## Firestore Security Rules

The application uses Firestore security rules to ensure:
- All database operations require authentication
- Users can only modify their own profiles
- Users can manage their own following relationships

## Troubleshooting

### Scraping Function Not Working

The application uses a hosted Firebase Cloud Function for scraping. If you encounter issues:

1. **Production mode (default)**: The app uses `https://us-central1-webtoon-tracker-demo.cloudfunctions.net/scrapeWebtoon`
2. Check your internet connection
3. Some websites may block automated scraping - if you get 403/429 errors, the site may be blocking the requests
4. The scraping has a 30-second timeout - if the website is slow, you may get a timeout error
5. Check the browser console for detailed error messages

**For development with emulators**:
1. Ensure Firebase emulators are running: `firebase emulators:start`
2. Check that the emulator ports match your configuration (default: 5001 for functions)
3. Verify the emulator connections are enabled in `src/firebase.js`
4. Update the function URLs in `src/pages/AddWebtoon.jsx` and `src/pages/Home.jsx` to use the emulator endpoint
5. **Important**: After making changes to `functions/index.js`, restart the Firebase emulators to apply the changes

### Build Issues

If you encounter build issues:

1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Check that Node.js version is 22 or higher
3. Verify all dependencies are installed in both root and functions directories

## License

ISC