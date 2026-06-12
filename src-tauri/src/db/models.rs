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

// Subtask model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subtask {
    pub id: String,
    pub task_id: String,
    pub parent_subtask_id: Option<String>,
    pub title: String,
    pub is_completed: bool,
    pub sort_order: f64,
    pub level: i32,
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
    pub created_at: String,
    pub updated_at: String,
}

// Setting model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Setting {
    pub key: String,
    pub value: String,
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
