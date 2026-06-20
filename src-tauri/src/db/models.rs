use serde::{Deserialize, Serialize};

// Task model (unified tree: tasks with parent_task_id are subtasks)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub is_completed: bool,
    pub priority: i32,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub start_date: Option<String>,
    pub reminder_time: Option<String>,
    pub recurrence_rule: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub list_id: Option<String>,
    pub tag_ids: Option<String>,
    pub sort_by: Option<String>,
    pub group_by: Option<String>,
    pub parent_task_id: Option<String>,
    pub level: i32,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub deleted_at: Option<String>,
    pub sort_order: f64,
    pub end_date: Option<String>,
    pub end_time: Option<String>,
}

// List model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct List {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub is_pinned: bool,
    pub is_archived: bool,
}

// Tag model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub emoji: Option<String>,
    pub parent_id: Option<String>,
    pub level: i32,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Step model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Step {
    pub id: String,
    pub task_id: String,
    pub description: String,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub is_completed: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Habit model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Habit {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub target_type: String,
    pub target_value: Option<i32>,
    pub target_unit: Option<String>,
    pub frequency: String,
    pub frequency_days: Option<String>,
    pub reminder_time: Option<String>,
    pub reminder_enabled: bool,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub total_completions: i32,
    pub start_date: String,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
    pub group_id: Option<String>,
}

// Habit log model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitLog {
    pub id: String,
    pub habit_id: String,
    pub log_date: String,
    pub log_time: String,
    pub completed: bool,
    pub value: Option<i32>,
    pub note: Option<String>,
}

// Habit group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitGroup {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Countdown model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Countdown {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub target_date: String,
    pub target_time: Option<String>,
    pub event_type: String,
    pub reminder_enabled: bool,
    pub reminder_days_before: Option<i32>,
    pub reminder_time: Option<String>,
    pub is_recurring: bool,
    pub recurrence_rule: Option<String>,
    pub group_id: Option<String>,
    pub is_favorite: bool,
    pub is_completed: bool,
    pub is_lunar: bool,
    pub display_mode: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// Countdown group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountdownGroup {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_preset: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Countdown group with count
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountdownGroupWithCount {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_preset: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub count: i64,
}

// Note group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteGroup {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: f64,
    pub is_archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

// Note model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub group_id: Option<String>,
    pub parent_id: Option<String>,
    pub tag_ids: Option<String>,
    pub is_completed: bool,
    pub is_archived: bool,
    pub is_pinned: bool,
    pub level: i32,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub deleted_at: Option<String>,
    pub target_date: Option<String>,
}

// Person group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonGroup {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Person model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub id: String,
    pub name: String,
    pub english_name: Option<String>,
    pub nickname: Option<String>,
    pub remark: Option<String>,
    pub group_id: Option<String>,
    pub tag_ids: Option<String>,
    pub avatar: Option<String>,
    pub birthday: Option<String>,
    pub lunar_birthday: Option<String>,
    pub food_taboos: Option<String>,
    pub preferences: Option<String>,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

// Person phone model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonPhone {
    pub id: String,
    pub person_id: String,
    pub phone: String,
    pub label: Option<String>,
    pub sort_order: f64,
}

// Person email model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonEmail {
    pub id: String,
    pub person_id: String,
    pub email: String,
    pub label: Option<String>,
    pub sort_order: f64,
}

// Person other name model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonOtherName {
    pub id: String,
    pub person_id: String,
    pub name: String,
    pub label: Option<String>,
    pub sort_order: f64,
}

// Calendar event model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub event_date: String,
    pub event_type: String,
    pub color: Option<String>,
    pub source: Option<String>,
    pub is_lunar: bool,
    pub created_at: String,
}

// Media group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaGroup {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_preset: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Media group with usage count
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaGroupWithCount {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_preset: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub usage_count: i64,
}

// Media item model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: String,
    pub r#type: String,
    pub title: String,
    pub year: Option<i32>,
    pub cover: Option<String>,
    pub rating: Option<f64>,
    pub status: String,
    pub group_id: Option<String>,
    pub douban_url: Option<String>,
    pub imdb_url: Option<String>,
    pub rotten_tomatoes_url: Option<String>,
    pub tv_show_title: Option<String>,
    pub season_number: Option<i32>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Media other name model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaOtherName {
    pub id: String,
    pub media_item_id: String,
    pub name: String,
    pub label: Option<String>,
    pub sort_order: f64,
}

// Media watch link model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaWatchLink {
    pub id: String,
    pub media_item_id: String,
    pub url: String,
    pub platform: Option<String>,
    pub sort_order: f64,
}

// Media relation model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaRelation {
    pub id: String,
    pub media_item_id: String,
    pub related_item_id: String,
    pub relation_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaLinkedItem {
    pub id: String,
    pub media_item_id: String,
    pub linked_type: String,
    pub linked_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteLinkedItem {
    pub id: String,
    pub note_id: String,
    pub linked_type: String,
    pub linked_id: String,
}

// Media watch history model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaWatchHistory {
    pub id: String,
    pub media_item_id: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
}

// Media watch history with links
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaWatchHistoryWithLinks {
    pub id: String,
    pub media_item_id: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub links: Vec<MediaWatchHistoryLinkDetail>,
}

// Media watch history link detail (with title)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaWatchHistoryLinkDetail {
    pub id: String,
    pub linked_type: String,
    pub linked_id: String,
    pub title: String,
}
