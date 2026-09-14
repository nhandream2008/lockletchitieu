'use strict'

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const cfg = require('./config')
const { db } = require('./db')

const enabled = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_SERVICE_ROLE_KEY)
const client = enabled
	? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
	: null
let ready = !enabled
let loading = null
let writing = Promise.resolve()

async function rows(table) {
	const { data, error } = await client.from(table).select('*')
	if (error) throw new Error(`${table}: ${error.message}`)
	return data || []
}

async function hydrate() {
	if (ready) return
	if (loading) return loading
	loading = (async () => {
		const [users, categories, expenses, links, history] = await Promise.all([
			rows('users'), rows('categories'), rows('expenses'), rows('expense_categories'), rows('han_muc_history'),
		])
		const run = db.transaction(() => {
			db.exec('DELETE FROM expense_categories; DELETE FROM expenses; DELETE FROM categories; DELETE FROM han_muc_history; DELETE FROM users;')
			const addUser = db.prepare('INSERT INTO users (id,ten,mat_khau_hash,han_muc_ngay,ngay_tao) VALUES (@id,@ten,@mat_khau_hash,@han_muc_ngay,@ngay_tao)')
			const addCat = db.prepare('INSERT INTO categories (id,user_id,ten,icon,mau_sac,la_mac_dinh,thu_tu,ngay_tao) VALUES (@id,@user_id,@ten,@icon,@mau_sac,@la_mac_dinh,@thu_tu,@ngay_tao)')
			const addExpense = db.prepare('INSERT INTO expenses (id,user_id,so_tien,ghi_chu,duong_dan_anh,ngay_tao,created_at,la_mau) VALUES (@id,@user_id,@so_tien,@ghi_chu,@duong_dan_anh,@ngay_tao,@created_at,@la_mau)')
			const addLink = db.prepare('INSERT INTO expense_categories (expense_id,category_id) VALUES (@expense_id,@category_id)')
			const addHistory = db.prepare('INSERT INTO han_muc_history (id,user_id,han_muc_ngay,ngay_hieu_luc,created_at) VALUES (@id,@user_id,@han_muc_ngay,@ngay_hieu_luc,@created_at)')
			users.forEach((x) => addUser.run(x)); categories.forEach((x) => addCat.run({...x,la_mac_dinh:x.la_mac_dinh?1:0})); expenses.forEach((x) => addExpense.run({...x,la_mau:x.la_mau?1:0})); links.forEach((x) => addLink.run(x)); history.forEach((x) => addHistory.run(x))
		})
		run(); ready = true
	})()
	try { await loading } finally { loading = null }
}

function localRows(table) { return db.prepare(`SELECT * FROM ${table}`).all() }

async function mirror(table, data, booleanFields = []) {
	const clean = data.map((row) => {
		const copy = { ...row }; booleanFields.forEach((key) => { copy[key] = Boolean(copy[key]) }); return copy
	})
	const { data: remote, error: readError } = await client.from(table).select('id')
	if (readError) throw readError
	const localIds = new Set(clean.map((x) => String(x.id)))
	const stale = (remote || []).map((x) => x.id).filter((id) => !localIds.has(String(id)))
	if (stale.length) { const { error } = await client.from(table).delete().in('id', stale); if (error) throw error }
	if (clean.length) { const { error } = await client.from(table).upsert(clean, { onConflict: 'id' }); if (error) throw error }
}

async function flush() {
	if (!enabled) return
	writing = writing.then(async () => {
		await mirror('users', localRows('users'))
		await mirror('categories', localRows('categories'), ['la_mac_dinh'])
		await mirror('expenses', localRows('expenses'), ['la_mau'])
		await mirror('han_muc_history', localRows('han_muc_history'))
		const links = localRows('expense_categories')
		const { error: clearError } = await client.from('expense_categories').delete().gte('expense_id', 0)
		if (clearError) throw clearError
		if (links.length) { const { error } = await client.from('expense_categories').insert(links); if (error) throw error }
	})
	return writing
}

async function uploadImage(buffer, filename, mime = 'image/jpeg', userId = 'shared') {
	if (!enabled) return null
	const object = `${userId}/${filename}`
	const { error } = await client.storage.from(cfg.SUPABASE_STORAGE_BUCKET).upload(object, buffer, { contentType: mime, upsert: true })
	if (error) throw error
	return client.storage.from(cfg.SUPABASE_STORAGE_BUCKET).getPublicUrl(object).data.publicUrl
}

async function middleware(req, res, next) {
	try { await hydrate() } catch (error) { return next(error) }
	if (!enabled || !['POST','PUT','PATCH','DELETE'].includes(req.method)) return next()
	const originalEnd = res.end.bind(res)
	let ended = false
	res.end = function (...args) {
		if (ended) return
		ended = true
		flush().then(() => originalEnd(...args)).catch(next)
	}
	next()
}

module.exports = { enabled, middleware, hydrate, flush, uploadImage }
