/* Vien phat sang om theo ria man hinh - Canvas 2D, khong phu thuoc thu vien.
   Y tuong lay tu demo edge-aura (do day vien, ban kinh goc, inset, do mo,
   pastel, troi mau, vet sang quet quanh vien) va viet lai bang code rieng. */
;(function () {
	'use strict'

	var canvas = document.getElementById('edge-aura')
	if (!canvas || !canvas.getContext) return

	var ctx = canvas.getContext('2d')
	var giamChuyenDong =
		window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

	var CH = {
		day: 76, // do day vung sang
		goc: 22, // ban kinh bo goc
		inset: 3, // cach ria man hinh
		mo: 0.9, // do mo tong
		pastel: 0.35, // pha trang cho diu mat
		troiMau: 10, // do troi mau (deg)
		chuKy: 8000, // 8s / vong quet
	}

	// Bang mau "sunset" - dong bo voi gradient hong/cam cua app
	var MAU = [
		{ h: 336, s: 100, l: 65 },
		{ h: 18, s: 100, l: 65 },
		{ h: 38, s: 100, l: 66 },
		{ h: 258, s: 100, l: 74 },
	]

	var w = 0
	var hgt = 0
	var dpr = 1

	function dat() {
		dpr = Math.min(window.devicePixelRatio || 1, 2)
		w = window.innerWidth
		hgt = window.innerHeight
		canvas.width = Math.round(w * dpr)
		canvas.height = Math.round(hgt * dpr)
		canvas.style.width = w + 'px'
		canvas.style.height = hgt + 'px'
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	}

	function mauChuoi(m, a, troi) {
		var h = (m.h + troi + 360) % 360
		var l = m.l + CH.pastel * (100 - m.l) * 0.45
		var s = m.s * (1 - CH.pastel * 0.25)
		return 'hsla(' + h.toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%,' + a + ')'
	}

	function duongVien(x, y, ww, hh, r) {
		var rr = Math.min(r, ww / 2, hh / 2)
		ctx.beginPath()
		if (ctx.roundRect) {
			ctx.roundRect(x, y, ww, hh, rr)
			return
		}
		ctx.moveTo(x + rr, y)
		ctx.lineTo(x + ww - rr, y)
		ctx.quadraticCurveTo(x + ww, y, x + ww, y + rr)
		ctx.lineTo(x + ww, y + hh - rr)
		ctx.quadraticCurveTo(x + ww, y + hh, x + ww - rr, y + hh)
		ctx.lineTo(x + rr, y + hh)
		ctx.quadraticCurveTo(x, y + hh, x, y + hh - rr)
		ctx.lineTo(x, y + rr)
		ctx.quadraticCurveTo(x, y, x + rr, y)
		ctx.closePath()
	}

	/** Diem chay quanh chu vi khung (t: 0..1) */
	function diemVien(t) {
		var x0 = CH.inset
		var y0 = CH.inset
		var ww = w - CH.inset * 2
		var hh = hgt - CH.inset * 2
		var chu = 2 * (ww + hh)
		var d = ((t % 1) + 1) % 1
		var s = d * chu
		if (s < ww) return { x: x0 + s, y: y0 }
		s -= ww
		if (s < hh) return { x: x0 + ww, y: y0 + s }
		s -= hh
		if (s < ww) return { x: x0 + ww - s, y: y0 + hh }
		s -= ww
		return { x: x0, y: y0 + hh - s }
	}

	function ve(thoiGian) {
		var t = thoiGian / CH.chuKy
		var troi = Math.sin(t * Math.PI * 2) * CH.troiMau

		ctx.clearRect(0, 0, w, hgt)
		ctx.save()
		ctx.globalCompositeOperation = 'lighter'

		// 1) Vien gradient mem, ve nhieu lop tu day den mong
		var g = ctx.createLinearGradient(0, 0, w, hgt)
		var lech = (t % 1) * 0.35
		for (var i = 0; i < MAU.length; i++) {
			var p = (i / (MAU.length - 1) + lech) % 1
			g.addColorStop(Math.min(0.999, Math.max(0.001, p)), mauChuoi(MAU[i], 0.5, troi))
		}

		var lop = [
			{ w: CH.day, a: 0.1 },
			{ w: CH.day * 0.55, a: 0.16 },
			{ w: CH.day * 0.26, a: 0.24 },
			{ w: 2.2, a: 0.5 },
		]
		for (var k = 0; k < lop.length; k++) {
			ctx.globalAlpha = lop[k].a * CH.mo
			ctx.lineWidth = lop[k].w
			ctx.strokeStyle = g
			ctx.shadowColor = mauChuoi(MAU[1], 0.5, troi)
			ctx.shadowBlur = lop[k].w * 0.9
			duongVien(
				CH.inset + lop[k].w / 2,
				CH.inset + lop[k].w / 2,
				w - CH.inset * 2 - lop[k].w,
				hgt - CH.inset * 2 - lop[k].w,
				CH.goc,
			)
			ctx.stroke()
		}
		ctx.shadowBlur = 0

		// 2) Vet sang quet doc theo vien
		var so = 2
		for (var j = 0; j < so; j++) {
			var pt = diemVien(t + j / so)
			var bk = Math.max(150, Math.min(w, hgt) * 0.36)
			var rg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, bk)
			var m = MAU[j % MAU.length]
			rg.addColorStop(0, mauChuoi(m, 0.3 * CH.mo, troi))
			rg.addColorStop(0.45, mauChuoi(m, 0.09 * CH.mo, troi))
			rg.addColorStop(1, mauChuoi(m, 0, troi))
			ctx.globalAlpha = 1
			ctx.fillStyle = rg
			ctx.beginPath()
			ctx.arc(pt.x, pt.y, bk, 0, Math.PI * 2)
			ctx.fill()
		}

		ctx.restore()
	}

	var dangCho = null
	function datLai() {
		clearTimeout(dangCho)
		dangCho = setTimeout(function () {
			dat()
			if (giamChuyenDong) ve(0)
		}, 140)
	}

	dat()

	if (giamChuyenDong) {
		ve(0)
	} else {
		var batDau = null
		;(function vong(ts) {
			if (batDau === null) batDau = ts
			ve(ts - batDau)
			requestAnimationFrame(vong)
		})(0)
	}

	window.addEventListener('resize', datLai)
	window.addEventListener('orientationchange', datLai)
})()
