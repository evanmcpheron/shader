import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const profile = mkdtempSync('/tmp/pss17-chrome-')
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let buffer = '', sequence = 0
const pending = new Map(), errors = [], warnings = [], requests = [], checks = [], frames = [], observations = {}
const downloads = []
const downloadPath = mkdtempSync('/tmp/pss17-downloads-')
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
const pngDirectory = `${evidence}/pss17-png`
mkdirSync(pngDirectory, { recursive: true })
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
    for (let i = 0; i < 200; i++) { if (await predicate()) return; await pause(30) }
    throw new Error(`Timed out: ${name}`)
  }
  for (const domain of ['Runtime', 'Page', 'DOM', 'Network']) await c(`${domain}.enable`)
  await c('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
  await c('Page.navigate', { url: 'http://127.0.0.1:5173/?scene-checks' })
  await pause(1600)
  await e(`(async()=>{
    window.store = (await import('/src/app/studioStore.ts')).studioStore;
    window.comparePng = (await import('/src/export/verifyPng.ts')).comparePngToFrame;
    window.clickButton = name => { const button = [...document.querySelectorAll('button')].find(b => b.textContent === name); if (!button) throw new Error('Missing button ' + name); button.click() };
    window.editField = (name, value) => { const label = [...document.querySelectorAll('label')].find(l => l.textContent === name); if (!label) throw new Error('Missing label ' + name); const input = document.getElementById(label.htmlFor); Object.getOwnPropertyDescriptor(input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(input, String(value)); input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) };
    window.realToBlob = HTMLCanvasElement.prototype.toBlob;
    window.realClick = HTMLAnchorElement.prototype.click;
    window.realCreateURL = URL.createObjectURL;
    window.realRevokeURL = URL.revokeObjectURL;
    window.liveURLs = new Set();
    URL.createObjectURL = function(blob) { const url = realCreateURL.call(URL, blob); liveURLs.add(url); return url };
    URL.revokeObjectURL = function(url) { liveURLs.delete(url); return realRevokeURL.call(URL, url) };
    document.querySelector('.renderer-diagnostics').open = true;
  })()`)
  const click = async (name) => { await e(`clickButton(${JSON.stringify(name)})`); await pause(85) }
  const edit = async (name, value) => { await e(`editField(${JSON.stringify(name)},${JSON.stringify(value)})`); await pause(85) }
  const diag = async () => { await click('Refresh diagnostics'); return e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`) }
  const frame = async (exported = false) => { await click(exported ? 'Inspect exported RGBA' : 'Inspect native RGBA'); return e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`) }
  const ready = () => waitFor(() => e(`store.getState().referenceStatus.kind === 'ready'`), 'renderer ready')
  const select = async (files) => {
    const { root } = await c('DOM.getDocument')
    const { nodeId } = await c('DOM.querySelector', { nodeId: root.nodeId, selector: '#local-model-files' })
    await c('DOM.setFileInputFiles', { nodeId, files: files.map(fixture) })
    await waitFor(() => e(`store.getState().modelImport.kind === 'ready'`), 'import ready')
    await pause(100)
  }
  const screenshot = async (name) => writeFileSync(`${evidence}/${name}.png`, Buffer.from((await c('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  const finishExport = async (name, index, expected) => {
    await waitFor(() => downloads[index]?.state === 'completed', `${name} download completion`)
    await waitFor(() => e(`document.body.innerText.includes('PNG download started:') && !document.body.innerText.includes('Preparing the clicked revision')`), 'export status')
    const exported = await frame(true)
    check(`${name}: pinned frame exists`, exported !== null)
    if (expected) check(`${name}: captured revision/bytes match clicked native frame`, exported.revision === expected.revision && hash(exported) === hash(expected), { exported: exported.revision, expected: expected.revision })
    const bytes = readFileSync(resolve(downloadPath, downloads[index].guid))
    writeFileSync(`${pngDirectory}/${name}.png`, bytes)
    const decoded = await e(`comparePng(new Blob([Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}), c => c.charCodeAt(0))], {type:'image/png'}), ${JSON.stringify(exported)})`)
    check(`${name}: actual downloaded PNG decodes byte-identically`, decoded.matches && decoded.differentBytes === 0, decoded)
    check(`${name}: binary alpha and zero hidden RGB`, decoded.alpha.every(a => a === 0 || a === 255) && decoded.hiddenColorPixels === 0, { alpha: decoded.alpha, hidden: decoded.hiddenColorPixels })
    check(`${name}: native dimension/style filename`, /^[a-z0-9-]+-\d+x\d+-[a-z0-9-]+\.png$/.test(downloads[index].suggestedFilename), downloads[index].suggestedFilename)
    frames.push({ name, frame: exported, decoded, filename: downloads[index].suggestedFilename, sha256: hash(exported) })
    return decoded
  }
  const exportFile = async (name) => {
    const expected = await frame(), index = downloads.length
    await e(`clickButton('Export PNG')`)
    return finishExport(name, index, expected)
  }
  observations.gpu = await e(`(()=>{const gl=document.querySelector('.reference-canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {dpr:devicePixelRatio,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}})()`)
  observations.initial = await diag()
  const s1 = await exportFile('s1-sphere')
  check('S1: 64x64 and exact x/y=16..47', s1.width === 64 && s1.height === 64 && JSON.stringify(s1.bounds) === JSON.stringify({ minX:16,minY:16,maxX:47,maxY:47 }), s1)
  check('S1: exactly four specified blue RGB entries', JSON.stringify(s1.opaqueColors) === JSON.stringify(['172038','304878','5C88B8','B8D8F0']), s1.opaqueColors)
  await edit('Canvas width (pixels)', 96)
  const s8 = await exportFile('s8-96x64-zoom8')
  check('S8: 96x64 and sphere x32..63/y16..47', s8.width === 96 && s8.height === 64 && JSON.stringify(s8.bounds) === JSON.stringify({ minX:32,minY:16,maxX:63,maxY:47 }), s8)
  const s8hash = frames.at(-1).sha256
  for (const zoom of [100, 125, 1600]) {
    await edit('Preview zoom (%)', zoom)
    await c('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 2, mobile: false })
    await exportFile(`s8-zoom${zoom}-dpr2`)
    check(`S8: zoom ${zoom}/DPR2 do not change pixels`, frames.at(-1).sha256 === s8hash)
  }
  await c('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
  await click('Reset scene')
  for (const background of ['transparent', 'solid']) {
    await edit('Background', background)
    for (const algorithm of ['none', '2', '4', '8', 'blue-noise', 'floyd-steinberg']) {
      await edit('Dither algorithm', algorithm)
      const decoded = await exportFile(`${background}-${algorithm}`)
      check(`${background}/${algorithm}: correct background alpha`, JSON.stringify(decoded.alpha) === JSON.stringify(background === 'solid' ? [255] : [0,255]), decoded.alpha)
      const allowed = ['172038','304878','5C88B8','B8D8F0', ...(background === 'solid' ? ['20232B'] : [])]
      check(`${background}/${algorithm}: exact palette/background bytes`, decoded.opaqueColors.every(c => allowed.includes(c)), decoded.opaqueColors)
    }
  }
  await click('Reset scene')
  for (const mode of ['smooth', 'flat', 'cel', 'palette']) {
    await edit('Shading mode', mode)
    await exportFile(`shading-${mode}`)
  }
  await click('Reset scene')
  await edit('Outline mode', 'silhouette')
  await edit('Outline thickness (pixels)', 2)
  await e(`store.getState().actions.setSection('outline',{kind:'silhouette',thickness:2,color:'#FF007F'})`)
  await pause(100)
  const outline = await exportFile('s5-outline-explicit')
  check('S5: 2px outline exact color/extent', outline.opaqueColors.includes('FF007F') && JSON.stringify(outline.bounds) === JSON.stringify({ minX:14,minY:14,maxX:49,maxY:49 }), outline)
  await edit('Dither algorithm', 'blue-noise')
  await edit('Effect palette policy', 'strict')
  const strict = await exportFile('s5-outline-strict-blue-noise')
  check('S5: strict effects use only palette', strict.opaqueColors.every(c => ['172038','304878','5C88B8','B8D8F0'].includes(c)), strict.opaqueColors)
  await e(`(()=>{const s=store.getState();s.actions.setSection('framing',{...s.settings.framing,fit:{...s.settings.framing.fit,offset:{x:30,y:0}}})})()`)
  await pause(100)
  await exportFile('s5-outline-clipped')
  check('S5: clipped outline keeps 64x64', frames.at(-1).frame.width === 64 && frames.at(-1).frame.outline.clipped)
  await click('Reset scene')
  await edit('Shape', 'plane')
  await e(`(()=>{const s=store.getState();s.actions.setSection('subject',{...s.settings.subject,geometry:{...s.settings.subject.geometry,width:3,height:1}});s.actions.setSection('canvas',{width:96,height:64});s.actions.setSection('framing',{...s.settings.framing,fit:{...s.settings.framing.fit,box:{width:48,height:24}}})})()`)
  await pause(100)
  const rectangular = await exportFile('rectangular-plane')
  check('rectangular subject/canvas preserve independent dimensions', rectangular.width === 96 && rectangular.height === 64 && frames.at(-1).frame.framing.actual.width === 48 && frames.at(-1).frame.framing.actual.height === 16, rectangular)
  await click('Reset scene')
  await edit('Shape', 'cube')
  await click('Isometric')
  await edit('Ground receiver', 'shadow-only')
  await e(`(()=>{const s=store.getState();s.actions.setSection('shadows',{kind:'directional',self:true,ground:true,strength:1,color:'#172038',bias:0.5,treatment:{kind:'pixel-soft',radius:2}})})()`)
  await edit('Outline mode', 'silhouette')
  await edit('Dither algorithm', 'floyd-steinberg')
  await exportFile('ground-shadows-outline-fs')
  for (const format of ['glb','gltf']) {
    await select(format === 'glb' ? ['group.glb'] : ['group.gltf','group.bin'])
    await exportFile(`import-${format}-effects-fs`)
  }
  await edit('Ground receiver', 'off')
  await click('Reset scene')
  await select(['group.glb'])
  const importedExpected = await frame()
  let index = downloads.length
  await e(`clickButton('Export PNG');store.getState().actions.selectPrimitive('cube')`)
  await finishExport('import-pinned-before-primitive', index, importedExpected)
  check('import pin releases after export and latest preview owns cube', (await diag()).settings.subject.geometry.kind === 'cube' && (await diag()).imports.assets === 0)
  await click('Reset scene')
  const priorRevision = (await frame()).revision
  index = downloads.length
  const clickedRevision = await e(`(()=>{const s=store.getState();s.actions.setSection('canvas',{width:96,height:64});const clicked=store.getState().revisions.settings;clickButton('Export PNG');clickButton('Export PNG');s.actions.setSection('canvas',{width:80,height:48});s.actions.setPaletteColors(['#000000','#FFFFFF']);return clicked})()`)
  await finishExport('rapid-edit-export-newer-preview', index)
  const pinned = frames.at(-1).frame, newest = await frame()
  check('rapid edit exports clicked complete revision, never older or newer', pinned.revision === clickedRevision && clickedRevision > priorRevision && pinned.width === 96 && pinned.height === 64 && pinned.framing.actual.x === 32 && pinned.framing.actual.y === 16, { priorRevision, clickedRevision, exportedRevision:pinned.revision, width:pinned.width,height:pinned.height })
  check('newer preview remains visible after pinned export', newest.revision > pinned.revision && newest.width === 80 && newest.height === 48 && (await diag()).nativeCanvas.revision === String(newest.revision), {revision:newest.revision,width:newest.width,height:newest.height})
  check('repeat click created exactly one download', downloads.length === index + 1)
  await click('Reset scene')
  await e(`HTMLCanvasElement.prototype.toBlob=function(callback,...args){window.encodingStarted=true;return realToBlob.call(this,blob=>setTimeout(()=>callback(blob),350),...args)}`)
  index = downloads.length
  await e(`window.encodingStarted=false;clickButton('Export PNG')`)
  await waitFor(() => e(`encodingStarted`), 'delayed encoder starts')
  check('repeat export disabled during asynchronous encoding', await e(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Exporting PNG…')?.disabled === true`))
  await e(`clickButton('Exporting PNG…');store.getState().actions.setPaletteColors(['#000000','#FFFFFF'])`)
  await finishExport('encoding-owns-pixels-across-preview-edit', index)
  check('encoding frame keeps pre-edit four-color bytes', frames.at(-1).decoded.opaqueColors.length === 4 && (await frame()).revision > frames.at(-1).frame.revision)
  await e(`HTMLCanvasElement.prototype.toBlob=realToBlob`)
  for (const kind of ['null', 'throw', 'download']) {
    const count = downloads.length
    await e(kind === 'download' ? `HTMLAnchorElement.prototype.click=function(){throw new Error('Download failed (verification)')}` : kind === 'null' ? `HTMLCanvasElement.prototype.toBlob=function(cb){cb(null)}` : `HTMLCanvasElement.prototype.toBlob=function(){throw new Error('Encoder failed (verification)')}`)
    await e(`clickButton('Export PNG')`)
    await waitFor(() => e(`document.querySelector('[role=alert]')?.textContent.includes('PNG export failed')`), `${kind} error`)
    check(`${kind}: visible retryable error and no download`, downloads.length === count && await e(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Export PNG')?.disabled === false`), await e(`document.querySelector('[role=alert]').textContent`))
    await e(`HTMLCanvasElement.prototype.toBlob=realToBlob;HTMLAnchorElement.prototype.click=realClick`)
    await exportFile(`retry-after-${kind}`)
  }
  for (const phase of ['queued','encoding']) {
    const count = downloads.length
    await e(`HTMLCanvasElement.prototype.toBlob=function(callback,...args){window.encodingStarted=true;return realToBlob.call(this,blob=>setTimeout(()=>callback(blob),350),...args)};window.encodingStarted=false`)
    if (phase === 'queued') await e(`clickButton('Export PNG');clickButton('Simulate context loss')`)
    else {
      await e(`clickButton('Export PNG')`)
      await waitFor(() => e(`encodingStarted`), 'encoder before context loss')
      await e(`clickButton('Simulate context loss')`)
    }
    await waitFor(() => e(`document.querySelector('[role=alert]')?.textContent.includes('PNG export failed')`), `${phase} context loss error`)
    await pause(400)
    check(`${phase}: lost context invalidates export and prevents download`, downloads.length === count && await e(`store.getState().referenceStatus.kind==='unavailable'`))
    await e(`HTMLCanvasElement.prototype.toBlob=realToBlob`)
    await click('Retry renderer')
    await ready()
    await exportFile(`retry-context-${phase}`)
  }
  await click('Reset scene')
  await edit('Dither algorithm', '4')
  await edit('Outline mode', 'silhouette')
  await e(`store.getState().actions.setPreview({zoom:8,grid:true,checkerboard:true,referenceWireframe:true,tool:'light',mode:'side-by-side'})`)
  await pause(100)
  await exportFile('all-preview-overlays-excluded')
  const overlayHash = frames.at(-1).sha256
  await e(`store.getState().actions.setPreview({grid:false,checkerboard:false,referenceWireframe:false,tool:'camera',mode:'final'})`)
  await pause(100)
  await exportFile('overlays-off-same-output')
  check('UI overlays/original/sidebars never affect PNG', frames.at(-1).sha256 === overlayHash)
  await screenshot('pss17-final-workspace')
  await pause(1200)
  check('all created download/import URLs revoked', await e(`liveURLs.size === 0`), await e(`[...liveURLs]`))
  observations.final = await diag()
  observations.downloads = downloads
  check('single real context remains healthy', observations.final.lifecycle.active === 1 && !observations.final.contextLost && !observations.final.exporting)
  check('all page resources are local', requests.every(url => /^(http:\/\/127\.0\.0\.1:5173\/|blob:http:\/\/127\.0\.0\.1:5173\/|data:)/.test(url)))
  check('no page console warnings/errors or uncaught exceptions', errors.length === 0 && warnings.length === 0, { errors, warnings })
} catch (error) {
  failure = String(error.stack ?? error)
  console.error(failure)
} finally {
  writeFileSync(`${evidence}/pss17-browser-checks.json`, JSON.stringify({ checks, observations, errors, warnings, requests, failure, browserHostMessages: browserStderr.split('\n').filter(Boolean).filter((line,index,all)=>all.indexOf(line)===index).slice(0,8) }, null, 2) + '\n')
  writeFileSync(`${evidence}/pss17-export-frames.json.gz`, gzipSync(JSON.stringify(frames)))
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
