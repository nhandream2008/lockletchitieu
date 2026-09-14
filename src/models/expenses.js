'use strict'

const fs = require('fs')
const path = require('path')
const { db } = require('../db')
const { UPLOAD_DIR } = require('../config')
const {
	homNay,
	bayGioISO,
	gioPhut,
	dinhDangTien,
	dinhDangNgay,
	thuCuaNgay,
	laNgayHopLe,
} = require('../helpers')
const categories = require('./categories')

/* ---------- Ghi ---------- */

function taoChiTieu(userId, opts) {
	const soTien = Math.round(Number(opts.soTien) || 0)
	if (!soTien || soTien <= 0) throw new Error('Số tiền phải lớn hơn 0')
	if (soTien > 100000000000) throw new Error('Số tiền quá lớn')

	const ngay = laNgayHopLe(opts.ngayTao) ? opts.ngayTao : homNay()
	const ids = categories.locIdHopLe(userId, opts.categoryIds || [])

	const chay = db.transaction(() => {
		const info = db
			.prepare(
				`INSERT INTO expenses (user_id, so_tien, ghi_chu, duong_dan_anh, ngay_tao, created_at, la_mau)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				userId,
				soTien,
				(opts.ghiChu || '').toString().trim().slice(0, 500) || null,
				opts.duongDanAnh || null,
				ngay,
				opts.createdAt || bayGioISO(),
				opts.laMau ? 1 : 0,
			)
		const id = Number(info.lastInsertRowid)
		ganTag(id, ids)
		return id
	})

	return lay(userId, chay())
}

function ganTag(expenseId, ids) {
	db.prepare('DELETE FROM expense_categories WHERE expense_id = ?').run(expenseId)
	const stmt = db.prepare(
		'INSERT OR IGNORE INTO expense_categories (expense_id, category_id) VALUES (?, ?)',
	)
	ids.forEach((cid) => stmt.run(expenseId, cid))
}

function capNhat(userId, id, opts) {
	const cu = lay(userId, id)
	if (!cu) throw new Error('Không tìm thấy khoản chi')

	const soTien =
		opts.soTien === undefined ? cu.so_tien : Math.round(Number(opts.soTien) || 0)
	if (!soTien || soTien <= 0) throw new Error('Số tiền phải lớn hơn 0')
	const ghiChu =
		opts.ghiChu === undefined
			? cu.ghi_chu
			: String(opts.ghiChu || '').trim().slice(0, 500) || null
	const ngay = laNgayHopLe(opts.ngayTao) ? opts.ngayTao : cu.ngay_tao

	const chay = db.transaction(() => {
		db.prepare(
			'UPDATE expenses SET so_tien = ?, ghi_chu = ?, ngay_tao = ? WHERE id = ? AND user_id = ?',
		).run(soTien, ghiChu, ngay, id, userId)
		if (opts.categoryIds !== undefined) {
			ganTag(id, categories.locIdHopLe(userId, opts.categoryIds || []))
		}
		if (opts.duongDanAnh) {
			if (cu.duong_dan_anh && cu.duong_dan_anh !== opts.duongDanAnh)
				xoaFileAnh(cu.duong_dan_anh)
			db.prepare('UPDATE expenses SET duong_dan_anh = ? WHERE id = ?').run(
				opts.duongDanAnh,
				id,
			)
		}
	})
	chay()
	return lay(userId, id)
}

function xoa(userId, id) {
	const cu = db
		.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
		.get(id, userId)
	if (!cu) throw new Error('Không tìm thấy khoản chi')
	db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, userId)
	if (cu.duong_dan_anh) xoaFileAnh(cu.duong_dan_anh)
	return true
}

function xoaFileAnh(duongDan) {
	try {
		const ten = path.basename(String(duongDan))
		const p = path.join(UPLOAD_DIR, ten)
		if (fs.existsSync(p)) fs.unlinkSync(p)
	} catch (e) {
		/* không chặn luồng chính vì lỗi xoá file */
	}
}

/* ---------- Đọc ---------- */

function lay(userId, id) {
	const row = db
		.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
		.get(id, userId)
	if (!row) return null
	return gomTag([row])[0]
}

function gomTag(rows) {
	if (!rows.length) return []
	const ids = rows.map((r) => r.id)
	const ph = ids.map(() => '?').join(',')
	const tags = db
		.prepare(
			`SELECT ec.expense_id, c.id, c.ten, c.icon, c.mau_sac
			FROM expense_categories ec JOIN categories c ON c.id = ec.category_id
			WHERE ec.expense_id IN (${ph})
			ORDER BY c.thu_tu ASC, c.id ASC`,
		)
		.all(...ids)
	const map = new Map()
	tags.forEach((t) => {
		if (!map.has(t.expense_id)) map.set(t.expense_id, [])
		map.get(t.expense_id).push({
			id: t.id,
			ten: t.ten,
			icon: t.icon,
			mau_sac: t.mau_sac,
		})
	})
	return rows.map((r) => ({
		...r,
		danh_muc: map.get(r.id) || [],
		so_tien_dep: dinhDangTien(r.so_tien),
		gio: gioPhut(r.created_at),
		ngay_dep: dinhDangNgay(r.ngay_tao),
		thu: thuCuaNgay(r.ngay_tao),
	}))
}

function danhSach(userId, { tu, den, categoryId, limit = 60, offset = 0 } = {}) {
	const dieuKien = ['e.user_id = ?']
	const tsam = [userId]
	if (tu) {
		dieuKien.push('e.ngay_tao >= ?')
		tsam.push(tu)
	}
	if (den) {
		dieuKien.push('e.ngay_tao <= ?')
		tsam.push(den)
	}
	if (categoryId) {
		dieuKien.push(
			'EXISTS (SELECT 1 FROM expense_categories ec WHERE ec.expense_id = e.id AND ec.category_id = ?)',
		)
		tsam.push(Number(categoryId))
	}
	const rows = db
		.prepare(
			`SELECT e.* FROM expenses e WHERE ${dieuKien.join(' AND ')}
			ORDER BY e.ngay_tao DESC, e.created_at DESC, e.id DESC
			LIMIT ? OFFSET ?`,
		)
		.all(...tsam, Number(limit), Number(offset))
	const tong = db
		.prepare(
			`SELECT COUNT(*) AS n, COALESCE(SUM(e.so_tien), 0) AS tong FROM expenses e WHERE ${dieuKien.join(
				' AND ',
			)}`,
		)
		.get(...tsam)
	return { items: gomTag(rows), soLuong: tong.n, tongTien: tong.tong }
}

/** Nhóm feed theo tứng ngày để hiển thị dạng dòng thời gian */
function nhomTheoNgay(items) {
	const nhom = []
	const chiMuc = new Map()
	items.forEach((it) => {
		if (!chiMuc.has(it.ngay_tao)) {
			const g = { ngay: it.ngay_tao, ngay_dep: it.ngay_dep, thu: it.thu, items: [], tong: 0 }
			chiMuc.set(it.ngay_tao, g)
			nhom.push(g)
		}
		const g = chiMuc.get(it.ngay_tao)
		g.items.push(it)
		g.tong += it.so_tien
	})
	nhom.forEach((g) => {
		g.tong_dep = dinhDangTien(g.tong)
	})
	return nhom
}

function xuatCsv(userId, tu, den) {
	const { items } = danhSach(userId, { tu, den, limit: 100000 })
	const dong = [['Ngay', 'Gio', 'So tien (VND)', 'Danh muc', 'Ghi chu', 'Anh']]
	items.forEach((e) => {
		dong.push([
			e.ngay_dep,
			e.gio,
			String(e.so_tien),
			e.danh_muc.map((d) => d.ten).join(' | '),
			e.ghi_chu || '',
			e.duong_dan_anh || '',
		])
	})
	return dong
		.map((r) =>
			r
				.map((c) => '"' + String(c).replace(/"/g, '""') + '"')
				.join(','),
		)
		.join('\r\n')
}

module.exports = {
	taoChiTieu,
	capNhat,
	xoa,
	xoaFileAnh,
	lay,
	danhSach,
	nhomTheoNgay,
	xuatCsv,
	gomTag,
}
