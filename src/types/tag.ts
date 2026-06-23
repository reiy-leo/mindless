// Tag types

export interface Tag {
  id: string;
  name: string;
  color: string;                // 标签颜色 (#RRGGBB)
  emoji: string;                // emoji图标
  parentId?: string;            // 父标签ID
  level: number;                // 层级深度 (0-3)
  sortOrder: number;
  atom: boolean;                // 原子标签（不可修改/删除/展示）
  children?: Tag[];             // 子标签 (树形结构)
  createdAt: string;
  updatedAt: string;
}

// 标签树形结构 (最多4级)
export interface TagTree {
  [tagId: string]: Tag & { children: TagTree };
}
