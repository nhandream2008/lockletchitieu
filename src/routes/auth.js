'use strict'

/** Thiết lập lần đầu / Đăng nhập / Đăng xuất */

const express = require('express')
const users = require('../models/users')
const seed = require('../models/seed')
const h = require('../helpers')

const router = express.Router()

/* ---------- Thiết lập lần đầu ---------- */

router.get('/thiet-lap', (req, res) => {
	if (req.user) return res.redirect('/camera')
	res.render('thiet-lap', {
		trang: 'thiet-lap',
		tieuDe: 'Thiết lập lần đầu',
		loi: null,
		form: { ten: '', han_muc: '150.000' },
		daCoUser: users.demSoUser() > 0,
	})
})

router.post('/thiet-lap', async (req, res) => {
	const ten = String(req.body.ten || '').trim()
	const matKhau = String(req.body.mat_khau || '')
	const matKhau2 = String(req.body.mat_khau_2 || '')
	const hanMuc = h.chuoiSo(req.body.han_muc)
	const muonDuLieuMau = req.body.du_lieu_mau === '1' || req.body.du_lieu_mau === 'on'

	const hong = (loi) =>
		res.status(400).render('thiet-lap', {
			trang: 'thiet-lap',
			tieuDe: 'Thiết lập lần đầu',
			loi,
			form: { ten, han_muc: hanMuc ? h.dinhDangSo(hanMuc) : '' },
			daCoUser: users.demSoUser() > 0,
		})

	if (ten.length < 2) return hong('Tên phải có ít nhất 2 ký tự')
	if (matKhau.length < 4) return hong('Mật khẩu / mã PIN phải có ít nhất 4 ký tự')
	if (matKhau !== matKhau2) return hong('Hai lần nhập mật khẩu chưa khớp nhau')
	if (hanMuc < 1000) return hong('Hạn mức mỗi ngày cần từ 1.000 ₫ trở lên')

	let u
	try {
		u = users.taoUser({ ten, matKhau, hanMucNgay: hanMuc })
	} catch (e) {
		return hong(e.message)
	}

	if (muonDuLieuMau) {
		try {
			await seed.napDuLieuMau(u.id)
		} catch (e) {
			console.error('[seed] không tạo được dữ liệu mẫu:', e.message)
		}
	}

	req.session.userId = u.id
	res.redirect('/camera?chao=1')
})

/* ---------- Đăng nhập ---------- */

function tiepHopLe(tiep) {
	return typeof tiep === 'string' && tiep.startsWith('/') && !tiep.startsWith('//')
		? tiep
		: '/camera'
}

router.get('/dang-nhap', (req, res) => {
	if (req.user) return res.redirect('/camera')
	if (users.demSoUser() === 0) return res.redirect('/thiet-lap')
	res.render('dang-nhap', {
		trang: 'dang-nhap',
		tieuDe: 'Đăng nhập',
		loi: null,
		ten: '',
		tiep: typeof req.query.tiep === 'string' ? req.query.tiep : '',
	})
})

router.post('/dang-nhap', (req, res) => {
	const ten = String(req.body.ten || '').trim()
	const matKhau = String(req.body.mat_khau || '')
	const tiep = typeof req.body.tiep === 'string' ? req.body.tiep : ''
	const u = users.layUserTheoTen(ten)

	if (!u || !users.kiemTraMatKhau(u, matKhau)) {
		return res.status(401).render('dang-nhap', {
			trang: 'dang-nhap',
			tieuDe: 'Đăng nhập',
			loi: 'Tên đăng nhập hoặc mật khẩu chưa đúng',
			ten,
			tiep,
		})
	}

	req.session.userId = u.id
	res.redirect(tiepHopLe(tiep))
})

/* ---------- Đăng xuất ---------- */

router.post('/dang-xuat', (req, res) => {
	req.session = null
	res.redirect('/dang-nhap')
})

module.exports = router
