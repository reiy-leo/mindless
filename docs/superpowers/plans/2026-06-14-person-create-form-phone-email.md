# 新建人员表单添加邮箱和手机字段实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在新建人员表单中添加邮箱和手机字段，支持类似任务步骤的交互方式，允许同时输入备注。

**Architecture:** 创建新的 PhoneEmailListEditor 组件，支持内联添加手机/邮箱和备注。修改 PersonCreateForm 集成该组件，在保存人员后批量创建手机和邮箱记录。

**Tech Stack:** React, TypeScript, Tailwind CSS, TanStack Query

---

## 文件结构

### 新建文件
- `src/components/PhoneEmailListEditor.tsx` - 手机邮箱列表编辑器组件

### 修改文件
- `src/pages/PeoplePage.tsx` - 修改 PersonCreateForm 集成新组件
- `src/queries/usePersonQueries.ts` - 添加批量创建手机/邮箱的 mutation
- `src/lib/api.ts` - 添加批量创建手机/邮箱的 API 函数
- `src/types/person.ts` - 添加 PhoneEntry 和 EmailEntry 类型

---

## Task 1: 更新类型定义

**Files:**
- Modify: `src/types/person.ts:48`

- [ ] **Step 1: 添加 PhoneEntry 和 EmailEntry 类型**

```typescript
export interface PhoneEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}

export interface EmailEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}
```

- [ ] **Step 2: 验证类型定义**

运行 TypeScript 类型检查：
```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/types/person.ts
git commit -m "feat: add PhoneEntry and EmailEntry types"
```

---

## Task 2: 更新 API 函数

**Files:**
- Modify: `src/lib/api.ts:706-727`

- [ ] **Step 1: 添加批量创建手机的 API 函数**

在 `src/lib/api.ts` 文件末尾添加：

```typescript
export async function createPersonPhones(personId: string, phones: { phone: string; label: string }[]): Promise<PersonPhone[]> {
  const results: PersonPhone[] = [];
  for (const p of phones) {
    const result = await createPersonPhone({ personId, phone: p.phone, label: p.label });
    results.push(result);
  }
  return results;
}

export async function createPersonEmails(personId: string, emails: { email: string; label: string }[]): Promise<PersonEmail[]> {
  const results: PersonEmail[] = [];
  for (const e of emails) {
    const result = await createPersonEmail({ personId, email: e.email, label: e.label });
    results.push(result);
  }
  return results;
}
```

- [ ] **Step 2: 验证 API 函数**

运行 TypeScript 类型检查：
```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/api.ts
git commit -m "feat: add batch create phones and emails API"
```

---

## Task 3: 更新 Query Hooks

**Files:**
- Modify: `src/queries/usePersonQueries.ts:131`

- [ ] **Step 1: 添加批量创建的 mutation hooks**

在 `src/queries/usePersonQueries.ts` 文件末尾添加：

```typescript
export function useCreatePersonPhones() {
  return useMutation({
    mutationFn: (params: { personId: string; phones: { phone: string; label: string }[] }) =>
      api.createPersonPhones(params.personId, params.phones),
  });
}

export function useCreatePersonEmails() {
  return useMutation({
    mutationFn: (params: { personId: string; emails: { email: string; label: string }[] }) =>
      api.createPersonEmails(params.personId, params.emails),
  });
}
```

- [ ] **Step 2: 验证 Query Hooks**

运行 TypeScript 类型检查：
```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/queries/usePersonQueries.ts
git commit -m "feat: add batch create phones and emails mutations"
```

---

## Task 4: 创建 PhoneEmailListEditor 组件

**Files:**
- Create: `src/components/PhoneEmailListEditor.tsx`

- [ ] **Step 1: 创建组件文件**

创建 `src/components/PhoneEmailListEditor.tsx`：

