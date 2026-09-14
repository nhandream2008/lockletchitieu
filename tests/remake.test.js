'use strict'

// Run with Node 22: node --test tests/remake.test.js
// Uses an isolated SQLite database; never creates an account in the user's database.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const root = path.resolve(__dirname, '..')

test('redesigned pages render and expense workflows retain their data', async (t) => {
  const dir = fs.mkdtempSync(path.join(root, '.remake-test-'))
  const child = spawn(process.execPath, ['index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '4317', DB_FILE: path.relative(root, path.join(dir, 'test.db')), SESSION_SECRET: 'isolated-remake-test', TRUST_PROXY: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stderr.on('data', (d) => { output += d })
  t.after(async () => {
    if (child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await closed }
    // This directory was created above, directly within the project.
    assert.equal(path.dirname(dir), root)
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file))
    fs.rmdirSync(dir)
  })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start: ' + output)), 15000)
    child.stdout.on('data', (d) => { if (String(d).includes('http://localhost:4317')) { clearTimeout(timer); resolve() } })
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error('Server exited ' + code + ': ' + output)) })
  })
  const base = 'http://localhost:4317'
  let cookie = ''
  async function request(url, options = {}) {
    const r = await fetch(base + url, { redirect: 'manual', ...options, headers: { Cookie: cookie, ...options.headers } })
    const setCookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : []
    if (setCookies.length) cookie = setCookies.map((value) => value.split(';')[0]).join('; ')
    else {
      const setCookie = r.headers.get('set-cookie')
      if (setCookie) cookie = setCookie.split(/,(?=[^;,]+=)/).map((value) => value.split(';')[0]).join('; ')
    }
    return r
  }
  async function json(url, body, method = 'POST') {
    const r = await request(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    assert.equal(r.status, 200, url + ': ' + r.status)
    const result = await r.json()
    assert.equal(result.ok, true)
    return result
  }
  assert.equal((await request('/thiet-lap')).status, 200)
  const signup = await request('/thiet-lap', { method: 'POST', body: new URLSearchParams({ ten: 'Kiểm thử giao diện', mat_khau: 'test-only-password', mat_khau_2: 'test-only-password', han_muc: '150000' }) })
  assert.equal(signup.status, 302)
  assert.ok(cookie)
  const pages = ['/camera', '/feed', '/dashboard?loai=ngay', '/dashboard?loai=tuan', '/dashboard?loai=thang', '/dashboard?loai=nam', '/danh-muc', '/cai-dat']
  for (const url of pages) assert.equal((await request(url)).status, 200, 'Empty state: ' + url)
  const categories = (await json('/api/danh-muc', undefined, 'GET')).dsDanhMuc
  const date = require('../src/helpers').homNay()
  const form = new FormData()
  form.append('so_tien', '45000')
  form.append('ghi_chu', 'Cà phê buổi sáng')
  form.append('ngay_tao', date)
  form.append('danh_muc', String(categories[0].id))
  const create = await request('/api/chi-tieu', { method: 'POST', body: form })
  assert.equal(create.status, 200)
  const expense = (await create.json()).chiTieu
  assert.equal(expense.so_tien, 45000)
  assert.equal(expense.danh_muc[0].id, categories[0].id)
  const stats = (await json('/api/thong-ke?loai=ngay', undefined, 'GET')).tk
  assert.equal(stats.tong, 45000)
  assert.equal(stats.conLai, 105000)
  assert.equal(stats.series.hanMuc.length, stats.series.values.length)
  for (const url of pages) assert.equal((await request(url)).status, 200, 'Populated state: ' + url)
  assert.equal((await request('/feed?loc=tat-ca&dm=' + categories[0].id)).status, 200)
  const edit = await json('/api/chi-tieu/' + expense.id, { so_tien: 160000, ghi_chu: 'Đã cập nhật', ngay_tao: date, danh_muc: String(categories[0].id) })
  assert.equal(edit.chiTieu.so_tien, 160000)
  assert.equal(edit.canhBao.ngay.trangThai, 'vuot')
  assert.equal((await request('/camera')).status, 200, 'Over-budget state')
  const csv = await request('/xuat-csv?tu=' + date + '&den=' + date)
  assert.equal(csv.status, 200)
  assert.ok((await csv.text()).includes('160000'))
  await json('/api/chi-tieu/' + expense.id, undefined, 'DELETE')
  assert.equal((await json('/api/thong-ke?loai=ngay', undefined, 'GET')).tk.tong, 0)
  const logout = await request('/dang-xuat', { method: 'POST' })
  assert.equal(logout.status, 302)
  assert.equal((await request('/dang-nhap')).status, 200)
  assert.equal((await request('/camera')).status, 302)
  assert.ok(!output.includes('[loi]'), output)
})

function runChart(useChartJs) {
  const recorded = []
  const listeners = {}
  const operations = []
  const data = { khoang: { loai: 'nam' }, series: { loai: 'thang', labels: ['T1', 'T2'], values: [40000, 100000], hanMuc: [150000, 180000], mocs: ['2026-01-01', '2026-02-01'] }, danhMuc: [] }
  const ctx = new Proxy({}, { get(target, key) {
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} })
    return target[key] || ((...args) => { if (['moveTo', 'lineTo', 'fillRect', 'quadraticCurveTo'].includes(key)) { assert.ok(args.every(Number.isFinite), key + ' received invalid coordinates'); operations.push([key, ...args]) } })
  }, set(target, key, value) { target[key] = value; return true } })
  const canvas = { style: {}, parentElement: { clientHeight: 300, clientWidth: 600 }, getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, width: 600 }), addEventListener: (event, callback) => { listeners[event] = callback } }
  function Chart(el, options) { recorded.push(options) }
  Chart.defaults = { font: {} }
  const window = { Chart: useChartJs ? Chart : undefined, matchMedia: () => ({ matches: true }), devicePixelRatio: 1, location: { href: '' }, addEventListener() {} }
  const context = { window, Chart: useChartJs ? Chart : undefined, console, setTimeout, clearTimeout, document: { readyState: 'complete', getElementById: (id) => id === 'du-lieu-tk' ? { textContent: JSON.stringify(data) } : id === 'bd-cot' ? canvas : null, querySelector: () => null } }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/dashboard.js'), 'utf8'), context)
  return { recorded, window, operations, listeners, data }
}

test('Chart.js uses each month’s budget and supports opening a month', () => {
  const result = runChart(true)
  assert.deepEqual(Array.from(result.recorded[0].data.datasets[1].data), [150000, 180000])
  result.recorded[0].options.onClick({}, [], { getElementsAtEventForMode: () => [{ index: 1 }] })
  assert.equal(result.window.location.href, '/dashboard?loai=thang&moc=2026-02-01')
})

test('offline chart handles budget arrays without NaN and opens the chosen month', () => {
  const result = runChart(false)
  assert.ok(result.operations.length > 10)
  result.listeners.click({ clientX: 500 })
  assert.equal(result.window.location.href, '/dashboard?loai=thang&moc=2026-02-01')
})
