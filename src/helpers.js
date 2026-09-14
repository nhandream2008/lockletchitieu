'use strict'

/**
 * Tiện ích chung: định dạng tiền VNĐ, ngày tháng kiểu Việt Nam và tính khoảng thời gian
 * (Ngày / Tuần / Tháng / Năm) theo múi giờ của app.
 */

const { TZ } = require('./config')

const THU = [
	'Chủ Nhật',
	'Thứ Hai',
	'Thứ Ba',
	'Thứ Tư',
	'Thứ Năm',
	'Thứ Sáu',
	'Thứ Bảy',
]
const THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const fmtNgayISO = new Intl.DateTimeFormat('en-CA', {
	timeZone: TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})
const fmtGio = new Intl.DateTimeFormat('en-GB', {
	timeZone: TZ,
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
})
const fmtSo = new Intl.NumberFormat('vi-VN')

/* ---------- Ngày tháng ---------- */

function homNay() {
	return fmtNgayISO.format(new Date())
}

function gioPhut(iso) {
	return fmtGio.format(new Date(iso))
}

function bayGioISO() {
	return new Date().toISOString()
}

function laNgayHopLe(s) {
	return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function sangUTC(s) {
	return new Date(s + 'T00:00:00Z')
}

function veChuoi(d) {
	return d.toISOString().slice(0, 10)
}

function themNgay(s, n) {
	const d = sangUTC(s)
	d.setUTCDate(d.getUTCDate() + n)
	return veChuoi(d)
}

function themThang(s, n) {
	const d = sangUTC(s)
	d.setUTCDate(1)
	d.setUTCMonth(d.getUTCMonth() + n)
	return veChuoi(d)
}

/** Tuần bắt đầu từ Thứ Hai (chuẩn Việt Nam) */
function dauTuan(s) {
	const d = sangUTC(s)
	const dow = (d.getUTCDay() + 6) % 7
	d.setUTCDate(d.getUTCDate() - dow)
	return veChuoi(d)
}

function soNgayTrongThang(nam, thang /* 1-12 */) {
	return new Date(Date.UTC(nam, thang, 0)).getUTCDate()
}

function danhSachNgay(tu, den) {
	const ds = []
	let cur = tu
	let guard = 0
	while (cur <= den && guard++ < 400) {
		ds.push(cur)
		cur = themNgay(cur, 1)
	}
	return ds
}

function thuCuaNgay(s) {
	return THU[sangUTC(s).getUTCDay()]
}

function thuNganCuaNgay(s) {
	return THU_NGAN[sangUTC(s).getUTCDay()]
}

/* ---------- Định dạng ---------- */

function dinhDangTien(n) {
	return fmtSo.format(Math.round(Number(n) || 0)) + '\u00a0₫'
}

function dinhDangSo(n) {
	return fmtSo.format(Math.round(Number(n) || 0))
}

/** 1.250.000 -> "1,25 tr" ; 150.000 -> "150k" (dùng cho trục biểu đồ, badge) */
function dinhDangTienNgan(n) {
	const v = Math.round(Number(n) || 0)
	if (v >= 1000000) {
		const tr = v / 1000000
		return (tr >= 10 ? Math.round(tr) : Math.round(tr * 10) / 10)
			.toString()
			.replace('.', ',') + ' tr'
	}
	if (v >= 1000) return Math.round(v / 1000) + 'k'
	return String(v)
}

function dinhDangNgay(s) {
	if (!laNgayHopLe(s)) return s || ''
	const [y, m, d] = s.split('-')
	return `${d}/${m}/${y}`
}

function dinhDangNgayNgan(s) {
	if (!laNgayHopLe(s)) return s || ''
	const [, m, d] = s.split('-')
	return `${d}/${m}`
}

/* ---------- Khoảng thời gian ---------- */

const LOAI_KHOANG = ['ngay', 'tuan', 'thang', 'nam']

/**
 * Tính khoảng thời gian đang xem.
 * @param {string} loai 'ngay' | 'tuan' | 'thang' | 'nam'
 * @param {string} moc  'YYYY-MM-DD' (mốc bất kỳ nằm trong khoảng)
 */
function tinhKhoang(loai, moc) {
	const kieu = LOAI_KHOANG.includes(loai) ? loai : 'ngay'
	const m = laNgayHopLe(moc) ? moc : homNay()
	const [nam, thang] = m.split('-').map(Number)

	let tu = m
	let den = m
	let nhan = ''
	let nhanNgan = ''
	let truoc = ''
	let sau = ''

	if (kieu === 'ngay') {
		tu = den = m
		nhan = `${thuCuaNgay(m)}, ${dinhDangNgay(m)}`
		nhanNgan = dinhDangNgay(m)
		truoc = themNgay(m, -1)
		sau = themNgay(m, 1)
	} else if (kieu === 'tuan') {
		tu = dauTuan(m)
		den = themNgay(tu, 6)
		nhan = `Tuần ${dinhDangNgayNgan(tu)} – ${dinhDangNgay(den)}`
		nhanNgan = `${dinhDangNgayNgan(tu)}–${dinhDangNgayNgan(den)}`
		truoc = themNgay(tu, -7)
		sau = themNgay(tu, 7)
	} else if (kieu === 'thang') {
		tu = `${m.slice(0, 7)}-01`
		den = `${m.slice(0, 7)}-${String(soNgayTrongThang(nam, thang)).padStart(2, '0')}`
		nhan = `Tháng ${thang}/${nam}`
		nhanNgan = `T${thang}/${nam}`
		truoc = themThang(tu, -1)
		sau = themThang(tu, 1)
	} else {
		tu = `${nam}-01-01`
		den = `${nam}-12-31`
		nhan = `Năm ${nam}`
		nhanNgan = String(nam)
		truoc = `${nam - 1}-01-01`
		sau = `${nam + 1}-01-01`
	}

	const nay = homNay()
	return {
		loai: kieu,
		moc: m,
		tu,
		den,
		nhan,
		nhanNgan,
		truoc,
		sau,
		soNgay: danhSachNgay(tu, den).length,
		chuaChuaHomNay: nay >= tu && nay <= den,
		coTuongLai: sau <= nay || tu <= nay,
	}
}

const TEN_LOAI = {
	ngay: 'Ngày',
	tuan: 'Tuần',
	thang: 'Tháng',
	nam: 'Năm',
}

/* ---------- Khác ---------- */

function trangThaiNganSach(phanTram) {
	if (phanTram >= 100) return 'vuot'
	if (phanTram >= 80) return 'canh-bao'
	return 'an-toan'
}

function chuoiSo(x) {
	const s = String(x == null ? '' : x).replace(/[^\d]/g, '')
	return s ? Number(s) : 0
}

function thoat(s) {
	return String(s == null ? '' : s)
}

module.exports = {
	THU,
	THU_NGAN,
	LOAI_KHOANG,
	TEN_LOAI,
	homNay,
	gioPhut,
	bayGioISO,
	laNgayHopLe,
	themNgay,
	themThang,
	dauTuan,
	soNgayTrongThang,
	danhSachNgay,
	thuCuaNgay,
	thuNganCuaNgay,
	dinhDangTien,
	dinhDangSo,
	dinhDangTienNgan,
	dinhDangNgay,
	dinhDangNgayNgan,
	tinhKhoang,
	trangThaiNganSach,
	chuoiSo,
	thoat,
}
