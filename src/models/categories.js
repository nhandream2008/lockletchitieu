'use strict'

const { db } = require('../db')

const DANH_MUC_MAC_DINH = [
	{ ten: 'Ăn uống', icon: '🍜', mau_sac: '#FF7A4D' },
	{ ten: 'Mua sắm', icon: '🛍️', mau_sac: '#FF4E8E' },
	{ ten: 'Đi chơi/Giải trí', icon: '🎡', mau_sac: '#8B7BFF' },
]

const MAU_GOI_Y = [
	'#FF4E8E',
	'#FF7A4D',
	'#FFB44E',
	'#F6D65A',
	'#5FD08A',
	'#4EC9D8',
	'#5B9CFF',
	'#8B7BFF',
	'#C86BFF',
	'#FF6B6B',
]

const ICON_GOI_Y = [
	'🍜',
	'☕️',
	'🍔',
	'🛒',
	'🛍️',
	'🎡',
	'🎮',
	'🎬',
	'🎵',
	'🚕',
	'⛽️',
	'🏠',
	'💡',
	'💊',
	'🏋️',
	'👕',
	'💐',
	'🎁',
	'📚',
	'✈️',
	'🐶',
	'👶',
	'💻',
	'🔧',
]

function taoBoMacDinh(userId) {
	const stmt = db.prepare(
		'INSERT INTO categories (user_id, ten, icon, mau_sac, la_mac_dinh, thu_tu) VALUES (?, ?, ?, ?, 1, ?)',
	)
	DANH_MUC_MAC_DINH.forEach((dm, i) => {
		stmt.run(userId, dm.ten, dm.icon, dm.mau_sac, i)
	})
}

function danhSach(userId) {
	return db
		.prepare(
			`SELECT c.*, (
				SELECT COUNT(*) FROM expense_categories ec
				JOIN expenses e ON e.id = ec.expense_id
				WHERE ec.category_id = c.id AND e.user_id = c.user_id
			) AS so_khoan_chi
			FROM categories c WHERE c.user_id = ? ORDER BY c.thu_tu ASC, c.id ASC`,
		)
		.all(userId)
}

function lay(userId, id) {
	return db
		.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
		.get(id, userId)
}

function locIdHopLe(userId, ids) {
	const mang = (Array.isArray(ids) ? ids : [ids])
		.map((x) => Number(x))
		.filter((x) => Number.isInteger(x) && x > 0)
	if (!mang.length) return []
	const placeholders = mang.map(() => '?').join(',')
	return db
		.prepare(
			`SELECT id FROM categories WHERE user_id = ? AND id IN (${placeholders})`,
		)
		.all(userId, ...mang)
		.map((r) => r.id)
}

function taoMoi(userId, { ten, icon, mau_sac }) {
	const tenSach = String(ten || '').trim()
	if (!tenSach) throw new Error('Tên danh mục không được để trống')
	if (tenSach.length > 40) throw new Error('Tên danh mục quá dài')
	const trung = db
		.prepare(
			'SELECT id FROM categories WHERE user_id = ? AND lower(ten) = lower(?)',
		)
		.get(userId, tenSach)
	if (trung) throw new Error('Đã có danh mục tên này')
	const maxThuTu =
		db.prepare('SELECT COALESCE(MAX(thu_tu), -1) AS m FROM categories WHERE user_id = ?')
			.get(userId).m + 1
	const info = db
		.prepare(
			'INSERT INTO categories (user_id, ten, icon, mau_sac, la_mac_dinh, thu_tu) VALUES (?, ?, ?, ?, 0, ?)',
		)
		.run(
			userId,
			tenSach,
			String(icon || '🏷️').slice(0, 8),
			mauHopLe(mau_sac),
			maxThuTu,
		)
	return lay(userId, Number(info.lastInsertRowid))
}

function capNhat(userId, id, { ten, icon, mau_sac }) {
	const cu = lay(userId, id)
	if (!cu) throw new Error('Không tìm thấy danh mục')
	const tenSach = ten === undefined ? cu.ten : String(ten || '').trim()
	if (!tenSach) throw new Error('Tên danh mục không được để trống')
	const trung = db
		.prepare(
			'SELECT id FROM categories WHERE user_id = ? AND lower(ten) = lower(?) AND id <> ?',
		)
		.get(userId, tenSach, id)
	if (trung) throw new Error('Đã có danh mục tên này')
	db.prepare(
		'UPDATE categories SET ten = ?, icon = ?, mau_sac = ? WHERE id = ? AND user_id = ?',
	).run(
		tenSach,
		String(icon === undefined ? cu.icon : icon || '🏷️').slice(0, 8),
		mau_sac === undefined ? cu.mau_sac : mauHopLe(mau_sac),
		id,
		userId,
	)
	return lay(userId, id)
}

function demKhoanChi(userId, id) {
	return db
		.prepare(
			`SELECT COUNT(*) AS n FROM expense_categories ec
			JOIN expenses e ON e.id = ec.expense_id
			WHERE ec.category_id = ? AND e.user_id = ?`,
		)
		.get(id, userId).n
}

/**
 * Xoá danh mục.
 * @param {'chan'|'go-tag'|'xoa-het'} cheDo
 *  - 'chan'    : từ chối nếu còn khoản chi (mặc định, front-end sẽ hỏi lại)
 *  - 'go-tag'  : chỉ gỡ tag khỏi các khoản chi, giữ nguyên khoản chi
 *  - 'xoa-het' : xoá luôn các khoản chi chỉ có duy nhất tag này
 */
function xoa(userId, id, cheDo = 'chan') {
	const dm = lay(userId, id)
	if (!dm) throw new Error('Không tìm thấy danh mục')
	const soKhoan = demKhoanChi(userId, id)
	if (soKhoan > 0 && cheDo === 'chan') {
		const err = new Error(
			`Danh mục “${dm.ten}” đang được dùng ở ${soKhoan} khoản chi`,
		)
		err.code = 'DANG_DUOC_DUNG'
		err.soKhoan = soKhoan
		throw err
	}

	const anhCanXoa = []
	const chay = db.transaction(() => {
		if (cheDo === 'xoa-het') {
			const rows = db
				.prepare(
					`SELECT e.id, e.duong_dan_anh FROM expenses e
					JOIN expense_categories ec ON ec.expense_id = e.id
					WHERE ec.category_id = ? AND e.user_id = ?
						AND (SELECT COUNT(*) FROM expense_categories x WHERE x.expense_id = e.id) = 1`,
				)
				.all(id, userId)
			rows.forEach((r) => {
				if (r.duong_dan_anh) anhCanXoa.push(r.duong_dan_anh)
				db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(
					r.id,
					userId,
				)
			})
		}
		db.prepare('DELETE FROM expense_categories WHERE category_id = ?').run(id)
		db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId)
	})
	chay()
	return { ten: dm.ten, anhCanXoa }
}

function mauHopLe(mau) {
	const s = String(mau || '').trim()
	return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : '#FF4E8E'
}

module.exports = {
	DANH_MUC_MAC_DINH,
	MAU_GOI_Y,
	ICON_GOI_Y,
	taoBoMacDinh,
	danhSach,
	lay,
	locIdHopLe,
	taoMoi,
	capNhat,
	demKhoanChi,
	xoa,
}
