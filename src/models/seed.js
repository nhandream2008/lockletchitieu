'use strict'

/**
 * Dữ liệu mẫu để xem giao diện có số liệu ngay lần đầu chạy.
 * Có thể nạp lại / xoá sạch bất kỳ lúc nào trong Cài đặt.
 * Ảnh mẫu được sinh bằng sharp (gradient) nên không cần tải gì từ Internet.
 */

const fs = require('fs')
const path = require('path')
const { db } = require('../db')
const { UPLOAD_DIR } = require('../config')
const { homNay, themNgay } = require('../helpers')
const expenses = require('./expenses')
const categoriesModel = require('./categories')

const MAU_CHI_TIEU = [
	{ lui: 0, gio: '08:15', tien: 45000, ghi: 'Cà phê sữa đá + bánh mì', tag: 'Ăn uống', g1: '#FF9A4D', g2: '#FF4E8E' },
	{ lui: 0, gio: '12:40', tien: 65000, ghi: 'Cơm tấm trưa', tag: 'Ăn uống', g1: '#FFC14D', g2: '#FF6B3D' },
	{ lui: 0, gio: '19:05', tien: 120000, ghi: 'Trà sữa với hội bạn', tag: 'Đi chơi/Giải trí', g1: '#8B7BFF', g2: '#FF4E8E' },
	{ lui: 1, gio: '09:20', tien: 32000, ghi: 'Xôi sáng', tag: 'Ăn uống', g1: '#FF7A4D', g2: '#F6D65A' },
	{ lui: 1, gio: '20:30', tien: 260000, ghi: 'Vé xem phim + bọc ngô', tag: 'Đi chơi/Giải trí', g1: '#5B9CFF', g2: '#8B7BFF' },
	{ lui: 2, gio: '11:10', tien: 189000, ghi: 'Áo thun basic', tag: 'Mua sắm', g1: '#FF4E8E', g2: '#C86BFF' },
	{ lui: 2, gio: '18:45', tien: 78000, ghi: 'Bún chả tối', tag: 'Ăn uống', g1: '#FFB44E', g2: '#FF7A4D' },
	{ lui: 3, gio: '07:50', tien: 25000, ghi: 'Cà phê mang đi', tag: 'Ăn uống', g1: '#FF9A4D', g2: '#FFD86B' },
	{ lui: 3, gio: '16:20', tien: 420000, ghi: 'Tai nghe không dây', tag: 'Mua sắm', g1: '#4EC9D8', g2: '#5B9CFF' },
	{ lui: 4, gio: '12:05', tien: 55000, ghi: 'Cơm gà văn phòng', tag: 'Ăn uống', g1: '#FFC14D', g2: '#FF4E8E' },
	{ lui: 5, gio: '10:30', tien: 95000, ghi: 'Siêu thị đầu tuần', tag: 'Mua sắm', g1: '#5FD08A', g2: '#4EC9D8' },
	{ lui: 5, gio: '21:00', tien: 150000, ghi: 'Lẩu nhẹ cuối tuần', tag: 'Ăn uống|Đi chơi/Giải trí', g1: '#FF6B6B', g2: '#FF9A4D' },
	{ lui: 6, gio: '15:15', tien: 68000, ghi: 'Kém cà phê làm việc', tag: 'Ăn uống', g1: '#C86BFF', g2: '#5B9CFF' },
	{ lui: 7, gio: '19:40', tien: 310000, ghi: 'Sinh nhật bạn', tag: 'Đi chơi/Giải trí|Mua sắm', g1: '#FF4E8E', g2: '#FFB44E' },
	{ lui: 9, gio: '13:25', tien: 42000, ghi: 'Chè chiều', tag: 'Ăn uống', g1: '#F6D65A', g2: '#5FD08A' },
]

async function anhGradient(tenFile, mau1, mau2) {
	const duongDan = path.join(UPLOAD_DIR, tenFile)
	if (fs.existsSync(duongDan)) return '/uploads/' + tenFile
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
	<defs>
		<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="${mau1}"/>
			<stop offset="100%" stop-color="${mau2}"/>
		</linearGradient>
		<radialGradient id="r" cx="30%" cy="25%" r="60%">
			<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
			<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
		</radialGradient>
	</defs>
	<rect width="900" height="900" fill="url(#g)"/>
	<circle cx="260" cy="230" r="260" fill="url(#r)"/>
	<circle cx="700" cy="700" r="210" fill="#000000" opacity="0.12"/>
	<circle cx="640" cy="280" r="70" fill="#ffffff" opacity="0.18"/>
	<rect x="120" y="640" width="320" height="22" rx="11" fill="#ffffff" opacity="0.22"/>
	<rect x="120" y="690" width="200" height="22" rx="11" fill="#ffffff" opacity="0.14"/>
</svg>`
	try {
		const sharp = require('sharp')
		await sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toFile(duongDan)
		return '/uploads/' + tenFile
	} catch (e) {
		return null
	}
}

function demDuLieuMau(userId) {
	return db
		.prepare('SELECT COUNT(*) AS n FROM expenses WHERE user_id = ? AND la_mau = 1')
		.get(userId).n
}

function xoaDuLieuMau(userId) {
	const rows = db
		.prepare('SELECT id, duong_dan_anh FROM expenses WHERE user_id = ? AND la_mau = 1')
		.all(userId)
	const chay = db.transaction(() => {
		db.prepare('DELETE FROM expenses WHERE user_id = ? AND la_mau = 1').run(userId)
	})
	chay()
	rows.forEach((r) => r.duong_dan_anh && expenses.xoaFileAnh(r.duong_dan_anh))
	return rows.length
}

async function napDuLieuMau(userId) {
	const dsDanhMuc = categoriesModel.danhSach(userId)
	const timId = (ten) => {
		const dm = dsDanhMuc.find((d) => d.ten.toLowerCase() === ten.toLowerCase())
		return dm ? dm.id : null
	}
	const nay = homNay()
	let dem = 0

	for (let i = 0; i < MAU_CHI_TIEU.length; i++) {
		const m = MAU_CHI_TIEU[i]
		const ngay = themNgay(nay, -m.lui)
		const ids = m.tag
			.split('|')
			.map(timId)
			.filter(Boolean)
		const anh = await anhGradient(`mau-${i + 1}.jpg`, m.g1, m.g2)
		expenses.taoChiTieu(userId, {
			soTien: m.tien,
			ghiChu: m.ghi,
			duongDanAnh: anh,
			ngayTao: ngay,
			createdAt: new Date(`${ngay}T${m.gio}:00+07:00`).toISOString(),
			categoryIds: ids,
			laMau: true,
		})
		dem++
	}
	return dem
}

async function napLai(userId) {
	xoaDuLieuMau(userId)
	return napDuLieuMau(userId)
}

module.exports = { napDuLieuMau, xoaDuLieuMau, napLai, demDuLieuMau }
