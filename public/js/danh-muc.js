;(function () {
	'use strict'

	var hop = document.getElementById('hop-danh-muc')
	if (!hop) return

	var oTieuDe = document.getElementById('dm-tieu-de')
	var oXemTruoc = document.getElementById('dm-xem-truoc')
	var oTen = document.getElementById('dm-ten')
	var bangMau = document.getElementById('dm-mau')
	var bangIcon = document.getElementById('dm-icon')
	var nutLuu = document.getElementById('dm-luu')

	var dangSua = 0
	var mau = '#FF4E8E'
	var icon = '🏷️'
	var dangLuu = false

	function ds(sel, goc) {
		return Array.prototype.slice.call((goc || document).querySelectorAll(sel))
	}

	function veXemTruoc() {
		if (!oXemTruoc) return
		oXemTruoc.textContent = icon
		oXemTruoc.style.background = mau + '22'
		oXemTruoc.style.border = '1px solid ' + mau + '66'
		oXemTruoc.style.boxShadow = '0 10px 26px ' + mau + '33'
	}

	function chonMau(m) {
		if (m) mau = m
		ds('[data-mau]', bangMau).forEach(function (b) {
			b.classList.toggle('chon', b.getAttribute('data-mau') === mau)
		})
		veXemTruoc()
	}

	function chonIcon(i) {
		if (i) icon = i
		ds('[data-icon]', bangIcon).forEach(function (b) {
			b.classList.toggle('chon', b.getAttribute('data-icon') === icon)
		})
		veXemTruoc()
	}

	function moHopDm(o) {
		dangSua = o ? Number(o.getAttribute('data-id')) : 0
		var mauDau = ds('[data-mau]', bangMau)[0]
		var iconDau = ds('[data-icon]', bangIcon)[0]
		mau =
			(o && o.getAttribute('data-mau')) ||
			(mauDau && mauDau.getAttribute('data-mau')) ||
			'#FF4E8E'
		icon =
			(o && o.getAttribute('data-icon')) ||
			(iconDau && iconDau.getAttribute('data-icon')) ||
			'🏷️'
		if (oTen) oTen.value = o ? o.getAttribute('data-ten') || '' : ''
		if (oTieuDe) oTieuDe.textContent = o ? 'Sửa danh mục' : 'Thêm danh mục'
		if (nutLuu) {
			nutLuu.textContent = o ? 'Lưu thay đổi' : 'Tạo danh mục'
			nutLuu.disabled = false
		}
		dangLuu = false
		chonMau()
		chonIcon()
		if (window.App) App.moHop('#hop-danh-muc')
	}

	async function luu() {
		if (dangLuu) return
		var ten = oTen ? oTen.value.trim() : ''
		if (!ten) {
			if (window.App) App.toast('Nhập tên danh mục đã nhé', 'loi')
			if (oTen) oTen.focus()
			return
		}
		dangLuu = true
		if (nutLuu) nutLuu.disabled = true
		try {
			var duong = dangSua ? '/api/danh-muc/' + dangSua : '/api/danh-muc'
			var kq = await App.api(duong, {
				method: 'POST',
				body: { ten: ten, icon: icon, mau_sac: mau },
			})
			if (!kq || !kq.ok) throw new Error((kq && kq.loi) || 'Không lưu được danh mục')
			App.toast(dangSua ? 'Đã cập nhật “' + ten + '”' : 'Đã thêm “' + ten + '”', 'ok')
			setTimeout(function () {
				window.location.reload()
			}, 420)
		} catch (e) {
			if (window.App) App.toast(e.message || 'Không lưu được danh mục', 'loi')
			dangLuu = false
			if (nutLuu) nutLuu.disabled = false
		}
	}

	async function goiXoa(id, cheDo, ten) {
		try {
			var kq = await App.api('/api/danh-muc/' + id + '?cheDo=' + cheDo, { method: 'DELETE' })
			if (!kq || !kq.ok) {
				if (kq && kq.ma === 'DANG_DUOC_DUNG') {
					App.toast('Danh mục đang dùng ở ' + kq.soKhoan + ' khoản chi', 'canh-bao')
					return
				}
				throw new Error((kq && kq.loi) || 'Không xoá được danh mục')
			}
			App.toast('Đã xoá “' + (kq.ten || ten) + '”', 'ok')
			var o = document.querySelector('.o-dm[data-id="' + id + '"]')
			if (o && window.HieuUng && HieuUng.voGiay) {
				HieuUng.voGiay(o)
				setTimeout(function () {
					window.location.reload()
				}, 820)
			} else {
				window.location.reload()
			}
		} catch (e) {
			if (window.App) App.toast(e.message || 'Không xoá được danh mục', 'loi')
		}
	}

	async function xoa(o, keoTheoKhoanChi) {
		var id = Number(o.getAttribute('data-id'))
		var ten = o.getAttribute('data-ten') || 'danh mục này'
		var so = Number(o.getAttribute('data-so') || 0)

		if (!so) {
			var ok = await App.xacNhan({
				tieuDe: 'Xoá “' + ten + '”?',
				chu: 'Danh mục này chưa có khoản chi nào nên xoá rất an toàn.',
				nutOk: 'Xoá danh mục',
				nguyHiem: true,
			})
			if (ok) goiXoa(id, 'chan', ten)
			return
		}

		if (keoTheoKhoanChi) {
			var okHet = await App.xacNhan({
				tieuDe: 'Xoá cả ' + so + ' khoản chi?',
				chu:
					'Bạn sẽ xoá “' +
					ten +
					'” <b>và toàn bộ ' +
					so +
					' khoản chi</b> đang gắn danh mục này (kể cả ảnh). Thống kê sẽ thay đổi và không hoàn tác được.',
				nutOk: 'Xoá tất cả',
				nutHuy: 'Huỷ',
				nguyHiem: true,
			})
			if (okHet) goiXoa(id, 'xoa-het', ten)
			return
		}

		var okGoTag = await App.xacNhan({
			tieuDe: 'Xoá “' + ten + '”?',
			chu:
				'Danh mục này đang gắn với <b>' +
				so +
				' khoản chi</b>. Các khoản chi đó sẽ được <b>giữ nguyên</b>, chỉ bỏ thẻ này.<br />Mẹo: giữ <b>Shift</b> khi bấm xoá nếu muốn xoá luôn cả các khoản chi.',
			nutOk: 'Bỏ thẻ & xoá danh mục',
			nutHuy: 'Huỷ',
			nguyHiem: true,
		})
		if (okGoTag) goiXoa(id, 'go-tag', ten)
	}

	/* ---------------- Gan su kien ---------------- */
	ds('[data-them-dm]').forEach(function (b) {
		b.addEventListener('click', function () {
			moHopDm(null)
		})
	})

	ds('.o-dm').forEach(function (o) {
		var s = o.querySelector('[data-sua]')
		if (s) {
			s.addEventListener('click', function () {
				moHopDm(o)
			})
		}
		var x = o.querySelector('[data-xoa]')
		if (x) {
			x.addEventListener('click', function (e) {
				xoa(o, e.shiftKey === true)
			})
		}
	})

	if (bangMau) {
		bangMau.addEventListener('click', function (e) {
			var b = e.target && e.target.closest ? e.target.closest('[data-mau]') : null
			if (b) chonMau(b.getAttribute('data-mau'))
		})
	}

	if (bangIcon) {
		bangIcon.addEventListener('click', function (e) {
			var b = e.target && e.target.closest ? e.target.closest('[data-icon]') : null
			if (b) chonIcon(b.getAttribute('data-icon'))
		})
	}

	if (nutLuu) nutLuu.addEventListener('click', luu)

	if (oTen) {
		oTen.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault()
				luu()
			}
		})
	}
})()
