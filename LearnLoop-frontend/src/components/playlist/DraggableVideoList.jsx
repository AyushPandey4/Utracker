'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VideoCard from './VideoCard';

// Sortable Item Component
function SortableVideoItem({ 
  video, 
  onUpdateStatus, 
  onUpdateNote, 
  onUpdateTimeSpent, 
  onGenerateAiSummary, 
  onCopySummaryToNote,
  onStartTracking,
  onStopTracking,
  isTimeTracking,
  onTagsUpdate,
  onTogglePin,
  onToggleExpand,
  isExpanded,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: video.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="relative" {...attributes}>
      <div className="absolute top-2 left-2 z-10 cursor-grab bg-white dark:bg-gray-800 p-2 rounded-full shadow-md" {...listeners}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </div>
      <VideoCard 
        video={video}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onUpdateStatus={onUpdateStatus}
        onUpdateNote={onUpdateNote}
        onUpdateTimeSpent={onUpdateTimeSpent}
        onGenerateAiSummary={onGenerateAiSummary}
        onCopySummaryToNote={onCopySummaryToNote}
        onStartTracking={onStartTracking}
        onStopTracking={onStopTracking}
        isTimeTracking={isTimeTracking}
        onTagsUpdate={onTagsUpdate}
        onTogglePin={onTogglePin}
      />
    </div>
  );
}

export default function DraggableVideoList({
  videos,
  onUpdateStatus,
  onUpdateNote,
  onUpdateTimeSpent,
  onGenerateAiSummary,
  onCopySummaryToNote,
  onStartTracking,
  onStopTracking,
  activeTrackingId,
  onTagsUpdate,
  onTogglePin,
  onReorder,
  isCustomPlaylist,
}) {
  const [items, setItems] = useState([]);
  const [expandedVideoId, setExpandedVideoId] = useState(null);

  // Set up sensors for keyboard and pointer interactions
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Initialize items from videos prop
  useEffect(() => {
    if (videos) {
      setItems(videos);
    }
  }, [videos]);
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      // Update local state
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update positions based on new order
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          position: index
        }));
        
        // Send updated positions to server
        const positions = updatedItems.map((item, index) => ({
          id: item.id,
          position: index
        }));
        
        // Call the parent handler to update positions in the backend
        onReorder(positions);
        
        return updatedItems;
      });
    }
  };
  
  const handleToggleExpand = (videoId) => {
    if (expandedVideoId === videoId) {
      setExpandedVideoId(null);
    } else {
      setExpandedVideoId(videoId);
    }
  };
  
  if (!items || items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Videos Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          This playlist doesn't have any videos yet.
        </p>
      </div>
    );
  }
  
  // Only enable drag and drop if it's a custom playlist
  if (!isCustomPlaylist) {
    return (
      <div className="space-y-4">
        {items.map((video) => (
          <VideoCard 
            key={video.id}
            video={video}
            isExpanded={expandedVideoId === video.id}
            onToggleExpand={() => handleToggleExpand(video.id)}
            onUpdateStatus={(status) => onUpdateStatus(video.id, status)}
            onUpdateNote={(note) => onUpdateNote(video.id, note)}
            onUpdateTimeSpent={(time) => onUpdateTimeSpent(video.id, time)}
            onGenerateAiSummary={() => onGenerateAiSummary(video.id)}
            onCopySummaryToNote={() => onCopySummaryToNote(video.id)}
            onStartTracking={(videoId) => onStartTracking(videoId)}
            onStopTracking={(videoId) => onStopTracking(videoId)}
            isTimeTracking={activeTrackingId === video.id}
            onTagsUpdate={(videoId, tags) => onTagsUpdate(videoId, tags)}
            onTogglePin={() => onTogglePin(video.id)}
          />
        ))}
      </div>
    );
  }
  
  // Return draggable list for custom playlists
  return (
    <div className="relative">
      <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded">
        <h3 className="text-amber-800 dark:text-amber-300 font-medium">Custom Order Mode</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          Drag and drop videos to reorder them. The new order will be saved automatically.
        </p>
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {items.map((video) => (
              <SortableVideoItem
                key={video.id}
                video={video}
                isExpanded={expandedVideoId === video.id}
                onToggleExpand={() => handleToggleExpand(video.id)}
                onUpdateStatus={(status) => onUpdateStatus(video.id, status)}
                onUpdateNote={(note) => onUpdateNote(video.id, note)}
                onUpdateTimeSpent={(time) => onUpdateTimeSpent(video.id, time)}
                onGenerateAiSummary={() => onGenerateAiSummary(video.id)}
                onCopySummaryToNote={() => onCopySummaryToNote(video.id)}
                onStartTracking={(videoId) => onStartTracking(videoId)}
                onStopTracking={(videoId) => onStopTracking(videoId)}
                isTimeTracking={activeTrackingId === video.id}
                onTagsUpdate={(videoId, tags) => onTagsUpdate(videoId, tags)}
                onTogglePin={() => onTogglePin(video.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
} 