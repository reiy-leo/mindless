import { useAppStore } from '&/useAppStore'
import { useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDisplayDate, formatTime } from '@/lib/formatUtils'
import {
  useAllPersons,
  useCreatePerson,
  useCreatePersonEmail,
  useCreatePersonEmails,
  useCreatePersonGroup,
  useCreatePersonOtherName,
  useCreatePersonPhone,
  useCreatePersonPhones,
  useDeletePerson,
  useDeletePersonEmail,
  useDeletePersonGroup,
  useDeletePersonOtherName,
  useDeletePersonPhone,
  usePersonEmails,
  usePersonGroups,
  usePersonOtherNames,
  usePersonPhones,
  usePersons,
  useUpdatePerson,
  useUpdatePersonGroup,
} from '@/queries/usePersonQueries'
import { useCreateTag, useTags } from '@/queries/useTaskQueries'
import type { EmailEntry, OtherNameEntry, Person, PersonGroup, PhoneEntry } from '@/types/person'
import PhoneEmailListEditor from '%/PhoneEmailListEditor'
import { AvatarImage } from '%/people/AvatarImage'
import { ResizeHandle } from '%/ResizeHandle'
import SimpleListEditor from '%/SimpleListEditor'
import TagCombobox from '%/TagCombobox'
import GroupFormPopup from '%/ui/GroupFormPopup'

// ==================== Helper ====================
const ICON_KEY_TO_EMOJI: Record<string, string> = {
  book: '📖',
  briefcase: '💼',
  fire: '🔥',
  flag: '🚩',
  folder: '📁',
  heart: '❤️',
  home: '🏠',
  star: '⭐',
  target: '🎯',
  users: '👥',
}

function resolveIcon(icon?: string): string {
  if (!icon) return '👥'
  if (icon.length <= 2) return icon
  return ICON_KEY_TO_EMOJI[icon] || '👥'
}

const AVATAR_SEEDS = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Hank',
  'Ivy',
  'Jack',
  'Kate',
  'Leo',
  'Mia',
  'Nick',
  'Olivia',
  'Paul',
  'Quinn',
  'Rose',
  'Sam',
  'Tina',
  'Uma',
  'Vince',
  'Wendy',
  'Xander',
  'Bryan',
  'Elisa',
]

// ==================== Smart Groups ====================
type SmartGroupId = 'favorites' | 'all' | 'archived'

const SMART_GROUPS: { id: SmartGroupId; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { icon: Star, id: 'favorites', labelKey: 'people.smart_groups.favorites' },
  { icon: BookOpen, id: 'all', labelKey: 'people.smart_groups.all' },
  { icon: Archive, id: 'archived', labelKey: 'people.smart_groups.archived' },
]

// ==================== Avatar Picker ====================

function AvatarPicker({
  avatarButtonRef,
  onSelect,
  onClose,
}: {
  avatarButtonRef: React.RefObject<HTMLDivElement>
  onSelect: (seed: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const clickedOutsidePicker = ref.current && !ref.current.contains(e.target as Node)
      const clickedAvatarButton = avatarButtonRef.current?.contains(e.target as Node)
      if (clickedOutsidePicker && !clickedAvatarButton) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, avatarButtonRef])

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 w-87.5 h-75 overflow-y-auto"
    >
      <div className="grid grid-cols-5 gap-2">
        {AVATAR_SEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(s)
              onClose()
            }}
            className="w-14 h-14 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all p-0"
          >
            <AvatarImage seed={s} size={56} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================== Person Create Form ====================

