/* Cac hieu ung chuyen dong "vui tay" - lay cam hung tu FeralUI
   (Blob xac nhan, Crumple vo giay, Hologram nghieng, PullCord day keo)
   nhung viet lai hoan toan bang CSS/Canvas thuan. */
;(function () {
	'use strict'

	var giamChuyenDong =
		window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

	/* ---------------- Blob xac nhan ---------------- */

	function blobXacNhan(chu, phu, emoji) {
		return new Promise(function (xong) {
			var boc = document.createElement('div')
			boc.className = 'blob-boc'
			boc.setAttribute('role', 'status')
			boc.innerHTML =
				'<div class="blob-giua">' +
				'<div class="blob">' +
				(emoji || '\uD83C\uDF89') +
				'</div>' +
				'<div class="blob-chu">' +
				(chu || '\u0110\u00e3 l\u01b0u!') +
				'</div>' +
				(phu ? '<div class="blob-phu">' + phu + '</div>' : '') +
				'</div>'
			document.body.appendChild(boc)

			if (!giamChuyenDong) {
				var giua = boc.querySelector('.blob')
				var r = giua.getBoundingClientRect()
				for (var i = 0; i < 14; i++) {
					var tia = document.createElement('span')
					var goc = (Math.PI * 2 * i) / 14 + Math.random() * 0.4
					var xa = 90 + Math.random() * 120
					tia.className = 'tia'
					tia.style.left = r.left + r.width / 2 + 'px'
					tia.style.top = r.top + r.height / 2 + 'px'
					tia.style.setProperty('--tx', Math.cos(goc) * xa + 'px')
					tia.style.setProperty('--ty', Math.sin(goc) * xa + 'px')
					tia.style.background = i % 2 ? '#d2f87a' : '#a3c971'
					boc.appendChild(tia)
				}
			}

			var cho = giamChuyenDong ? 420 : 1150
			setTimeout(function () {
				boc.classList.add('tan')
				setTimeout(function () {
					boc.remove()
					xong()
				}, 320)
			}, cho)
		})
	}

	/* ---------------- Vo giay (Crumple) ---------------- */

	function gioRac() {
		var g = document.querySelector('.gio-rac')
		if (!g) {
			g = document.createElement('div')
			g.className = 'gio-rac'
			g.innerHTML = window.svgIcon ? window.svgIcon('trash-2') : ''
			document.body.appendChild(g)
		}
		return g
	}

	function voGiay(el) {
		return new Promise(function (xong) {
			if (!el) return xong()
			if (giamChuyenDong) {
				el.style.transition = 'opacity .2s linear'
				el.style.opacity = '0'
				return setTimeout(function () {
					el.remove()
					xong()
				}, 220)
			}
			var gio = gioRac()
			gio.classList.add('hien')
			var a = el.getBoundingClientRect()
			var b = gio.getBoundingClientRect()
			el.style.setProperty('--dx', b.left + b.width / 2 - (a.left + a.width / 2) + 'px')
			el.style.setProperty('--dy', b.top + b.height / 2 - (a.top + a.height / 2) + 'px')
			el.classList.add('vo-giay')
			setTimeout(function () {
				gio.classList.add('nhan')
			}, 620)
			setTimeout(function () {
				el.remove()
				gio.classList.remove('nhan')
				gio.classList.remove('hien')
				xong()
			}, 900)
		})
	}

	/* ---------------- Hologram nghieng theo con tro ---------------- */

	function ganHologram(el) {
		if (!el || giamChuyenDong) return
		function di(e) {
			var r = el.getBoundingClientRect()
			var x = (e.clientX - r.left) / r.width
			var y = (e.clientY - r.top) / r.height
			el.style.setProperty('--mx', (x * 100).toFixed(1) + '%')
			el.style.setProperty('--my', (y * 100).toFixed(1) + '%')
			el.style.transform =
				'perspective(900px) rotateX(' +
				((0.5 - y) * 7).toFixed(2) +
				'deg) rotateY(' +
				((x - 0.5) * 9).toFixed(2) +
				'deg)'
		}
		function ra() {
			el.style.transform = ''
			el.style.setProperty('--mx', '50%')
			el.style.setProperty('--my', '28%')
		}
		el.addEventListener('pointermove', di)
		el.addEventListener('pointerleave', ra)
	}

	/* ---------------- Day keo bat/tat (PullCord) ---------------- */

	function taoDayKeo(boc, batDauBat, khiDoi) {
		if (!boc) return null
		var canvas = boc.querySelector('canvas')
		if (!canvas) {
			canvas = document.createElement('canvas')
			boc.appendChild(canvas)
		}
		var ctx = canvas.getContext('2d')
		var bat = !!batDauBat
		var w = 0
		var h = 0
		var dpr = 1

		var y = 0 // do gian them cua day
		var v = 0
		var keo = false
		var batDauY = 0
		var batDauKeo = 0
		var daDoi = false

		function dat() {
			var r = boc.getBoundingClientRect()
			dpr = Math.min(window.devicePixelRatio || 1, 2)
			w = r.width
			h = r.height
			canvas.width = Math.max(1, Math.round(w * dpr))
			canvas.height = Math.max(1, Math.round(h * dpr))
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		function ve() {
			var x = w - 34
			var dai = h * 0.44 + y
			ctx.clearRect(0, 0, w, h)

			// day
			ctx.strokeStyle = bat ? 'rgba(255,180,78,.9)' : 'rgba(255,255,255,.34)'
			ctx.lineWidth = 2.4
			ctx.lineCap = 'round'
			ctx.beginPath()
			ctx.moveTo(x, 0)
			ctx.quadraticCurveTo(x + (keo ? 5 : 0), dai * 0.6, x, dai)
			ctx.stroke()

			// tay nam
			var g = ctx.createLinearGradient(x - 12, dai, x + 12, dai + 26)
			if (bat) {
				g.addColorStop(0, '#a3c971')
				g.addColorStop(1, '#d2f87a')
			} else {
				g.addColorStop(0, 'rgba(255,255,255,.22)')
				g.addColorStop(1, 'rgba(255,255,255,.1)')
			}
			ctx.fillStyle = g
			ctx.beginPath()
			if (ctx.roundRect) ctx.roundRect(x - 11, dai, 22, 26, 11)
			else ctx.arc(x, dai + 13, 12, 0, Math.PI * 2)
			ctx.fill()
			ctx.strokeStyle = 'rgba(255,255,255,.5)'
			ctx.lineWidth = 1
			ctx.stroke()
		}

		function vong() {
			if (!keo) {
				// hoi ve vi tri nghi bang mo hinh spring
				v += -y * 0.22
				v *= 0.82
				y += v
				if (Math.abs(y) < 0.15 && Math.abs(v) < 0.15) {
					y = 0
					v = 0
				}
			}
			ve()
			requestAnimationFrame(vong)
		}

		function doi() {
			bat = !bat
			if (typeof khiDoi === 'function') khiDoi(bat)
		}

		boc.addEventListener('pointerdown', function (e) {
			keo = true
			daDoi = false
			batDauY = e.clientY
			batDauKeo = y
			if (boc.setPointerCapture) boc.setPointerCapture(e.pointerId)
		})

		boc.addEventListener('pointermove', function (e) {
			if (!keo) return
			var d = e.clientY - batDauY
			y = Math.max(-8, Math.min(h * 0.42, batDauKeo + d))
			if (!daDoi && y > h * 0.24) {
				daDoi = true
				doi()
			}
		})

		function nha() {
			if (!keo) return
			keo = false
			if (!daDoi && y < 6) doi() // bam nhanh cung coi la bat/tat
			v = -Math.abs(y) * 0.12
		}
		boc.addEventListener('pointerup', nha)
		boc.addEventListener('pointercancel', nha)
		boc.addEventListener('pointerleave', function () {
			if (keo) nha()
		})
		boc.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				y = h * 0.2
				v = 0
				doi()
			}
		})

		dat()
		ve()
		if (!giamChuyenDong) requestAnimationFrame(vong)
		window.addEventListener('resize', function () {
			dat()
			ve()
		})

		return {
			dat: function (gt) {
				bat = !!gt
				ve()
			},
			lay: function () {
				return bat
			},
		}
	}

	window.HieuUng = {
		blobXacNhan: blobXacNhan,
		voGiay: voGiay,
		ganHologram: ganHologram,
		taoDayKeo: taoDayKeo,
		giamChuyenDong: giamChuyenDong,
	}

	document.addEventListener('DOMContentLoaded', function () {
		document.querySelectorAll('[data-hologram]').forEach(function (el) {
			ganHologram(el)
		})
	})
})()
