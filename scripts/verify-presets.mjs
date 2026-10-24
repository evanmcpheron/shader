import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

const profile = mkdtempSync('/tmp/pss18-chrome-')
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let buffer = '', sequence = 0
const pending = new Map(), errors = [], warnings = [], requests = [], checks = [], frames = [], observations = {}
const downloads = []
const downloadPath = mkdtempSync('/tmp/pss18-downloads-')
let browserStderr = ''
browser.stderr.on('data', (chunk) => { browserStderr += chunk })
browser.stdio[4].setEncoding('utf8')
browser.stdio[4].on('data', (chunk) => {
  buffer += chunk
  let end
  while ((end = buffer.indexOf('\0')) >= 0) {
    const message = JSON.parse(buffer.slice(0, end))
    buffer = buffer.slice(end + 1)
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id)
      pending.delete(message.id)
      clearTimeout(item.timeout)
      if (message.error) item.reject(new Error(JSON.stringify(message.error)))
      else item.resolve(message.result)
    }
    if (message.method === 'Browser.downloadWillBegin') downloads.push({ ...message.params, state: 'started' })
    if (message.method === 'Browser.downloadProgress') Object.assign(downloads.find(d => d.guid === message.params.guid) ?? {}, message.params)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params)
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) warnings.push(message.params)
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url)
  }
})
function send(method, params = {}, sessionId) {
  return new Promise((resolvePromise, reject) => {
    const id = ++sequence
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 20_000)
    pending.set(id, { resolve: resolvePromise, reject, timeout })
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0')
  })
}
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail })
  if (!passed) throw new Error(`Failed: ${name}: ${JSON.stringify(detail)}`)
}
const evidence = resolve('docs/pixel-shading-studio/evidence')
const fixture = (name) => resolve('tests/fixtures/models', name)
const hash = (frame) => createHash('sha256').update(new Uint8Array(frame.rgba)).digest('hex')
browser.on('exit', (code, signal) => { for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(new Error(`Browser exited ${code}/${signal}`)) }; pending.clear() })
const pngDirectory = `${evidence}/pss18-png`
mkdirSync(pngDirectory, { recursive: true })
const complete = JSON.parse(readFileSync(resolve('tests/fixtures/scenes/complete-v1.json'), 'utf8'))
const equal = isDeepStrictEqual
let failure
try {
  observations.browser = await send('Browser.getVersion')
  await send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath, eventsEnabled: true })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const c = (method, params = {}) => send(method, params, sessionId)
  const e = async (expression) => {
    const result = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const waitFor = async (predicate, name) => {
    for (let i = 0; i < 240; i++) { if (await predicate()) return; await pause(30) }
    throw new Error(`Timed out: ${name}`)
  }
  for (const domain of ['Runtime', 'Page', 'DOM', 'Network']) await c(`${domain}.enable`)
  await c('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
  const bind = async () => {
    await waitFor(() => e(`Boolean(document.querySelector('.renderer-diagnostics'))`), 'app mounted')
    await e(`(async()=>{
      window.store = (await import('/src/app/studioStore.ts')).studioStore;
      window.keys = (await import('/src/persistence/localPersistence.ts')).STORAGE_KEYS;
      window.comparePng = (await import('/src/export/verifyPng.ts')).comparePngToFrame;
      window.clickButton = name => { const button = [...document.querySelectorAll('button')].find(b => b.textContent === name); if (!button) throw new Error('Missing button ' + name); button.click() };
      window.edit = (id, value) => { const input = document.getElementById(id); Object.getOwnPropertyDescriptor(input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(input, String(value)); input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) };
      document.querySelector('.renderer-diagnostics').open = true;
    })()`)
  }
  const navigate = async () => {
    await c('Page.navigate', { url: 'http://127.0.0.1:5173/?scene-checks' })
    await pause(800)
    await bind()
  }
  const ready = () => waitFor(() => e(`store.getState().referenceStatus.kind === 'ready'`), 'renderer ready')
  const click = async name => { await e(`clickButton(${JSON.stringify(name)})`); await pause(70) }
  const edit = async (id, value) => { await e(`edit(${JSON.stringify(id)},${JSON.stringify(value)})`); await pause(70) }
  const open = async () => { if (!await e(`Boolean(document.querySelector('#preset-panel'))`)) await click('Presets') }
  const settings = () => e('store.getState().settings')
  const saved = () => e('JSON.parse(localStorage.getItem(keys.current))')
  const frame = async () => { await ready(); await click('Inspect native RGBA'); return e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`) }
  const diag = async () => { await click('Refresh diagnostics'); return e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`) }
  const screenshot = async name => writeFileSync(`${evidence}/${name}.png`, Buffer.from((await c('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  const exportFile = async name => {
    const expected = await frame(), index = downloads.length
    await click('Export PNG')
    await waitFor(() => downloads[index]?.state === 'completed', 'download complete')
    const bytes = readFileSync(resolve(downloadPath, downloads[index].guid))
    writeFileSync(`${pngDirectory}/${name}.png`, bytes)
    const decoded = await e(`comparePng(new Blob([Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}), c=>c.charCodeAt(0))], {type:'image/png'}),${JSON.stringify(expected)})`)
    check(`${name}: actual downloaded PNG matches authoritative RGBA`, decoded.matches && decoded.differentBytes === 0, decoded)
    frames.push({ name, frame: expected, decoded, sha256: hash(expected) })
    return expected
  }
  const select = async (selector, names) => {
    const { root } = await c('DOM.getDocument')
    const { nodeId } = await c('DOM.querySelector', { nodeId: root.nodeId, selector })
    await c('DOM.setFileInputFiles', { nodeId, files: names.map(fixture) })
    await waitFor(() => e(`store.getState().modelImport.kind !== 'loading'`), 'import/reselect settled')
    await pause(100)
  }
  await navigate()
  await ready()
  observations.gpu = await e(`(()=>{const gl=document.querySelector('.reference-canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {dpr:devicePixelRatio,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}})()`)
  observations.schemaVersion = 1
  check('new profile starts with canonical sphere', (await settings()).subject.geometry.kind === 'sphere')
  await e(`store.getState().actions.restoreSettings(${JSON.stringify(complete)})`)
  await pause(250)
  const validated = await settings()
  check('fully configured scene equals fixture across every persisted category', equal(validated, complete), validated)
  await open()
  await edit('preset-name', 'S7 torus study')
  await click('Save new preset')
  const id = await e(`document.querySelector('#scene-preset').value`)
  check('named save has a distinct identifier', !id.startsWith('factory-'))
  await waitFor(() => e(`document.body.innerText.includes('Current scene saved locally.')`), 'autosave')
  check('saved current equals validated settings', equal(await saved(), validated))
  const before = await exportFile('s7-before-reload')
  await screenshot('pss18-preset-panel')
  await navigate()
  await ready()
  check('reload hydrates all settings before initial rendering', equal(await settings(), validated))
  check('reload keeps only the settings contract in local JSON', equal(await saved(), validated))
  const after = await exportFile('s7-after-reload')
  check('S7 reload reproduces exact settled native pixels', hash(before) === hash(after), { before: hash(before), after: hash(after) })
  await open()
  await edit('scene-preset', id)
  await click('Reset scene')
  check('full reset keeps named presets', await e(`JSON.parse(localStorage.getItem(keys.presets)).presets.some(p=>p.id===${JSON.stringify(id)})`))
  await e(`store.getState().actions.setPreview({zoom:3,grid:true,tool:'preview-pan'});window.beforeRestore=store.getState().revisions;window.transitions=[];window.unsub=store.subscribe((state,previous)=>{if(state.settings!==previous.settings)transitions.push(state.settings)});window.realSet=Storage.prototype.setItem;window.writes=[];Storage.prototype.setItem=function(k,v){writes.push({k,v});return realSet.call(this,k,v)};`)
  const prior = await diag()
  await click('Restore scene')
  await pause(500)
  const settled = await diag()
  check('atomic restore captures/processes exactly one latest native frame', settled.native.captures === prior.native.captures + 1 && settled.native.processes === prior.native.processes + 1, { before: prior.native, after: settled.native, presentationDraws: settled.frames - prior.frames })
  const restored = await exportFile('s7-after-preset-restore')
  check('preset restore reproduces every setting', equal(await settings(), validated))
  check('preset restore reproduces all native pixels', hash(restored) === hash(before), { before: hash(before), restored: hash(restored) })
  check('restore publishes exactly one complete settings transition', await e(`transitions.length===1 && JSON.stringify(transitions[0])===JSON.stringify(store.getState().settings)`))
  check('autosave after restore writes only complete intended scene', await e(`writes.filter(w=>w.k===keys.current).length===1 && writes.filter(w=>w.k===keys.current).every(w=>JSON.stringify(JSON.parse(w.v))===JSON.stringify(store.getState().settings))`))
  check('restore keeps view/tool state', await e(`store.getState().preview.zoom===3 && store.getState().preview.grid && store.getState().preview.tool==='preview-pan'`))
  const post = await diag()
  observations.atomic = { before: prior, after: post }
  await e(`unsub();Storage.prototype.setItem=realSet`)
  await e(`store.getState().actions.resetSection('palette')`)
  check('palette reset retains camera, lighting, subject and dither', await e(`JSON.stringify(store.getState().settings.camera)===${JSON.stringify(JSON.stringify(validated.camera))} && JSON.stringify(store.getState().settings.subject)===${JSON.stringify(JSON.stringify(validated.subject))} && store.getState().settings.dither.kind==='bayer'`))
  await click('Overwrite selected…')
  check('overwrite requires explicit confirmation', await e(`JSON.stringify(JSON.parse(localStorage.getItem(keys.presets)).presets[0].settings)===${JSON.stringify(JSON.stringify(validated))}`))
  await click('Cancel')
  await click('Overwrite selected…')
  await click('Confirm overwrite')
  check('confirmed overwrite captures current settings', await e(`JSON.stringify(JSON.parse(localStorage.getItem(keys.presets)).presets[0].settings)===JSON.stringify(store.getState().settings)`))
  const sceneBeforeDelete = await settings()
  await click('Delete selected…')
  check('delete requires explicit confirmation', await e(`JSON.parse(localStorage.getItem(keys.presets)).presets.length===1`))
  await click('Confirm delete')
  check('confirmed delete keeps current scene', equal(sceneBeforeDelete, await settings()) && await e(`JSON.parse(localStorage.getItem(keys.presets)).presets.length===0`))
  for (const factory of ['factory-sphere', 'factory-cube', 'factory-dither']) {
    await edit('scene-preset', factory)
    await click('Restore scene')
    await ready()
    const scene = await settings()
    check(`${factory}: complete working factory scene`, scene.schemaVersion === 1 && scene.canvas.width === 64 && (factory !== 'factory-cube' || scene.subject.geometry.kind === 'cube') && (factory !== 'factory-dither' || scene.dither.kind === 'bayer'))
  }
  await edit('scene-preset', 'factory-sphere')
  await click('Restore scene')
  await click('Close presets')
  await e(`store.getState().actions.restoreSettings(${JSON.stringify(complete)});window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}`)
  await pause(550)
  check('quota failure is visible while keeping complete in-memory settings', equal(await settings(), validated) && await e(`document.body.innerText.includes('storage is full') && document.body.innerText.includes('in memory')`))
  await exportFile('quota-in-memory-export')
  await open()
  await edit('preset-name', 'Unsaved quota study')
  await click('Save new preset')
  check('quota-failed named save remains usable in memory', await e(`document.querySelector('#scene-preset').selectedOptions[0].textContent==='Unsaved quota study' && document.body.innerText.includes('Changes remain in memory')`))
  await e(`Storage.prototype.setItem=realSet`)
  await click('Retry local save')
  check('retry commits current and unsaved named preset', equal(await saved(), validated) && await e(`JSON.parse(localStorage.getItem(keys.presets)).presets[0].name==='Unsaved quota study'`))
  await e(`window.realStorageDescriptor=Object.getOwnPropertyDescriptor(window,'localStorage');Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError')}});store.getState().actions.selectPrimitive('cube')`)
  await pause(550)
  check('unavailable storage getter leaves renderer and editing usable with visible notice', (await settings()).subject.geometry.kind === 'cube' && await e(`document.body.innerText.includes('storage is blocked') && store.getState().referenceStatus.kind==='ready'`))
  await exportFile('security-error-in-memory-export')
  await e(`Object.defineProperty(window,'localStorage',realStorageDescriptor);true`)
  await click('Retry local save')
  await click('Close presets')
  const invalids = [
    ['malformed-current', '{broken'],
    ['future-current', JSON.stringify({ ...complete, schemaVersion: 99 })],
    ['invalid-current', JSON.stringify({ ...complete, camera: null })],
  ]
  for (const [name, raw] of invalids) {
    await e(`localStorage.setItem(keys.current,${JSON.stringify(raw)});localStorage.setItem('unrelated-application','keep')`)
    await navigate()
    await ready()
    check(`${name}: invalid saved data is visible and not loaded`, (await settings()).subject.geometry.kind === 'sphere' && await e(`document.body.innerText.includes('was not loaded')`))
    await e(`store.getState().actions.selectPrimitive('cube')`)
    await pause(500)
    check(`${name}: edits/autosave preserve raw original`, await e(`localStorage.getItem(keys.current)===${JSON.stringify(raw)} && store.getState().settings.subject.geometry.kind==='cube'`))
    await open()
    check(`${name}: recovery download includes original and in-memory scene`, await e(`(()=>{const a=document.querySelector('.download-settings');const json=JSON.parse(decodeURIComponent(a.href.split(',')[1]));return json.preserved[0].raw===${JSON.stringify(raw)} && json.current.subject.geometry.kind==='cube'})()`))
    await click('Replace unreadable data…')
    check(`${name}: replace awaits explicit confirmation`, await e(`localStorage.getItem(keys.current)===${JSON.stringify(raw)}`))
    await click('Back up & replace')
    check(`${name}: explicit replace archives raw and commits current scene only`, await e(`Object.keys(localStorage).some(k=>k.startsWith(keys.current+':recovery:')&&localStorage.getItem(k)===${JSON.stringify(raw)}) && JSON.parse(localStorage.getItem(keys.current)).subject.geometry.kind==='cube' && localStorage.getItem('unrelated-application')==='keep'`))
    await click('Close presets')
  }
  const futureLibrary = '{"schemaVersion":55,"presets":["future data"]}'
  await e(`localStorage.setItem(keys.presets,${JSON.stringify(futureLibrary)})`)
  await navigate()
  await ready()
  await open()
  check('unknown library version has actionable recovery status', await e(`document.querySelector('#preset-panel').innerText.includes('Unsupported preset library version')`))
  await edit('preset-name', 'Recovery study')
  await click('Save new preset')
  check('unknown library stays intact while a new preset remains in memory', await e(`localStorage.getItem(keys.presets)===${JSON.stringify(futureLibrary)} && document.querySelector('#scene-preset').selectedOptions[0].textContent==='Recovery study'`))
  await click('Replace unreadable data…')
  await click('Back up & replace')
  check('library recovery commits new presets after preserving original', await e(`JSON.parse(localStorage.getItem(keys.presets)).presets[0].name==='Recovery study' && Object.keys(localStorage).some(k=>k.startsWith(keys.presets+':recovery:')&&localStorage.getItem(k)===${JSON.stringify(futureLibrary)})`))
  await click('Close presets')
  const blockedStartup = await c('Page.addScriptToEvaluateOnNewDocument', { source: `window.savedStorageDescriptor=Object.getOwnPropertyDescriptor(window,'localStorage');Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError')}})` })
  await navigate()
  await ready()
  check('storage blocked during startup preserves usable default scene and status', (await settings()).subject.geometry.kind === 'sphere' && await e(`document.body.innerText.includes('storage is blocked')`))
  await e(`store.getState().actions.selectPrimitive('cube')`)
  await open()
  await edit('preset-name', 'Startup offline study')
  await click('Save new preset')
  await exportFile('startup-storage-unavailable-export')
  await c('Page.removeScriptToEvaluateOnNewDocument', { identifier: blockedStartup.identifier })
  await e(`Object.defineProperty(window,'localStorage',savedStorageDescriptor);true`)
  await click('Retry local save')
  check('startup storage retry saves in-memory work and preserves earlier named presets', (await saved()).subject.geometry.kind === 'cube' && await e(`JSON.parse(localStorage.getItem(keys.presets)).presets.length===2`))
  await click('Close presets')
  await e(`store.getState().actions.restoreSettings(${JSON.stringify(complete)})`)
  await select('#local-model-files', ['group.glb'])
  await ready()
  const imported = await settings()
  check('model imported through real file input', imported.subject.geometry.kind === 'imported')
  await open()
  await edit('preset-name', 'Imported study')
  await click('Save new preset')
  const importId = await e(`document.querySelector('#scene-preset').value`)
  const importedFrame = await exportFile('import-before-reload')
  check('stored import contains descriptor only without files/URLs/runtime', await e(`(()=>{const text=localStorage.getItem(keys.current);const data=JSON.parse(text);return !/blob:|Object3D|rgba|captureRevision/.test(text)&&Object.keys(data.subject.geometry).join(',')==='kind,asset'&&Object.keys(data.subject.geometry.asset).join(',')==='fileName,format,sha256'})()`))
  await navigate()
  await waitFor(() => e(`document.body.innerText.includes('Saved model needs reselect')`), 'pending imported model')
  check('reload preserves all imported settings and has no file/runtime asset', equal(await settings(), imported) && await e(`!store.assets.getAsset(store.getState().settings.subject.geometry)`))
  await screenshot('pss18-pending-model')
  await select('#pending-model-files', ['embedded.gltf'])
  check('wrong model reselect is rejected and releases staged asset', equal(await settings(), imported) && await e(`store.getState().modelImport.kind==='error' && document.body.innerText.includes('does not match saved model') && !store.assets.getAsset(store.getState().settings.subject.geometry)`))
  await select('#pending-model-files', ['group.glb'])
  await ready()
  check('matching file reselect preserves saved scene settings', equal(await settings(), imported))
  const reselectedFrame = await exportFile('import-matching-reselect')
  check('matching model reproduces saved pixels', hash(importedFrame) === hash(reselectedFrame), { before: hash(importedFrame), after: hash(reselectedFrame) })
  await e(`store.getState().actions.selectPrimitive('sphere')`)
  await ready()
  await open()
  await edit('scene-preset', importId)
  await click('Restore scene')
  await waitFor(() => e(`document.body.innerText.includes('Saved model needs reselect')`), 'preset missing model')
  await click('Close presets')
  await click('Use built-in sphere instead')
  await ready()
  const fallback = await settings()
  check('explicit built-in fallback changes only geometry', fallback.subject.geometry.kind === 'sphere' && equal({ ...fallback, subject: { ...fallback.subject, geometry: imported.subject.geometry } }, imported))
  await exportFile('explicit-built-in-fallback')
  await screenshot('pss18-final-workspace')
  await c('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  await open()
  await pause(150)
  await screenshot('pss18-narrow-presets')
  const panelRect = await e(`(()=>{const r=document.querySelector('#preset-panel').getBoundingClientRect();const css=getComputedStyle(document.querySelector('#preset-panel'));return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,position:css.position,maxHeight:css.maxHeight}})()`)
  check('preset controls remain within narrow viewport', panelRect.left>=0&&panelRect.right<=panelRect.width&&panelRect.top>=0&&panelRect.bottom<=panelRect.height,panelRect)
  observations.final = await diag()
  check('single healthy renderer remains', observations.final.lifecycle.active === 1 && !observations.final.contextLost)
  check('all page resources are local', requests.every(url => /^(http:\/\/127\.0\.0\.1:5173\/|blob:http:\/\/127\.0\.0\.1:5173\/|data:)/.test(url)))
  check('no page console warnings/errors or uncaught exceptions', errors.length === 0 && warnings.length === 0, { errors, warnings })
  observations.downloads = downloads
} catch (error) {
  failure = String(error.stack ?? error)
  console.error(failure)
} finally {
  writeFileSync(`${evidence}/pss18-browser-checks.json`, JSON.stringify({ checks, observations, errors, warnings, requests, failure, browserHostMessages: browserStderr.split('\n').filter(Boolean).filter((line,index,all)=>all.indexOf(line)===index).slice(0,8) }, null, 2) + '\n')
  writeFileSync(`${evidence}/pss18-export-frames.json.gz`, gzipSync(JSON.stringify(frames)))
  if (browser.exitCode === null && browser.signalCode === null) {
    const exited = once(browser, 'exit')
    await send('Browser.close').catch(() => browser.kill())
    await exited
  }
  for (const item of pending.values()) clearTimeout(item.timeout)
  pending.clear()
  for (const stream of browser.stdio) stream?.destroy()
  rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
  rmSync(downloadPath, { recursive: true, force: true })
}
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} browser checks passed; ${frames.length} downloaded PNGs decoded`)
if (failure) process.exitCode = 1
