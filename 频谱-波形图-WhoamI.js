/**
 * @name 频谱 - 波形图
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { events } = lessAPI
const { APIEvents, register, } = events



/* 自由开发代码区 */
let count = 0
const setupSpectrumColor = (spectrumColor) => {
    if(count % 3 == 0) {
        count = 0
    } else if(count % 3 == 1) {
        spectrumColor = `${spectrumColor}cb`
    } else if(count % 3 == 2) {
        spectrumColor = `${spectrumColor}9e`
    } 
    ++count
    return spectrumColor
}

const drawSpectrum = (canvas, { freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke }) => {
    if(!analyser) return
    //计算出采样频率44100所需的缓冲区长度
    const length = freqBinCount * 44100 / sampleRate | 0
    const byteTimeDomainData = new Uint8Array(length)
    analyser.getByteTimeDomainData(byteTimeDomainData)

    spectrumColor = setupSpectrumColor(spectrumColor)
    stroke = spectrumColor

    const { width: cWidth, height: cHeight } = canvas

    const canvasCtx = canvas.getContext("2d")
    canvasCtx.clearRect(0, 0, cWidth, cHeight)

    canvasCtx.fillStyle = 'transparent'
    canvasCtx.fillRect(0, 0, cWidth, cHeight)

    canvasCtx.lineWidth = 2
    canvasCtx.fillStyle = spectrumColor
    canvasCtx.strokeStyle = stroke
    //canvasCtx.shadowBlur = 3
    //canvasCtx.shadowColor = stroke

    canvasCtx.beginPath()
    for (var i = 0; i < cWidth; i++) {
        canvasCtx.lineTo(i, cHeight / 2 - (cHeight * (byteTimeDomainData[byteTimeDomainData.length * i / cWidth | 0] / 256 - 0.5)))
    }
    canvasCtx.stroke()
}



/* 插件接入规范区 */
//插件启用
export const activate = (plugin) => {
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理函数
   */
  register(plugin, APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Activated ] 频谱 - 波形图')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 频谱 - 波形图')
}
