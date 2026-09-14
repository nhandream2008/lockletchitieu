/* Man hinh Camera: chon/chup anh -> bang xac nhan -> luu khoan chi */
;(function () {
	'use strict'

	var A = window.App
	var HU = window.HieuUng
	var KHOA_CHE_DO = 'locket_che_do_chup'

	var oAnh = document.getElementById('o-anh')
	if (!oAnh) return

	var khungNgam = document.getElementById('khung-ngam')
	var nutChup = document.getElementById('nut-chup')
	var nutThuVien = document.getElementById('nut-thu-vien')
	var nutKhongAnh = document.getElementById('nut-khong-anh')
	var chuGoi = document.getElementById('chu-goi')
	var hop = document.getElementById('hop-xac-nhan')
	var xemTruoc = document.getElementById('xem-truoc')
	var khongAnhNhan = document.getElementById('khong-anh-nhan')
	var oSoTien = document.getElementById('o-so-tien')
	var oGhiChu = document.getElementById('o-ghi-chu')
	var oNgay = document.getElementById('o-ngay')
	var nutLuu = document.getElementById('nut-luu')
	var nutLuuFeed = document.getElementById('nut-luu-feed')
	var bocChip = document.getElementById('chip-danh-muc')
	var goiYTien = document.getElementById('goi-y-tien')
	var nutCheDo = document.querySelectorAll('[data-che-do]')
	var nhanNutChup = document.getElementById('nhan-nut-chup')

	var anhDangChon = null
	var urlTam = null
	var cheDoChup = true
	try { cheDoChup = localStorage.getItem(KHOA_CHE_DO) !== '0' } catch (e) {}

	function apDungCheDo() {
		if (cheDoChup) oAnh.setAttribute('capture', 'environment')
		else oAnh.removeAttribute('capture')
		nutCheDo.forEach(function (nut) {
			nut.setAttribute('aria-pressed', String((nut.dataset.cheDo === 'camera') === cheDoChup))
		})
		if (chuGoi) chuGoi.textContent = cheDoChup
			? 'Chạm để mở camera thiết bị. Trên máy tính, bạn có thể chọn ảnh có sẵn.'
			: 'Chọn một bức ảnh từ thư viện để lưu lại khoản chi của bạn.'
		if (nhanNutChup) nhanNutChup.textContent = cheDoChup ? 'Chụp ảnh' : 'Chọn ảnh'
		if (nutChup) nutChup.setAttribute('aria-label', cheDoChup ? 'Chụp ảnh khoản chi' : 'Chọn ảnh khoản chi từ thư viện')
		try { localStorage.setItem(KHOA_CHE_DO, cheDoChup ? '1' : '0') } catch (e) {}
	}
	nutCheDo.forEach(function (nut) {
		nut.addEventListener('click', function () {
			cheDoChup = nut.dataset.cheDo === 'camera'
			apDungCheDo()
		})
	})
	apDungCheDo()

	/* ---------------- Mo chon anh ---------------- */

	function moChon(batBuocThuVien) {
		if (batBuocThuVien) oAnh.removeAttribute('capture')
		else apDungCheDo()
		oAnh.click()
	}

	if (nutChup)
		nutChup.addEventListener('click', function () {
			moChon(false)
		})
	if (khungNgam)
		khungNgam.addEventListener('click', function () {
			moChon(false)
		})
	if (khungNgam) khungNgam.addEventListener('keydown', function (e) {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); moChon(false) }
	})
	if (nutThuVien)
		nutThuVien.addEventListener('click', function () {
			moChon(true)
		})
	if (nutKhongAnh)
		nutKhongAnh.addEventListener('click', function () {
			anhDangChon = null
			moBangXacNhan()
		})

	oAnh.addEventListener('change', function () {
		var f = oAnh.files && oAnh.files[0]
		if (!f) return
		anhDangChon = f
		moBangXacNhan()
		oAnh.value = ''
	})

	/* ---------------- Bang xac nhan ---------------- */

	function moBangXacNhan() {
		if (urlTam) {
			URL.revokeObjectURL(urlTam)
			urlTam = null
		}
		if (anhDangChon) {
			urlTam = URL.createObjectURL(anhDangChon)
			xemTruoc.src = urlTam
			xemTruoc.classList.remove('an')
			if (khongAnhNhan) khongAnhNhan.classList.add('an')
			if (khungNgam) {
				var cu = khungNgam.querySelector('img.xem-truoc')
				if (cu) cu.remove()
				var im = document.createElement('img')
				im.className = 'xem-truoc'
				im.alt = ''
				im.src = urlTam
				khungNgam.appendChild(im)
				khungNgam.classList.add('co-anh')
			}
		} else {
			xemTruoc.removeAttribute('src')
			xemTruoc.classList.add('an')
			if (khongAnhNhan) khongAnhNhan.classList.remove('an')
		}
		A.moHop(hop)
		setTimeout(function () {
			if (oSoTien) oSoTien.focus()
		}, 160)
	}

	function xoaKhungAnh() {
		if (!khungNgam) return
		var cu = khungNgam.querySelector('img.xem-truoc')
		if (cu) cu.remove()
		khungNgam.classList.remove('co-anh')
	}

	hop.addEventListener('locket:close', xoaKhungAnh)
	hop.addEventListener('click', function (e) {
		if (e.target === hop || (e.target.closest && e.target.closest('[data-dong]'))) xoaKhungAnh()
	})

	// Chip danh muc: chon nhieu
	if (bocChip) {
		bocChip.addEventListener('click', function (e) {
			var c = e.target.closest('button.chip[data-id]')
			if (!c) return
			c.classList.toggle('chon')
			c.setAttribute('aria-pressed', c.classList.contains('chon') ? 'true' : 'false')
		})
	}

	// Goi y so tien nhanh
	if (goiYTien) {
		goiYTien.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-tien]')
			if (!b) return
			var hienTai = A.chuoiSo(oSoTien.value)
			oSoTien.value = A.dinhDangSo(hienTai + Number(b.getAttribute('data-tien')))
			oSoTien.focus()
		})
	}

	function dsDanhMucDaChon() {
		if (!bocChip) return []
		return Array.prototype.map.call(bocChip.querySelectorAll('.chip.chon'), function (c) {
			return c.getAttribute('data-id')
		})
	}

	function datLaiForm() {
		oSoTien.value = ''
		if (oGhiChu) oGhiChu.value = ''
		if (bocChip) {
			bocChip.querySelectorAll('.chip.chon').forEach(function (c) {
				c.classList.remove('chon')
				c.setAttribute('aria-pressed', 'false')
			})
		}
		anhDangChon = null
		if (urlTam) {
			URL.revokeObjectURL(urlTam)
			urlTam = null
		}
		xoaKhungAnh()
	}

	async function luu(diFeed) {
		if (nutLuu.disabled) return
		var tien = A.chuoiSo(oSoTien.value)
		if (!tien || tien <= 0) {
			A.toast('Nh\u1eadp s\u1ed1 ti\u1ec1n \u0111\u00e3 chi tr\u01b0\u1edbc nh\u00e9', 'loi', 3)
			oSoTien.focus()
			return
		}
		var fd = new FormData()
		fd.append('so_tien', String(tien))
		fd.append('ghi_chu', oGhiChu ? oGhiChu.value : '')
		if (oNgay && oNgay.value) fd.append('ngay_tao', oNgay.value)
		dsDanhMucDaChon().forEach(function (id) {
			fd.append('danh_muc', id)
		})
		if (anhDangChon) fd.append('anh', anhDangChon)

		nutLuu.disabled = true
		if (nutLuuFeed) nutLuuFeed.disabled = true
		try {
			var kq = await A.api('/api/chi-tieu', { method: 'POST', formData: fd })
			A.dongHop(hop)
			datLaiForm()
			await HU.blobXacNhan(
				'\u0110\u00e3 l\u01b0u ' + A.dinhDangTien(kq.chiTieu.so_tien),
				kq.canhBao && kq.canhBao.ngay
					? 'H\u00f4m nay: ' +
							kq.canhBao.ngay.tong_dep +
							' / ' +
							kq.canhBao.ngay.hanMuc_dep
					: '',
				'\uD83D\uDCB8',
			)
			if (kq.canhBao) A.toastCanhBao(kq.canhBao)
			if (diFeed) {
				window.location.href = '/feed'
				return
			}
			window.location.reload()
		} catch (e) {
			A.toast(e.message, 'loi', 5)
		} finally {
			nutLuu.disabled = false
			if (nutLuuFeed) nutLuuFeed.disabled = false
		}
	}

	nutLuu.addEventListener('click', function () {
		luu(false)
	})
	if (nutLuuFeed)
		nutLuuFeed.addEventListener('click', function () {
			luu(true)
		})

	oSoTien.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') {
			e.preventDefault()
			luu(false)
		}
	})

	// Phim tat: C de mo camera
	document.addEventListener('keydown', function (e) {
		if (hop.classList.contains('mo')) return
		var o = document.activeElement
		if (o && (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA')) return
		if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || (o && o.isContentEditable)) return
		if (e.key === 'c' || e.key === 'C') { e.preventDefault(); moChon(false) }
	})
})()
