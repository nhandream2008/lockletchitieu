/* Bo icon net mong duy nhat cho toan app (mot bo, khong tron nhieu bo).
   Neu CDN lucide tai duoc thi dung lucide; neu khong, dung bo du phong nay
   voi cung ten thuoc tinh data-lucide="..." nen giao dien khong bao gio trong. */
;(function () {
	'use strict'

	var P = {
		camera:
			'<path d="M14.5 4h-5L8 6.5H5a2 2 0 0 0-2 2V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3L14.5 4Z"/><circle cx="12" cy="12.6" r="3.4"/>',
		images:
			'<rect x="3" y="7" width="14" height="12" rx="2.5"/><path d="M7 4h12a2 2 0 0 1 2 2v10"/><circle cx="7.9" cy="11.4" r="1.3"/><path d="M3.6 17.6 8 13.6l3.2 3 2.3-2 3.3 3"/>',
		'bar-chart':
			'<path d="M3 20h18"/><path d="M6 20v-5"/><path d="M11 20V6"/><path d="M16 20v-9"/><path d="M21 20v-3"/>',
		tags:
			'<path d="M12.6 3.2H5.2a2 2 0 0 0-2 2v7.4a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L13.6 3.8a2 2 0 0 0-1-.6Z"/><circle cx="8" cy="8" r="1.4"/>',
		settings:
			'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6l1.1 2.3 2.5-.5.6 2.5 2.3 1.1-1.2 2.3 1.2 2.3-2.3 1.1-.6 2.5-2.5-.5L12 21.4l-1.1-2.3-2.5.5-.6-2.5-2.3-1.1 1.2-2.3-1.2-2.3 2.3-1.1.6-2.5 2.5.5L12 2.6Z"/>',
		'log-out':
			'<path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9.5"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		x: '<path d="M18 6 6 18M6 6l12 12"/>',
		check: '<path d="M20 6.5 9 17.5l-5-5"/>',
		'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.4 12.4 2.6 2.6 4.9-5.4"/>',
		'trash-2':
			'<path d="M3.5 6.5h17"/><path d="M8.5 6.5V4.6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1.9"/><path d="M18.6 6.5 17.7 20a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.4 6.5"/><path d="M10.2 11v6M13.8 11v6"/>',
		pencil: '<path d="M17 3.6a2.1 2.1 0 0 1 3 3L7.6 19 3 20.5 4.5 16 17 3.6Z"/><path d="m15 5.6 3 3"/>',
		'chevron-left': '<path d="m15 18-6-6 6-6"/>',
		'chevron-right': '<path d="m9 6 6 6-6 6"/>',
		'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
		calendar:
			'<rect x="3.2" y="5" width="17.6" height="16" rx="2.6"/><path d="M3.2 10h17.6M8 3v4M16 3v4"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.2 2"/>',
		wallet:
			'<rect x="3" y="6" width="18" height="13" rx="2.6"/><path d="M3 10.2h18"/><circle cx="17" cy="14.6" r="1.3"/>',
		flame:
			'<path d="M12 22c4 0 6.6-2.6 6.6-6.1 0-4.6-4.1-6.3-4.9-11.2C11 7 6.9 8.7 6.9 14.2c0 1.4.5 2.7 1.4 3.7"/><path d="M12 22c-1.9 0-3.2-1.3-3.2-3 0-2.2 2.2-3 2.6-5.4 1.6 1.9 3.5 3 3.5 5.2 0 1.8-1.3 3.2-2.9 3.2Z"/>',
		sparkles:
			'<path d="M11.4 3.2l1.7 4.4 4.4 1.7-4.4 1.7-1.7 4.4-1.7-4.4L5.3 9.3l4.4-1.7 1.7-4.4Z"/><path d="M18.3 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>',
		download: '<path d="M12 3.5v12"/><path d="m7 10.5 5 5 5-5"/><path d="M4 20.5h16"/>',
		lock: '<rect x="4.2" y="10" width="15.6" height="11" rx="2.6"/><path d="M8 10V7.6a4 4 0 0 1 8 0V10"/>',
		user: '<circle cx="12" cy="8.2" r="3.9"/><path d="M4.6 21a7.6 7.6 0 0 1 14.8 0"/>',
		image:
			'<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="2.6"/><circle cx="8.6" cy="9.6" r="1.5"/><path d="m3.8 18.2 4.8-4.8 3.6 3.6 2.9-2.5 5.7 4.7"/>',
		upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
		'alert-triangle':
			'<path d="M10.3 4 2.6 17.2A2 2 0 0 0 4.3 20.2h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z"/><path d="M12 9.2v4.6M12 17.2h.01"/>',
		'trending-up': '<path d="m3 17.2 6-6 4 4 8-8"/><path d="M15 7.2h6v6"/>',
		coins:
			'<ellipse cx="9" cy="6.8" rx="5.6" ry="2.8"/><path d="M3.4 6.8v3.6c0 1.6 2.5 2.8 5.6 2.8s5.6-1.2 5.6-2.8V6.8"/><path d="M9 13.6v3.6c0 1.6 2.5 2.8 5.6 2.8s5.6-1.2 5.6-2.8v-5.6c0-1.4-1.9-2.5-4.6-2.8"/>',
		palette:
			'<path d="M12 21a9 9 0 1 1 9-9c0 2.4-1.9 3.5-3.4 3.5h-2.2a2 2 0 0 0-1.6 3.2A1.8 1.8 0 0 1 12 21Z"/><circle cx="8.2" cy="10" r="1.2"/><circle cx="12" cy="7.4" r="1.2"/><circle cx="15.8" cy="10" r="1.2"/>',
		'refresh-cw':
			'<path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.6"/><path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9l2.4 2.3"/><path d="M20.5 4.2v4.2h-4.2M3.5 19.8v-4.2h4.2"/>',
		key: '<circle cx="8.2" cy="15.4" r="3.8"/><path d="m10.9 12.7 8.2-8.2"/><path d="m16.3 4.5 3.6 3.6"/><path d="m13.8 7 3.1 3.1"/>',
		'arrow-left': '<path d="M19.5 12H5"/><path d="m11 18-6-6 6-6"/>',
		receipt:
			'<path d="M6.5 3h11a1 1 0 0 1 1 1v17l-2.8-1.9-2.1 1.9-2.1-1.9-2.1 1.9L6.5 21V4a1 1 0 0 1 1-1Z"/><path d="M9.3 8h5.4M9.3 11.8h5.4M9.3 15.6h3"/>',
		'pie-chart':
			'<path d="M11.4 3.1a9 9 0 1 0 9.5 9.5h-9.5V3.1Z"/><path d="M14.4 3.7A9 9 0 0 1 20.3 9.6h-5.9V3.7Z"/>',
		smile:
			'<circle cx="12" cy="12" r="9"/><path d="M8.4 14a4.6 4.6 0 0 0 7.2 0"/><path d="M9.2 9.6h.01M14.8 9.6h.01"/>',
		filter: '<path d="M3.5 5.5h17l-6.6 7.6V19l-3.8 2v-7.9L3.5 5.5Z"/>',
		heart:
			'<path d="M12 20.4 4.6 13a4.8 4.8 0 0 1 7.4-6 4.8 4.8 0 0 1 7.4 6L12 20.4Z"/>',
	}

	function svg(ten) {
		var noi = P[ten] || P.sparkles
		return (
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
			'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
			'stroke-linejoin="round" aria-hidden="true">' +
			noi +
			'</svg>'
		)
	}

	function veIcons(pham) {
		var goc = pham && pham.querySelectorAll ? pham : document
		if (window.lucide && typeof window.lucide.createIcons === 'function') {
			try {
				window.lucide.createIcons({
					attrs: { 'stroke-width': 1.8 },
					nameAttr: 'data-lucide',
					root: goc === document ? document.body : goc,
				})
				return
			} catch (e) {
				/* roi xuong bo du phong */
			}
		}
		var ds = goc.querySelectorAll('i[data-lucide], span[data-lucide]')
		for (var i = 0; i < ds.length; i++) {
			var el = ds[i]
			var ten = el.getAttribute('data-lucide')
			var khung = document.createElement('span')
			khung.innerHTML = svg(ten)
			var s = khung.firstChild
			if (el.className) s.setAttribute('class', el.className)
			el.replaceWith(s)
		}
	}

	window.veIcons = veIcons
	window.svgIcon = svg

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			veIcons(document)
		})
	} else {
		veIcons(document)
	}
})()
