'use client';

export default function PlaylistHeader({ playlist, onMarkAllComplete }) {
  // Format minutes as hours and minutes
  const formatTime = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };
  
  // Calculate total time spent on this playlist
  const getTotalTimeSpent = () => {
    if (!playlist.videos || playlist.videos.length === 0) return 0;
    return playlist.videos.reduce((total, video) => total + (video.timeSpent || 0), 0);
  };
  
  // Count total notes
  const getTotalNotes = () => {
    if (!playlist.videos) return 0;
    return playlist.videos.filter(video => video.notes && video.notes.trim()).length;
  };
  
  const totalTimeSpent = getTotalTimeSpent();
  const totalNotes = getTotalNotes();
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5 mb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
            {playlist.name}
          </h1>
          <div className="flex items-center mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2">
              {playlist.category}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {playlist.totalVideos} videos
            </span>
          </div>
        </div>
        
        <button
          onClick={onMarkAllComplete}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Mark All as Complete
        </button>
      </div>
      
      {/* Stats Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Videos</div>
            <div className="font-semibold text-gray-800 dark:text-white">
              {playlist.completedVideos}/{playlist.totalVideos} completed
            </div>
          </div>
        </div>
        
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time Spent</div>
            <div className="font-semibold text-gray-800 dark:text-white">{formatTime(totalTimeSpent)}</div>
          </div>
        </div>
        
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Notes</div>
            <div className="font-semibold text-gray-800 dark:text-white">{totalNotes} videos with notes</div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-1 flex justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{playlist.progress}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
        <div
          className={`h-2.5 rounded-full ${
            playlist.progress === 100 ? 'bg-green-600' : 'bg-blue-600'
          }`}
          style={{ width: `${playlist.progress}%` }}
        ></div>
      </div>
    </div>
  );
} 