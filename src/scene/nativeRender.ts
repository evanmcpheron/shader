import { Color, NoToneMapping, Vector4 } from 'three'
import type { Scene, WebGLRenderer, WebGLRenderTarget } from 'three'

export function withNativeTarget(renderer: WebGLRenderer, scene: Scene, target: WebGLRenderTarget, draw: () => void): void {
  const gl = renderer.getContext()
  const previous = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    viewport: renderer.getViewport(new Vector4()), scissor: renderer.getScissor(new Vector4()), scissorTest: renderer.getScissorTest(),
    clear: renderer.getClearColor(new Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear,
    toneMapping: renderer.toneMapping, override: scene.overrideMaterial, background: scene.background, dither: gl.isEnabled(gl.DITHER),
  }
  try {
    scene.background = null
    renderer.toneMapping = NoToneMapping
    renderer.autoClear = false
    renderer.setRenderTarget(target)
    renderer.setViewport(0, 0, target.width, target.height)
    renderer.setScissorTest(false)
    renderer.setClearColor(0, 0)
    gl.disable(gl.DITHER)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Native framebuffer allocation failed. Choose a smaller canvas and Retry renderer.')
    draw()
  } finally {
    scene.overrideMaterial = previous.override
    scene.background = previous.background
    renderer.toneMapping = previous.toneMapping
    renderer.autoClear = previous.autoClear
    renderer.setRenderTarget(previous.target, previous.face, previous.mip)
    renderer.setViewport(previous.viewport)
    renderer.setScissor(previous.scissor)
    renderer.setScissorTest(previous.scissorTest)
    renderer.setClearColor(previous.clear, previous.alpha)
    if (previous.dither) gl.enable(gl.DITHER)
    else gl.disable(gl.DITHER)
  }
}
