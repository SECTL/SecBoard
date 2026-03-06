-- KV 存储表
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- UI 状态表
CREATE TABLE IF NOT EXISTS ui_state (
  window_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (window_id, key)
);

-- 事件表
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload TEXT,
  ts INTEGER NOT NULL
);

-- CUNOX 文件索引表
CREATE TABLE IF NOT EXISTS cunox_files (
  path TEXT PRIMARY KEY NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 初始化索引
CREATE INDEX IF NOT EXISTS idx_ui_state_window ON ui_state(window_id);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
