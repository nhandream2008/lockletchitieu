'use strict'

/**
 * Locket Chi Tiêu — điểm khởi động của ứng dụng.
 * Hosting panel chạy đúng file này: /usr/local/bin/node /home/container/index.js
 */

require('dotenv').config()

const path = require('path')
const express = require('express')
const cookieSession = require('cookie-session')

const cfg = require('./src/config')
require('./src/db') // mở SQLite + tự migrate schema khi chạy lần đầu
const cloudSync = require('./src/cloudSync')
const h = require('./src/helpers')
const users = require('./src/models/users')
const { ganUser } = require('./src/middleware/auth')

const authRoutes = require('./src/routes/auth')
const apiRoutes = require('./src/routes/api')
const pageRoutes = require('./src/routes/pages')

const app = express()

if (cfg.TRUST_PROXY) app.set('trust proxy', 1)
app.disable('x-powered-by')
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(express.json({ limit: '1mb' }))

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }))
app.use('/uploads', express.static(cfg.UPLOAD_DIR, { maxAge: '30d' }))

app.use(
	cookieSession({
		name: 'locket_chi_tieu',
		keys: [cfg.SESSION_SECRET],
		httpOnly: true,
		sameSite: 'lax',
		secure: Boolean(process.env.VERCEL) || cfg.TRUST_PROXY,
		maxAge: 30 * 24 * 60 * 60 * 1000,
	}),
)

app.use(cloudSync.middleware)

app.locals.tenApp = 'Locket Chi Tiêu'
app.locals.h = h

app.use(ganUser)

app.get('/', (req, res) => {
	if (req.user) return res.redirect('/camera')
	if (users.demSoUser() === 0) return res.redirect('/thiet-lap')
	return res.redirect('/dang-nhap')
})

app.get('/khoe', (req, res) => {
	res.json({ ok: true, app: 'locket-chi-tieu', gio: new Date().toISOString() })
})

app.use(authRoutes)
app.use('/api', apiRoutes)
app.use(pageRoutes)

/* ---------- 404 ---------- */

app.use((req, res) => {
	if (req.path.startsWith('/api/'))
		return res.status(404).json({ ok: false, loi: 'Không tìm thấy đường dẫn' })
	res.status(404).render('loi', {
		trang: '',
		tieuDe: 'Không tìm thấy trang',
		ma: 404,
		thongDiep: 'Trang bạn tìm không tồn tại hoặc đã bị xoá.',
	})
})

/* ---------- Lỗi chung ---------- */

app.use((err, req, res, next) => {
	console.error('[loi]', err)
	if (res.headersSent) return next(err)
	if (req.path.startsWith('/api/'))
		return res.status(500).json({ ok: false, loi: err.message || 'Lỗi máy chủ' })
	res.status(500).render('loi', {
		trang: '',
		tieuDe: 'Có lỗi xảy ra',
		ma: 500,
		thongDiep: 'Máy chủ gặp sự cố khi xử lý yêu cầu này. Thử tải lại trang nhé.',
	})
})

// Bind explicitly to IPv4 so a hosting panel's IPv4 port mapping can reach us.
// The public hostname belongs to the panel; localhost is only an internal address.
function startServer() {
	const server = app.listen(cfg.PORT, '0.0.0.0', () => {
	const address = server.address()
	console.log(`Locket Chi Tiêu đang chạy tại http://localhost:${address.port}`)
	console.log(`[startup] Node ${process.version}; listening=${address.address}:${address.port}; pid=${process.pid}`)

	// One local HTTP check distinguishes application startup from public networking.
	// It does not read personal data or change the database.
	const request = require('http').get({
		hostname: '127.0.0.1',
		port: address.port,
		path: '/khoe',
		timeout: 5000,
	}, (response) => {
		console.log(`[startup] Internal HTTP check /khoe: ${response.statusCode}`)
		response.resume()
	})
	request.on('timeout', () => request.destroy(new Error('Internal HTTP check timed out after 5s')))
	request.on('error', (error) => console.error(`[startup] Internal HTTP check failed: ${error.message}`))
	})

	server.on('error', (error) => {
		console.error(`[startup] Cannot listen on 0.0.0.0:${cfg.PORT}: ${error.code || error.message}`)
		process.exitCode = 1
	})

	function dongGon(tinHieu) {
		console.log(`\n[${tinHieu}] Đang tắt máy chủ...`)
		server.close(() => process.exit(0))
		setTimeout(() => process.exit(0), 4000).unref()
	}
	process.on('SIGTERM', () => dongGon('SIGTERM'))
	process.on('SIGINT', () => dongGon('SIGINT'))
	return server
}

if (require.main === module) startServer()

module.exports = app
module.exports.startServer = startServer
