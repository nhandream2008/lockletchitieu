'use strict'

const path = require('path')

const ROOT = path.join(__dirname, '..')

const config = {
	ROOT,
	PORT: Number(process.env.PORT) || 3000,
	DB_PATH: process.env.VERCEL
		? path.join(process.env.TMPDIR || '/tmp', 'chi_tieu.db')
		: path.join(ROOT, process.env.DB_FILE || 'chi_tieu.db'),
	UPLOAD_DIR: process.env.VERCEL
		? path.join(process.env.TMPDIR || '/tmp', 'uploads')
		: path.join(ROOT, 'uploads'),
	// Múi giờ dùng để quyết định "hôm nay / tuần này / tháng này"
	TZ: process.env.APP_TZ || 'Asia/Ho_Chi_Minh',
	SESSION_SECRET:
		process.env.SESSION_SECRET || 'locket-chi-tieu-secret-hay-doi-trong-env',
	IMAGE_MAX_SIZE: Number(process.env.IMAGE_MAX_SIZE) || 1280,
	IMAGE_QUALITY: Number(process.env.IMAGE_QUALITY) || 72,
	TRUST_PROXY: process.env.TRUST_PROXY === '1',
	SUPABASE_URL: process.env.SUPABASE_URL || '',
	SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
	SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'expense-images',
	// Ngưỡng cảnh báo ngân sách
	NGUONG_CANH_BAO: 0.8,
	NGUONG_VUOT: 1,
}

module.exports = config
