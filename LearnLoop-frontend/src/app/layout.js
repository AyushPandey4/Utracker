import "./globals.css";
import Providers from "./Providers";
import Navbar from "@/components/Navbar";
import { cookies } from 'next/headers';

export const metadata = {
  title: 'LearnLoop - Your Learning Journey Companion',
  description: 'Track, organize, and enhance your learning journey with LearnLoop. Manage your notes, videos, and playlists in one place.',
  keywords: 'learning, education, notes, videos, playlists, organization, productivity',
};

export default function RootLayout({ children }) {
  // Check if we're on the dashboard route - this runs at build time
  // so we're using a more generic approach with cookies or URL paths
  const isDashboard = false; // Will be dynamically determined by client components
  
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Providers>
          {/* Navbar will be conditionally shown by the client component */}
          <div id="navbar-container">
            <Navbar />
          </div>
          <main className="pt-16 dashboard:pt-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
