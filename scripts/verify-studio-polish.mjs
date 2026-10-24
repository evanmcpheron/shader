import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

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
const fixture = (name) => resolve('tests/fixtures/models', name)
const hash = (frame) => createHash('sha256').update(new Uint8Array(frame.rgba)).digest('hex')
browser.on('exit', (code, signal) => { for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(new Error(`Browser exited ${code}/${signal}`)) }; pending.clear() })
let failure
try {
  observations.browser = await send('Browser.getVersion')
  await send('Browser.setDownloadBehavior', { behavior:'allowAndName',downloadPath,eventsEnabled:true })
  const {targetId}=await send('Target.createTarget',{url:'about:blank'})
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true})
  const c=(method,params={})=>send(method,params,sessionId)
  const e=async expression=>{const r=await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
  const waitFor=async(expression,name)=>{for(let i=0;i<200;i++){if(await e(expression))return;await pause(30)}throw Error('Timeout: '+name)}
  const click=async name=>{await e(`clickButton(${JSON.stringify(name)})`);await pause(80)}
  const diag=()=>e('diag()')
  const screenshot=async name=>writeFileSync(`${evidence}/${name}.png`,Buffer.from((await c('Page.captureScreenshot',{format:'png'})).data,'base64'))
  const key=async(key,code=key,modifiers=0)=>{await c('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{}),windowsVirtualKeyCode:({Enter:13,Tab:9,Escape:27,ArrowRight:39}[key]??0)});await c('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers});await pause(40)}
  const mouse=(type,x,y,buttons=0)=>c('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons,clickCount:type==='mouseMoved'?0:1})
  for(const domain of ['Runtime','Page','DOM','Network','Performance'])await c(`${domain}.enable`)
  const resize=async(width,height)=>{await c('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await pause(120)}
  const origin=process.env.PSS_PREVIEW?'http://127.0.0.1:4173/':'http://127.0.0.1:5173/'
  await resize(1440,900)
  await c('Page.navigate',{url:origin+(process.env.PSS_PREVIEW?'':'?scene-checks')});await pause(1000)
  await e(`window.clickButton=name=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===name);if(!b)throw Error(name);b.click()}`)
  if(process.env.PSS_PREVIEW){
    await waitFor(`document.body.innerText.includes('Reference ready')`,'production renderer')
    await click('Compare');await click('Fit view');await click('Presets');await screenshot('pss19-production')
    check('production preview renders comparison and local preset UI',await e(`document.querySelectorAll('.preview-panel:not([hidden]) .native-canvas, .preview-panel:not([hidden]) .before-canvas').length===2&&!!document.querySelector('#preset-panel')&&!document.querySelector('.renderer-diagnostics')`))
    check('production preview has no horizontal overflow',await e('document.documentElement.scrollWidth<=innerWidth'))
  }else{
    await e(`(async()=>{
      window.store=(await import('/src/app/studioStore.ts')).studioStore;
      window.defaults=(await import('/src/domain/defaults.ts')).createDefaultSettings;
      window.comparePng=(await import('/src/export/verifyPng.ts')).comparePngToFrame;
      window.diag=async()=>{clickButton('Refresh diagnostics');await new Promise(r=>setTimeout(r,0));return JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)};
      window.frame=async()=>{clickButton('Inspect native RGBA');await new Promise(r=>setTimeout(r,0));return JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)};
      window.edit=(label,value)=>{const input=[...document.querySelectorAll('input')].find(i=>i.labels?.[0]?.textContent===label);if(!input)throw Error(label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}))};
      window.urls={created:0,revoked:0};window.realCreate=URL.createObjectURL;window.realRevoke=URL.revokeObjectURL;
      URL.createObjectURL=function(...args){urls.created++;return realCreate.apply(this,args)};URL.revokeObjectURL=function(...args){urls.revoked++;return realRevoke.apply(this,args)};
    })()`)
    await waitFor(`store.getState().referenceStatus.kind==='ready'`,'renderer')
    observations.gpu=await e(`(()=>{const gl=document.querySelector('.reference-canvas').getContext('webgl2');return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)})()`)
    const reset=async()=>{await e('store.getState().actions.resetScene();store.getState().actions.resetPreview()');await pause(150)}
    const exportFile=async name=>{
      const revision=await e('store.getState().revisions.settings'),index=downloads.length
      await click('Export PNG');await waitFor(`document.body.innerText.includes('PNG download started:')`,'export status')
      for(let i=0;i<200&&downloads[index]?.state!=='completed';i++)await pause(30)
      check(name+': download completed',downloads[index]?.state==='completed',downloads[index])
      await click('Inspect exported RGBA');const expected=await e(`window.expectedPng=JSON.parse(document.querySelector('[aria-label="Renderer diagnostics"]').textContent)`);check(name+': pinned capture is clicked latest revision',expected?.revision===revision,{expected:revision,actual:expected?.revision});
      const preview=await e('frame()');check(name+': settled preview equals exported bytes',preview&&hash(preview)===hash(expected));
      const bytes=readFileSync(resolve(downloadPath,downloads[index].guid))
      const result=await e(`comparePng(new Blob([Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0))],{type:'image/png'}),window.expectedPng)`);await e('window.expectedPng=null')
      check(name+': decoded PNG equals latest native RGBA',result.matches&&result.differentBytes===0,result)
      return {sha256:hash(expected),decoded:result}
    }
    for(const [width,height]of[[1440,900],[1024,768],[768,900]]){
      await resize(width,height);await reset()
      if(width===768){await click('Scene');check('narrow Scene opens alone',await e(`!document.querySelector('#scene-inspector').hidden&&document.querySelector('#pixel-inspector').hidden`));await click('Pixels')}
      check(`${width}: viewport contained`,await e(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.reference-host').clientWidth>200`))
      const ax=await c('Accessibility.getFullAXTree')
      const unnamed=ax.nodes.filter(n=>!n.ignored&&['button','combobox','spinbutton','slider','textbox','checkbox','link'].includes(n.role?.value)&&!n.name?.value)
      check(`${width}: visible controls have accessible names`,unnamed.length===0,unnamed)
      await click('Fit view');await screenshot(`pss19-layout-${width}`)
      if(width===768){
        await e(`document.querySelector('#pixel-inspector input[type=number]').focus()`);await key('Escape')
        check('narrow Escape returns focus to Pixels toggle',await e(`document.activeElement.textContent==='Pixels'&&document.querySelector('#pixel-inspector').hidden`))
        await key('Enter');check('keyboard reopens Pixels panel',await e(`!document.querySelector('#pixel-inspector').hidden`));await key('Tab');check('Tab reaches a visible control',await e(`document.activeElement.getBoundingClientRect().width>0`))
      }
    }
    await resize(1440,900);await reset()
    await e(`edit('Canvas width (pixels)','')`)
    check('empty numeric draft preserves valid canvas and reports error',await e(`store.getState().settings.canvas.width===64&&document.querySelector('[aria-invalid=true]')?.getAttribute('aria-describedby')`))
    await e(`document.querySelector('[aria-invalid=true]').focus()`);await key('Escape')
    check('Escape restores numeric value without closing panel',await e(`!document.querySelector('[aria-invalid=true]')&&!document.querySelector('#pixel-inspector').hidden`))
    await click('Presets');check('factory current status is explicit',await e(`document.querySelector('#preset-panel').textContent.includes('Current scene: Factory')`))
    await e(`store.getState().actions.setSection('canvas',{width:96,height:64})`);await pause(80)
    check('modified current status is explicit',await e(`document.querySelector('#preset-panel').textContent.includes('Current scene: Custom')`));await click('Close presets')
    await reset()
    let before=await diag()
    await e(`store.getState().actions.setPreview({zoom:2,pan:{x:13,y:-9},grid:true,checkerboard:false,mode:'side-by-side',referenceWireframe:true})`);await pause(80)
    let after=await diag()
    check('all view navigation skips native capture/process/composition',after.native.captures===before.native.captures&&after.native.processes===before.native.processes&&after.native.composites===before.native.composites,{before:before.native,after:after.native})
    before=after
    await e(`store.getState().actions.setPaletteColors(['#000000','#FFFFFF']);store.getState().actions.setSection('dither',{kind:'floyd-steinberg',strength:1})`);await pause(80);after=await diag()
    check('coalesced palette/dither changes process once without normal capture',after.native.captures===before.native.captures&&after.native.processes===before.native.processes+1,{before:before.native,after:after.native})
    await e(`(()=>{const s=store.getState().settings;store.getState().actions.restoreSettings({...s,canvas:{width:256,height:256},camera:{...s.camera,roll:35,projection:{kind:'perspective',fov:40,zoom:1}},framing:{...s.framing,fit:{...s.framing.fit,box:{width:128,height:128}}},ground:{kind:'receiver',position:{x:0,y:-1,z:0},width:4,depth:4,appearance:{kind:'visible',color:'#304878'}},shadows:{kind:'directional',self:true,ground:true,strength:0.8,color:'#172038',treatment:{kind:'pixel-soft',radius:4}},outline:{kind:'silhouette',thickness:2,color:'#172038'}})})()`);await pause(150)
    before=await diag();await e(`(()=>{const s=store.getState();s.actions.setSection('lighting',{...s.settings.lighting,ambient:{...s.settings.lighting.ambient,intensity:0.4}})})()`);await pause(80);after=await diag()
    check('light color/intensity edit reuses normals and shadow pass',after.native.captures===before.native.captures&&after.native.visibilityCaptures===before.native.visibilityCaptures)
    before=after;await e(`(()=>{const s=store.getState();s.actions.setSection('shadows',{...s.settings.shadows,strength:0.6,color:'#000000',treatment:{kind:'pixel-soft',radius:2}})})()`);await pause(80);after=await diag()
    check('shadow appearance/radius reuse GPU visibility',after.native.visibilityCaptures===before.native.visibilityCaptures&&after.native.captures===before.native.captures,{before:before.native.visibilityCaptures,after:after.native.visibilityCaptures})
    for(const mode of ['final','reference','side-by-side']){
      await e(`store.getState().actions.setPreview({mode:${JSON.stringify(mode)},tool:'light',zoom:2,pan:{x:7,y:-5}})`);await pause(80)
      const d=await diag(),p=d.presentation[0].handle.handle,camera=JSON.stringify(d.settings.camera),lighting=JSON.stringify(d.settings.lighting)
      await mouse('mousePressed',p.x,p.y,1);await mouse('mouseMoved',p.x+30,p.y+15,1);await pause(80)
      const moved=await diag()
      check(mode+': rolled perspective light drag owns gesture',JSON.stringify(moved.settings.camera)===camera&&JSON.stringify(moved.settings.lighting)!==lighting&&moved.light.dragging&&moved.camera.lightOwnsGesture)
      await key('Escape');await mouse('mouseReleased',p.x+30,p.y+15)
      const cancelled=await diag()
      check(mode+': Escape restores light and releases capture',JSON.stringify(cancelled.settings.lighting)===lighting&&!cancelled.light.dragging&&!cancelled.camera.lightOwnsGesture&&await e(`!document.querySelector('.reference-host').hasPointerCapture(1)`))
    }
    await e(`store.getState().actions.setPreview({tool:'preview-pan',mode:'side-by-side'})`);await pause(80)
    before=await diag();const rect=before.presentation[0].viewport,x=rect.left+rect.width/2,y=rect.top+rect.height/2
    await mouse('mousePressed',x,y,1);await mouse('mouseMoved',x+20,y+10,1);await key('Escape');await mouse('mouseReleased',x+20,y+10)
    after=await diag();check('preview pan cancellation leaves camera/light/pixels unchanged',JSON.stringify(after.settings)===JSON.stringify(before.settings)&&JSON.stringify(after.preview.pan)===JSON.stringify(before.preview.pan)&&after.native.processes===before.native.processes)
    await e(`document.querySelector('.reference-host').focus()`);await key('ArrowRight');await key('n','KeyN');await key('+','Equal');await key('f','KeyF')
    check('keyboard preview commands work without scene changes',JSON.stringify((await diag()).settings)===JSON.stringify(before.settings))
    await e(`(()=>{const input=[...document.querySelectorAll('input')].find(i=>i.labels?.[0]?.textContent==='Brightness');input.scrollIntoView({block:'center'});input.focus();input.select();let count=0;window.editTimer=setInterval(()=>{const s=store.getState();s.actions.setSection('lighting',{...s.settings.lighting,directional:{...s.settings.lighting.directional,position:{x:3+count/10,y:4,z:5}}});if(++count===10){clearInterval(editTimer);window.editsFinished=true}},30)})()`)
    await c('Input.insertText',{text:'0.25'});await waitFor('window.editsFinished','concurrent light edits');await pause(100)
    check('real numeric typing stays usable during repeated rendering',await e(`store.getState().settings.shading.brightness===0.25&&!document.querySelector('[aria-invalid=true]')`))
    await e(`store.getState().actions.setPreview({tool:'light',mode:'side-by-side'})`);await pause(80)
    const collapseBefore=await diag(),handle=collapseBefore.presentation[0].handle.handle
    await mouse('mousePressed',handle.x,handle.y,1);await mouse('mouseMoved',handle.x+12,handle.y+9,1);await click('Scene');await click('Pixels');await pause(100)
    const collapseAfter=await diag()
    check('collapsing panels releases active light ownership/capture',!collapseAfter.light.dragging&&!collapseAfter.camera.lightOwnsGesture&&await e(`!document.querySelector('.reference-host').hasPointerCapture(1)`))
    await mouse('mouseReleased',handle.x+12,handle.y+9);await click('Scene');await click('Pixels')
    await e(`for(let i=0;i<20;i++){const s=store.getState();s.actions.setSection('shading',{...s.settings.shading,brightness:i/40})}`)
    observations.latestExport=await exportFile('256 latest revision after burst')
    const idle=await diag();await pause(1200);const idleAfter=await diag();check('idle native and presentation counters stop',idle.frames===idleAfter.frames&&idle.native.processes===idleAfter.native.processes,{before:idle.frames,after:idleAfter.frames})
    observations.resources=[]
    for(let i=0;i<32;i++){
      const {root}=await c('DOM.getDocument');const {nodeId}=await c('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type=file][accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp"]'})
      await c('DOM.setFileInputFiles',{nodeId,files:[fixture(i%2?'embedded.gltf':'group.glb')]});await waitFor(`store.getState().modelImport.kind!=='loading'`,'import settled');await pause(100)
      check(`cycle ${i}: real model loaded`,await e(`store.getState().settings.subject.geometry.kind==='imported'&&store.getState().referenceStatus.kind==='ready'`))
      for(const enabled of [true,false,true]){await e(`store.getState().actions.setSection('outline',${enabled}?{kind:'silhouette',thickness:2,color:'#172038'}:{kind:'none'});store.getState().actions.setSection('shadows',${enabled}?{kind:'directional',self:true,ground:true,strength:0.8,color:'#172038',treatment:{kind:'pixel-soft',radius:2}}:{kind:'none'});store.getState().actions.setSection('ground',${enabled}?{kind:'receiver',position:{x:0,y:-1,z:0},width:4,depth:4,appearance:{kind:'visible',color:'#304878'}}:{kind:'none'})`);await pause(50)}
      for(const size of [32,256,128,64]){await e(`store.getState().actions.setSection('canvas',{width:${size},height:${size}})`);await pause(35)}
      await exportFile('resource cycle '+i)
      await e(`store.getState().actions.selectPrimitive('torus')`);await pause(50);await reset();await click('Remount reference');await waitFor(`store.getState().referenceStatus.kind==='ready'`,'remount');await pause(70)
      const d=await diag();await e(`clickButton('Refresh diagnostics')`);await pause(10)
      await c('HeapProfiler.collectGarbage');await c('HeapProfiler.collectGarbage')
      const metrics=Object.fromEntries((await c('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]))
      observations.resources.push({cycle:i,memory:d.memory,lifecycle:d.lifecycle,imports:d.imports,target:d.native.targetLifecycle,metrics,canvases:await e(`document.querySelectorAll('.reference-host canvas').length`)})
    }
    const tail=observations.resources.slice(16),first=tail[0],last=tail.at(-1)
    check('replacement/remount GPU and asset counters plateau',tail.every(r=>JSON.stringify(r.memory)===JSON.stringify(first.memory)&&r.lifecycle.active===1&&r.target.active===1&&r.canvases===5&&r.imports.assets===0),tail)
    check('post-GC listeners and heap plateau',last.metrics.JSEventListeners<=first.metrics.JSEventListeners+5&&last.metrics.JSHeapUsedSize<first.metrics.JSHeapUsedSize*1.2+1_000_000,tail.map(r=>({cycle:r.cycle,listeners:r.metrics.JSEventListeners,heap:r.metrics.JSHeapUsedSize})))
    await click('Simulate context loss');await waitFor(`store.getState().referenceStatus.kind==='unavailable'`,'context lost')
    check('context loss removes all old canvases',await e(`document.querySelectorAll('.reference-host canvas').length===0`))
    await click('Retry renderer');await waitFor(`store.getState().referenceStatus.kind==='ready'`,'retry')
    const recovered=await diag();check('context recovery has one runtime, target and canvas set',recovered.lifecycle.active===1&&recovered.native.targetLifecycle.active===1&&await e(`document.querySelectorAll('.reference-host canvas').length===5`),recovered.memory)
    observations.recoveredExport=await exportFile('after forced context recovery')
    await waitFor('urls.created===urls.revoked','deferred download URL release');check('all created blob URLs revoked',await e('urls.created===urls.revoked'),await e('urls'))
    await reset();await e(`store.getState().actions.setPreview({mode:'side-by-side',zoom:2,checkerboard:true})`);await pause(100);await screenshot('pss19-comparison-checkerboard')
  }
  check('no unexpected console warnings/errors',errors.length===0&&warnings.length===0,{errors,warnings})
  check('all browser requests local',requests.every(u=>u.startsWith(origin)||u.startsWith('data:')||u.startsWith('blob:'+origin)),requests.filter(u=>!u.startsWith(origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'+origin)))
}catch(error){failure=String(error.stack??error)}finally{
  writeFileSync(`${evidence}/pss19-${process.env.PSS_PREVIEW?'production':'browser'}-checks.json`,JSON.stringify({checks,observations,errors,warnings,failure,browserStderr},null,2))
  try{await send('Browser.close')}catch{}
  if(browser.exitCode===null&&browser.signalCode===null){browser.kill();await Promise.race([once(browser,'exit'),pause(2000)])}
  rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});rmSync(downloadPath,{recursive:true,force:true})
}
console.log(JSON.stringify({checks:checks.length,failure}));if(failure)process.exitCode=1