```typescript
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import type { PhoneEntry, EmailEntry } from '@/types/person';

type EntryType = 'phone' | 'email';

interface PhoneEmailListEditorProps {
  type: EntryType;
  entries: PhoneEntry[] | EmailEntry[];
  onChange: (entries: PhoneEntry[] | EmailEntry[]) => void;
}

const PHONE_LABELS = ['手机', '工作', '家庭', '其他'];
const EMAIL_LABELS = ['邮箱', '工作', '个人', '其他'];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function PhoneEmailListEditor({ type, entries, onChange }: PhoneEmailListEditorProps) {
  const { t } = useTranslation('common');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newLabel, setNewLabel] = useState(type === 'phone' ? '手机' : '邮箱');
  const valueInputRef = useRef<HTMLInputElement>(null);

  const labels = type === 'phone' ? PHONE_LABELS : EMAIL_LABELS;
  const Icon = type === 'phone' ? PhoneIcon : EnvelopeIcon;
  const placeholder = type === 'phone' ? '输入手机号' : '输入邮箱地址';

  useEffect(() => {
    if (showAddForm && valueInputRef.current) {
      valueInputRef.current.focus();
    }
  }, [showAddForm]);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    
    const newEntry = {
      id: generateId(),
      label: newLabel,
      value: newValue.trim(),
      note: newNote.trim(),
    };

    onChange([...entries, newEntry as any]);
    setNewValue('');
    setNewNote('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewValue('');
      setNewNote('');
    }
  };

  return (
    <div className="space-y-2">
      {/* 已添加的条目列表 */}
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-2 group">
          <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
            {entry.label}
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
            {entry.value}
          </span>
          {entry.note && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              ({entry.note})
            </span>
          )}
          <button
            onClick={() => handleDelete(entry.id)}
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* 添加表单 */}
      {showAddForm ? (
        <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <select
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {labels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
            <input
              ref={valueInputRef}
              type={type === 'email' ? 'email' : 'tel'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="备注（可选）"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newValue.trim()}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewValue('');
                setNewNote('');
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          添加{type === 'phone' ? '手机号' : '邮箱'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证组件**

运行 TypeScript 类型检查：
```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/components/PhoneEmailListEditor.tsx
git commit -m "feat: create PhoneEmailListEditor component"
```

---

## Task 5: 修改 PersonCreateForm 组件

**Files:**
- Modify: `src/pages/PeoplePage.tsx:305-486`

- [ ] **Step 1: 更新 PersonCreateForm 的 onSave 类型**

修改 `src/pages/PeoplePage.tsx` 中的 `PersonCreateForm` 组件：

首先更新 `onSave` 的类型定义（第307-323行）：

```typescript
function PersonCreateForm({
    onSave,
    onCancel,
}: {
    onSave: (data: {
        name: string;
        englishName: string;
        nickname: string;
        birthday: string;
        lunarBirthday: string;
        foodTaboos: string;
        preferences: string;
        remark: string;
        avatar: string;
        phones: { phone: string; label: string }[];
        emails: { email: string; label: string }[];
    }) => void;
    onCancel: () => void;
}) {
```

- [ ] **Step 2: 添加手机邮箱状态**

在 `PersonCreateForm` 组件中添加状态（在第334行后）：

```typescript
    const [phones, setPhones] = useState<PhoneEntry[]>([]);
    const [emails, setEmails] = useState<EmailEntry[]>([]);
```

- [ ] **Step 3: 更新 handleSave 函数**

修改 `handleSave` 函数（第337-349行）：

```typescript
    const handleSave = () => {
        onSave({
            name: name || t("people.new_person"),
            englishName,
            nickname,
            birthday,
            lunarBirthday,
            foodTaboos,
            preferences,
            remark,
            avatar: avatarSeed,
            phones: phones.map(p => ({ phone: p.value, label: p.label })),
            emails: emails.map(e => ({ email: e.value, label: e.label })),
        });
    };
```

- [ ] **Step 4: 在表单中添加手机邮箱字段**

在 `PersonCreateForm` 的表单内容中（第467行后，备注字段之后）添加：

```typescript
                {/* Phones */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        <div className="flex items-center gap-1">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            手机号
                        </div>
                    </label>
                    <PhoneEmailListEditor
                        type="phone"
                        entries={phones}
                        onChange={setPhones}
                    />
                </div>

                {/* Emails */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        <div className="flex items-center gap-1">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            邮箱
                        </div>
                    </label>
                    <PhoneEmailListEditor
                        type="email"
                        entries={emails}
                        onChange={setEmails}
                    />
                </div>
```

- [ ] **Step 5: 添加导入**

在文件顶部的导入中添加 `PhoneEmailListEditor`：

```typescript
import { PhoneEmailListEditor } from "@/components/PhoneEmailListEditor";
```

- [ ] **Step 6: 验证修改**

运行 TypeScript 类型检查：
```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 7: 提交**

```bash
git add src/pages/PeoplePage.tsx
git commit -m "feat: integrate PhoneEmailListEditor into PersonCreateForm"
```

---

## Task 6: 修改 handleSaveNewPerson 函数

**Files:**
- Modify: `src/pages/PeoplePage.tsx:640-683`

- [ ] **Step 1: 更新 handleSaveNewPerson 函数**

修改 `handleSaveNewPerson` 函数以处理手机和邮箱数据：

```typescript
    const handleSaveNewPerson = useCallback(
        (data: {
            name: string;
            englishName: string;
            nickname: string;
            birthday: string;
            lunarBirthday: string;
            foodTaboos: string;
            preferences: string;
            remark: string;
            avatar: string;
            phones: { phone: string; label: string }[];
            emails: { email: string; label: string }[];
        }) => {
            createPerson.mutate(
                {
                    name: data.name,
                    englishName: data.englishName,
                    nickname: data.nickname,
                    birthday: data.birthday,
                    lunarBirthday: data.lunarBirthday,
                    foodTaboos: data.foodTaboos,
                    preferences: data.preferences,
                    remark: data.remark,
                    avatar: data.avatar,
                    groupId: selectedGroupId || undefined,
                },
                {
                    onSuccess: (newPerson) => {
                        // 批量创建手机号
                        if (data.phones.length > 0) {
                            createPersonPhones.mutate({
                                personId: newPerson.id,
                                phones: data.phones,
                            });
                        }
                        // 批量创建邮箱
                        if (data.emails.length > 0) {
                            createPersonEmails.mutate({
                                personId: newPerson.id,
                                emails: data.emails,
                            });
                        }
                        queryClient.invalidateQueries({ queryKey: ["persons"] });
                        queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                        setShowPersonForm(false);
                    },
                    onError: (err) => {
                        console.error("Failed to create person:", err);
                    },
                },
            );
        },
        [selectedGroupId, createPerson, createPersonPhones, createPersonEmails, queryClient],
    );
```

- [ ] **Step 2: 添加 mutation hooks**

在 `PeoplePage` 组件中添加 mutation hooks（在第522行后）：

```typescript
    const createPersonPhones = useCreatePersonPhones();
    const createPersonEmails = useCreatePersonEmails();
```

- [ ] **Step 3: 添加导入**

在文件顶部的导入中添加：

```typescript
import {
    // ... 现有导入
    useCreatePersonPhones,
    useCreatePersonEmails,
} from "@/queries/usePersonQueries";
```

- [ ] **Step 4: 验证修改**

运行 TypeScript 类型检查：
```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 5: 提交**

```bash
git add src/pages/PeoplePage.tsx
git commit -m "feat: handle phones and emails in handleSaveNewPerson"
```

---

## Task 7: 测试和验证

- [ ] **Step 1: 运行开发服务器**

```bash
npm run tauri dev
```

- [ ] **Step 2: 测试新建人员流程**

1. 点击新建人员按钮
2. 填写姓名等基本信息
3. 添加一个手机号（选择"手机"标签，输入手机号，添加备注）
4. 添加一个邮箱（选择"邮箱"标签，输入邮箱，添加备注）
5. 点击保存
6. 验证人员创建成功
7. 验证手机号和邮箱显示在人员详情中

- [ ] **Step 3: 运行类型检查**

```bash
npm run typecheck
```

预期：无类型错误

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: add phone and email fields to person create form"
```

---

## 验收标准

- [ ] 新建人员表单显示手机和邮箱字段
- [ ] 可以添加多个手机和邮箱
- [ ] 每次输入时可以同时输入备注
- [ ] 按Enter或点击保存提交
- [ ] 可以删除已添加的条目
- [ ] 字段为可选，不填也能创建人员
- [ ] 创建后手机号和邮箱显示在人员详情中
