'use strict'

const bcrypt = require('bcryptjs')
const { db } = require('../db')
const { homNay, bayGioISO } = require('../helpers')
const categories = require('./categories')

function demSoUser() {
	return db.prepare('SELECT COUNT(*) AS n FROM users').get().n
}

function layUser(id) {
	return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

function layUserTheoTen(ten) {
	return db
		.prepare('SELECT * FROM users WHERE lower(ten) = lower(?)')
		.get(String(ten || '').trim())
}

/**
 * Tạo tài khoản mới + bộ danh mục mặc định + mốc hạn mức đầu tiên.
 */
function taoUser({ ten, matKhau, hanMucNgay }) {
	const tenSach = String(ten || '').trim()
	if (tenSach.length < 2) throw new Error('Tên phải có ít nhất 2 ký tự')
	if (String(matKhau || '').length < 4)
		throw new Error('Mật khẩu / mã PIN phải có ít nhất 4 ký tự')
	if (layUserTheoTen(tenSach)) throw new Error('Tên này đã được dùng')

	const hanMuc = Math.max(1000, Math.round(Number(hanMucNgay) || 150000))
	const hash = bcrypt.hashSync(String(matKhau), 10)

	const tao = db.transaction(() => {
		const info = db
			.prepare(
				'INSERT INTO users (ten, mat_khau_hash, han_muc_ngay, ngay_tao) VALUES (?, ?, ?, ?)',
			)
			.run(tenSach, hash, hanMuc, homNay())
		const userId = Number(info.lastInsertRowid)
		categories.taoBoMacDinh(userId)
		db.prepare(
			'INSERT INTO han_muc_history (user_id, han_muc_ngay, ngay_hieu_luc, created_at) VALUES (?, ?, ?, ?)',
		).run(userId, hanMuc, homNay(), bayGioISO())
		return userId
	})

	return layUser(tao())
}

function kiemTraMatKhau(user, matKhau) {
	if (!user) return false
	try {
		return bcrypt.compareSync(String(matKhau || ''), user.mat_khau_hash)
	} catch (e) {
		return false
	}
}

function doiMatKhau(userId, matKhauCu, matKhauMoi) {
	const user = layUser(userId)
	if (!kiemTraMatKhau(user, matKhauCu))
		throw new Error('Mật khẩu hiện tại không đúng')
	if (String(matKhauMoi || '').length < 4)
		throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự')
	db.prepare('UPDATE users SET mat_khau_hash = ? WHERE id = ?').run(
		bcrypt.hashSync(String(matKhauMoi), 10),
		userId,
	)
	return true
}

/**
 * Đổi hạn mức/ngày. Ghi thêm 1 mốc vào lịch sử để các khoảng thời gian đã qua
 * vẫn được tính theo hạn mức có hiệu lực lúc đó.
 */
function capNhatHanMuc(userId, hanMucNgay, ngayHieuLuc) {
	const hanMuc = Math.max(1000, Math.round(Number(hanMucNgay) || 0))
	if (!hanMuc) throw new Error('Hạn mức không hợp lệ')
	const ngay = ngayHieuLuc || homNay()
	const chay = db.transaction(() => {
		db.prepare('UPDATE users SET han_muc_ngay = ? WHERE id = ?').run(hanMuc, userId)
		const daCo = db
			.prepare(
				'SELECT id FROM han_muc_history WHERE user_id = ? AND ngay_hieu_luc = ?',
			)
			.get(userId, ngay)
		if (daCo) {
			db.prepare('UPDATE han_muc_history SET han_muc_ngay = ? WHERE id = ?').run(
				han_mucSafe(hanMuc),
				daCo.id,
			)
		} else {
			db.prepare(
				'INSERT INTO han_muc_history (user_id, han_muc_ngay, ngay_hieu_luc, created_at) VALUES (?, ?, ?, ?)',
			).run(userId, hanMuc, ngay, bayGioISO())
		}
	})
	chay()
	return hanMuc
}

function han_mucSafe(v) {
	return Math.max(1000, Math.round(Number(v) || 0))
}

function lichSuHanMuc(userId) {
	return db
		.prepare(
			'SELECT han_muc_ngay, ngay_hieu_luc FROM han_muc_history WHERE user_id = ? ORDER BY ngay_hieu_luc ASC',
		)
		.all(userId)
}

module.exports = {
	demSoUser,
	layUser,
	layUserTheoTen,
	taoUser,
	kiemTraMatKhau,
	doiMatKhau,
	capNhatHanMuc,
	lichSuHanMuc,
}
