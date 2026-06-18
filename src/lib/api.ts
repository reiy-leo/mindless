import { invoke } from '@tauri-apps/api/core';
import type { Task, Habit, Countdown, Tag, Step, List, ListSettings, TodayCheckinInfo, HabitLog, CalendarEvent, HabitGroup, Note, NoteGroup, NoteLinkedItem, Person, PersonGroup, PersonPhone, PersonEmail, PersonOtherName, MediaGroup, MediaGroupWithCount, MediaItem, MediaItemWithDetails, CreateMediaItemInput, UpdateMediaItemInput, MediaWatchHistoryWithLinks, CreateMediaWatchHistoryInput } from '@/types';

// Task APIs
export async function getTasks(): Promise<Task[]> {
  return await invoke<Task[]>('get_tasks');
}

export async function getAllTasks(): Promise<Task[]> {
  return await invoke<Task[]>('get_all_tasks');
}

export async function getTaskById(id: string): Promise<Task> {
  return await invoke<Task>('get_task_by_id', { id });
}

export async function createTask(params: {
  title: string;
  description?: string;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  startDate?: string;
  listId?: string;
  tagIds?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  parentTaskId?: string;
  level?: number;
}): Promise<Task> {
  return await invoke<Task>('create_task', params);
}

export async function updateTask(id: string, params: {
  title?: string;
  description?: string;
  isCompleted?: boolean;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  startDate?: string;
  listId?: string;
  tagIds?: string;
  sortOrder?: number;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
}): Promise<Task> {
  return await invoke<Task>('update_task', { id, ...params });
}

export async function deleteTask(id: string): Promise<void> {
  return await invoke<void>('delete_task', { id });
}

export async function completeRecurringTask(id: string): Promise<Task | null> {
  return await invoke<Task | null>('complete_recurring_task', { id });
}

// Reorder APIs
export async function reorderTasks(items: { id: string; sortOrder: number }[]): Promise<void> {
  return await invoke<void>('reorder_tasks', { items });
}

export async function reorderSubtasks(items: { id: string; sortOrder: number }[]): Promise<void> {
  return await invoke<void>('reorder_subtasks', { items });
}

export async function reorderSteps(items: { id: string; sortOrder: number }[]): Promise<void> {
  return await invoke<void>('reorder_steps', { items });
}

// List APIs
export async function getLists(): Promise<List[]> {
  return await invoke<List[]>('get_lists');
}

