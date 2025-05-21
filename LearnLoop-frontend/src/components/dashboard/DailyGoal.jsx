'use client';

import { useState, useEffect } from 'react';

export default function DailyGoal({ dailyGoal, onUpdate }) {
  const [goal, setGoal] = useState(dailyGoal || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setGoal(dailyGoal || '');
  }, [dailyGoal]);

  const handleUpdate = async () => {
    try {
      setIsSaving(true);
      await onUpdate(goal);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating daily goal:', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <span className="text-2xl mr-2">📝</span>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your Daily Goal</h2>
      </div>

      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What's your learning goal for today?"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setGoal(dailyGoal || '');
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSaving}
                className={`px-3 py-1.5 text-sm bg-green-600 text-white rounded-md transition-colors ${
                  isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'
                }`}
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Goal'}
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="min-h-[100px] px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-text hover:border-green-300 dark:hover:border-green-600 transition-colors"
          >
            {goal ? (
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{goal}</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Click here to set your daily learning goal...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 