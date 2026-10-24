import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const profile = mkdtempSync('/tmp/pss16-chrome-')
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let buffer = '', sequence = 0
const pending = new Map(), errors = [], warnings = [], requests = [], checks = [], frames = [], observations = {}
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
let failure
try {
  observations.browser = await send('Browser.getVersion')
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const c = (method, params = {}) => send(method, params, sessionId)
  const e = async (expression) => {
    const result = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  for (const domain of ['Runtime', 'Page', 'DOM', 'Network']) await c(`${domain}.enable`)
  await c('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
  await c('Page.navigate', { url: 'http://127.0.0.1:5173/?scene-checks' })
  await pause(1600)
  await e(`window.clickButton = name => { const button = [...document.querySelectorAll('button')].find(b => b.textContent === name); if (!button) throw new Error('Missing button ' + name); button.click() };
    window.editField = (name, value) => { const label = [...document.querySelectorAll('label')].find(l => l.textContent === name); if (!label) throw new Error('Missing label ' + name); const input = document.getElementById(label.htmlFor); Object.getOwnPropertyDescriptor(input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(input, String(value)); input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) };
    document.querySelector('.renderer-diagnostics').open = true`)
  const click = async (name) => { await e(`clickButton(${JSON.stringify(name)})`); await pause(85) }
  const edit = async (name, value) => { await e(`editField(${JSON.stringify(name)},${JSON.stringify(value)})`); await pause(85) }
  const toggle = async (name) => { await e(`(()=>{const input=[...document.querySelectorAll('input[type=checkbox]')].find(i=>i.parentElement.textContent.trim()===${JSON.stringify(name)}); if(!input)throw new Error('Missing checkbox');input.click()})()`); await pause(85) }
  const diag = async () => { await click('Refresh diagnostics'); return e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`) }
  const frame = async () => { await click('Inspect native RGBA'); return e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`) }
  const select = async (files, settle = true) => {
    const { root } = await c('DOM.getDocument')
    const { nodeId } = await c('DOM.querySelector', { nodeId: root.nodeId, selector: '#local-model-files' })
    await c('DOM.setFileInputFiles', { nodeId, files: files.map(fixture) })
    if (settle) await pause(180)
  }
  const screenshot = async (name) => writeFileSync(`${evidence}/${name}.png`, Buffer.from((await c('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  observations.gpu = await e(`(()=>{const gl=document.querySelector('.reference-canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {dpr:devicePixelRatio,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}})()`)
  observations.initial = await diag()
  check('real renderer starts', observations.initial.lifecycle.active === 1 && observations.initial.native.frame.width === 64)
  for (const format of ['glb', 'gltf']) {
    await select(format === 'glb' ? ['group.glb'] : ['group.gltf', 'group.bin'])
    const d = await diag(), f = await frame()
    check(`${format} selected files publish a normalized asset`, d.modelImport.kind === 'ready' && d.settings.subject.geometry.asset.format === format && d.imports.assets === 1 && d.imports.urls === 0, d.imports)
    check(`${format} uses shared fitter and native frame`, f.width === 64 && f.height === 64 && f.framing.actual.width === 32 && f.framing.actual.height === 18, f.framing)
    check(`${format} leaves independent user transforms`, JSON.stringify(d.settings.subject.transform) === JSON.stringify(observations.initial.settings.subject.transform))
    if (format === 'glb') observations.glbHash = hash(f)
    else check('GLB and glTF companion render identical bytes', hash(f) === observations.glbHash)
    frames.push({ name: `initial-${format}`, frame: f, diagnostics: d })
    for (const mode of ['smooth', 'flat']) {
      await edit('Shading mode', mode)
      const result = await frame()
      frames.push({ name: `${format}-${mode}`, frame: result, diagnostics: await diag() })
      check(`${format} ${mode} renders subject`, result.rgba.some((value, i) => i % 4 === 3 && value === 255))
    }
    await edit('Shading mode', 'bands')
    await edit('Normal treatment', 'smooth')
    for (const algorithm of ['none', '2', '4', '8', 'blue-noise', 'floyd-steinberg']) {
      await edit('Dither algorithm', algorithm)
      const f = await frame(), d = await diag()
      const palette = new Set(d.settings.palette.colors.map(color => color.slice(1).toUpperCase()))
      let valid = true
      for (let i = 0; i < f.rgba.length; i += 4) {
        const [r,g,b,a] = f.rgba.slice(i, i + 4)
        if (a === 0) valid &&= r === 0 && g === 0 && b === 0
        else valid &&= a === 255 && palette.has([r,g,b].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase())
      }
      check(`${format} ${algorithm} exact palette and binary alpha`, valid)
      frames.push({ name: `${format}-${algorithm}`, frame: f, diagnostics: d })
    }
    await edit('Dither algorithm', 'none')
  }
  await edit('Rotation Y', 35)
  await edit('Scale X', 1.4)
  const rotated = await frame()
  check('rotation/nonuniform scale change native pixels', hash(rotated) !== observations.glbHash)
  await click('Isometric')
  await edit('Camera projection', 'perspective')
  await edit('Camera roll (degrees)', 25)
  await click('Reframe reference')
  const camera = await diag()
  check('reframe keeps imported transforms', camera.settings.subject.transform.rotation.y === 35 && camera.settings.subject.transform.scale.x === 1.4 && camera.settings.camera.projection.kind === 'perspective')
  const beforeLight = hash(await frame())
  await click('Upper Left')
  check('lighting changes imported shading without rebuilding geometry', hash(await frame()) !== beforeLight && (await diag()).geometryBuilds === camera.geometryBuilds)
  await edit('Ground receiver', 'shadow-only')
  await toggle('Directional shadows')
  await edit('Shadow treatment', 'pixel-soft')
  await edit('Outline mode', 'silhouette')
  await edit('Dither algorithm', 'floyd-steinberg')
  await edit('Effect palette policy', 'strict')
  const styled = await frame(), styledDiag = await diag()
  frames.push({ name: 'styled-perspective', frame: styled, diagnostics: styledDiag })
  check('shadows and outlines use the existing passes', styledDiag.native.visibilityCaptures > 0 && styledDiag.native.shadow.allocatedMaps === 1 && styled.outline.pixelCount > 0 && styled.ground !== null, styledDiag.memory)
  await click('Inspect native passes')
  frames.at(-1).passes = await e(`JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`)
  await click('Compare')
  await toggle('Checkerboard')
  await screenshot('pss16-imported-workspace')
  await edit('Palette preset', 'warm')
  await click('Apply palette preset')
  await edit('Shading mode', 'palette')
  const warm = await frame(), warmDiag = await diag()
  frames.push({ name: 'warm-nearest-palette', frame: warm, diagnostics: warmDiag })
  check('palette edits reuse capture for imported models', warmDiag.native.captures === styledDiag.native.captures && warmDiag.settings.shading.tone.kind === 'palette' && hash(warm) !== hash(styled))
  const prior = hash(warm)
  for (const files of [['missing.gltf'], ['group.gltf'], ['remote.gltf'], ['compressed.gltf'], ['morph.gltf'], ['animated.gltf'], ['malformed.glb']]) {
    await select(files)
    const d = await diag(), f = await frame()
    check(`${files[0]} fails visibly while prior subject stays usable`, d.modelImport.kind === 'error' && hash(f) === prior && d.imports.assets === 1 && d.imports.urls === 0, d.modelImport)
  }
  await e(`(()=>{const input=document.querySelector('#local-model-files');const files=new DataTransfer();files.items.add(new File([new Uint8Array(25*1024*1024+1)],'oversized.glb'));input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`)
  await pause(100)
  check('oversized selection is rejected visibly', (await diag()).modelImport.message.includes('25 MiB') && hash(await frame()) === prior)
  await e(`window.originalArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){if(this.name==='group.glb') await new Promise(r=>setTimeout(r,350));return originalArrayBuffer.call(this)}`)
  await select(['group.glb'], false)
  check('loading UI exposes cancellation', await e(`document.body.innerText.includes('Loading local model') && [...document.querySelectorAll('button')].some(b=>b.textContent==='Cancel import')`))
  await click('Cancel import')
  await pause(400)
  check('cancel preserves frame and releases stale work', hash(await frame()) === prior && (await diag()).imports.assets === 1)
  await select(['group.glb'], false)
  await select(['group.gltf', 'group.bin'])
  await pause(450)
  check('rapid replacement never publishes delayed older GLB', (await diag()).settings.subject.geometry.asset.format === 'gltf' && (await diag()).imports.assets === 1)
  await e(`File.prototype.arrayBuffer=originalArrayBuffer`)
  observations.cycles = []
  for (let i = 0; i < 12; i++) {
    await edit('Shape', 'cube')
    const primitive = await diag()
    check(`cycle ${i} primitive releases model ownership`, primitive.imports.assets === 0 && primitive.imports.geometries === 0 && primitive.imports.materials === 0 && primitive.imports.urls === 0, primitive.imports)
    await select(i % 2 ? ['group.glb'] : ['group.gltf', 'group.bin'])
    const imported = await diag()
    observations.cycles.push({ primitive: primitive.memory, imported: imported.memory, resources: imported.imports })
    check(`cycle ${i} one active asset/context and no URLs`, imported.imports.assets === 1 && imported.imports.urls === 0 && imported.lifecycle.active === 1)
  }
  const memory = observations.cycles.map(cycle => JSON.stringify(cycle.imported))
  check('GPU memory plateaus across repeated imports', new Set(memory.slice(2)).size === 1, observations.cycles)
  const beforeRemount = hash(await frame())
  await click('Remount reference')
  await pause(300)
  check('renderer remount reuses retained asset with identical native bytes', hash(await frame()) === beforeRemount && (await diag()).imports.assets === 1)
  await click('Simulate context loss')
  await pause(100)
  await click('Retry renderer')
  await pause(300)
  check('context retry retains imported geometry and reproduces pixels', hash(await frame()) === beforeRemount && (await diag()).lifecycle.active === 1)
  await edit('Shape', 'sphere')
  await select(['embedded.gltf'])
  check('embedded data with computed missing normals renders', (await diag()).modelImport.kind === 'ready' && (await frame()).framing.actual.width === 32)
  const last = await diag()
  observations.serialized = JSON.stringify(last.settings)
  check('serialized settings contain descriptor only', last.settings.subject.geometry.asset.sha256.length === 64 && !/blob:|Object3D|arrayBuffer/.test(observations.serialized))
  await e(`(async()=>{window.testStore=(await import('/src/app/studioStore.ts')).studioStore; window.savedSettings=JSON.parse(${JSON.stringify(observations.serialized)}); testStore.assets.release(); testStore.getState().actions.selectPrimitive('cube'); testStore.getState().actions.restoreSettings(savedSettings)})()`)
  await pause(150)
  check('missing runtime asset requests reselect explicitly', await e(`document.body.innerText.includes('Reselect embedded.gltf')`))
  await select(['embedded.gltf'])
  check('reselect of matching descriptor restores rendering', (await frame()) !== null && (await diag()).modelImport.kind === 'ready')
  await edit('Shape', 'sphere')
  observations.final = await diag()
  check('final primitive has no model resources or URLs', observations.final.imports.assets === 0 && observations.final.imports.urls === 0 && observations.final.imports.geometries === 0)
  check('no remote page resource fetches', requests.every(url => /^(http:\/\/127\.0\.0\.1:5173\/|blob:http:\/\/127\.0\.0\.1:5173\/|data:)/.test(url)), requests.filter(url => !/^(http:\/\/127\.0\.0\.1:5173\/|blob:|data:)/.test(url)))
  check('no page console warnings/errors or uncaught exceptions', errors.length === 0 && warnings.length === 0, { errors, warnings })
} catch (error) {
  failure = String(error.stack ?? error)
  console.error(failure)
} finally {
  writeFileSync(`${evidence}/pss16-browser-checks.json`, JSON.stringify({ checks, observations, errors, warnings, requests, failure, browserHostMessages: browserStderr.split('\n').filter(Boolean).filter((line, index, all) => all.indexOf(line) === index).slice(0, 8) }, null, 2) + '\n')
  writeFileSync(`${evidence}/pss16-browser-frames.json.gz`, gzipSync(JSON.stringify(frames)))
  const exited = once(browser, 'exit')
  await send('Browser.close').catch(() => browser.kill())
  await exited
  for (const item of pending.values()) clearTimeout(item.timeout)
  pending.clear()
  rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
}
console.log(`${checks.filter(check => check.passed).length}/${checks.length} browser checks passed; ${frames.length} native frame sets saved`)
if (failure) process.exitCode = 1
