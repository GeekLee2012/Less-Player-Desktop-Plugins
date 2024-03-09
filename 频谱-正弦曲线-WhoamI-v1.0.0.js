/**
 * @name 频谱 - 正弦曲线
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { events } = lessAPI
const { APIEvents, register, unregister } = events



/* 自由开发代码区 */
let step = 0, h = null
const drawSpectrum = (canvas, { freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke }) => {
    const { width: cWidth, height: cHeight } = canvas

    const canvasCtx = canvas.getContext("2d")
    canvasCtx.clearRect(0, 0, cWidth, cHeight)

    canvasCtx.fillStyle = 'transparent'
    canvasCtx.fillRect(0, 0, cWidth, cHeight)


    canvasCtx.fillStyle = spectrumColor
    canvasCtx.strokeStyle = stroke
    //canvasCtx.shadowBlur = 1
    //canvasCtx.shadowColor = stroke

    //防止溢出
    step = (++step % Number.MAX_SAFE_INTEGER)

    const k = 30 * Math.PI / cWidth
    h = h || (cHeight * 2 / 3) - 3
    const start = h * Math.sin(k * step) / 2
    
    canvasCtx.moveTo(0, cHeight + start)
    canvasCtx.beginPath()
    for (var i = 0; i < cWidth; i++) {
        const y = h - h * Math.sin(k * (i + step)) / 2
        canvasCtx.lineTo(i, y) 
    }
    canvasCtx.stroke()
}



/* 插件接入规范区 */
//插件启用
export const activate = () => {
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理函数
   */
  register(APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Activated ] 频谱 - 正弦曲线')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 正弦曲线')
}