export async function createList(params: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<List> {
  return await invoke<List>('create_list', params);
}

export async function updateList(id: string, params: {
  name?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isPinned?: boolean;
  isArchived?: boolean;
}): Promise<List> {
  return await invoke<List>('update_list', {
    id,
    name: params.name,
    color: params.color,
    icon: params.icon,
    sort_order: params.sortOrder,
    is_pinned: params.isPinned,
    is_archived: params.isArchived,
  });
}

export async function deleteList(id: string): Promise<void> {
  return await invoke<void>('delete_list', { id });
}

// Tag APIs
export async function getTags(): Promise<Tag[]> {
  return await invoke<Tag[]>('get_tags');
}

export async function createTag(params: {
  name: string;
  color?: string;
  emoji?: string;
  parentId?: string;
  level?: number;
}): Promise<Tag> {
  return await invoke<Tag>('create_tag', params);
}

export async function updateTag(id: string, params: {
  name?: string;
  color?: string;
  emoji?: string;
}): Promise<Tag> {
  return await invoke<Tag>('update_tag', { id, ...params });
}

export async function deleteTag(id: string): Promise<void> {
  return await invoke<void>('delete_tag', { id });
}

export async function moveTags(items: {
  id: string; parentId?: string | null; level?: number; sortOrder?: number;
}[]): Promise<void> {
  return await invoke<void>('move_tags', { items });
}

// Subtask APIs (subtasks are now tasks with parentTaskId)
export async function getSubtasks(taskId: string): Promise<Task[]> {
  return await invoke<Task[]>('get_subtasks', { task_id: taskId });
}

export async function getAllSubtasks(taskIds: string[]): Promise<Task[]> {
  if (taskIds.length === 0) return [];
  return await invoke<Task[]>('get_all_subtasks', { task_ids: taskIds });
}

export async function createSubtask(params: {
  taskId: string;
  title: string;
  parentSubtaskId?: string;
  level?: number;
}): Promise<Task> {
  return await invoke<Task>('create_subtask', {
    task_id: params.taskId,
    title: params.title,
    parent_subtask_id: params.parentSubtaskId,
    level: params.level,
  });
}

export async function updateSubtask(id: string, params: {
  title?: string;
  isCompleted?: boolean;
  sortOrder?: number;
  taskId?: string;
}): Promise<Task> {
  return await invoke<Task>('update_subtask', {
    id,
    title: params.title,
    is_completed: params.isCompleted,
    sort_order: params.sortOrder,
    _task_id: params.taskId,
  });
}

export async function deleteSubtask(id: string, taskId?: string): Promise<void> {
  return await invoke<void>('delete_subtask', { id, taskId });
}

// Step APIs
export async function getSteps(taskId: string): Promise<Step[]> {
  return await invoke<Step[]>('get_steps', { task_id: taskId });
}

export async function createStep(params: {
  taskId: string;
  description: string;
  dueDate?: string;
  dueTime?: string;
}): Promise<Step> {
  return await invoke<Step>('create_step', {
    task_id: params.taskId,
    description: params.description,
    due_date: params.dueDate,
    due_time: params.dueTime,
  });
}

export async function updateStep(id: string, params: {
  description?: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted?: boolean;
  sortOrder?: number;
}): Promise<Step> {
  return await invoke<Step>('update_step', {
    id,
    description: params.description,
    due_date: params.dueDate,
    due_time: params.dueTime,
    is_completed: params.isCompleted,
    sort_order: params.sortOrder,
  });
}

export async function deleteStep(id: string): Promise<void> {
  return await invoke<void>('delete_step', { id });
}

// Habit APIs
export async function getHabits(): Promise<Habit[]> {
  return await invoke<Habit[]>('get_habits');
}

export async function getHabitById(id: string): Promise<Habit> {
  return await invoke<Habit>('get_habit_by_id', { id });
}

export async function getHabitLogs(habitId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> {
  return await invoke<HabitLog[]>('get_habit_logs', { habitId, startDate, endDate });
}

export async function createHabit(params: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  targetType?: string;
  targetValue?: number;
  targetUnit?: string;
  frequency?: string;
  frequencyDays?: string;
  reminderTime?: string;
  reminderEnabled?: boolean;
  startDate?: string;
  groupId?: string;
}): Promise<Habit> {
  return await invoke<Habit>('create_habit', params);
}

export async function updateHabit(id: string, params: Partial<Habit>): Promise<Habit> {
  return await invoke<Habit>('update_habit', { id, ...params });
}

export async function deleteHabit(id: string): Promise<void> {
  return await invoke<void>('delete_habit', { id });
}

export async function checkInHabit(habitId: string, date: string, value?: number): Promise<void> {
  return await invoke<void>('check_in_habit', { habitId, date, value });
}

export async function getTodayCheckins(): Promise<TodayCheckinInfo[]> {
  return await invoke<TodayCheckinInfo[]>('get_today_checkins');
}

export async function refreshHabitStreaks(): Promise<void> {
  return await invoke<void>('refresh_habit_streaks');
}

export async function getHabitGroups(): Promise<HabitGroup[]> {
  return await invoke<HabitGroup[]>('get_habit_groups');
}

export async function createHabitGroup(params: {
  name: string;
  icon?: string;
  color?: string;
}): Promise<HabitGroup> {
  return await invoke<HabitGroup>('create_habit_group', params);
}

export async function updateHabitGroup(id: string, params: {
  name?: string;
  icon?: string;
  color?: string;
}): Promise<HabitGroup> {
  return await invoke<HabitGroup>('update_habit_group', { id, ...params });
}

export async function deleteHabitGroup(id: string): Promise<void> {
  return await invoke<void>('delete_habit_group', { id });
}

export async function getArchivedHabits(): Promise<Habit[]> {
  return await invoke<Habit[]>('get_archived_habits');
}

export async function unarchiveHabit(id: string): Promise<Habit> {
  return await invoke<Habit>('unarchive_habit', { id });
}

export async function hardDeleteHabit(id: string): Promise<void> {
  return await invoke<void>('hard_delete_habit', { id });
}

export async function moveHabitToGroup(habitId: string, groupId: string | null): Promise<void> {
  return await invoke<void>('move_habit_to_group', { habitId, groupId });
}

export async function dissolveHabitGroup(id: string): Promise<void> {
  return await invoke<void>('dissolve_habit_group', { id });
}

export async function deleteHabitGroupWithHabits(id: string): Promise<void> {
  return await invoke<void>('delete_habit_group_with_habits', { id });
}

// Countdown APIs
export async function getCountdowns(): Promise<Countdown[]> {
  return await invoke<Countdown[]>('get_countdowns');
}

export async function getCountdownById(id: string): Promise<Countdown> {
  return await invoke<Countdown>('get_countdown_by_id', { id });
}

export async function createCountdown(params: {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  targetDate: string;
  targetTime?: string;
  eventType?: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}): Promise<Countdown> {
  return await invoke<Countdown>('create_countdown', params);
}

export async function updateCountdown(id: string, params: {
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  targetDate?: string;
  targetTime?: string;
  eventType?: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}): Promise<Countdown> {
  return await invoke<Countdown>('update_countdown', { id, ...params });
}

export async function deleteCountdown(id: string): Promise<void> {
  return await invoke<void>('delete_countdown', { id });
}

// Settings APIs
export async function getSettings(): Promise<[string, string][]> {
  return await invoke<[string, string][]>('get_settings');
}

export async function updateSetting(key: string, value: string): Promise<void> {
  return await invoke<void>('update_setting', { key, value });
}

export async function updateSettings(settings: [string, string][]): Promise<void> {
  return await invoke<void>('update_settings', { settings });
}

// List Settings APIs
export async function getListSettings(listId: string): Promise<ListSettings | null> {
  return await invoke<ListSettings | null>('get_list_settings', { listId });
}

export async function saveListSettings(settings: ListSettings): Promise<void> {
  return await invoke<void>('save_list_settings', { settings });
}

// Calendar Events APIs
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return await invoke<CalendarEvent[]>('get_calendar_events');
}

