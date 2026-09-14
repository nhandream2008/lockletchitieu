'use strict'

/**
 * Import the existing SQLite database and uploads into Supabase.
 * Run locally, never in Vercel, with SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY set in the environment.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const Database = require('better-sqlite3')
const { createClient } = require('@supabase/supabase-js')

const root = path.resolve(__dirname, '..')
const dbFile = process.env.DB_FILE || 'chi_tieu.db'
const dbPath = path.resolve(root, dbFile)
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(root, 'uploads'))
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'expense-images'

if (!url || !key) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
if (!fs.existsSync(dbPath)) throw new Error(`Không tìm thấy database: ${dbPath}`)

const supabase = createClient(url, key, { auth: { persistSession: false } })
const db = new Database(dbPath, { readonly: true })

async function insert(table, rows) {

  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`${table}: ${rows.length} dòng`)
}

async function main() {
  const users = db.prepare('SELECT * FROM users ORDER BY id').all()
  const categories = db.prepare('SELECT * FROM categories ORDER BY id').all()
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY id').all()
  const links = db.prepare('SELECT * FROM expense_categories ORDER BY expense_id, category_id').all()
  const history = db.prepare('SELECT * FROM han_muc_history ORDER BY id').all()

  await insert('users', users.map((r) => ({
    id: r.id, ten: r.ten, mat_khau_hash: r.mat_khau_hash,
    han_muc_ngay: r.han_muc_ngay, ngay_tao: r.ngay_tao,
  })))
  await insert('categories', categories.map((r) => ({ ...r, la_mac_dinh: Boolean(r.la_mac_dinh) })))
  await insert('han_muc_history', history)

  for (const expense of expenses) {
    const row = { ...expense, la_mau: Boolean(expense.la_mau) }
    const local = row.duong_dan_anh && path.basename(row.duong_dan_anh)
    if (local) {
      const source = path.join(uploadDir, local)
      if (fs.existsSync(source)) {
        const remote = `${expense.user_id}/${local}`
        const body = fs.readFileSync(source)
        const { error } = await supabase.storage.from(bucket).upload(remote, body, {
          contentType: 'image/jpeg', upsert: true,
        })
        if (error) throw new Error(`Ảnh ${local}: ${error.message}`)
        const { data } = supabase.storage.from(bucket).getPublicUrl(remote)
        row.duong_dan_anh = data.publicUrl
        console.log(`ảnh: ${local}`)
      } else {
        console.warn(`Bỏ qua ảnh không tồn tại: ${source}`)
        row.duong_dan_anh = null
      }
    }
    await insert('expenses', [row])
  }
  await insert('expense_categories', links)
  console.log(`Hoàn tất import vào Supabase (${url})`)
  db.close()
}

main().catch((error) => { console.error('[migration]', error.message); db.close(); process.exitCode = 1 })
