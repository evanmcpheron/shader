import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { isDeepStrictEqual } from 'node:util'
import { createHash } from 'node:crypto'

const profile = mkdtempSync('/tmp/pss20-application-chrome-')
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let buffer = '', sequence = 0
const pending = new Map(), errors = [], warnings = [], requests = [], checks = [], frames = [], observations = {}
const downloads = []
for (const stream of [browser.stdio[3], browser.stdio[4]]) stream.on('error', error => {
  for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(error) }
  pending.clear()
})
const downloadPath = mkdtempSync('/tmp/pss20-application-downloads-')
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
    if (browser.exitCode !== null || browser.signalCode !== null || !browser.stdio[3].writable) { reject(new Error('Chrome did not start or its DevTools pipe closed.')); return }
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
const pngDirectory = `${evidence}/pss20-application-png`
mkdirSync(pngDirectory, { recursive: true })
const origin = 'http://127.0.0.1:4173/'
let failure
try {
  observations.browser = await send('Browser.getVersion')
  await send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath, eventsEnabled: true })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const c = (method, params = {}) => send(method, params, sessionId)
  const e = async expression => {
    const result = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const waitFor = async (expression, name) => {
    for (let i = 0; i < 200; i++) { if (await e(expression)) return; await pause(30) }
    throw Error(`Timeout: ${name}`)
  }
  for (const domain of ['Runtime', 'Page', 'DOM', 'Network']) await c(`${domain}.enable`)
  await c('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
  const bind = async () => {
    await waitFor(`!!document.querySelector('.native-canvas')`, 'native canvas mounted')
    await e(`window.button=name=>{const b=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent)===name);if(!b||b.disabled)throw Error('Unavailable button '+name);b.click()};
      window.field=label=>{const l=[...document.querySelectorAll('label')].find(l=>[...l.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim()===label);const input=l&&(l.control||document.getElementById(l.htmlFor));if(!input)throw Error('Missing field '+label);return input};
      window.edit=(label,value)=>{const input=field(label);if(input.matches(':disabled'))throw Error('Disabled '+label);Object.getOwnPropertyDescriptor(input instanceof HTMLSelectElement?HTMLSelectElement.prototype:input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,String(value));input.dispatchEvent(new Event(input instanceof HTMLSelectElement?'change':'input',{bubbles:true}))};
      window.snapshot=()=>{const canvas=document.querySelector('.native-canvas');return {width:canvas.width,height:canvas.height,revision:Number(canvas.dataset.revision),rgba:Array.from(canvas.getContext('2d',{colorSpace:'srgb'}).getImageData(0,0,canvas.width,canvas.height).data)}};
      document.querySelectorAll('details').forEach(d=>d.open=true)`)
    await waitFor(`document.body.innerText.includes('Reference ready')`, 'production renderer ready')
  }
  await c('Page.navigate', { url: origin }); await bind()
  observations.gpu = await e(`(()=>{const gl=document.querySelector('.reference-canvas').getContext('webgl2');return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)})()`)
  const click = async name => { await e(`button(${JSON.stringify(name)})`); await pause(80) }
  const edit = async (label, value) => { await e(`edit(${JSON.stringify(label)},${JSON.stringify(value)})`); await pause(80) }
  const state = () => e(`(()=>{window.dispatchEvent(new Event('pagehide'));return JSON.parse(localStorage.getItem('pixel-shading-studio:current'))})()`)
  const frame = () => e('snapshot()')
  const reset = async () => { await click('Reset scene'); await click('Reset view'); await e(`document.querySelectorAll('details').forEach(d=>d.open=true)`); await pause(80) }
  const bounds = f => {
    let x = f.width, y = f.height, right = -1, bottom = -1, count = 0
    for (let i = 0; i < f.rgba.length; i += 4) if (f.rgba[i + 3]) { const px = i / 4 % f.width, py = Math.floor(i / 4 / f.width); x = Math.min(x, px); y = Math.min(y, py); right = Math.max(right, px); bottom = Math.max(bottom, py); count++ }
    return { x, y, width: right - x + 1, height: bottom - y + 1, count }
  }
  const colors = f => [...new Set(Array.from({ length: f.width * f.height }, (_, i) => f.rgba[i * 4 + 3] ? '#'+f.rgba.slice(i * 4, i * 4 + 3).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase() : null).filter(Boolean))].sort()
  const exportFile = async name => {
    const expected = await frame(), index = downloads.length
    await click('Export PNG')
    for (let i=0; i<200 && downloads[index]?.state!=='completed'; i++) await pause(30)
    check(name+': production download completed', downloads[index]?.state==='completed', downloads[index])
    const bytes = readFileSync(resolve(downloadPath, downloads[index].guid))
    writeFileSync(`${pngDirectory}/${name}.png`, bytes)
    const decoded = await e(`(async()=>{const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),v=>v.charCodeAt(0))],{type:'image/png'}),{premultiplyAlpha:'none',colorSpaceConversion:'none'});const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d',{colorSpace:'srgb'});ctx.drawImage(bitmap,0,0);const result={width:bitmap.width,height:bitmap.height,rgba:Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data)};bitmap.close();return result})()`)
    check(name+': every decoded RGBA byte equals production final canvas', decoded.width===expected.width&&decoded.height===expected.height&&hash(decoded)===hash(expected), { dimensions:[decoded.width,decoded.height],sha256:hash(decoded),bounds:bounds(decoded),colors:colors(decoded) })
    frames.push({ name, frame:expected, sha256:hash(expected) })
    return expected
  }
  await reset()
  const canonical = await frame(), blue = ['#172038','#304878','#5C88B8','#B8D8F0'].sort()
  check('S1 exact production sphere mask and four blue bytes', JSON.stringify(bounds(canonical))===JSON.stringify({x:16,y:16,width:32,height:32,count:812})&&JSON.stringify(colors(canonical))===JSON.stringify(blue),{bounds:bounds(canonical),colors:colors(canonical)})
  await exportFile('s1-production')
  const parameters = {
    sphere:[['Radius',1.3],['Width segments',8],['Height segments',4]],
    cube:[['Width',2.8],['Height',1.4],['Depth',0.8]],
    cylinder:[['Radius',0.7],['Height',2.6],['Radial segments',8],['Height segments',3]],
    cone:[['Radius',0.8],['Height',2.7],['Radial segments',6],['Height segments',4]],
    pyramid:[['Base size',2.8],['Height',1.4]],
    torus:[['Major radius',1.2],['Tube radius',0.2],['Tube segments',6],['Ring segments',12]],
    plane:[['Width',2.8],['Height',1.4],['Width segments',4],['Height segments',3]],
  }
  observations.primitives = []
  for (const [shape, fields] of Object.entries(parameters)) {
    await edit('Shape',shape)
    for (const [label,value] of fields) await edit(label,value)
    const s = await state(), f = await frame()
    check(shape+': every geometry field commits and renders', fields.every(([label,value])=>s.subject.geometry[({Radius:'radius','Width segments':'widthSegments','Height segments':'heightSegments',Width:'width',Height:'height',Depth:'depth','Radial segments':'radialSegments','Base size':'baseSize','Major radius':'radius','Tube radius':'tubeRadius','Tube segments':'radialSegments','Ring segments':'tubularSegments'})[label]]===value)&&bounds(f).count>0,{geometry:s.subject.geometry,bounds:bounds(f)})
    observations.primitives.push({shape,settings:s.subject,frame:f,sha256:hash(f),bounds:bounds(f)})
    await click('Reset geometry')
  }
  await edit('Shape','cube'); await click('Isometric')
  let before = await state()
  for (const [group,value] of [['Position',0.3],['Rotation',25],['Scale',1.2]]) for (const axis of ['X','Y','Z']) await edit(`${group} ${axis}`,value)
  let after = await state()
  check('R01 all XYZ object transforms preserve camera', JSON.stringify(before.camera)===JSON.stringify(after.camera)&&Object.values(after.subject.transform.rotation).every(v=>v===25),after.subject.transform)
  await click('Reset transforms')
  before = await state(); const imageBefore = await frame()
  const rect = await e(`(()=>{const r=document.querySelector('.reference-host').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await c('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',buttons:1,clickCount:1})
  await c('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+60,y:rect.y+30,button:'left',buttons:1})
  await c('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+60,y:rect.y+30,button:'left',buttons:0})
  await pause(100); after = await state()
  check('S2 real camera orbit changes bands without object edits',JSON.stringify(before.subject)===JSON.stringify(after.subject)&&JSON.stringify(before.camera)!==JSON.stringify(after.camera)&&hash(imageBefore)!==hash(await frame()))
  await edit('Rotation Y',35); const objectRotated = await state()
  check('S2 object rotation preserves orbited camera',JSON.stringify(objectRotated.camera)===JSON.stringify(after.camera))
  before = await state(); const litBefore = hash(await frame()); await click('Upper Left'); after=await state()
  check('S2 light preset changes cube bands independently',litBefore!==hash(await frame())&&JSON.stringify(before.camera)===JSON.stringify(after.camera)&&JSON.stringify(before.subject)===JSON.stringify(after.subject))
  await edit('Camera roll (degrees)',37)
  for (const projection of ['orthographic','perspective']) {
    await edit('Camera projection',projection)
    for (const view of ['Front','Back','Left','Right','Top','Bottom','Isometric']) {
      await click(view); const s=await state()
      check(`${projection} ${view}: finite rolled render and independent subject`,s.camera.roll===37&&bounds(await frame()).count>0&&JSON.stringify(s.subject)===JSON.stringify(after.subject))
    }
  }
  check('R02 pixel-fit locks pan/zoom inputs',await e(`field('Camera zoom').matches(':disabled')&&field('Camera position X').matches(':disabled')&&document.body.innerText.includes('Camera pan/zoom are disabled')`))
  await click('Switch to manual framing'); await click('Reset camera'); await edit('Camera zoom',1.5)
  const zoomed=hash(await frame()); await edit('Camera zoom',1)
  check('R02 manual camera zoom changes pixels',zoomed!==hash(await frame()))
  await edit('Camera projection','perspective'); const narrow=hash(await frame()); await edit('Field of view (degrees)',75)
  check('R02 manual FOV changes projection',narrow!==hash(await frame()))
  for (const group of ['position','target']) for (const axis of ['X','Y','Z']) { const value=await e(`Number(field(${JSON.stringify('Camera '+group+' '+axis)}).value)`); await edit(`Camera ${group} ${axis}`,value+0.1) }
  await click('Reset camera'); await click('Reset framing'); await reset()
  for (const size of [8,16,24,32,48,64,96,128,256]) { await edit('Canvas preset',String(size)); const f=await frame(); check(`R04 ${size} square native preset`,f.width===size&&f.height===size&&f.rgba.length===size*size*4&&bounds(f).count>0) }
  await reset(); await edit('Canvas width (pixels)',96)
  const rectangle=await frame()
  check('S8 independent 96x64 mask',JSON.stringify(bounds(rectangle))===JSON.stringify({x:32,y:16,width:32,height:32,count:812}),bounds(rectangle))
  await exportFile('s8-production')
  for (const zoom of [100,200,800,125]) { await edit('Preview zoom (%)',zoom); check(`S8 zoom ${zoom} leaves native bytes`,hash(await frame())===hash(rectangle)) }
  await c('Emulation.setDeviceMetricsOverride',{width:1300,height:900,deviceScaleFactor:2,mobile:false}); await pause(100)
  check('S8 DPR2 leaves native bytes',hash(await frame())===hash(rectangle))
  await exportFile('s8-production-dpr2')
  await c('Emulation.setDeviceMetricsOverride',{width:1500,height:1100,deviceScaleFactor:1,mobile:false}); await reset()
  await edit('Canvas width (pixels)',71); await edit('Canvas height (pixels)',56)
  for (const [edge,value] of [['left',3],['right',7],['top',2],['bottom',5]]) await edit(`Padding ${edge} (pixels)`,value)
  for (const alignment of ['top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right']) {
    await edit('Subject alignment',alignment); const b=bounds(await frame())
    const x=alignment.includes('left')?3:alignment.includes('right')?32:17, y=alignment.includes('top')?2:alignment.includes('bottom')?19:10
    check('R04 odd padded '+alignment,b.x===x&&b.y===y&&b.width===32&&b.height===32,b)
  }
  await edit('Subject offset X (pixels)',-4); await edit('Subject offset Y (pixels)',6)
  check('R04 independent offsets',bounds(await frame()).x===28&&bounds(await frame()).y===25)
  await reset(); await edit('Padding left (pixels)',60)
  check('R04 oversize request disclosed and measured',bounds(await frame()).width===4&&await e(`document.body.innerText.includes('clamp')`))
  await reset()
  for (const [fieldName,value] of [['Brightness',0.2],['Contrast',1.7],['Shade distribution',1.8]]) {const previous=hash(await frame());await edit(fieldName,value);check('R05 '+fieldName+' changes native allocation',previous!==hash(await frame()))}
  await reset(); await edit('Threshold 1',0.1); check('R05 custom threshold retained',(await state()).shading.tone.thresholds[0]===0.1)
  await edit('Threshold 2',0.1); check('R05 nonmonotonic threshold rejected',(await state()).shading.tone.thresholds[1]===0.5&&await e(`!!document.querySelector('[aria-invalid=true]')`))
  await reset()
  for(const mode of ['smooth','flat','cel','bands','palette']) {await edit('Shading mode',mode);check('R05 named '+mode+' produces pixels',bounds(await frame()).count===812)}
  await reset()
  observations.palettePresets={grayscale:['#202020','#686868','#B0B0B0','#F0F0F0'],gameBoy:['#0F380F','#306230','#8BAC0F','#9BBC0F'],nes:['#1C1C1C','#2038EC','#38B4FC','#FCFCFC'],warm:['#301B28','#78404A','#C47761','#F4D7A1'],cool:['#172038','#304878','#5C88B8','#B8D8F0']}
  for(const preset of ['grayscale','gameBoy','nes','warm','cool']) {
    await edit('Palette preset',preset);await click('Apply palette preset')
    check('R06 exact built-in '+preset+' emits stored entries',isDeepStrictEqual((await state()).palette.colors,observations.palettePresets[preset])&&colors(await frame()).every(color=>observations.palettePresets[preset].includes(color)))
  }
  await reset();await edit('Entry 1 (hex)','#123ABC');await click('Move entry 1 later')
  check('R06 manual entry and reorder preserve artist bytes',(await state()).palette.colors[1]==='#123ABC')
  await click('Add color');await click('Remove entry 5');check('R06 add/remove preserve count',(await state()).palette.colors.length===4)
  const paletteFile=resolve(downloadPath,'audit-palette.hex');writeFileSync(paletteFile,'#FFFFFF #000000 #1279AB #1279AB')
  const {root}=await c('DOM.getDocument');const {nodeId}=await c('DOM.querySelector',{nodeId:root.nodeId,selector:'.palette-file input'})
  const oldPalette=(await state()).palette
  await c('DOM.setFileInputFiles',{nodeId,files:[paletteFile]});await waitFor(`document.body.innerText.includes('File read. Review text')`,'local palette file staged')
  check('R06 real file stages without changing palette',isDeepStrictEqual((await state()).palette,oldPalette))
  await click('Import palette text');check('R06 actual selected hex file imports atomically',isDeepStrictEqual((await state()).palette.colors,['#FFFFFF','#000000','#1279AB','#1279AB']))
  const fileIndex=downloads.length;await e(`document.querySelector('.palette-download').click()`)
  for(let i=0;i<200&&downloads[fileIndex]?.state!=='completed';i++)await pause(30)
  check('R06 palette JSON download contains exact imported entries',downloads[fileIndex]?.state==='completed'&&isDeepStrictEqual(JSON.parse(readFileSync(resolve(downloadPath,downloads[fileIndex].guid),'utf8')).colors,(await state()).palette.colors))
  writeFileSync(`${evidence}/pss20-palette.json`,readFileSync(resolve(downloadPath,downloads[fileIndex].guid)))
  await edit('Palette import text','{');const validPalette=(await state()).palette;await click('Import palette text');check('R06 malformed palette preserves complete state',isDeepStrictEqual((await state()).palette,validPalette)&&await e(`document.body.innerText.includes('Invalid')||document.body.innerText.includes('JSON')`))
  await reset()
  const lightingBaseline=await state()
  for(const preset of ['Upper Right','Upper Left','Overhead','Side','Flat Ambient']) {await click(preset);const s=await state();check('R03 '+preset+' changes lighting alone',Object.keys(s).filter(k=>k!=='lighting').every(k=>isDeepStrictEqual(s[k],lightingBaseline[k])))}
  check('R03 ambient-only removes directional sphere contrast',colors(await frame()).length===1)
  await click('Reset lighting');await edit('Shading mode','smooth');const white=hash(await frame());await edit('Directional color (hex)','#FF5020');check('R03 colored light tints continuous shading',hash(await frame())!==white)
  await edit('Ambient intensity',0.8);await edit('Directional intensity',2)
  for(const group of ['position','target'])for(const axis of ['X','Y','Z']) {const label=`Light ${group} ${axis}`;const previous=await e(`Number(field(${JSON.stringify(label)}).value)`);await edit(label,previous+0.1)}
  await click('Reset lighting');check('R03 reset lighting preserves shading',(await state()).shading.tone.kind==='continuous')
  await reset();await click('Isometric');await edit('Ground receiver','visible');await e(`document.querySelectorAll('input[type=checkbox]').forEach(i=>{if(i.parentElement.textContent.includes('Directional shadows')&&!i.checked)i.click()})`);await pause(100)
  await edit('Receiver color (hex)','#FEDCBA');await edit('Ground width',4);await edit('Ground depth',5);await edit('Ground position X',0.1);await edit('Ground position Y',-1.1);await edit('Ground position Z',0.2)
  await edit('Shadow strength',0.8);await edit('Shadow treatment','pixel-soft');await edit('Shadow softness (pixels)',4);await edit('Shadow bias (map texels)',0.6);await edit('Ground shadow color (hex)','#010203')
  const effects=await state();check('R09 all receiver/shadow controls commit and render',effects.ground.width===4&&effects.ground.depth===5&&effects.shadows.treatment.radius===4&&bounds(await frame()).count>0,effects.shadows)
  await edit('Effect palette policy','strict');check('R09 strict receiver and shadow map to palette',colors(await frame()).every(color=>blue.includes(color)))
  await edit('Ground receiver','shadow-only');check('R09 shadow-only leaves transparent unshadowed pixels',(await frame()).rgba.some((v,i)=>i%4===3&&v===0))
  const effectSettings=await state();await click('Reset lighting');check('R09 lighting reset preserves receiver/shadows',isDeepStrictEqual((await state()).ground,effectSettings.ground)&&isDeepStrictEqual((await state()).shadows,effectSettings.shadows))
  await click('Reset ground & shadows');check('R09 reset ground/shadows clears only effects',(await state()).ground.kind==='none'&&(await state()).shadows.kind==='none')
  await reset(); await edit('Dither algorithm','4'); const bayer=hash(await frame()); await edit('Dither strength',0);check('S3 zero strength equals none',hash(await frame())===hash(canonical));await edit('Dither strength',1);check('S3 Bayer deterministic',hash(await frame())===bayer);await edit('Preview zoom (%)',1600);check('S3 zoom cannot change Bayer',hash(await frame())===bayer)
  await edit('Shading mode','palette');await edit('Dither algorithm','4'); const paletteBayer=hash(await frame());await edit('Dither algorithm','floyd-steinberg');const fs=hash(await frame());check('S4 real production diffusion differs from Bayer and stays in palette',fs!==paletteBayer&&colors(await frame()).every(color=>blue.includes(color)));await edit('Dither algorithm','none');await edit('Dither algorithm','floyd-steinberg');check('S4 deterministic production diffusion',hash(await frame())===fs)
  await exportFile('s4-production-fs')
  await reset(); await edit('Outline mode','silhouette');await edit('Outline thickness (pixels)',2); await edit('Outline color (hex)','#FF007F')
  check('S5 2px production outline has integer extent and exact color',JSON.stringify(bounds(await frame()))===JSON.stringify({x:14,y:14,width:36,height:36,count:1084})&&colors(await frame()).includes('#FF007F'),bounds(await frame()))
  await exportFile('s5-production-outline')
  await edit('Effect palette policy','strict');check('S5 strict outline emits palette bytes only',colors(await frame()).every(color=>blue.includes(color)));await exportFile('s5-production-strict')
  for(const mode of ['Final only','Original only','Compare']) {await click(mode);check('R10 '+mode+' preserves final bytes',colors(await frame()).every(color=>blue.includes(color)))}
  await reset()
  const complete=JSON.parse(readFileSync(resolve('tests/fixtures/scenes/complete-v1.json'),'utf8'))
  await state()
  await e(`localStorage.setItem('pixel-shading-studio:current',${JSON.stringify(JSON.stringify(complete))})`)
  await c('Page.reload');await bind();const completeBefore=await exportFile('s7-production-before')
  await click('Presets');await edit('New preset name','PSS-20 complete');await click('Save new preset');await click('Close presets')
  await c('Page.reload');await bind();check('S7 production reload reproduces complete settings and pixels',isDeepStrictEqual(await state(),complete)&&hash(await frame())===hash(completeBefore))
  await click('Reset scene');await click('Presets');await e(`(()=>{const s=document.querySelector('#scene-preset');if(!s)throw Error('preset select');const option=[...s.options].find(o=>o.textContent==='PSS-20 complete');edit('Saved scene',option.value)})()`);await click('Restore scene');await click('Close presets');check('S7 saved complete production preset reproduces settings and pixels',isDeepStrictEqual(await state(),complete)&&hash(await frame())===hash(completeBefore));await exportFile('s7-production-restored')
  await reset(); await e(`document.querySelector('.workspace-help').open=false`);await click('Compare');await click('Fit view')
  writeFileSync(`${evidence}/pss20-application-workspace.png`,Buffer.from((await c('Page.captureScreenshot',{format:'png'})).data,'base64'))
  const contextFrame=hash(await frame());await e(`document.querySelector('.reference-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);await waitFor(`document.body.innerText.includes('Retry renderer')`,'production context loss')
  check('R14 production context loss removes stale canvases and disables export',await e(`document.querySelectorAll('.reference-host canvas').length===0&&[...document.querySelectorAll('button')].find(b=>b.textContent==='Export PNG').disabled`))
  await click('Retry renderer');await waitFor(`document.body.innerText.includes('Reference ready')`,'production context retry');check('R14 production retry reproduces pixels',hash(await frame())===contextFrame)
  await state()
  const unavailable=await c('Page.addScriptToEvaluateOnNewDocument',{source:`window.originalGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:originalGetContext.call(this,kind,...args)}`})
  await c('Page.reload');await waitFor(`document.body.innerText.includes('WebGL2 is unavailable')`,'unavailable WebGL guidance')
  check('R14 unavailable WebGL retains controls and blocks export',await e(`!!document.querySelector('#pixel-inspector')&&[...document.querySelectorAll('button')].find(b=>b.textContent==='Export PNG').disabled`))
  await c('Page.removeScriptToEvaluateOnNewDocument',{identifier:unavailable.identifier});await e(`HTMLCanvasElement.prototype.getContext=originalGetContext`)
  await e(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry renderer').click()`);await bind();await exportFile('recovered-production')
  check('S6 all production exports have binary alpha and zero hidden RGB',frames.every(({frame:f})=>f.rgba.every((v,i)=>i%4!==3||(v===255||v===0&&!f.rgba[i-1]&&!f.rgba[i-2]&&!f.rgba[i-3]))))
  check('production diagnostics absent',await e(`!document.querySelector('.renderer-diagnostics')`))
  check('no unexpected console warnings/errors',errors.length===0&&warnings.length===0,{errors,warnings})
  check('all production requests remain local',requests.every(url=>url.startsWith(origin)||url.startsWith('blob:'+origin)||url.startsWith('data:')),requests)
} catch(error) { failure=String(error.stack??error) } finally {
  writeFileSync(`${evidence}/pss20-application-checks.json`,JSON.stringify({checks,observations,errors,warnings,downloads,failure,browserStderr},null,2))
  writeFileSync(`${evidence}/pss20-application-frames.json.gz`,gzipSync(JSON.stringify(frames)))
  try { await send('Browser.close') } catch {}
  if(browser.exitCode===null&&browser.signalCode===null){browser.kill();await Promise.race([once(browser,'exit'),pause(2000)])}
  browser.stdio[3]?.destroy();browser.stdio[4]?.destroy();browser.stderr?.destroy()
  rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});rmSync(downloadPath,{recursive:true,force:true})
}
console.log(JSON.stringify({checks:checks.length,exports:frames.length,failure}));if(failure)process.exitCode=1
