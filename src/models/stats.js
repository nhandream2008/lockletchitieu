'use strict'

/**
 * Ngân sách tự động + thống kê.
 *
 * Quy tắc ngân sách (mục 4.5):
 *  - Ngày   = hạn mức/ngày
 *  - Tuần   = tổng hạn mức của 7 ngày trong tuần
 *  - Tháng  = tổng hạn mức của số ngày thực tế của tháng (28/29/30/31)
 *  - Năm    = tổng hạn mức của tất cả ngày trong năm (365/366)
 * Hạn mức được tra theo lịch sử hiệu lực => khoảng thời gian đã qua không bị
 * thay đổi khi người dùng đổi hạn mức hôm nay.
 */

const { db } = require('../db')
const { NGUONG_CANH_BAO } = require('../config')
const {
	danhSachNgay,
	homNay,
	themNgay,
	dinhDangTien,
	dinhDangTienNgan,
	dinhDangNgayNgan,
	thuNganCuaNgay,
	trangThaiNganSach,
} = require('../helpers')

/* ---------- Hạn mức ---------- */

function hamHanMuc(userId) {
	const rows = db
		.prepare(
			'SELECT han_muc_ngay, ngay_hieu_luc FROM han_muc_history WHERE user_id = ? ORDER BY ngay_hieu_luc ASC',
		)
		.all(userId)
	const user = db.prepare('SELECT han_muc_ngay FROM users WHERE id = ?').get(userId)
	const mac_dinh = (user && user.han_muc_ngay) || 0
	if (!rows.length) return () => mac_dinh
	return function (ngay) {
		let v = rows[0].han_muc_ngay
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].ngay_hieu_luc <= ngay) v = rows[i].han_muc_ngay
			else break
		}
		return v
	}
}

function nganSachKhoang(userId, tu, den, fn) {
	const f = fn || hamHanMuc(userId)
	return danhSachNgay(tu, den).reduce((s, d) => s + f(d), 0)
}

/* ---------- Truy vấn tổng ---------- */

function tongKhoang(userId, tu, den) {
	const r = db
		.prepare(
			`SELECT COALESCE(SUM(so_tien), 0) AS tong, COUNT(*) AS n
			FROM expenses WHERE user_id = ? AND ngay_tao BETWEEN ? AND ?`,
		)
		.get(userId, tu, den)
	return { tong: r.tong, soGiaoDich: r.n }
}

function tongTheoNgay(userId, tu, den) {
	const rows = db
		.prepare(
			`SELECT ngay_tao AS ngay, SUM(so_tien) AS tong, COUNT(*) AS n
			FROM expenses WHERE user_id = ? AND ngay_tao BETWEEN ? AND ?
			GROUP BY ngay_tao`,
		)
		.all(userId, tu, den)
	const map = new Map()
	rows.forEach((r) => map.set(r.ngay, r))
	return map
}

function tongTheoThang(userId, nam) {
	const rows = db
		.prepare(
			`SELECT substr(ngay_tao, 1, 7) AS thang, SUM(so_tien) AS tong, COUNT(*) AS n
			FROM expenses WHERE user_id = ? AND ngay_tao BETWEEN ? AND ?
			GROUP BY 1`,
		)
		.all(userId, `${nam}-01-01`, `${nam}-12-31`)
	const map = new Map()
	rows.forEach((r) => map.set(r.thang, r))
	return map
}

/**
 * Chi tiêu theo danh mục. Một khoản chi gắn nhiều tag được **chia đều** cho các tag
 * để tổng các danh mục luôn khớp với tổng chi tiêu (biểu đồ tròn không bị vượt 100%).
 */
function theoDanhMuc(userId, tu, den) {
	const rows = db
		.prepare(
			`SELECT c.id, c.ten, c.icon, c.mau_sac,
				SUM(e.so_tien * 1.0 / (SELECT COUNT(*) FROM expense_categories x WHERE x.expense_id = e.id)) AS tong,
				COUNT(DISTINCT e.id) AS so_giao_dich
			FROM expenses e
			JOIN expense_categories ec ON ec.expense_id = e.id
			JOIN categories c ON c.id = ec.category_id
			WHERE e.user_id = ? AND e.ngay_tao BETWEEN ? AND ?
			GROUP BY c.id
			ORDER BY tong DESC`,
		)
		.all(userId, tu, den)

	const chuaPhanLoai = db
		.prepare(
			`SELECT COALESCE(SUM(so_tien), 0) AS tong, COUNT(*) AS n FROM expenses e
			WHERE e.user_id = ? AND e.ngay_tao BETWEEN ? AND ?
				AND NOT EXISTS (SELECT 1 FROM expense_categories x WHERE x.expense_id = e.id)`,
		)
		.get(userId, tu, den)

	const ds = rows.map((r) => ({
		id: r.id,
		ten: r.ten,
		icon: r.icon,
		mau_sac: r.mau_sac,
		tong: Math.round(r.tong),
		so_giao_dich: r.so_giao_dich,
	}))
	if (chuaPhanLoai.tong > 0) {
		ds.push({
			id: 0,
			ten: 'Chưa phân loại',
			icon: '❓',
			mau_sac: '#8A8A9E',
			tong: Math.round(chuaPhanLoai.tong),
			so_giao_dich: chuaPhanLoai.n,
		})
	}
	ds.sort((a, b) => b.tong - a.tong)
	const tongTatCa = ds.reduce((s, x) => s + x.tong, 0) || 1
	ds.forEach((x) => {
		x.phan_tram = Math.round((x.tong / tongTatCa) * 1000) / 10
		x.tong_dep = dinhDangTien(x.tong)
	})
	return ds
}

/* ---------- Thống kê tổng hợp cho dashboard ---------- */