function PersonCreateForm({
  onSave,
  onCancel,
  defaultGroupId,
  personGroups,
}: {
  onSave: (data: {
    name: string
    otherNames: { name: string; label: string }[]
    birthday: string
    lunarBirthday: string
    foodTaboos: string[]
    preferences: string[]
    remark: string
    avatar: string
    phones: { phone: string; label: string }[]
    emails: { email: string; label: string }[]
    groupId?: string
  }) => void
  onCancel: () => void
  defaultGroupId?: string | null
  personGroups?: PersonGroup[]
}) {
  const { t } = useTranslation('common')
  const [name, setName] = useState('')
  const [otherNames, setOtherNames] = useState<OtherNameEntry[]>([])
  const [birthday, setBirthday] = useState('')
  const [lunarBirthday, setLunarBirthday] = useState('')
  const [foodTaboos, setFoodTaboos] = useState<string[]>([])
  const [preferences, setPreferences] = useState<string[]>([])
  const [remark, setRemark] = useState('')
  const [avatarSeed, setAvatarSeed] = useState('beam')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const avatarButtonRef = useRef<HTMLDivElement>(null)
  const [phones, setPhones] = useState<PhoneEntry[]>([])
  const [emails, setEmails] = useState<EmailEntry[]>([])
  const [groupId, setGroupId] = useState<string>(defaultGroupId || '')

  const handleSave = () => {
    onSave({
      avatar: avatarSeed,
      birthday,
      emails: emails.map((e) => ({ email: e.value, label: e.label })),
      foodTaboos,
      groupId: groupId || undefined,
      lunarBirthday,
      name: name || t('people.new_person'),
      otherNames: otherNames.map((n) => ({ label: n.label, name: n.value })),
      phones: phones.map((p) => ({ label: p.label, phone: p.value })),
      preferences,
      remark,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative group cursor-pointer" onMouseDown={() => setShowAvatarPicker((prev) => !prev)}>
            <AvatarImage avatarRef={avatarButtonRef} seed={name || avatarSeed || 'default'} size={48} />
            {showAvatarPicker && (
              <AvatarPicker
                avatarButtonRef={avatarButtonRef}
                onSelect={(value) => {
                  setAvatarSeed(value)
                  setShowAvatarPicker(false)
                }}
                onClose={() => setShowAvatarPicker(false)}
              />
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('people.detail.name_placeholder')}
            className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave()
              }
              if (e.key === 'Escape') {
                onCancel()
              }
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
        {/* Other Names */}
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="other names"
            aria-labelledby="other names"
          >
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {t('people.detail.other_names')}
            </div>
          </label>
          <PhoneEmailListEditor type="other_name" entries={otherNames} onChange={setOtherNames} />
        </div>
        {/* Group */}
        {personGroups && personGroups.length > 0 && (
          <div>
            <label
              className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              htmlFor="groups"
              aria-labelledby="groups"
            >
              人员组
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">未分组</option>
              {personGroups
                .filter((g) => !g.isArchived)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {resolveIcon(group.icon)} {group.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="birthdays"
            aria-labelledby="birthdays"
          >
            生日
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="lunar birthdays"
            aria-labelledby="lunar birthdays"
          >
            农历生日
          </label>
          <input
            type="text"
            value={lunarBirthday}
            onChange={(e) => setLunarBirthday(e.target.value)}
            placeholder="例：腊月初八"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {/* Phones */}
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="phones"
            aria-labelledby="phones"
          >
            <div className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              手机号
            </div>
          </label>
          <PhoneEmailListEditor type="phone" entries={phones} onChange={setPhones} />
        </div>

        {/* Emails */}
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="emails"
            aria-labelledby="emails"
          >
            <div className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              邮箱
            </div>
          </label>
          <PhoneEmailListEditor type="email" entries={emails} onChange={setEmails} />
        </div>
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="dislikes"
            aria-labelledby="dislikes"
          >
            忌口
          </label>
          <SimpleListEditor items={foodTaboos} onChange={setFoodTaboos} placeholder="输入忌口，按回车添加" />
        </div>
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="likes"
            aria-labelledby="likes"
          >
            偏好
          </label>
          <SimpleListEditor items={preferences} onChange={setPreferences} placeholder="输入偏好，按回车添加" />
        </div>
        <div>
          <label
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            htmlFor="note"
            aria-labelledby="note"
          >
            {t('people.detail.remark')}
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t('people.detail.remark_placeholder')}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

// ==================== Main Page ====================

export default function PeoplePage() {
  const { t } = useTranslation('common')
  const {
    personGroupsPanelWidth,
    detailPanelWidth,
    setPersonGroupsPanelWidth,
    setDetailPanelWidth,
    dateFormat,
    timeFormat,
  } = useAppStore()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (containerWidth <= 0) return
    const available = containerWidth - personGroupsPanelWidth - 8
    if (available < 500) {
      setDetailPanelWidth(Math.max(200, Math.min(300, available - 200)))
    } else {
      setDetailPanelWidth((w) => Math.max(200, Math.min(300, w)))
    }
  }, [containerWidth, personGroupsPanelWidth])

  // State
  const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PersonGroup | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6')
  const [newGroupIcon, setNewGroupIcon] = useState('👥')
  const [showPersonForm, setShowPersonForm] = useState(false)
  const [showDetailAvatarPicker, setShowDetailAvatarPicker] = useState(false)
  const detailAvatarButtonRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const [personContextMenu, setPersonContextMenu] = useState<{ x: number; y: number; person: Person } | null>(null)
  const [groupFormTriggerRect, setGroupFormTriggerRect] = useState<DOMRect | null>(null)

  // Data
  const { data: persons = [] } = usePersons()
  const { data: allPersons = [] } = useAllPersons()
  const { data: personGroups = [] } = usePersonGroups()
  const { data: allTags = [] } = useTags()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  const deletePerson = useDeletePerson()
  const createPersonGroup = useCreatePersonGroup()
  const updatePersonGroup = useUpdatePersonGroup()
  const deletePersonGroup = useDeletePersonGroup()
  const createPersonPhones = useCreatePersonPhones()
  const createPersonEmails = useCreatePersonEmails()
  const createPersonPhone = useCreatePersonPhone()
  const deletePersonPhone = useDeletePersonPhone()
  const createPersonEmail = useCreatePersonEmail()
  const deletePersonEmail = useDeletePersonEmail()
  const createTag = useCreateTag()

  // Phones & Emails for selected person
  const selectedPerson = useMemo(
    () => allPersons.find((p) => p.id === selectedPersonId) || null,
    [allPersons, selectedPersonId],
  )
  const { data: phonesData } = usePersonPhones(selectedPersonId || undefined)
  const phones = phonesData ?? []
  const { data: emailsData } = usePersonEmails(selectedPersonId || undefined)
  const emails = emailsData ?? []
  const { data: otherNamesData } = usePersonOtherNames(selectedPersonId || undefined)
  const otherNames = otherNamesData ?? []
  const createPersonOtherName = useCreatePersonOtherName()
  const deletePersonOtherName = useDeletePersonOtherName()

  // Detail local state
  const [localName, setLocalName] = useState('')
  const [localBirthday, setLocalBirthday] = useState('')
  const [localLunarBirthday, setLocalLunarBirthday] = useState('')
  const [localFoodTaboos, setLocalFoodTaboos] = useState<string[]>([])
  const [localPreferences, setLocalPreferences] = useState<string[]>([])
  const [localPhones, setLocalPhones] = useState<PhoneEntry[]>([])
  const [localEmails, setLocalEmails] = useState<EmailEntry[]>([])
  const [localOtherNames, setLocalOtherNames] = useState<OtherNameEntry[]>([])
  const [localRemark, setLocalRemark] = useState('')
  const [showOtherNamesAdd, setShowOtherNamesAdd] = useState(false)
  const [showPhonesAdd, setShowPhonesAdd] = useState(false)
  const [showEmailsAdd, setShowEmailsAdd] = useState(false)
  const [showFoodTaboosAdd, setShowFoodTaboosAdd] = useState(false)
  const [showPreferencesAdd, setShowPreferencesAdd] = useState(false)
  const lastSyncedRef = useRef<string | null>(null)
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const birthdayDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lunarBirthdayDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remarkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when selected person changes (by ID, not by reference)
  useEffect(() => {
    if (selectedPersonId && selectedPerson && selectedPersonId !== lastSyncedRef.current) {
      lastSyncedRef.current = selectedPersonId
      setLocalName(selectedPerson.name || '')
      setLocalBirthday(selectedPerson.birthday || '')
      setLocalLunarBirthday(selectedPerson.lunarBirthday || '')
      setLocalFoodTaboos(selectedPerson.foodTaboos ? selectedPerson.foodTaboos.split(',') : [])
      setLocalPreferences(selectedPerson.preferences ? selectedPerson.preferences.split(',') : [])
      setLocalPhones(phones.map((p) => ({ id: p.id, label: p.label, note: '', value: p.phone })))
      setLocalEmails(emails.map((e) => ({ id: e.id, label: e.label, note: '', value: e.email })))
      setLocalOtherNames(otherNames.map((n) => ({ id: n.id, label: n.label || '别名', note: '', value: n.name })))
      setLocalRemark(selectedPerson.remark || '')
    }
    if (!selectedPersonId) {
      lastSyncedRef.current = null
      setLocalName('')
      setLocalBirthday('')
      setLocalLunarBirthday('')
      setLocalFoodTaboos([])
      setLocalPreferences([])
      setLocalPhones([])
      setLocalEmails([])
      setLocalOtherNames([])
      setLocalRemark('')
    }
  }, [selectedPersonId]) // Only re-sync when selectedPersonId changes

  // Sync phones/emails/otherNames when query data arrives (first load per person)
  const phonesLoadedRef = useRef<string | null>(null)
  const emailsLoadedRef = useRef<string | null>(null)
  const otherNamesLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedPersonId && phones.length > 0 && phonesLoadedRef.current !== selectedPersonId) {
      phonesLoadedRef.current = selectedPersonId
      setLocalPhones(phones.map((p) => ({ id: p.id, label: p.label, note: '', value: p.phone })))
    }
    if (!selectedPersonId) phonesLoadedRef.current = null
  }, [phones, selectedPersonId])

  useEffect(() => {
    if (selectedPersonId && emails.length > 0 && emailsLoadedRef.current !== selectedPersonId) {
      emailsLoadedRef.current = selectedPersonId
      setLocalEmails(emails.map((e) => ({ id: e.id, label: e.label, note: '', value: e.email })))
    }
    if (!selectedPersonId) emailsLoadedRef.current = null
  }, [emails, selectedPersonId])

  useEffect(() => {
    if (selectedPersonId && otherNames.length > 0 && otherNamesLoadedRef.current !== selectedPersonId) {
      otherNamesLoadedRef.current = selectedPersonId
      setLocalOtherNames(otherNames.map((n) => ({ id: n.id, label: n.label || '别名', note: '', value: n.name })))
    }
    if (!selectedPersonId) otherNamesLoadedRef.current = null
  }, [otherNames, selectedPersonId])

  const debounceSave = useCallback(
    (field: string, value: string, ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
      if (!selectedPersonId) return
      if (ref.current) clearTimeout(ref.current)
      ref.current = setTimeout(() => {
        updatePerson.mutate(
          { id: selectedPersonId, [field]: value },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['persons'] })
              queryClient.invalidateQueries({ queryKey: ['allPersons'] })
            },
          },
        )
      }, 500)
    },
    [selectedPersonId, updatePerson, queryClient],
  )

  // Smart group counts
  const smartGroupCounts = useMemo(() => {
    return {
      all: allPersons.filter((p) => !p.isArchived).length,
      archived: allPersons.filter((p) => p.isArchived).length,
      favorites: allPersons.filter((p) => p.isPinned && !p.isArchived).length,
    }
  }, [allPersons])

  // Filter persons based on selection
  const filteredPersons = useMemo(() => {
    let result: Person[]

    if (selectedSmartGroup === 'favorites') {
      result = allPersons.filter((p) => p.isPinned && !p.isArchived)
    } else if (selectedSmartGroup === 'all') {
      result = persons.filter((p) => !p.isArchived)
    } else if (selectedSmartGroup === 'archived') {
      result = allPersons.filter((p) => p.isArchived)
    } else if (selectedGroupId) {
      result = persons.filter((p) => p.groupId === selectedGroupId && !p.isArchived)
    } else {
      result = persons.filter((p) => !p.isArchived)
    }

    return result
  }, [persons, allPersons, selectedSmartGroup, selectedGroupId])

  // Handlers
  const handleSelectGroup = useCallback((smartId: SmartGroupId) => {
    setSelectedSmartGroup(smartId)
    setSelectedGroupId(null)
    setSelectedPersonId(null)
  }, [])

  const handleSelectPersonGroup = useCallback((groupId: string) => {
    setSelectedSmartGroup(null)
    setSelectedGroupId(groupId)
    setSelectedPersonId(null)
  }, [])

  const handleCreatePerson = useCallback(() => {
    setShowPersonForm(true)
    setSelectedPersonId(null)
  }, [])

  const handleSaveNewPerson = useCallback(
    (data: {
      name: string
      otherNames: { name: string; label: string }[]
      birthday: string
      lunarBirthday: string
      foodTaboos: string[]
      preferences: string[]
      remark: string
      avatar: string
      phones: { phone: string; label: string }[]
      emails: { email: string; label: string }[]
      groupId?: string
    }) => {
      createPerson.mutate(
        {
          avatar: data.avatar,
          birthday: data.birthday,
          foodTaboos: data.foodTaboos.join(','),
          groupId: data.groupId || selectedGroupId || undefined,
          lunarBirthday: data.lunarBirthday,
          name: data.name,
          preferences: data.preferences.join(','),
          remark: data.remark,
        },
        {
          onError: (err) => {
            console.error('Failed to create person:', err)
          },
          onSuccess: (newPerson) => {
            // 批量创建手机号
            if (data.phones.length > 0) {
              createPersonPhones.mutate({
                personId: newPerson.id,
                phones: data.phones,
              })
            }
            // 批量创建邮箱
            if (data.emails.length > 0) {
              createPersonEmails.mutate({
                emails: data.emails,
                personId: newPerson.id,
              })
            }
            // Batch create other names
            if (data.otherNames.length > 0) {
              data.otherNames.forEach((n) => {
                createPersonOtherName.mutate({
                  label: n.label,
                  name: n.name,
                  personId: newPerson.id,
                })
              })
            }
            queryClient.invalidateQueries({ queryKey: ['persons'] })
            queryClient.invalidateQueries({ queryKey: ['allPersons'] })
            setShowPersonForm(false)
            setSelectedPersonId(newPerson.id)
          },
        },
      )
    },
    [selectedGroupId, createPerson, createPersonPhones, createPersonEmails, createPersonOtherName, queryClient],
  )

  const handleCancelNewPerson = useCallback(() => {
    setShowPersonForm(false)
  }, [])

  const handleDeletePerson = useCallback(
    (id: string) => {
      if (!window.confirm(t('people.delete_confirm'))) return
      deletePerson.mutate(id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['persons'] })
          queryClient.invalidateQueries({ queryKey: ['allPersons'] })
        },
      })
      if (selectedPersonId === id) setSelectedPersonId(null)
    },
    [deletePerson, selectedPersonId, queryClient, t],
  )

  const handleTogglePin = useCallback(
    (person: Person) => {
      updatePerson.mutate(
        { id: person.id, isPinned: !person.isPinned },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['persons'] })
            queryClient.invalidateQueries({ queryKey: ['allPersons'] })
          },
        },
      )
    },
    [updatePerson, queryClient],
  )

  const handleToggleArchive = useCallback(
    (person: Person) => {
      updatePerson.mutate(
        { id: person.id, isArchived: !person.isArchived },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['persons'] })
            queryClient.invalidateQueries({ queryKey: ['allPersons'] })
          },
        },
      )
    },
    [updatePerson, queryClient],
  )

  const handleCopyPerson = useCallback(
    (person: Person) => {
      createPerson.mutate(
        {
          birthday: person.birthday,
          foodTaboos: person.foodTaboos,
          groupId: person.groupId,
          lunarBirthday: person.lunarBirthday,
          name: `${person.name} (副本)`,
          preferences: person.preferences,
          remark: person.remark,
          tagIds: person.tagIds,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['persons'] })
            queryClient.invalidateQueries({ queryKey: ['allPersons'] })
          },
        },
      )
    },
    [createPerson, queryClient],
  )

  const handlePersonContextMenu = useCallback((e: React.MouseEvent, person: Person) => {
    e.preventDefault()
    e.stopPropagation()
    setPersonContextMenu({ person, x: e.clientX, y: e.clientY })
  }, [])

  // Person Group CRUD
  const handleCreateGroup = useCallback(
    (result: { name: string; icon: string; color: string }) => {
      if (!result.name.trim()) return
      createPersonGroup.mutate(
        { color: result.color, icon: result.icon, name: result.name.trim() },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personGroups'] })
            setShowGroupForm(false)
          },
        },
      )
    },
    [createPersonGroup, queryClient],
  )

  const handleEditGroup = useCallback((e: React.MouseEvent, group: PersonGroup) => {
    e.stopPropagation()
    setEditingGroup(group)
    setNewGroupName(group.name)
    setNewGroupColor(group.color || '#3B82F6')
    setNewGroupIcon(group.icon || '👥')
    const rect =
      (e.currentTarget as HTMLElement).closest('button')?.getBoundingClientRect() ||
      (e.currentTarget as HTMLElement).getBoundingClientRect()
    setGroupFormTriggerRect(rect)
    setShowGroupForm(true)
  }, [])

  const handleUpdateGroup = useCallback(
    (result: { name: string; icon: string; color: string }) => {
      if (!editingGroup || !result.name.trim()) return
      updatePersonGroup.mutate(
        { color: result.color, icon: result.icon, id: editingGroup.id, name: result.name.trim() },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personGroups'] })
            setEditingGroup(null)
            setShowGroupForm(false)
          },
        },
      )
    },
    [editingGroup, updatePersonGroup, queryClient],
  )

  const handleToggleGroupPin = useCallback(
    (id: string) => {
      const group = personGroups.find((g) => g.id === id)
      if (group) {
        updatePersonGroup.mutate(
          { id, isPinned: !group.isPinned },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['personGroups'] })
            },
          },
        )
      }
      setContextMenu(null)
    },
    [personGroups, updatePersonGroup, queryClient],
  )

  const handleArchiveGroup = useCallback(
    (id: string) => {
      const group = personGroups.find((g) => g.id === id)
      if (group) {
        updatePersonGroup.mutate(
          { id, isArchived: !group.isArchived },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['personGroups'] })
            },
          },
        )
      }
      setContextMenu(null)
    },
    [personGroups, updatePersonGroup, queryClient],
  )

  const handleDeleteGroup = useCallback(
    (id: string) => {
      if (!window.confirm(t('people.groups.delete_confirm'))) return
      deletePersonGroup.mutate(id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['personGroups'] })
          queryClient.invalidateQueries({ queryKey: ['persons'] })
          queryClient.invalidateQueries({ queryKey: ['allPersons'] })
        },
      })
      if (selectedGroupId === id) {
        setSelectedGroupId(null)
        setSelectedSmartGroup('all')
      }
      setContextMenu(null)
    },
    [deletePersonGroup, selectedGroupId, queryClient, t],
  )

  // Context menu
  const handleGroupContextMenu = useCallback((e: React.MouseEvent, groupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ id: groupId, x: e.clientX, y: e.clientY })
  }, [])

  // Panel resize
  useEffect(() => {
    let prevWidth = window.innerWidth
    const handleResize = () => {
      const newWidth = window.innerWidth
      const delta = newWidth - prevWidth
      prevWidth = newWidth
      if (delta !== 0) {
        setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)))
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setDetailPanelWidth])

  // Active group label
  const activeLabel = useMemo(() => {
    if (selectedSmartGroup) {
      return t(`people.smart_groups.${selectedSmartGroup}`)
    }
    if (selectedGroupId) {
      const group = personGroups.find((g) => g.id === selectedGroupId)
      return group ? `${resolveIcon(group.icon)} ${group.name}` : ''
    }
    return t('people.smart_groups.all')
  }, [selectedSmartGroup, selectedGroupId, personGroups, t])

  // Tag helpers
  const parseTagIds = useCallback((tagIds?: string): string[] => {
    if (!tagIds) return []
    return tagIds.split(',').filter(Boolean)
  }, [])

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900" ref={containerRef}>
      {/* Left Panel: Groups */}
      <div
        className="overflow-hidden border-r border-gray-200 dark:border-gray-700 shrink-0 flex flex-col"
        style={{
          backgroundColor: 'var(--theme-bg-20)',
          flexShrink: 0,
          maxWidth: 315,
          minWidth: 215,
          width: personGroupsPanelWidth,
        }}
      >
        <div className="p-3 flex-1 overflow-y-auto">
          {/* Smart Groups */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('people.smart_groups.all')}
              </span>
            </div>
            {SMART_GROUPS.map((sg) => {
              const Icon = sg.icon
              const isActive = selectedSmartGroup === sg.id && !selectedGroupId
              return (
                <button
                  type="button"
                  key={sg.id}
                  onClick={() => handleSelectGroup(sg.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                    isActive
                      ? 'bg-black/10 dark:bg-white/15'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{t(sg.labelKey)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{smartGroupCounts[sg.id]}</span>
                </button>
              )
            })}
          </div>

          {/* Person Groups */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <button
                type="button"
                onClick={() => setGroupsExpanded(!groupsExpanded)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {groupsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('people.groups.title')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setEditingGroup(null)
                  setNewGroupName('')
                  setNewGroupColor('#3B82F6')
                  setNewGroupIcon('👥')
                  setGroupFormTriggerRect(e.currentTarget.getBoundingClientRect())
                  setShowGroupForm(true)
                }}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {groupsExpanded && (
              <>
                {personGroups.filter((g) => !g.isArchived).length === 0 && !showGroupForm && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-2.5 py-2">{t('people.groups.no_groups')}</p>
                )}
                {personGroups
                  .filter((g) => !g.isArchived)
                  .map((group) => {
                    const isActive = selectedGroupId === group.id
                    return (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => handleSelectPersonGroup(group.id)}
                        onContextMenu={(e) => handleGroupContextMenu(e, group.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                          isActive
                            ? 'bg-black/10 dark:bg-white/15'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                      >
                        <span className="text-sm">{resolveIcon(group.icon)}</span>
                        <span className="flex-1 text-left truncate">{group.name}</span>
                        {group.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                      </button>
                    )
                  })}
              </>
            )}

            {/* Group Form Popup */}
            <GroupFormPopup
              isOpen={showGroupForm}
              onClose={() => {
                setShowGroupForm(false)
                setEditingGroup(null)
              }}
              onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
              triggerRect={groupFormTriggerRect}
              name={newGroupName}
              icon={newGroupIcon}
              color={newGroupColor}
              namePlaceholder={t('people.groups.name_placeholder')}
              isEditing={!!editingGroup}
            />
          </div>
        </div>
      </div>

      <ResizeHandle onResize={(delta) => setPersonGroupsPanelWidth((w) => Math.max(215, Math.min(315, w + delta)))} />

      {/* Middle Panel: Person List */}
      <div
        className="flex flex-col min-w-50 max-w-75"
        style={{ backgroundColor: 'var(--theme-bg-2)', width: detailPanelWidth }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
          style={{ backgroundColor: 'var(--theme-bg-2)' }}
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{activeLabel}</h2>
          <div className="flex items-center gap-2">
            {(selectedSmartGroup === 'all' || selectedGroupId) && (
              <button
                type="button"
                onClick={handleCreatePerson}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Person List */}
        <div className="flex-1 overflow-y-auto">
          {filteredPersons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <User className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">{t('people.no_people')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredPersons.map((person) => {
                const isSelected = selectedPersonId === person.id
                return (
                  <div
                    key={person.id}
                    onMouseDown={() => setSelectedPersonId(person.id)}
                    onContextMenu={(e) => handlePersonContextMenu(e, person)}
                    className={`px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                        <AvatarImage seed={person.avatar || person.id} size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                          {person.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                          {person.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ResizeHandle
        onResize={(delta) => {
          setDetailPanelWidth((w) => Math.max(200, Math.min(300, w + delta)))
        }}
      />

      {/* Right Panel: Person Detail / Create Form */}
      <div
        className="flex-1 overflow-hidden border-l border-gray-200 dark:border-gray-700 flex flex-col"
        style={{ backgroundColor: 'var(--theme-bg-2)' }}
      >
        {showPersonForm ? (
          <PersonCreateForm
            onSave={handleSaveNewPerson}
            onCancel={handleCancelNewPerson}
            defaultGroupId={selectedGroupId}
            personGroups={personGroups}
          />
        ) : selectedPerson ? (
          <div className="flex flex-col h-full">
            {/* Avatar, Name & Other Names */}
            <div className="px-4 pt-4 pb-2 shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="relative cursor-pointer" onMouseDown={() => setShowDetailAvatarPicker((prev) => !prev)}>
                  <AvatarImage
                    avatarRef={detailAvatarButtonRef}
                    seed={selectedPerson.avatar || selectedPerson.id}
                    size={48}
                  />
                </div>
                {showDetailAvatarPicker && (
                  <AvatarPicker
                    avatarButtonRef={detailAvatarButtonRef}
                    onSelect={(style) => {
                      updatePerson.mutate(
                        { avatar: style, id: selectedPerson.id },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['persons'] })
                            queryClient.invalidateQueries({ queryKey: ['allPersons'] })
                          },
                        },
                      )
                      setShowDetailAvatarPicker(false)
                    }}
                    onClose={() => setShowDetailAvatarPicker(false)}
                  />
                )}
                <input
                  type="text"
                  value={localName}
                  maxLength={25}
                  onChange={(e) => {
                    setLocalName(e.target.value)
                    debounceSave('name', e.target.value, nameDebounceRef)
                  }}
                  placeholder={t('people.detail.name_placeholder')}
                  className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
              {/* Other Names - aligned with name */}
              <div className="ml-15">
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                    htmlFor="other names"
                    aria-labelledby="other names"
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {t('people.detail.other_names')}
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOtherNamesAdd(!showOtherNamesAdd)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <PhoneEmailListEditor
                  type="other_name"
                  entries={localOtherNames}
                  showAddForm={showOtherNamesAdd}
                  setShowAddForm={setShowOtherNamesAdd}
                  onChange={(entries) => {
                    const newEntries = entries as OtherNameEntry[]
                    setLocalOtherNames(newEntries)

                    const currentIds = otherNames.map((n) => n.id)
                    const newIds = newEntries.map((e) => e.id)
                    const deletedIds = currentIds.filter((id) => !newIds.includes(id))

                    deletedIds.forEach((id) => {
                      deletePersonOtherName.mutate(id, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['personOtherNames', selectedPerson.id] })
                        },
                      })
                    })

                    const addedEntries = newEntries.filter((e) => !currentIds.includes(e.id))
                    addedEntries.forEach((entry) => {
                      createPersonOtherName.mutate(
                        {
                          label: entry.label,
                          name: entry.value,
                          personId: selectedPerson.id,
                        },
                        {
                          onSuccess: (newOtherName) => {
                            setLocalOtherNames((prev) =>
                              prev.map((n) =>
                                n.id === entry.id
                                  ? {
                                      id: newOtherName.id,
                                      label: newOtherName.label || '别名',
                                      note: '',
                                      value: newOtherName.name,
                                    }
                                  : n,
                              ),
                            )
                            queryClient.invalidateQueries({ queryKey: ['personOtherNames', selectedPerson.id] })
                          },
                        },
                      )
                    })
                  }}
                />
              </div>
            </div>

            {/* Detail Fields */}
            <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
              {/* Birthday */}
              <div>
                <label
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                  htmlFor="birthday"
                  aria-labelledby="birthday"
                >
                  生日
                </label>
                <input
                  type="date"
                  value={localBirthday}
                  onChange={(e) => {
                    setLocalBirthday(e.target.value)
                    debounceSave('birthday', e.target.value, birthdayDebounceRef)
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Lunar Birthday */}
              <div>
                <label
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                  htmlFor="lunar birthdays"
                  aria-labelledby="lunar birthdays"
                >
                  农历生日
                </label>
                <input
                  type="text"
                  value={localLunarBirthday}
                  onChange={(e) => {
                    setLocalLunarBirthday(e.target.value)
                    debounceSave('lunarBirthday', e.target.value, lunarBirthdayDebounceRef)
                  }}
                  placeholder="例：腊月初八"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Phones */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                    htmlFor="phones"
                    aria-labelledby="phones"
                  >
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {t('people.detail.phones')}
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPhonesAdd(!showPhonesAdd)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="group">
                  <PhoneEmailListEditor
                    type="phone"
                    entries={localPhones}
                    showAddForm={showPhonesAdd}
                    setShowAddForm={setShowPhonesAdd}
                    onChange={(entries) => {
                      const newEntries = entries as PhoneEntry[]
                      setLocalPhones(newEntries)

                      const currentIds = phones.map((p) => p.id)
                      const newIds = newEntries.map((e) => e.id)
                      const deletedIds = currentIds.filter((id) => !newIds.includes(id))

                      deletedIds.forEach((id) => {
                        deletePersonPhone.mutate(id, {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['personPhones', selectedPerson.id] })
                          },
                        })
                      })

                      const addedEntries = newEntries.filter((e) => !currentIds.includes(e.id))
                      addedEntries.forEach((entry) => {
                        createPersonPhone.mutate(
                          {
                            label: entry.label,
                            personId: selectedPerson.id,
                            phone: entry.value,
                          },
                          {
                            onSuccess: (newPhone) => {
                              setLocalPhones((prev) =>
                                prev.map((p) =>
                                  p.id === entry.id
                                    ? {
                                        id: newPhone.id,
                                        label: newPhone.label || '手机',
                                        note: '',
                                        value: newPhone.phone,
                                      }
                                    : p,
                                ),
                              )
                              queryClient.invalidateQueries({ queryKey: ['personPhones', selectedPerson.id] })
                            },
                          },
                        )
                      })
                    }}
                  />
                </div>
              </div>

              {/* Emails */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                    htmlFor="emails"
                    aria-labelledby="emails"
                  >
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {t('people.detail.emails')}
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEmailsAdd(!showEmailsAdd)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="group">
                  <PhoneEmailListEditor
                    type="email"
                    entries={localEmails}
                    showAddForm={showEmailsAdd}
                    setShowAddForm={setShowEmailsAdd}
                    onChange={(entries) => {
                      const newEntries = entries as EmailEntry[]
                      setLocalEmails(newEntries)

                      const currentIds = emails.map((e) => e.id)
                      const newIds = newEntries.map((e) => e.id)
                      const deletedIds = currentIds.filter((id) => !newIds.includes(id))

                      deletedIds.forEach((id) => {
                        deletePersonEmail.mutate(id, {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['personEmails', selectedPerson.id] })
                          },
                        })
                      })

                      const addedEntries = newEntries.filter((e) => !currentIds.includes(e.id))
                      addedEntries.forEach((entry) => {
                        createPersonEmail.mutate(
                          {
                            email: entry.value,
                            label: entry.label,
                            personId: selectedPerson.id,
                          },
                          {
                            onSuccess: (newEmail) => {
                              setLocalEmails((prev) =>
                                prev.map((e) =>
                                  e.id === entry.id
                                    ? {
                                        id: newEmail.id,
                                        label: newEmail.label || '邮箱',
                                        note: '',
                                        value: newEmail.email,
                                      }
                                    : e,
                                ),
                              )
                              queryClient.invalidateQueries({ queryKey: ['personEmails', selectedPerson.id] })
                            },
                          },
                        )
                      })
                    }}
                  />
                </div>
              </div>

              {/* Food Taboos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                    htmlFor="dislikes"
                    aria-labelledby="dislikes"
                  >
                    忌口
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFoodTaboosAdd(!showFoodTaboosAdd)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <SimpleListEditor
                  items={localFoodTaboos}
                  showAddForm={showFoodTaboosAdd}
                  setShowAddForm={setShowFoodTaboosAdd}
                  onChange={(items) => {
                    setLocalFoodTaboos(items)
                    updatePerson.mutate(
                      { foodTaboos: items.join(','), id: selectedPerson.id },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['persons'] })
                          queryClient.invalidateQueries({ queryKey: ['allPersons'] })
                        },
                      },
                    )
                  }}
                  placeholder="输入忌口，按回车添加"
                />
              </div>

              {/* Preferences */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                    htmlFor="preferences"
                    aria-labelledby="preferences"
                  >
                    偏好
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreferencesAdd(!showPreferencesAdd)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <SimpleListEditor
                  items={localPreferences}
                  showAddForm={showPreferencesAdd}
                  setShowAddForm={setShowPreferencesAdd}
                  onChange={(items) => {
                    setLocalPreferences(items)
                    updatePerson.mutate(
                      { id: selectedPerson.id, preferences: items.join(',') },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['persons'] })
                          queryClient.invalidateQueries({ queryKey: ['allPersons'] })
                        },
                      },
                    )
                  }}
                  placeholder="输入偏好，按回车添加"
                />
              </div>

              {/* Remark */}
              <div>
                <label
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                  htmlFor="note"
                  aria-labelledby="note"
                >
                  {t('people.detail.remark')}
                </label>
                <textarea
                  value={localRemark}
                  onChange={(e) => {
                    setLocalRemark(e.target.value)
                    debounceSave('remark', e.target.value, remarkDebounceRef)
                  }}
                  placeholder={t('people.detail.remark_placeholder')}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <TagCombobox
                  selectedIds={parseTagIds(selectedPerson.tagIds)}
                  allTags={allTags}
                  onToggle={(tagId: string) => {
                    const current = parseTagIds(selectedPerson.tagIds)
                    const next = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
                    updatePerson.mutate(
                      { id: selectedPerson.id, tagIds: next.join(',') },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['persons'] })
                          queryClient.invalidateQueries({ queryKey: ['allPersons'] })
                        },
                      },
                    )
                  }}
                  onCreateTag={(name: string) => {
                    createTag.mutate(
                      { name },
                      {
                        onSuccess: (newTag) => {
                          const current = parseTagIds(selectedPerson.tagIds)
                          const next = [...current, newTag.id]
                          updatePerson.mutate(
                            { id: selectedPerson.id, tagIds: next.join(',') },
                            {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['persons'] })
                                queryClient.invalidateQueries({ queryKey: ['allPersons'] })
                              },
                            },
                          )
                        },
                      },
                    )
                  }}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
              <p>
                {t('common.edit')}: {formatDisplayDate(selectedPerson.updatedAt.slice(0, 10), dateFormat, t)}{' '}
                {formatTime(selectedPerson.updatedAt.slice(11, 16), timeFormat)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <User className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">{t('people.select_person')}</p>
          </div>
        )}
      </div>

      {/* Context Menu - Group */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onMouseDown={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-40"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                const group = personGroups.find((g) => g.id === contextMenu.id)
                if (group) handleEditGroup({ stopPropagation: () => {} } as React.MouseEvent, group)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              type="button"
              onClick={() => handleToggleGroupPin(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Star className="w-4 h-4" />
              {personGroups.find((g) => g.id === contextMenu.id)?.isPinned ? t('people.unpin') : t('people.pin')}
            </button>
            <button
              type="button"
              onClick={() => handleArchiveGroup(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Archive className="w-4 h-4" />
              {personGroups.find((g) => g.id === contextMenu.id)?.isArchived
                ? t('people.groups.unarchive')
                : t('people.groups.archive')}
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <button
              type="button"
              onClick={() => handleDeleteGroup(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </div>
        </>
      )}

      {/* Context Menu - Person */}
      {personContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onMouseDown={() => setPersonContextMenu(null)} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-40"
            style={{ left: personContextMenu.x, top: personContextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                handleTogglePin(personContextMenu.person)
                setPersonContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Star className="w-4 h-4" />
              {personContextMenu.person.isPinned ? t('people.unfavorite') : t('people.favorite')}
            </button>
            <button
              type="button"
              onClick={() => {
                handleToggleArchive(personContextMenu.person)
                setPersonContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Archive className="w-4 h-4" />
              {personContextMenu.person.isArchived ? t('people.groups.unarchive') : t('people.groups.archive')}
            </button>
            <button
              type="button"
              onClick={() => {
                handleCopyPerson(personContextMenu.person)
                setPersonContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {t('people.copy')}
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <button
              type="button"
              onClick={() => {
                handleDeletePerson(personContextMenu.person.id)
                setPersonContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
