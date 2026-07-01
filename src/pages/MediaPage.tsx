import { useAppStore } from '&/useAppStore'
import { useState } from 'react'
import MediaContent from '%/media/MediaContent'
import MediaSidebar from '%/media/MediaSidebar'
import { ResizeHandle } from '%/ResizeHandle'

type SmartGroupId = 'all' | 'favorites' | 'unwatched' | 'planned' | 'normal' | 'watched' | 'archived'

export default function MediaPage() {
  const { mediaSidebarWidth, mediaViewMode, setMediaSidebarWidth, setMediaViewMode } = useAppStore()

  const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const handleSelectSmartGroup = (groupId: SmartGroupId) => {
    setSelectedSmartGroup(groupId)
    setSelectedGroupId(null)
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedSmartGroup(null)
    setSelectedGroupId(groupId)
  }

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
      <ResizeHandle onResize={(delta) => setMediaSidebarWidth(mediaSidebarWidth + delta)} />

      {/* Content */}
      <MediaContent
        selectedSmartGroup={selectedSmartGroup}
        selectedGroupId={selectedGroupId}
        viewMode={mediaViewMode}
        onViewModeChange={setMediaViewMode}
      />
    </div>
  )
}