function thongKe(userId, khoang) {
	const f = hamHanMuc(userId)
	const { tong, soGiaoDich } = tongKhoang(userId, khoang.tu, khoang.den)
	const nganSach = nganSachKhoang(userId, khoang.tu, khoang.den, f)
	const phanTram = nganSach > 0 ? Math.round((tong / nganSach) * 1000) / 10 : 0
	const ngayTrongKhoang = danhSachNgay(khoang.tu, khoang.den)

	// Chuỗi số liệu cho biểu đồ cột/đường
	let series = { loai: 'ngay', labels: [], values: [], hanMuc: [], mocs: [] }
	if (khoang.loai === 'nam') {
		const nam = Number(khoang.tu.slice(0, 4))
		const map = tongTheoThang(userId, nam)
		series.loai = 'thang'
		for (let m = 1; m <= 12; m++) {
			const key = `${nam}-${String(m).padStart(2, '0')}`
			const tuT = `${key}-01`
			const denT = `${key}-${String(new Date(Date.UTC(nam, m, 0)).getUTCDate()).padStart(2, '0')}`
			series.labels.push(`T${m}`)
			series.values.push(map.has(key) ? map.get(key).tong : 0)
			series.hanMuc.push(nganSachKhoang(userId, tuT, denT, f))
			series.mocs.push(tuT)
		}
	} else {
		const tuS = khoang.loai === 'ngay' ? themNgay(khoang.den, -6) : khoang.tu
		const ngay = danhSachNgay(tuS, khoang.den)
		const map = tongTheoNgay(userId, tuS, khoang.den)
		ngay.forEach((d) => {
			series.labels.push(
				khoang.loai === 'thang'
					? String(Number(d.slice(8, 10)))
					: `${thuNganCuaNgay(d)} ${dinhDangNgayNgan(d)}`,
			)
			series.values.push(map.has(d) ? map.get(d).tong : 0)
			series.hanMuc.push(f(d))
			series.mocs.push(d)
		})
	}

	const danhMuc = theoDanhMuc(userId, khoang.tu, khoang.den)
	const soNgayDaQua = ngayTrongKhoang.filter((d) => d <= homNay()).length || 1

	return {
		khoang,
		tong,
		tong_dep: dinhDangTien(tong),
		soGiaoDich,
		nganSach,
		nganSach_dep: dinhDangTien(nganSach),
		phanTram,
		trangThai: trangThaiNganSach(phanTram),
		conLai: nganSach - tong,
		conLai_dep: dinhDangTien(Math.abs(nganSach - tong)),
		vuot: tong > nganSach,
		trungBinhNgay: Math.round(tong / soNgayDaQua),
		trungBinhNgay_dep: dinhDangTien(Math.round(tong / soNgayDaQua)),
		hanMucNgay: f(homNay() > khoang.den ? khoang.den : homNay()),
		soNgay: ngayTrongKhoang.length,
		series,
		danhMuc,
		danhMucLonNhat: danhMuc[0] || null,
	}
}

/* ---------- Thông tin nhanh cho sidebar ---------- */

function tomTatHomNay(userId) {
	const nay = homNay()
	const f = hamHanMuc(userId)
	const { tong, soGiaoDich } = tongKhoang(userId, nay, nay)
	const hanMuc = f(nay)
	const phanTram = hanMuc > 0 ? Math.round((tong / hanMuc) * 1000) / 10 : 0
	return {
		ngay: nay,
		tong,
		tong_dep: dinhDangTien(tong),
		tong_ngan: dinhDangTienNgan(tong),
		soGiaoDich,
		hanMuc,
		hanMuc_dep: dinhDangTien(hanMuc),
		hanMuc_ngan: dinhDangTienNgan(hanMuc),
		phanTram,
		trangThai: trangThaiNganSach(phanTram),
		conLai: hanMuc - tong,
		conLai_dep: dinhDangTien(Math.abs(hanMuc - tong)),
	}
}

/**
 * Gamification kiểu Astryx: chuỗi ngày giữ được hạn mức + điểm tiết kiệm + huy hiệu.
 */
function thanhTich(userId) {
	const f = hamHanMuc(userId)
	const nay = homNay()
	const user = db.prepare('SELECT ngay_tao FROM users WHERE id = ?').get(userId)
	const batDau = (user && user.ngay_tao) || nay
	const map = tongTheoNgay(userId, themNgay(nay, -400), nay)

	let chuoi = 0
	for (let i = 0; i < 400; i++) {
		const d = themNgay(nay, -i)
		if (d < batDau) break
		const chi = map.has(d) ? map.get(d).tong : 0
		if (i === 0 && chi === 0 && !map.has(d)) {
			// hôm nay chưa chi gì: vẫn tính là đang trong hạn mức
		}
		if (chi <= f(d)) chuoi++
		else break
	}

	let diem = 0
	for (let i = 0; i < 30; i++) {
		const d = themNgay(nay, -i)
		if (d < batDau) break
		const chi = map.has(d) ? map.get(d).tong : 0
		diem += Math.max(0, f(d) - chi)
	}
	diem = Math.round(diem / 1000)

	const bac =
		diem >= 3000
			? { ten: 'Thủ lĩnh tiết kiệm', icon: '👑' }
			: diem >= 1500
				? { ten: 'Thợ săn deal', icon: '🎯' }
				: diem >= 600
					? { ten: 'Tay tiết kiệm', icon: '🌟' }
					: { ten: 'Người mới', icon: '🌱' }

	return { chuoi, diem, bac }
}

module.exports = {
	hamHanMuc,
	nganSachKhoang,
	tongKhoang,
	tongTheoNgay,
	tongTheoThang,
	theoDanhMuc,
	thongKe,
	tomTatHomNay,
	thanhTich,
	NGUONG_CANH_BAO,
}
