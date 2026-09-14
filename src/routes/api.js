'use strict'

/** REST API dùng cho các thao tác AJAX của giao diện */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')

const { canDangNhap } = require('../middleware/auth')
const cfg = require('../config')
const chiTieu = require('../models/expenses')
const danhMucModel = require('../models/categories')
const stats = require('../models/stats')
const users = require('../models/users')
const seed = require('../models/seed')
const h = require('../helpers')
const cloudSync = require('../cloudSync')

const router = express.Router()
router.use(canDangNhap)

/* ---------- Ảnh ---------- */

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 15 * 1024 * 1024 },
	fileFilter(req, file, cb) {
		if (!/^image\//.test(file.mimetype)) return cb(new Error('Chỉ nhận tệp ảnh'))
		cb(null, true)
	},
})

/** Nhận multipart mà không để lỗi multer làm sập request */
function nhanAnh(req, res, next) {
	upload.single('anh')(req, res, (err) => {
		if (err) return res.status(400).json({ ok: false, loi: err.message })
		next()
	})
}

async function luuAnh(file, userId) {
	if (!file || !file.buffer || !file.buffer.length) return null
	const ten = `chi-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.jpg`
	const dich = path.join(cfg.UPLOAD_DIR, ten)
	if (cloudSync.enabled) {
		let body = file.buffer
		try {
			const sharp = require('sharp')
			body = await sharp(file.buffer).rotate().resize({ width: cfg.IMAGE_MAX_SIZE, height: cfg.IMAGE_MAX_SIZE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: cfg.IMAGE_QUALITY, mozjpeg: true }).toBuffer()
		} catch (e) { console.error('[anh] không nén được, dùng ảnh gốc:', e.message) }
		return cloudSync.uploadImage(body, ten, 'image/jpeg', userId)
	}
	try {
		const sharp = require('sharp')
		await sharp(file.buffer)
			.rotate()
			.resize({
				width: cfg.IMAGE_MAX_SIZE,
				height: cfg.IMAGE_MAX_SIZE,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.jpeg({ quality: cfg.IMAGE_QUALITY, mozjpeg: true })
			.toFile(dich)
	} catch (e) {
		// Nếu sharp lỗi (ảnh lạ) thì vẫn lưu tệp gốc để không mất dữ liệu
		console.error('[anh] sharp lỗi, lưu ảnh gốc:', e.message)
		fs.writeFileSync(dich, file.buffer)
	}
	return '/uploads/' + ten
}

/* ---------- Tiện ích ---------- */

function dsIdTuBody(body) {
	let raw = body.danh_muc
	if (raw === undefined || raw === null || raw === '') return []
	if (typeof raw === 'string') raw = raw.split(',')
	if (!Array.isArray(raw)) raw = [raw]
	return raw.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0)
}

/** Tình trạng ngân sách hôm nay + tháng này, dùng cho toast cảnh báo */
function canhBao(userId) {
	const ngay = stats.tomTatHomNay(userId)
	const k = h.tinhKhoang('thang', h.homNay())
	const tongThang = stats.tongKhoang(userId, k.tu, k.den).tong
	const nsThang = stats.nganSachKhoang(userId, k.tu, k.den)
	const ptThang = nsThang > 0 ? Math.round((tongThang / nsThang) * 1000) / 10 : 0
	const thang = {
		nhan: k.nhan,
		tong: tongThang,
		tong_dep: h.dinhDangTien(tongThang),
		nganSach: nsThang,
		nganSach_dep: h.dinhDangTien(nsThang),
		phanTram: ptThang,
		trangThai: h.trangThaiNganSach(ptThang),
	}

	let muc = 'ok'
	let loi = ''
	if (ngay.phanTram >= 100) {
		muc = 'vuot'
		loi = `Hôm nay đã vượt hạn mức: ${ngay.tong_dep} / ${ngay.hanMuc_dep}`
	} else if (ngay.phanTram >= 80) {
		muc = 'canh-bao'
		loi = `Hôm nay đã dùng ${ngay.phanTram}% hạn mức ngày (${ngay.tong_dep} / ${ngay.hanMuc_dep})`
	} else if (ptThang >= 100) {
		muc = 'vuot'
		loi = `${k.nhan} đã vượt ngân sách: ${thang.tong_dep} / ${thang.nganSach_dep}`
	} else if (ptThang >= 80) {
		muc = 'canh-bao'
		loi = `${k.nhan} đã dùng ${ptThang}% ngân sách tháng`
	}
	return { muc, loi, ngay, thang }
}

function batLoi(fn) {
	return async (req, res) => {
		try {
			await fn(req, res)
		} catch (e) {
			res.status(400).json({ ok: false, loi: e.message || 'Có lỗi xảy ra' })
		}
	}
}

/* ---------- Khoản chi ---------- */

router.post(
	'/chi-tieu',
	nhanAnh,
	batLoi(async (req, res) => {
		const duongDanAnh = await luuAnh(req.file, req.user.id)
		const e = chiTieu.taoChiTieu(req.user.id, {
			soTien: h.chuoiSo(req.body.so_tien),
			ghiChu: req.body.ghi_chu,
			ngayTao: req.body.ngay_tao,
			duongDanAnh,
			categoryIds: dsIdTuBody(req.body),
		})
		res.json({ ok: true, chiTieu: e, canhBao: canhBao(req.user.id) })
	}),
)

router.get(
	'/chi-tieu/:id',
	batLoi(async (req, res) => {
		const e = chiTieu.lay(req.user.id, Number(req.params.id))
		if (!e) return res.status(404).json({ ok: false, loi: 'Không tìm thấy khoản chi' })
		res.json({ ok: true, chiTieu: e })
	}),
)

router.post(
	'/chi-tieu/:id',
	nhanAnh,
	batLoi(async (req, res) => {
		const id = Number(req.params.id)
		const cu = chiTieu.lay(req.user.id, id)
		if (!cu) return res.status(404).json({ ok: false, loi: 'Không tìm thấy khoản chi' })

		const duongDanAnh = await luuAnh(req.file, req.user.id)
		const opts = {
			soTien: req.body.so_tien === undefined ? undefined : h.chuoiSo(req.body.so_tien),
			ghiChu: req.body.ghi_chu,
			ngayTao: req.body.ngay_tao,
			categoryIds: dsIdTuBody(req.body),
		}
		if (duongDanAnh) opts.duongDanAnh = duongDanAnh
		const e = chiTieu.capNhat(req.user.id, id, opts)

		// Gỡ ảnh mà không thay ảnh mới
		if (!duongDanAnh && String(req.body.xoa_anh) === '1' && cu.duong_dan_anh) {
			chiTieu.xoaFileAnh(cu.duong_dan_anh)
			require('../db').db.prepare('UPDATE expenses SET duong_dan_anh = NULL WHERE id = ? AND user_id = ?').run(id, req.user.id)
			e.duong_dan_anh = null
		}

		res.json({ ok: true, chiTieu: e, canhBao: canhBao(req.user.id) })
	}),
)

router.delete(
	'/chi-tieu/:id',
	batLoi(async (req, res) => {
		chiTieu.xoa(req.user.id, Number(req.params.id))
		res.json({ ok: true, canhBao: canhBao(req.user.id) })
	}),
)

/* ---------- Danh mục ---------- */

router.get(
	'/danh-muc',
	batLoi(async (req, res) => {
		res.json({ ok: true, dsDanhMuc: danhMucModel.danhSach(req.user.id) })
	}),
)

router.post(
	'/danh-muc',
	batLoi(async (req, res) => {
		const dm = danhMucModel.taoMoi(req.user.id, {
			ten: req.body.ten,
			icon: req.body.icon,
			mau_sac: req.body.mau_sac,
		})
		res.json({ ok: true, danhMuc: dm })
	}),
)

router.post(
	'/danh-muc/:id',
	batLoi(async (req, res) => {
		const dm = danhMucModel.capNhat(req.user.id, Number(req.params.id), {
			ten: req.body.ten,
			icon: req.body.icon,
			mau_sac: req.body.mau_sac,
		})
		res.json({ ok: true, danhMuc: dm })
	}),
)

router.delete('/danh-muc/:id', async (req, res) => {
	const id = Number(req.params.id)
	const cheDo = ['chan', 'go-tag', 'xoa-het'].includes(req.query.cheDo)
		? req.query.cheDo
		: 'chan'
	try {
		const soKhoan = danhMucModel.demKhoanChi(req.user.id, id)
		const kq = danhMucModel.xoa(req.user.id, id, cheDo)
		;(kq.anhCanXoa || []).forEach((a) => chiTieu.xoaFileAnh(a))
		res.json({ ok: true, ten: kq.ten, soKhoan, cheDo })
	} catch (e) {
		if (e.code === 'DANG_DUOC_DUNG') {
			return res
				.status(409)
				.json({ ok: false, ma: 'DANG_DUOC_DUNG', soKhoan: e.soKhoan, loi: e.message })
		}
		res.status(400).json({ ok: false, loi: e.message })
	}
})

/* ---------- Hạn mức / Ngân sách ---------- */

router.post(
	'/han-muc',
	batLoi(async (req, res) => {
		const hanMuc = users.capNhatHanMuc(req.user.id, h.chuoiSo(req.body.han_muc))
		const k = h.tinhKhoang('thang', h.homNay())
		res.json({
			ok: true,
			hanMuc,
			hanMuc_dep: h.dinhDangTien(hanMuc),
			nganSachTuan_dep: h.dinhDangTien(hanMuc * 7),
			nganSachThang_dep: h.dinhDangTien(stats.nganSachKhoang(req.user.id, k.tu, k.den)),
			soNgayThang: k.soNgay,
			nhanThang: k.nhan,
			canhBao: canhBao(req.user.id),
		})
	}),
)

/* ---------- Mật khẩu ---------- */

router.post(
	'/mat-khau',
	batLoi(async (req, res) => {
		if (String(req.body.mat_khau_moi || '') !== String(req.body.mat_khau_moi_2 || ''))
			throw new Error('Hai lần nhập mật khẩu mới chưa khớp')
		users.doiMatKhau(req.user.id, req.body.mat_khau_cu, req.body.mat_khau_moi)
		res.json({ ok: true })
	}),
)

/* ---------- Dữ liệu mẫu ---------- */

router.post(
	'/du-lieu-mau',
	batLoi(async (req, res) => {
		const hanh = req.body.hanh === 'xoa' ? 'xoa' : 'nap-lai'
		const so =
			hanh === 'xoa' ? seed.xoaDuLieuMau(req.user.id) : await seed.napLai(req.user.id)
		res.json({ ok: true, hanh, so, conLai: seed.demDuLieuMau(req.user.id) })
	}),
)

/* ---------- Thống kê ---------- */

router.get(
	'/thong-ke',
	batLoi(async (req, res) => {
		const khoang = h.tinhKhoang(req.query.loai, req.query.moc)
		res.json({ ok: true, tk: stats.thongKe(req.user.id, khoang) })
	}),
)

router.get(
	'/tom-tat',
	batLoi(async (req, res) => {
		res.json({ ok: true, homNay: stats.tomTatHomNay(req.user.id), canhBao: canhBao(req.user.id) })
	}),
)

module.exports = router
