'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { PlaylistProvider } from '../context/PlaylistContext';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in environment variables');
}

export default function Providers({ children }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
        <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Configuration Error</h2>
        <p className="text-red-700 dark:text-red-300 mb-4">
          Missing Google OAuth Client ID. Please follow these steps to fix it:
        </p>
        <ol className="list-decimal list-inside text-red-700 dark:text-red-300 space-y-2">
          <li>Create a <code className="bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded">.env.local</code> file in the project root</li>
          <li>Add the following line:<br />
            <code className="block bg-red-100 dark:bg-red-900 p-2 my-2 rounded">
              NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
            </code>
          </li>
          <li>Restart the development server</li>
        </ol>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <PlaylistProvider>
            {children}
          </PlaylistProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
} 