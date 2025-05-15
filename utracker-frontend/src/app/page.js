'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <main className="flex flex-col items-center max-w-5xl w-full px-4 py-12">
        <div className="flex items-center mb-6">
          <div className="bg-red-600 text-white p-2 rounded-lg mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Utracker</h1>
        </div>
        
        <h2 className="text-2xl font-medium text-center mb-6">Never lose track of your YouTube playlists again</h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12 w-full max-w-4xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Your YouTube Playlist Companion</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Utracker helps you organize, track, and manage all your YouTube playlists in one place. Keep track of what you've watched, what's next, and discover new content.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Track your watching progress",
                  "Organize playlists by category",
                  "Get notified about new videos",
                  "Sync across all your devices"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-90 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-6 w-full max-w-md justify-center">
          <button
            className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 font-medium shadow-lg transform transition hover:scale-105"
            onClick={() => router.push('/login')}
          >
            Get Started
          </button>
          <a
            className="rounded-full border-2 border-blue-600 text-blue-600 dark:text-blue-400 px-8 py-3 font-medium hover:bg-blue-50 dark:hover:bg-gray-800 transform transition hover:scale-105"
            href="#features"
          >
            Learn More
          </a>
        </div>
      </main>
      
      <footer className="w-full py-6 text-center border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
        <div className="container mx-auto">
          Utracker - YouTube Playlist Manager &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
