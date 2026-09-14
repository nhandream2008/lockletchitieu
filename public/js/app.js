/* Tien ich dung chung: dinh dang tien VND, mat na o nhap, toast, hop thoai, goi API */
;(function () {
	'use strict'

	var NBSP = '\u00A0'

	function chuoiSo(v) {
		if (v === null || v === undefined) return 0
		var s = String(v).replace(/[^0-9-]/g, '')
		var n = parseInt(s, 10)
		return isNaN(n) ? 0 : n
	}

	function dinhDangSo(n) {
		var x = Math.round(Number(n) || 0)
		return x.toLocaleString('vi-VN')
	}

	function dinhDangTien(n) {
		return dinhDangSo(n) + NBSP + '\u20AB'
	}

	function tienNgan(n) {
		var x = Math.round(Number(n) || 0)
		if (x >= 1000000000) return (x / 1000000000).toFixed(1).replace('.0', '') + ' t\u1ef7'
		if (x >= 1000000) return (x / 1000000).toFixed(1).replace('.0', '') + ' tr'
		if (x >= 1000) return Math.round(x / 1000) + 'k'
		return String(x)
	}

	/** Mat na so tien: tu them dau cham ngan nghin khi nguoi dung go */
	function ganMatNaTien(o) {
		if (!o || o.__daGan) return
		o.__daGan = true
		o.setAttribute('inputmode', 'numeric')
		o.setAttribute('autocomplete', 'off')
		function lam() {
			var n = chuoiSo(o.value)
			o.value = n ? dinhDangSo(n) : ''
		}
		o.addEventListener('input', lam)
		o.addEventListener('blur', lam)
		if (o.value) lam()
	}

	/* ---------------- Toast ---------------- */

	function khay() {
		var k = document.querySelector('.khay-toast')
		if (!k) {
			k = document.createElement('div')
			k.className = 'khay-toast'
			k.setAttribute('aria-live', 'polite')
			document.body.appendChild(k)
		}
		return k
	}

	var ICON_TOAST = {
		ok: 'check-circle',
		'canh-bao': 'alert-triangle',
		vuot: 'alert-triangle',
		loi: 'alert-triangle',
	}

	function toast(chu, loai, giay) {
		if (!chu) return
		var l = loai || 'ok'
		var t = document.createElement('div')
		t.className = 'toast ' + l
		t.innerHTML =
			(window.svgIcon ? window.svgIcon(ICON_TOAST[l] || 'check-circle') : '') +
			'<span>' +
			chu +
			'</span>'
		khay().appendChild(t)
		setTimeout(function () {
			t.classList.add('dong')
			setTimeout(function () {
				t.remove()
			}, 280)
		}, (giay || 4) * 1000)
		return t
	}

	/** Hien toast tu ket qua canh bao ngan sach do API tra ve */
	function toastCanhBao(cb) {
		if (!cb || !cb.loi) return
		toast(cb.loi, cb.muc === 'vuot' ? 'vuot' : 'canh-bao', 6)
	}

	/* ---------------- Hop thoai ---------------- */

	function moHop(hop) {
		var el = typeof hop === 'string' ? document.querySelector(hop) : hop
		if (!el) return
		el.__traFocus = document.activeElement
		el.classList.add('mo')
		document.body.style.overflow = 'hidden'
		var oDau = el.querySelector('input:not([type=hidden]), textarea, button')
		if (oDau) {
			setTimeout(function () {
				oDau.focus()
			}, 120)
		}
	}

	function dongHop(hop) {
		var el = typeof hop === 'string' ? document.querySelector(hop) : hop
		if (!el) return
		el.classList.remove('mo')
		el.dispatchEvent(new CustomEvent('locket:close'))
		if (!document.querySelector('.man-che.mo')) document.body.style.overflow = ''
		if (el.__traFocus && el.__traFocus.isConnected) el.__traFocus.focus()
	}

	function xacNhan(tuyChon) {
		var o = tuyChon || {}
		return new Promise(function (tra) {
			var man = document.createElement('div')
			man.className = 'man-che'
			man.innerHTML =
				'<div class="hop" role="dialog" aria-modal="true">' +
				'<div class="hop-dau"><h3>' +
				(o.tieuDe || 'X\u00e1c nh\u1eadn') +
				'</h3></div>' +
				'<p class="mo">' +
				(o.chu || '') +
				'</p>' +
				'<div class="hop-chan">' +
				'<button type="button" class="nut day-du" data-huy>' +
				(o.nutHuy || 'Hu\u1ef7') +
				'</button>' +
				'<button type="button" class="nut ' +
				(o.nguyHiem ? 'nut-nguy' : 'nut-chinh') +
				' day-du" data-ok>' +
				(o.nutOk || '\u0110\u1ed3ng \u00fd') +
				'</button>' +
				'</div></div>'
			document.body.appendChild(man)
			requestAnimationFrame(function () {
				moHop(man)
			})
			function ket(gt) {
				if (man.__daKetThuc) return
				man.__daKetThuc = true
				dongHop(man)
				setTimeout(function () {
					man.remove()
				}, 260)
				tra(gt)
			}
			man.addEventListener('locket:close', function () { ket(false) })
			man.querySelector('[data-ok]').addEventListener('click', function () {
				ket(true)
			})
			man.querySelector('[data-huy]').addEventListener('click', function () {
				ket(false)
			})
			man.addEventListener('click', function (e) {
				if (e.target === man) ket(false)
			})
		})
	}

	/* ---------------- Goi API ---------------- */

	async function api(duongDan, tuyChon) {
		var o = tuyChon || {}
		var cauHinh = { method: o.method || 'GET', headers: {} }
		if (o.formData) {
			cauHinh.body = o.formData
		} else if (o.body !== undefined) {
			cauHinh.headers['Content-Type'] = 'application/json'
			cauHinh.body = JSON.stringify(o.body)
		}
		var r = await fetch(duongDan, cauHinh)
		var d = null
		try {
			d = await r.json()
		} catch (e) {
			d = null
		}
		if (r.status === 401) {
			window.location.href = '/dang-nhap?tiep=' + encodeURIComponent(window.location.pathname)
			throw new Error('C\u1ea7n \u0111\u0103ng nh\u1eadp l\u1ea1i')
		}
		if (!r.ok || !d || d.ok === false) {
			var loi = new Error((d && d.loi) || 'Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd y\u00eau c\u1ea7u')
			loi.duLieu = d
			loi.trangThai = r.status
			throw loi
		}
		return d
	}

	window.App = {
		chuoiSo: chuoiSo,
		dinhDangSo: dinhDangSo,
		dinhDangTien: dinhDangTien,
		tienNgan: tienNgan,
		ganMatNaTien: ganMatNaTien,
		toast: toast,
		toastCanhBao: toastCanhBao,
		moHop: moHop,
		dongHop: dongHop,
		xacNhan: xacNhan,
		api: api,
	}

	/* ---------------- Khoi tao chung ---------------- */

	document.addEventListener('DOMContentLoaded', function () {
		document.querySelectorAll('input[data-tien]').forEach(ganMatNaTien)

		// dong hop thoai bang nut [data-dong] hoac bam ra ngoai
		document.addEventListener('click', function (e) {
			var nut = e.target.closest ? e.target.closest('[data-dong]') : null
			if (nut) {
				var h = nut.closest('.man-che')
				if (h) dongHop(h)
				return
			}
			if (e.target.classList && e.target.classList.contains('man-che')) dongHop(e.target)
		})

		document.addEventListener('keydown', function (e) {
			var mo = document.querySelectorAll('.man-che.mo')
			if (!mo.length) return
			var tren = mo[mo.length - 1]
			if (e.key === 'Escape') { e.preventDefault(); dongHop(tren); return }
			if (e.key !== 'Tab') return
			var cacO = Array.from(tren.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(function (o) { return o.getClientRects().length > 0 })
			if (!cacO.length) return
			var dau = cacO[0], cuoi = cacO[cacO.length - 1]
			if (e.shiftKey && (document.activeElement === dau || !tren.contains(document.activeElement))) { e.preventDefault(); cuoi.focus() }
			else if (!e.shiftKey && (document.activeElement === cuoi || !tren.contains(document.activeElement))) { e.preventDefault(); dau.focus() }
		})
	})
})()
