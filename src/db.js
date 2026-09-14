'use strict'

/**
 * Kết nối SQLite + tự động migrate schema khi app khởi động lần đầu.
 * Toàn bộ dữ liệu (file .db) nằm trong thư mục project => persistent trên volume hosting.
 */

const fs = require('fs')
const Database = require('better-sqlite3')
const { DB_PATH, UPLOAD_DIR } = require('./config')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	ten             TEXT    NOT NULL UNIQUE,
	mat_khau_hash   TEXT    NOT NULL,
	han_muc_ngay    INTEGER NOT NULL DEFAULT 150000,
	ngay_tao        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	ten             TEXT    NOT NULL,
	icon            TEXT    NOT NULL DEFAULT '🏷️',
	mau_sac         TEXT    NOT NULL DEFAULT '#FF4E8E',
	la_mac_dinh     INTEGER NOT NULL DEFAULT 0,
	thu_tu          INTEGER NOT NULL DEFAULT 0,
	ngay_tao        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	so_tien         INTEGER NOT NULL,
	ghi_chu         TEXT,
	duong_dan_anh   TEXT,
	ngay_tao        TEXT    NOT NULL,   -- 'YYYY-MM-DD' theo múi giờ app
	created_at      TEXT    NOT NULL,   -- ISO-8601 (UTC)
	la_mau          INTEGER NOT NULL DEFAULT 0  -- 1 = dữ liệu mẫu (seed)
);

CREATE TABLE IF NOT EXISTS expense_categories (
	expense_id      INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
	category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
	PRIMARY KEY (expense_id, category_id)
);

-- Lịch sử thay đổi hạn mức/ngày (tính năng nâng cao ở mục 4.5):
-- các khoảng thời gian đã qua vẫn giữ hạn mức có hiệu lực tại thời điểm đó.
CREATE TABLE IF NOT EXISTS han_muc_history (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	han_muc_ngay    INTEGER NOT NULL,
	ngay_hieu_luc   TEXT    NOT NULL,   -- 'YYYY-MM-DD'
	created_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	sid             TEXT PRIMARY KEY,
	du_lieu         TEXT    NOT NULL,
	han_su_dung     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_ngay ON expenses(user_id, ngay_tao);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON expenses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ec_category ON expense_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id, thu_tu);
CREATE INDEX IF NOT EXISTS idx_han_muc_user ON han_muc_history(user_id, ngay_hieu_luc);
`

function migrate() {
	db.exec(SCHEMA)
}

migrate()

module.exports = { db, migrate }
