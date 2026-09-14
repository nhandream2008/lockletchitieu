'use strict'

const users = require('../models/users')
const categories = require('../models/categories')
const stats = require('../models/stats')

/** Gắn user hiện tại + dữ liệu chung cho mọi view */
function ganUser(req, res, next) {
	res.locals.user = null
	if (req.session && req.session.userId) {
		const u = users.layUser(req.session.userId)
		if (u) {
			req.user = u
			res.locals.user = u
		} else {
			req.session.userId = null
		}
	}
	res.locals.soUser = users.demSoUser()
	next()
}

/** Bắt buộc đăng nhập cho các trang/API riêng tư */
function canDangNhap(req, res, next) {
	if (req.user) return next()
	if (req.path.startsWith('/api/')) {
		return res.status(401).json({ ok: false, loi: 'Chưa đăng nhập' })
	}
	if (users.demSoUser() === 0) return res.redirect('/thiet-lap')
	return res.redirect('/dang-nhap?tiep=' + encodeURIComponent(req.originalUrl))
}

/** Dữ liệu dùng chung cho sidebar (danh mục + tiến độ hôm nay + huy hiệu) */
function duLieuChung(req, res, next) {
	if (req.user) {
		res.locals.dsDanhMuc = categories.danhSach(req.user.id)
		res.locals.homNayTomTat = stats.tomTatHomNay(req.user.id)
		res.locals.thanhTich = stats.thanhTich(req.user.id)
	}
	next()
}

module.exports = { ganUser, canDangNhap, duLieuChung }
