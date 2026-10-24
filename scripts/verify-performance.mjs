import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'

const profile = mkdtempSync('/tmp/pss19-chrome-')
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let buffer = '', sequence = 0
const pending = new Map(), errors = [], warnings = [], requests = [], checks = [], observations = {}
const downloads = []
const downloadPath = mkdtempSync('/tmp/pss19-downloads-')
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
browser.on('exit', (code, signal) => { for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(new Error(`Browser exited ${code}/${signal}`)) }; pending.clear() })
const label = process.env.PSS_PROFILE_LABEL ?? 'baseline'
let failure
try {
  observations.browser = await send('Browser.getVersion')
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const c = (method, params = {}) => send(method, params, sessionId)
  const e = async expression => {
    const result = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  for (const domain of ['Runtime', 'Page', 'DOM', 'Network', 'Performance']) await c(`${domain}.enable`)
  await c('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await c('Page.navigate', { url: 'http://127.0.0.1:5173/?scene-checks' })
  await pause(1400)
  await e(`(async()=>{
    window.store = (await import('/src/app/studioStore.ts')).studioStore;
    window.defaults = (await import('/src/domain/defaults.ts')).createDefaultSettings;
    window.clickButton = name => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent===name); if(!b)throw Error(name); b.click() };
    window.diag = async () => { clickButton('Refresh diagnostics'); await new Promise(r=>setTimeout(r,0)); return JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent) };
    window.frame = async () => { clickButton('Inspect native RGBA'); await new Promise(r=>setTimeout(r,0)); return JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent) };
  })()`)
  observations.gpu = await e(`(()=>{const gl=document.querySelector('.reference-canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency}})()`)
  observations.workload = 'Sphere, half-canvas pixel-fit subject, smooth-normal bands, four colors, 2px outline, visible 4x4 ground, directional self+ground, radius4 softness; real CDP orbit/light pointer moves, four warmups then eight measured moves.'
  const move = (x,y,buttons=1) => c('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons})
  const drag = async (tool, samples) => {
    await e(`store.getState().actions.setPreview({tool:${JSON.stringify(tool)},mode:'final',zoom:1,pan:{x:0,y:0}})`)
    await pause(80)
    const d = await e('diag()')
    const panel = d.presentation[0]
    const point = tool === 'light' ? panel.handle.handle : {x:panel.viewport.left+panel.viewport.width/2,y:panel.viewport.top+panel.viewport.height/2}
    await c('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1})
    const records=[]
    for(let i=0;i<samples+4;i++) {
      const started=performance.now()
      await move(point.x+10+(i%6)*5,point.y+8+Math.floor(i/6)*7)
      await pause(25)
      const next=await e('diag()')
      if(i===3) await e('longTasks=[]');
      if(i>=4) records.push({roundTripMs:performance.now()-started,...next.native.timings,renderTimings:next.renderTimings,captures:next.native.captures,processes:next.native.processes,visibilityCaptures:next.native.visibilityCaptures,revision:next.revisions.settings,canvasRevision:next.nativeCanvas.revision})
    }
    await c('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+35,y:point.y+15,button:'left',clickCount:1})
    return records
  }
  await e(`window.longTasks=[];new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(entry=>entry.duration))).observe({type:'longtask'})`);
  observations.profiles=[]
  for (const {size,effects} of [...[32,64,128,256].map(size=>({size,effects:'soft'})),{size:256,effects:'off'},{size:256,effects:'hard'}]) for (const algorithm of ['none','bayer','blue-noise','floyd-steinberg']) {
    const scene=await e('defaults()')
    Object.assign(scene,{canvas:{width:size,height:size},framing:{...scene.framing,fit:{...scene.framing.fit,box:{width:size/2,height:size/2}}},outline:{kind:'silhouette',thickness:2,color:'#172038'},ground:{kind:'receiver',position:{x:0,y:-1,z:0},width:4,depth:4,appearance:{kind:'visible',color:'#304878'}},shadows:{kind:'directional',self:true,ground:true,strength:0.8,color:'#172038',treatment:{kind:'pixel-soft',radius:4}},dither:algorithm==='none'?{kind:'none'}:algorithm==='floyd-steinberg'?{kind:algorithm,strength:1}:{kind:algorithm,...(algorithm==='bayer'?{matrixSize:4}:{}),strength:1,patternScale:1,transitionWidth:1}})
    if(effects==='off')Object.assign(scene,{outline:{kind:'none'},ground:{kind:'none'},shadows:{kind:'none'}})
    if(effects==='hard')scene.shadows.treatment={kind:'hard'}
    const result=await e(`store.getState().actions.restoreSettings(${JSON.stringify(scene)})`)
    check(`${size}/${effects}/${algorithm}: valid workload`,result.ok,result)
    await pause(150)
    for(const tool of ['camera','light']) {
      const samples=await drag(tool,8)
      check(`${size}/${effects}/${algorithm}/${tool}: latest settled native revision`,samples.every(s=>Number(s.canvasRevision)===s.revision),samples)
      observations.profiles.push({size,effects,algorithm,tool,samples,longTasks:await e('longTasks')})
    }
  }
  check('no uncaught errors or console warnings',errors.length===0&&warnings.length===0,{errors,warnings})
  check('all browser requests local',requests.every(url=>url.startsWith('http://127.0.0.1:5173/')||url.startsWith('data:')),requests.filter(url=>!url.startsWith('http://127.0.0.1:5173/')&&!url.startsWith('data:')))
} catch(error) { failure=String(error.stack??error) }
finally {
  writeFileSync(`${evidence}/pss19-${label}.json`,JSON.stringify({label,checks,observations,errors,warnings,failure,browserStderr},null,2))
  try { await send('Browser.close') } catch {}
  if(browser.exitCode===null && browser.signalCode===null) { browser.kill(); await Promise.race([once(browser,'exit'),pause(2000)]) }
  rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});rmSync(downloadPath,{recursive:true,force:true})
}
console.log(JSON.stringify({label,checks:checks.length,profiles:observations.profiles?.length,failure}))
if(failure)process.exitCode=1
