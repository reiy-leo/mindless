import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ResizeHandle } from '@/components/ResizeHandle';
import MediaSidebar from '@/components/media/MediaSidebar';
import MediaContent from '@/components/media/MediaContent';

type SmartGroupId = 'all' | 'favorites' | 'normal' | 'watched' | 'archived';

export default function MediaPage() {
  const { mediaSidebarWidth, mediaViewMode, setMediaSidebarWidth, setMediaViewMode } = useAppStore();

  const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const handleSelectSmartGroup = (groupId: SmartGroupId) => {
    setSelectedSmartGroup(groupId);
    setSelectedGroupId(null);
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedSmartGroup(null);
    setSelectedGroupId(groupId);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <MediaSidebar
        selectedSmartGroup={selectedSmartGroup}
        selectedGroupId={selectedGroupId}
        onSelectSmartGroup={handleSelectSmartGroup}
        onSelectGroup={handleSelectGroup}
        width={mediaSidebarWidth}
      />

      {/* Resize Handle */}
      <ResizeHandle
        onResize={(delta) => setMediaSidebarWidth(mediaSidebarWidth + delta)}
      />

      {/* Content */}
      <MediaContent
        selectedSmartGroup={selectedSmartGroup}
        selectedGroupId={selectedGroupId}
        viewMode={mediaViewMode}
        onViewModeChange={setMediaViewMode}
      />
    </div>
  );
}
