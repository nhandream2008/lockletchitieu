'use strict'

/** Các trang render bằng EJS: Camera, Feed, Dashboard, Danh mục, Cài đặt, Xuất CSV */

const express = require('express')
const { canDangNhap, duLieuChung } = require('../middleware/auth')
const chiTieu = require('../models/expenses')
const danhMucModel = require('../models/categories')
const stats = require('../models/stats')
const users = require('../models/users')
const seed = require('../models/seed')
const h = require('../helpers')

const router = express.Router()
router.use(canDangNhap, duLieuChung)

/* ---------- Camera ---------- */

router.get('/camera', (req, res) => {
	const ganNhat = chiTieu.danhSach(req.user.id, { limit: 4 }).items
	res.render('camera', {
		trang: 'camera',
		tieuDe: 'Camera',
		chao: req.query.chao === '1',
		ganNhat,
		homNay: h.homNay(),
	})
})

/* ---------- Feed ---------- */

const BO_LOC = {
	'hom-nay': { ten: 'Hôm nay' },
	tuan: { ten: 'Tuần này' },
	thang: { ten: 'Tháng này' },
	'tat-ca': { ten: 'Tất cả' },
}

function khoangBoLoc(ma) {
	const nay = h.homNay()
	if (ma === 'tuan') {
		const tu = h.dauTuan(nay)
		return { tu, den: h.themNgay(tu, 6) }
	}
	if (ma === 'thang') {
		const k = h.tinhKhoang('thang', nay)
		return { tu: k.tu, den: k.den }
	}
	if (ma === 'tat-ca') return {}
	return { tu: nay, den: nay }
}

router.get('/feed', (req, res) => {
	const boLoc = BO_LOC[req.query.loc] ? req.query.loc : 'thang'
	const { tu, den } = khoangBoLoc(boLoc)
	const dmId = Number(req.query.dm) > 0 ? Number(req.query.dm) : null
	const kq = chiTieu.danhSach(req.user.id, { tu, den, categoryId: dmId, limit: 300 })

	res.render('feed', {
		trang: 'feed',
		tieuDe: 'Feed chi tiêu',
		boLoc,
		boLocDs: BO_LOC,
		dmId,
		nhom: chiTieu.nhomTheoNgay(kq.items),
		soLuong: kq.soLuong,
		tongTien: kq.tongTien,
		tongTien_dep: h.dinhDangTien(kq.tongTien),
	})
})

/* ---------- Dashboard ---------- */

router.get('/dashboard', (req, res) => {
	const khoang = h.tinhKhoang(req.query.loai, req.query.moc)
	const tk = stats.thongKe(req.user.id, khoang)
	res.render('dashboard', {
		trang: 'dashboard',
		tieuDe: 'Dashboard',
		tk,
		khoang,
		tenLoai: h.TEN_LOAI,
	})
})

/* ---------- Danh mục ---------- */

router.get('/danh-muc', (req, res) => {
	const khoang = h.tinhKhoang('thang', h.homNay())
	res.render('danh-muc', {
		trang: 'danh-muc',
		tieuDe: 'Danh mục',
		khoang,
		thangNay: stats.theoDanhMuc(req.user.id, khoang.tu, khoang.den),
		mauGoiY: danhMucModel.MAU_GOI_Y,
		iconGoiY: danhMucModel.ICON_GOI_Y,
	})
})

/* ---------- Cài đặt ---------- */

router.get('/cai-dat', (req, res) => {
	const khoang = h.tinhKhoang('thang', h.homNay())
	res.render('cai-dat', {
		trang: 'cai-dat',
		tieuDe: 'Cài đặt',
		khoang,
		nganSachThang: stats.nganSachKhoang(req.user.id, khoang.tu, khoang.den),
		nganSachTuan: req.user.han_muc_ngay * 7,
		lichSuHanMuc: users.lichSuHanMuc(req.user.id).slice().reverse(),
		soDuLieuMau: seed.demDuLieuMau(req.user.id),
		soKhoanChi: chiTieu.danhSach(req.user.id, { limit: 1 }).soLuong,
		mocXuat: { tu: khoang.tu, den: khoang.den },
	})
})

/* ---------- Xuất CSV ---------- */

router.get('/xuat-csv', (req, res) => {
	let tu = h.laNgayHopLe(req.query.tu) ? req.query.tu : h.tinhKhoang('thang', h.homNay()).tu
	let den = h.laNgayHopLe(req.query.den) ? req.query.den : h.homNay()
	if (tu > den) {
		const t = tu
		tu = den
		den = t
	}

	const { items, tongTien } = chiTieu.danhSach(req.user.id, { tu, den, limit: 100000 })
	const o = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
	const dong = [
		['Ngày', 'Giờ', 'Số tiền (VNĐ)', 'Danh mục', 'Ghi chú', 'Ảnh'].map(o).join(','),
	]
	items.forEach((e) => {
		dong.push(
			[
				e.ngay_dep,
				e.gio,
				e.so_tien,
				e.danh_muc.map((d) => d.ten).join(' | '),
				e.ghi_chu || '',
				e.duong_dan_anh || '',
			]
				.map(o)
				.join(','),
		)
	})
	dong.push('')
	dong.push([o('Tổng'), '', o(tongTien), '', '', ''].join(','))

	res.setHeader('Content-Type', 'text/csv; charset=utf-8')
	res.setHeader(
		'Content-Disposition',
		`attachment; filename="chi-tieu-${tu}-den-${den}.csv"`,
	)
	res.send('\uFEFF' + dong.join('\r\n'))
})

module.exports = router