export async function getCalendarEventsByRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  return await invoke<CalendarEvent[]>('get_calendar_events_by_range', { startDate, endDate });
}

export async function importCalendarEvents(events: { title: string; eventDate: string; eventType?: string; color?: string; isLunar?: boolean }[], source?: string): Promise<number> {
  return await invoke<number>('import_calendar_events', { events, source });
}

export async function deleteCalendarEventsBySource(source: string): Promise<number> {
  return await invoke<number>('delete_calendar_events_by_source', { source });
}

export async function clearAllCalendarEvents(): Promise<number> {
  return await invoke<number>('clear_all_calendar_events');
}

// Notification APIs
export interface TaskReminder {
  id: string;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: number;
}

export interface HabitReminder {
  id: string;
  name: string;
  reminderTime: string | null;
  currentStreak: number;
}

export interface CountdownReminder {
  id: string;
  title: string;
  targetDate: string;
  daysRemaining: number;
}

export async function getDueTasks(): Promise<TaskReminder[]> {
  return await invoke<TaskReminder[]>('get_due_tasks');
}

export async function getReminderHabits(): Promise<HabitReminder[]> {
  return await invoke<HabitReminder[]>('get_reminder_habits');
}

export async function getReminderCountdowns(): Promise<CountdownReminder[]> {
  return await invoke<CountdownReminder[]>('get_reminder_countdowns');
}

// Data Export/Import APIs
export async function exportAllData(): Promise<string> {
  return await invoke<string>('export_all_data');
}

