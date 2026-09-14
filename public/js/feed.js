/* Feed chi tieu: xem chi tiet, sua, xoa (hieu ung vo giay) */
;(function () {
	'use strict'

	var A = window.App
	var HU = window.HieuUng

	var boc = document.getElementById('luoi-feed-boc')
	var hop = document.getElementById('hop-chi-tiet')
	if (!boc || !hop) return

	var ctAnh = document.getElementById('ct-anh')
	var ctKhongAnh = document.getElementById('ct-khong-anh')
	var ctTien = document.getElementById('ct-tien')
	var ctGhiChu = document.getElementById('ct-ghi-chu')
	var ctNgay = document.getElementById('ct-ngay')
	var ctChip = document.getElementById('ct-chip')
	var ctGio = document.getElementById('ct-gio')
	var ctLuu = document.getElementById('ct-luu')
	var ctXoa = document.getElementById('ct-xoa')
	var feedTong = document.getElementById('feed-tong')
	var feedSoLuong = document.getElementById('feed-so-luong')

	var dangXem = null

	function capNhatTongNhom(idNhom) {
		var nhom = boc.querySelector('[data-nhom="' + idNhom + '"]')
		if (!nhom) return
		var the = nhom.querySelectorAll('.the-chi-tieu')
		var dau = boc.querySelector('[data-nhom-dau="' + idNhom + '"]')
		if (!the.length) {
			if (dau) dau.remove()
			nhom.remove()
		} else if (dau) {
			var t = 0
			the.forEach(function (e) {
				t += Number(e.getAttribute('data-tien')) || 0
			})
			var o = dau.querySelector('.tong')
			if (o) o.textContent = A.dinhDangTien(t)
		}
		capNhatTongChung()
	}

	function capNhatTongChung() {
		var the = boc.querySelectorAll('.the-chi-tieu')
		var t = 0
		the.forEach(function (e) {
			t += Number(e.getAttribute('data-tien')) || 0
		})
		if (feedTong) feedTong.textContent = A.dinhDangTien(t)
		if (feedSoLuong) feedSoLuong.textContent = the.length + ' kho\u1ea3n'
		if (!the.length && !boc.querySelector('.trong')) {
			var tr = document.createElement('div')
			tr.className = 'trong'
			tr.innerHTML =
				'<div class="hinh">\uD83E\uDDFE</div><h3>Ch\u01b0a c\u00f3 kho\u1ea3n chi n\u00e0o</h3>' +
				'<p>M\u1edf m\u00e0n h\u00ecnh Camera \u0111\u1ec3 ghi l\u1ea1i kho\u1ea3n chi \u0111\u1ea7u ti\u00ean.</p>' +
				'<a class="nut nut-chinh mt-8" href="/camera">M\u1edf Camera</a>'
			boc.appendChild(tr)
		}
	}

	function veChip(ds, dsChon) {
		ctChip.innerHTML = ''
		ds.forEach(function (dm) {
			var b = document.createElement('button')
			b.type = 'button'
			b.className = 'chip' + (dsChon.indexOf(dm.id) >= 0 ? ' chon' : '')
			b.setAttribute('data-id', dm.id)
			b.style.setProperty('--mau', dm.mau_sac)
			b.innerHTML =
				'<span class="cham"></span><span>' + dm.icon + ' ' + dm.ten + '</span>'
			b.addEventListener('click', function () {
				b.classList.toggle('chon')
			})
			ctChip.appendChild(b)
		})
	}

	var dsDanhMuc = []
	try {
		var the = document.getElementById('du-lieu-dm')
		if (the) dsDanhMuc = JSON.parse(the.textContent)
	} catch (e) {
		dsDanhMuc = []
	}

	async function moChiTiet(id) {
		try {
			var kq = await A.api('/api/chi-tieu/' + id)
			var e = kq.chiTieu
			dangXem = e
			if (e.duong_dan_anh) {
				ctAnh.src = e.duong_dan_anh
				ctAnh.classList.remove('an')
				ctKhongAnh.classList.add('an')
			} else {
				ctAnh.removeAttribute('src')
				ctAnh.classList.add('an')
				ctKhongAnh.classList.remove('an')
			}
			ctTien.value = A.dinhDangSo(e.so_tien)
			ctGhiChu.value = e.ghi_chu || ''
			ctNgay.value = e.ngay_tao
			ctGio.textContent = e.gio || ''
			veChip(
				dsDanhMuc,
				(e.danh_muc || []).map(function (d) {
					return d.id
				}),
			)
			A.moHop(hop)
		} catch (err) {
			A.toast(err.message, 'loi')
		}
	}

	boc.addEventListener('click', function (e) {
		var the = e.target.closest('.the-chi-tieu')
		if (!the) return
		moChiTiet(the.getAttribute('data-id'))
	})

	boc.addEventListener('keydown', function (e) {
		if (e.key !== 'Enter' && e.key !== ' ') return
		var the = e.target.closest('.the-chi-tieu')
		if (!the) return
		e.preventDefault()
		moChiTiet(the.getAttribute('data-id'))
	})

	ctLuu.addEventListener('click', async function () {
		if (!dangXem) return
		var tien = A.chuoiSo(ctTien.value)
		if (!tien || tien <= 0) return A.toast('S\u1ed1 ti\u1ec1n kh\u00f4ng h\u1ee3p l\u1ec7', 'loi', 3)
		var ids = Array.prototype.map.call(ctChip.querySelectorAll('.chip.chon'), function (c) {
			return c.getAttribute('data-id')
		})
		ctLuu.disabled = true
		try {
			var kq = await A.api('/api/chi-tieu/' + dangXem.id, {
				method: 'POST',
				body: {
					so_tien: tien,
					ghi_chu: ctGhiChu.value,
					ngay_tao: ctNgay.value,
					danh_muc: ids.join(','),
				},
			})
			A.dongHop(hop)
			A.toast('\u0110\u00e3 c\u1eadp nh\u1eadt kho\u1ea3n chi', 'ok', 3)
			if (kq.canhBao) A.toastCanhBao(kq.canhBao)
			setTimeout(function () {
				window.location.reload()
			}, 700)
		} catch (err) {
			A.toast(err.message, 'loi')
		} finally {
			ctLuu.disabled = false
		}
	})

	ctXoa.addEventListener('click', async function () {
		if (!dangXem) return
		var dong = await A.xacNhan({
			tieuDe: 'Xo\u00e1 kho\u1ea3n chi n\u00e0y?',
			chu:
				'Kho\u1ea3n ' +
				A.dinhDangTien(dangXem.so_tien) +
				' ng\u00e0y ' +
				dangXem.ngay_dep +
				' s\u1ebd b\u1ecb xo\u00e1 v\u0129nh vi\u1ec5n.',
			nutOk: 'Xo\u00e1',
			nguyHiem: true,
		})
		if (!dong) return
		var id = dangXem.id
		try {
			var kq = await A.api('/api/chi-tieu/' + id, { method: 'DELETE' })
			A.dongHop(hop)
			var the = boc.querySelector('.the-chi-tieu[data-id="' + id + '"]')
			var idNhom = the ? the.parentElement.getAttribute('data-nhom') : null
			await HU.voGiay(the)
			if (idNhom) capNhatTongNhom(idNhom)
			else capNhatTongChung()
			A.toast('\u0110\u00e3 xo\u00e1 kho\u1ea3n chi', 'ok', 3)
			if (kq.canhBao) A.toastCanhBao(kq.canhBao)
		} catch (err) {
			A.toast(err.message, 'loi')
		}
	})
})()
