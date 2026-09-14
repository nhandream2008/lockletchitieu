/* Cai dat: han muc/ngay, doi mat khau, du lieu mau, xuat CSV */
;(function () {
	'use strict'

	var A = window.App

	var formHanMuc = document.getElementById('form-han-muc')
	var oHanMuc = document.getElementById('o-han-muc')
	var xemTruocNs = document.getElementById('xem-truoc-ns')
	var soNgayThang = Number(document.body.getAttribute('data-so-ngay-thang')) || 30

	function veXemTruoc() {
		if (!oHanMuc || !xemTruocNs) return
		var hm = A.chuoiSo(oHanMuc.value)
		xemTruocNs.innerHTML =
			'Tu\u1ea7n: <b>' +
			A.dinhDangTien(hm * 7) +
			'</b> \u00b7 Th\u00e1ng n\u00e0y (' +
			soNgayThang +
			' ng\u00e0y): <b>' +
			A.dinhDangTien(hm * soNgayThang) +
			'</b>'
	}

	if (oHanMuc) {
		oHanMuc.addEventListener('input', veXemTruoc)
		veXemTruoc()
	}

	if (formHanMuc) {
		formHanMuc.addEventListener('submit', async function (e) {
			e.preventDefault()
			var hm = A.chuoiSo(oHanMuc.value)
			if (hm < 1000) return A.toast('H\u1ea1n m\u1ee9c c\u1ea7n t\u1eeb 1.000 \u20ab', 'loi', 3)
			var nut = formHanMuc.querySelector('button[type=submit]')
			nut.disabled = true
			try {
				var kq = await A.api('/api/han-muc', { method: 'POST', body: { han_muc: hm } })
				var o1 = document.getElementById('hm-hien-tai')
				if (o1) o1.textContent = kq.hanMuc_dep + '/ng\u00e0y'
				var o2 = document.getElementById('ns-thang')
				if (o2) o2.textContent = kq.nganSachThang_dep
				var o3 = document.getElementById('ns-tuan')
				if (o3) o3.textContent = kq.nganSachTuan_dep
				A.toast('\u0110\u00e3 c\u1eadp nh\u1eadt h\u1ea1n m\u1ee9c/ng\u00e0y', 'ok', 3)
				if (kq.canhBao) A.toastCanhBao(kq.canhBao)
			} catch (err) {
				A.toast(err.message, 'loi')
			} finally {
				nut.disabled = false
			}
		})
	}

	var formMatKhau = document.getElementById('form-mat-khau')
	if (formMatKhau) {
		formMatKhau.addEventListener('submit', async function (e) {
			e.preventDefault()
			var d = new FormData(formMatKhau)
			var nut = formMatKhau.querySelector('button[type=submit]')
			nut.disabled = true
			try {
				await A.api('/api/mat-khau', {
					method: 'POST',
					body: {
						mat_khau_cu: d.get('mat_khau_cu'),
						mat_khau_moi: d.get('mat_khau_moi'),
						mat_khau_moi_2: d.get('mat_khau_moi_2'),
					},
				})
				formMatKhau.reset()
				A.toast('\u0110\u00e3 \u0111\u1ed5i m\u1eadt kh\u1ea9u', 'ok', 3)
			} catch (err) {
				A.toast(err.message, 'loi', 5)
			} finally {
				nut.disabled = false
			}
		})
	}

	async function duLieuMau(hanh, nut) {
		var chu =
			hanh === 'xoa'
				? 'To\u00e0n b\u1ed9 kho\u1ea3n chi \u0111\u01b0\u1ee3c \u0111\u00e1nh d\u1ea5u l\u00e0 d\u1eef li\u1ec7u m\u1eabu s\u1ebd b\u1ecb xo\u00e1. D\u1eef li\u1ec7u b\u1ea1n t\u1ef1 nh\u1eadp v\u1eabn gi\u1eef nguy\u00ean.'
				: 'D\u1eef li\u1ec7u m\u1eabu c\u0169 s\u1ebd b\u1ecb xo\u00e1 v\u00e0 t\u1ea1o l\u1ea1i b\u1ed9 m\u1eabu m\u1edbi cho v\u00e0i ng\u00e0y g\u1ea7n \u0111\u00e2y.'
		var dong = await A.xacNhan({
			tieuDe: hanh === 'xoa' ? 'Xo\u00e1 d\u1eef li\u1ec7u m\u1eabu?' : 'N\u1ea1p l\u1ea1i d\u1eef li\u1ec7u m\u1eabu?',
			chu: chu,
			nutOk: hanh === 'xoa' ? 'Xo\u00e1' : 'N\u1ea1p l\u1ea1i',
			nguyHiem: hanh === 'xoa',
		})
		if (!dong) return
		nut.disabled = true
		try {
			var kq = await A.api('/api/du-lieu-mau', { method: 'POST', body: { hanh: hanh } })
			A.toast(
				(hanh === 'xoa' ? '\u0110\u00e3 xo\u00e1 ' : '\u0110\u00e3 t\u1ea1o ') +
					kq.so +
					' kho\u1ea3n chi m\u1eabu',
				'ok',
				3,
			)
			setTimeout(function () {
				window.location.reload()
			}, 800)
		} catch (err) {
			A.toast(err.message, 'loi')
		} finally {
			nut.disabled = false
		}
	}

	var nutNap = document.getElementById('nut-nap-mau')
	if (nutNap)
		nutNap.addEventListener('click', function () {
			duLieuMau('nap-lai', nutNap)
		})

	var nutXoa = document.getElementById('nut-xoa-mau')
	if (nutXoa)
		nutXoa.addEventListener('click', function () {
			duLieuMau('xoa', nutXoa)
		})

	var formXuat = document.getElementById('form-xuat')
	if (formXuat) {
		formXuat.addEventListener('submit', function (e) {
			var tu = formXuat.querySelector('[name=tu]').value
			var den = formXuat.querySelector('[name=den]').value
			if (!tu || !den) {
				e.preventDefault()
				A.toast('Ch\u1ecdn kho\u1ea3ng ng\u00e0y tr\u01b0\u1edbc khi xu\u1ea5t', 'loi', 3)
				return
			}
			A.toast('\u0110ang t\u1ea3i t\u1ec7p CSV...', 'ok', 3)
		})
	}
})()