export async function importAllData(json: string): Promise<void> {
  return await invoke<void>('import_all_data', { json });
}

// Note Group APIs
export async function getNoteGroups(): Promise<NoteGroup[]> {
  return await invoke<NoteGroup[]>('get_note_groups');
}

export async function createNoteGroup(params: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<NoteGroup> {
  return await invoke<NoteGroup>('create_note_group', params);
}

export async function updateNoteGroup(id: string, params: {
  name?: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
}): Promise<NoteGroup> {
  return await invoke<NoteGroup>('update_note_group', { id, ...params });
}

export async function deleteNoteGroup(id: string): Promise<void> {
  return await invoke<void>('delete_note_group', { id });
}

// Note APIs
export async function getNotes(): Promise<Note[]> {
  return await invoke<Note[]>('get_notes');
}

export async function getAllNotes(): Promise<Note[]> {
  return await invoke<Note[]>('get_all_notes');
}

export async function getNoteById(id: string): Promise<Note> {
  return await invoke<Note>('get_note_by_id', { id });
}

export async function getSubNotes(parentId: string): Promise<Note[]> {
  return await invoke<Note[]>('get_sub_notes', { parentId });
}

export async function getAllSubNotes(noteIds: string[]): Promise<Note[]> {
  if (noteIds.length === 0) return [];
  return await invoke<Note[]>('get_all_sub_notes', { noteIds });
}

export async function createNote(params: {
  title: string;
  content?: string;
  groupId?: string;
  parentId?: string;
  tagIds?: string;
  level?: number;
}): Promise<Note> {
  return await invoke<Note>('create_note', params);
}

export async function updateNote(id: string, params: {
  title?: string;
  content?: string;
  groupId?: string;
  tagIds?: string;
  isCompleted?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  sortOrder?: number;
}): Promise<Note> {
  return await invoke<Note>('update_note', {
    id,
    title: params.title,
    content: params.content,
    groupId: params.groupId,
    tagIds: params.tagIds,
    isCompleted: params.isCompleted,
    isArchived: params.isArchived,
    isPinned: params.isPinned,
    sortOrder: params.sortOrder,
  });
}

export async function deleteNote(id: string): Promise<void> {
  return await invoke<void>('delete_note', { id });
}

export async function archiveNote(id: string): Promise<Note> {
  return await invoke<Note>('archive_note', { id });
}

export async function unarchiveNote(id: string): Promise<Note> {
  return await invoke<Note>('unarchive_note', { id });
}

export async function completeNote(id: string): Promise<Note> {
  return await invoke<Note>('complete_note', { id });
}

export async function getNoteLinkedItems(noteId: string): Promise<NoteLinkedItem[]> {
  return await invoke<NoteLinkedItem[]>('get_note_linked_items', { noteId });
}

export async function getNotesLinkedTo(linkedType: string, linkedId: string): Promise<NoteLinkedItem[]> {
  return await invoke<NoteLinkedItem[]>('get_notes_linked_to', { linkedType, linkedId });
}

export async function linkNoteItem(noteId: string, linkedType: string, linkedId: string): Promise<NoteLinkedItem> {
  return await invoke<NoteLinkedItem>('link_note_item', { noteId, linkedType, linkedId });
}

export async function unlinkNoteItem(id: string): Promise<void> {
  return await invoke<void>('unlink_note_item', { id });
}

// Person Group APIs
export async function getPersonGroups(): Promise<PersonGroup[]> {
  return await invoke<PersonGroup[]>('get_person_groups');
}

export async function createPersonGroup(params: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<PersonGroup> {
  return await invoke<PersonGroup>('create_person_group', params);
}

export async function updatePersonGroup(id: string, params: {
  name?: string;
  color?: string;
  icon?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}): Promise<PersonGroup> {
  return await invoke<PersonGroup>('update_person_group', {
    id,
    name: params.name,
    color: params.color,
    icon: params.icon,
    is_pinned: params.isPinned,
    is_archived: params.isArchived,
  });
}

export async function deletePersonGroup(id: string): Promise<void> {
  return await invoke<void>('delete_person_group', { id });
}

// Person APIs
export async function getPersons(): Promise<Person[]> {
  return await invoke<Person[]>('get_persons');
}

export async function getAllPersons(): Promise<Person[]> {
  return await invoke<Person[]>('get_all_persons');
}

export async function getPersonById(id: string): Promise<Person> {
  return await invoke<Person>('get_person_by_id', { id });
}

export async function createPerson(params: {
  name: string;
    englishName?: string;
    nickname?: string;
    remark?: string;
    groupId?: string;
    tagIds?: string;
    avatar?: string;
    birthday?: string;
    lunarBirthday?: string;
    foodTaboos?: string;
    preferences?: string;
}): Promise<Person> {
  return await invoke<Person>('create_person', {
    name: params.name,
    english_name: params.englishName,
    nickname: params.nickname,
    remark: params.remark,
    group_id: params.groupId,
    tag_ids: params.tagIds,
    avatar: params.avatar,
    birthday: params.birthday,
    lunar_birthday: params.lunarBirthday,
    food_taboos: params.foodTaboos,
    preferences: params.preferences,
  });
}

export async function updatePerson(id: string, params: {
  name?: string;
  englishName?: string;
  nickname?: string;
  remark?: string;
  groupId?: string;
  tagIds?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  avatar?: string;
  birthday?: string;
  lunarBirthday?: string;
  foodTaboos?: string;
  preferences?: string;
}): Promise<Person> {
  return await invoke<Person>('update_person', {
    id,
    name: params.name,
    english_name: params.englishName,
    nickname: params.nickname,
    remark: params.remark,
    group_id: params.groupId,
    tag_ids: params.tagIds,
    is_pinned: params.isPinned,
    is_archived: params.isArchived,
    sort_order: params.sortOrder,
    avatar: params.avatar,
    birthday: params.birthday,
    lunar_birthday: params.lunarBirthday,
    food_taboos: params.foodTaboos,
    preferences: params.preferences,
  });
}

export async function deletePerson(id: string): Promise<void> {
  return await invoke<void>('delete_person', { id });
}

// Person Phone APIs
export async function getPersonPhones(personId: string): Promise<PersonPhone[]> {
  return await invoke<PersonPhone[]>('get_person_phones', { person_id: personId });
}

export async function createPersonPhone(params: {
  personId: string;
  phone: string;
  label?: string;
}): Promise<PersonPhone> {
  return await invoke<PersonPhone>('create_person_phone', {
    person_id: params.personId,
    phone: params.phone,
    label: params.label,
  });
}

export async function updatePersonPhone(id: string, params: {
  phone?: string;
  label?: string;
}): Promise<PersonPhone> {
  return await invoke<PersonPhone>('update_person_phone', { id, ...params });
}

export async function deletePersonPhone(id: string): Promise<void> {
  return await invoke<void>('delete_person_phone', { id });
}

// Person Email APIs
export async function getPersonEmails(personId: string): Promise<PersonEmail[]> {
  return await invoke<PersonEmail[]>('get_person_emails', { person_id: personId });
}

export async function createPersonEmail(params: {
  personId: string;
  email: string;
  label?: string;
}): Promise<PersonEmail> {
  return await invoke<PersonEmail>('create_person_email', {
    person_id: params.personId,
    email: params.email,
    label: params.label,
  });
}

export async function updatePersonEmail(id: string, params: {
  email?: string;
  label?: string;
}): Promise<PersonEmail> {
  return await invoke<PersonEmail>('update_person_email', { id, ...params });
}

export async function deletePersonEmail(id: string): Promise<void> {
  return await invoke<void>('delete_person_email', { id });
}

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

// Person Other Name APIs
export async function getPersonOtherNames(personId: string): Promise<PersonOtherName[]> {
  return await invoke<PersonOtherName[]>('get_person_other_names', { person_id: personId });
}

export async function createPersonOtherName(params: {
  personId: string;
  name: string;
  label?: string;
}): Promise<PersonOtherName> {
  return await invoke<PersonOtherName>('create_person_other_name', {
    person_id: params.personId,
    name: params.name,
    label: params.label,
  });
}

export async function updatePersonOtherName(id: string, params: {
  name?: string;
  label?: string;
}): Promise<PersonOtherName> {
  return await invoke<PersonOtherName>('update_person_other_name', { id, ...params });
}

export async function deletePersonOtherName(id: string): Promise<void> {
  return await invoke<void>('delete_person_other_name', { id });
}

// Media Group APIs
export async function getMediaGroups(): Promise<MediaGroup[]> {
  return await invoke<MediaGroup[]>('get_media_groups');
}

export async function getMediaGroupsWithCount(): Promise<MediaGroupWithCount[]> {
  return await invoke<MediaGroupWithCount[]>('get_media_groups_with_count');
}

export async function createMediaGroup(params: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<MediaGroup> {
  return await invoke<MediaGroup>('create_media_group', params);
}

export async function updateMediaGroup(id: string, params: {
  name?: string;
  color?: string;
  icon?: string;
}): Promise<MediaGroup> {
  return await invoke<MediaGroup>('update_media_group', { id, ...params });
}

export async function deleteMediaGroup(id: string): Promise<void> {
  return await invoke<void>('delete_media_group', { id });
}

// Media Item Genre APIs
export async function getMediaItemGenres(mediaItemId: string): Promise<string[]> {
  return await invoke<string[]>('get_media_item_genres', { mediaItemId });
}

export async function updateMediaItemGenres(mediaItemId: string, genreIds: string[]): Promise<void> {
  return await invoke<void>('update_media_item_genres', { mediaItemId, genreIds });
}

// Media Item APIs
export async function getMediaItems(filters?: {
  status?: string;
  groupId?: string;
  search?: string;
}): Promise<MediaItem[]> {
  return await invoke<MediaItem[]>('get_media_items', {
    status: filters?.status,
    groupId: filters?.groupId,
    search: filters?.search,
  });
}

export async function createMediaItem(params: CreateMediaItemInput): Promise<MediaItem> {
  return await invoke<MediaItem>('create_media_item', { ...params });
}

export async function updateMediaItem(id: string, params: UpdateMediaItemInput): Promise<MediaItem> {
  return await invoke<MediaItem>('update_media_item', { id, ...params });
}

export async function deleteMediaItem(id: string): Promise<void> {
  return await invoke<void>('delete_media_item', { id });
}

export async function getMediaItemDetails(id: string): Promise<MediaItemWithDetails> {
  return await invoke<MediaItemWithDetails>('get_media_item_details', { id });
}

// Media Watch History APIs
export async function getMediaWatchHistory(mediaItemId: string): Promise<MediaWatchHistoryWithLinks[]> {
  return await invoke<MediaWatchHistoryWithLinks[]>('get_media_watch_history', { mediaItemId });
}

export async function createMediaWatchHistory(params: CreateMediaWatchHistoryInput): Promise<MediaWatchHistoryWithLinks> {
  return await invoke<MediaWatchHistoryWithLinks>('create_media_watch_history', {
    mediaItemId: params.mediaItemId,
    startDate: params.startDate,
    endDate: params.endDate,
    note: params.note,
    linkedItems: params.linkedItems,
  });
}

export async function updateMediaWatchHistory(id: string, params: Partial<CreateMediaWatchHistoryInput>): Promise<MediaWatchHistoryWithLinks> {
  return await invoke<MediaWatchHistoryWithLinks>('update_media_watch_history', {
    id,
    startDate: params.startDate,
    endDate: params.endDate,
    note: params.note,
    linkedItems: params.linkedItems,
  });
}

export async function deleteMediaWatchHistory(id: string): Promise<void> {
  return await invoke<void>('delete_media_watch_history', { id });
}

// Heatmap APIs
export interface HeatmapData {
  tasks: Record<string, number>;
  habits: Record<string, number>;
}

export async function getHeatmapData(): Promise<HeatmapData> {
  return await invoke<HeatmapData>('get_heatmap_data');
}
