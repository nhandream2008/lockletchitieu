'use strict'

/**
 * Session store nhỏ gọn lưu ngay trong file SQLite của project.
 * Nhờ vậy không cần thêm dependency (connect-*), và đăng nhập không bị mất khi restart app.
 */

const { db } = require('./db')

module.exports = function (session) {
	const Store = session.Store

	const stmt = {
		get: db.prepare('SELECT du_lieu, han_su_dung FROM sessions WHERE sid = ?'),
		set: db.prepare(
			'INSERT INTO sessions (sid, du_lieu, han_su_dung) VALUES (?, ?, ?)' +
				' ON CONFLICT(sid) DO UPDATE SET du_lieu = excluded.du_lieu, han_su_dung = excluded.han_su_dung',
		),
		del: db.prepare('DELETE FROM sessions WHERE sid = ?'),
		clean: db.prepare('DELETE FROM sessions WHERE han_su_dung < ?'),
		touch: db.prepare('UPDATE sessions SET han_su_dung = ? WHERE sid = ?'),
	}

	const MOT_NGAY = 24 * 60 * 60 * 1000

	function hanSuDung(sess) {
		const expires = sess && sess.cookie && sess.cookie.expires
		if (expires) return new Date(expires).getTime()
		return Date.now() + 30 * MOT_NGAY
	}

	class SqliteStore extends Store {
		constructor() {
			super()
			this.donDep()
			this.timer = setInterval(() => this.donDep(), 6 * 60 * 60 * 1000)
			if (this.timer.unref) this.timer.unref()
		}

		donDep() {
			try {
				stmt.clean.run(Date.now())
			} catch (e) {
				/* bỏ qua */
			}
		}

		get(sid, cb) {
			try {
				const row = stmt.get.get(sid)
				if (!row) return cb(null, null)
				if (row.han_su_dung < Date.now()) {
					stmt.del.run(sid)
					return cb(null, null)
				}
				return cb(null, JSON.parse(row.du_lieu))
			} catch (err) {
				return cb(err)
			}
		}

		set(sid, sess, cb) {
			try {
				stmt.set.run(sid, JSON.stringify(sess), hanSuDung(sess))
				return cb && cb(null)
			} catch (err) {
				return cb && cb(err)
			}
		}

		destroy(sid, cb) {
			try {
				stmt.del.run(sid)
				return cb && cb(null)
			} catch (err) {
				return cb && cb(err)
			}
		}

		touch(sid, sess, cb) {
			try {
				stmt.touch.run(hanSuDung(sess), sid)
				return cb && cb(null)
			} catch (err) {
				return cb && cb(err)
			}
		}
	}

	return SqliteStore
}
