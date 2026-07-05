import { useAppStore } from '&/useAppStore'
import { useState } from 'react'
import ItemContent from '%/items/ItemContent'
import ItemSidebar from '%/items/ItemSidebar'
import { ResizeHandle } from '%/ResizeHandle'

export default function ItemsPage() {
  const { mediaSidebarWidth, mediaViewMode, setMediaSidebarWidth, setMediaViewMode } = useAppStore()
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  return (
    <div className="flex h-full">
      <ItemSidebar selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} width={mediaSidebarWidth} />
      <ResizeHandle onResize={(delta) => setMediaSidebarWidth(mediaSidebarWidth + delta)} />
      <ItemContent
        selectedGroupId={selectedGroupId}
        viewMode={mediaViewMode}
        onViewModeChange={setMediaViewMode}
      />
    </div>
  )
}
