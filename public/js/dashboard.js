;(function () {
	'use strict'

	var oDuLieu = document.getElementById('du-lieu-tk')
	if (!oDuLieu) return

	var tk
	try {
		tk = JSON.parse(oDuLieu.textContent)
	} catch (e) {
		console.warn('Không đọc được dữ liệu thống kê', e)
		return
	}
	if (!tk || !tk.series) return

	var series = tk.series
	var danhMuc = tk.danhMuc || []
	var oCot = document.getElementById('bd-cot')
	var oTron = document.getElementById('bd-tron')
	var chuThich = document.querySelector('[data-chu-thich-du-phong]')
	var FONT = "'Be Vietnam Pro', 'Segoe UI', sans-serif"

	var MAU = {
		hong: '#d2f87a',
		cam: '#6d8844',
		xanh: '#b0c69a',
		chu: 'rgba(255, 255, 255, 0.62)',
		luoi: 'rgba(255, 255, 255, 0.08)',
		nen: 'rgba(14, 14, 20, 0.95)',
		vien: 'rgba(11, 11, 17, 0.9)',
	}

	var itChuyenDong = false
	try {
		itChuyenDong = window.matchMedia('(prefers-reduced-motion: reduce)').matches
	} catch (e) {}

	function tien(v) {
		return window.App && App.dinhDangTien ? App.dinhDangTien(v) : String(v)
	}
	function ngan(v) {
		return window.App && App.tienNgan ? App.tienNgan(v) : String(v)
	}
	function diToiThang(i) {
		var moc = series.mocs && series.mocs[i]
		if (moc) window.location.href = '/dashboard?loai=thang&moc=' + encodeURIComponent(moc)
	}

	/* ============ 1. Chart.js (khi tải được CDN) ============ */
	function veBangChartJs() {
		Chart.defaults.color = MAU.chu
		Chart.defaults.font.family = FONT
		Chart.defaults.font.size = 12

		if (oCot) {
			var caoBoc = (oCot.parentElement && oCot.parentElement.clientHeight) || 300
			var ctx = oCot.getContext('2d')
			var g = ctx.createLinearGradient(0, 0, 0, caoBoc)
			g.addColorStop(0, MAU.hong)
			g.addColorStop(1, MAU.cam)

			var boDuLieu = [
				{
					type: 'bar',
					label: 'Đã chi',
					data: series.values,
					backgroundColor: g,
					hoverBackgroundColor: '#e0ff9d',
					borderRadius: 8,
					borderSkipped: false,
					maxBarThickness: 46,
					order: 2,
				},
			]
			if (series.hanMuc) {
				boDuLieu.push({
					type: 'line',
					label: tk.khoang.loai === 'nam' ? 'Ngân sách tháng' : 'Hạn mức/ngày',
					data: series.hanMuc,
					borderColor: MAU.xanh,
					borderWidth: 1.5,
					borderDash: [6, 6],
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0,
					order: 1,
				})
			}

			new Chart(oCot, {
				data: { labels: series.labels, datasets: boDuLieu },
				options: {
					responsive: true,
					maintainAspectRatio: false,
					animation: itChuyenDong ? false : { duration: 640, easing: 'easeOutQuart' },
					interaction: { mode: 'index', intersect: false },
					plugins: {
						legend: { display: false },
						tooltip: {
							backgroundColor: MAU.nen,
							borderColor: 'rgba(255, 255, 255, 0.12)',
							borderWidth: 1,
							padding: 10,
							cornerRadius: 12,
							displayColors: false,
							callbacks: {
								label: function (c) {
									return c.dataset.label + ': ' + tien(c.parsed.y || 0)
								},
							},
						},
					},
					scales: {
						x: {
							grid: { display: false },
							ticks: { color: MAU.chu, maxRotation: 0, autoSkip: true, maxTicksLimit: 16 },
						},
						y: {
							beginAtZero: true,
							grid: { color: MAU.luoi },
							ticks: {
								color: MAU.chu,
								maxTicksLimit: 5,
								callback: function (v) {
									return ngan(v)
								},
							},
						},
					},
					onClick: function (e, ptr, chart) {
						if (tk.khoang.loai !== 'nam') return
						var els = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, true)
						if (els.length) diToiThang(els[0].index)
					},
				},
			})
			if (tk.khoang.loai === 'nam') oCot.style.cursor = 'pointer'
		}

		if (oTron && danhMuc.length) {
			new Chart(oTron, {
				type: 'doughnut',
				data: {
					labels: danhMuc.map(function (d) {
						return d.icon + ' ' + d.ten
					}),
					datasets: [
						{
							data: danhMuc.map(function (d) {
								return d.tong
							}),
							backgroundColor: danhMuc.map(function (d) {
								return d.mau_sac
							}),
							borderColor: MAU.vien,
							borderWidth: 3,
							hoverOffset: 6,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					cutout: '62%',
					animation: itChuyenDong ? false : { duration: 700 },
					plugins: {
						legend: { display: false },
						tooltip: {
							backgroundColor: MAU.nen,
							borderColor: 'rgba(255, 255, 255, 0.12)',
							borderWidth: 1,
							padding: 10,
							cornerRadius: 12,
							callbacks: {
								label: function (c) {
									return ' ' + c.label + ': ' + tien(c.parsed || 0)
								},
							},
						},
					},
				},
			})
		}
	}

	/* ============ 2. Dự phòng: tự vẽ bằng Canvas 2D ============ */
	function chuanBi(canvas, caoMacDinh) {
		var boc = canvas.parentElement
		var rong = (boc && boc.clientWidth) || canvas.clientWidth || 600
		var cao = (boc && boc.clientHeight) || 0
		if (!cao || cao < 80) cao = caoMacDinh
		var dpr = window.devicePixelRatio || 1
		canvas.width = Math.round(rong * dpr)
		canvas.height = Math.round(cao * dpr)
		canvas.style.width = rong + 'px'
		canvas.style.height = cao + 'px'
		var ctx = canvas.getContext('2d')
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.clearRect(0, 0, rong, cao)
		return { ctx: ctx, rong: rong, cao: cao }
	}

	function hcnTron(ctx, x, y, w, h, r) {
		var rr = Math.max(0, Math.min(r, w / 2, h))
		ctx.beginPath()
		ctx.moveTo(x, y + h)
		ctx.lineTo(x, y + rr)
		ctx.quadraticCurveTo(x, y, x + rr, y)
		ctx.lineTo(x + w - rr, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
		ctx.lineTo(x + w, y + h)
		ctx.closePath()
	}

	function buocDep(x) {
		if (!(x > 0)) return 1
		var bac = Math.pow(10, Math.floor(Math.log10(x)))
		var n = x / bac
		var k =
			n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10
		return k * bac
	}

	function veCotDuPhong() {
		if (!oCot) return
		var d = chuanBi(oCot, 300)
		var ctx = d.ctx
		var n = series.labels.length || 1
		var traiPad = 58
		var phaiPad = 14
		var trenPad = 14
		var duoiPad = 30
		var w = Math.max(60, d.rong - traiPad - phaiPad)
		var h = Math.max(60, d.cao - trenPad - duoiPad)
		var y0 = trenPad + h

		var caoNhat = 0
		series.values.forEach(function (v) {
			if (v > caoNhat) caoNhat = v
		})
		;(series.hanMuc || []).forEach(function (v) { if (v > caoNhat) caoNhat = v })
		if (!caoNhat) caoNhat = 1
		var dinh = buocDep((caoNhat * 1.14) / 4) * 4

		ctx.font = '12px ' + FONT
		ctx.textAlign = 'right'
		ctx.textBaseline = 'middle'
		var soVach = 4
		for (var i = 0; i <= soVach; i++) {
			var gt = (dinh / soVach) * i
			var y = Math.round(y0 - (gt / dinh) * h) + 0.5
			ctx.strokeStyle = MAU.luoi
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.moveTo(traiPad, y)
			ctx.lineTo(traiPad + w, y)
			ctx.stroke()
			ctx.fillStyle = MAU.chu
			ctx.fillText(ngan(Math.round(gt)), traiPad - 10, y)
		}

		var buoc = w / n
		var rongCot = Math.min(46, Math.max(4, buoc * 0.62))
		series.values.forEach(function (v, idx) {
			var x = traiPad + buoc * idx + (buoc - rongCot) / 2
			var caoCot = (Math.max(0, v) / dinh) * h
			if (v > 0 && caoCot < 3) caoCot = 3
			if (v > 0) {
				var g = ctx.createLinearGradient(0, y0 - caoCot, 0, y0)
				g.addColorStop(0, MAU.hong)
				g.addColorStop(1, MAU.cam)
				ctx.fillStyle = g
				hcnTron(ctx, x, y0 - caoCot, rongCot, caoCot, 8)
				ctx.fill()
			} else {
				ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
				ctx.fillRect(x, y0 - 2, rongCot, 2)
			}
		})

		if (series.hanMuc) {
			ctx.save()
			ctx.setLineDash([6, 6])
			ctx.strokeStyle = MAU.xanh
			ctx.lineWidth = 1.5
			ctx.beginPath()
			series.hanMuc.forEach(function (v, idx) {
				var xh = traiPad + buoc * idx + buoc / 2
				var yh = y0 - (v / dinh) * h
				if (idx === 0) ctx.moveTo(xh, yh)
				else ctx.lineTo(xh, yh)
			})
			ctx.stroke()
			ctx.restore()
		}

		ctx.fillStyle = MAU.chu
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		var buocNhan = Math.ceil(n / 16)
		series.labels.forEach(function (nh, idx) {
			if (idx % buocNhan !== 0 && idx !== n - 1) return
			ctx.fillText(String(nh), traiPad + buoc * idx + buoc / 2, y0 + 9)
		})
	}

	function veTronDuPhong() {
		if (!oTron || !danhMuc.length) return
		var d = chuanBi(oTron, 260)
		var ctx = d.ctx
		var cx = d.rong / 2
		var cy = d.cao / 2
		var R = Math.max(40, Math.min(d.rong, d.cao) / 2 - 10)
		var r = R * 0.62
		var tong = 0
		danhMuc.forEach(function (x) {
			tong += x.tong
		})
		if (!tong) return

		var goc = -Math.PI / 2
		danhMuc.forEach(function (x) {
			var quet = (x.tong / tong) * Math.PI * 2
			ctx.beginPath()
			ctx.moveTo(cx, cy)
			ctx.arc(cx, cy, R, goc, goc + quet)
			ctx.closePath()
			ctx.fillStyle = x.mau_sac || MAU.hong
			ctx.fill()
			goc += quet
		})

		goc = -Math.PI / 2
		ctx.strokeStyle = MAU.vien
		ctx.lineWidth = 3
		danhMuc.forEach(function (x) {
			ctx.beginPath()
			ctx.moveTo(cx + Math.cos(goc) * (r - 2), cy + Math.sin(goc) * (r - 2))
			ctx.lineTo(cx + Math.cos(goc) * (R + 1), cy + Math.sin(goc) * (R + 1))
			ctx.stroke()
			goc += (x.tong / tong) * Math.PI * 2
		})

		ctx.save()
		ctx.globalCompositeOperation = 'destination-out'
		ctx.beginPath()
		ctx.arc(cx, cy, r, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()

		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
		ctx.font = '600 17px ' + FONT
		ctx.fillText(ngan(tong), cx, cy - 7)
		ctx.fillStyle = MAU.chu
		ctx.font = '11px ' + FONT
		ctx.fillText('tổng chi', cx, cy + 12)
	}

	function ganClickNam() {
		if (tk.khoang.loai !== 'nam' || !oCot) return
		oCot.style.cursor = 'pointer'
		oCot.addEventListener('click', function (e) {
			var hcn = oCot.getBoundingClientRect()
			var traiPad = 58
			var phaiPad = 14
			var w = Math.max(60, hcn.width - traiPad - phaiPad)
			var x = e.clientX - hcn.left - traiPad
			if (x < 0 || x > w) return
			var idx = Math.floor((x / w) * series.labels.length)
			diToiThang(idx)
		})
	}

	/* ============ 3. Khởi động ============ */
	function batDau() {
		if (window.Chart) {
			try {
				veBangChartJs()
				return
			} catch (e) {
				console.warn('Chart.js lỗi, chuyển sang chế độ tự vẽ', e)
			}
		}
		if (chuThich) chuThich.classList.remove('an')
		veCotDuPhong()
		veTronDuPhong()
		ganClickNam()
		var hen
		window.addEventListener('resize', function () {
			clearTimeout(hen)
			hen = setTimeout(function () {
				veCotDuPhong()
				veTronDuPhong()
			}, 180)
		})
	}

	if (document.readyState === 'complete') batDau()
	else window.addEventListener('load', batDau)
})()
