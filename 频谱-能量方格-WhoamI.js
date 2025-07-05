/**
 * @name 频谱 - 能量方格
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { events } = lessAPI
const { APIEvents, register, } = events



/* 自由开发代码区 */
const drawSpectrum = (canvas, { freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke, alignment }) => {
    alignment = alignment || 'bottom'

    const { width: cWidth, height: cHeight } = canvas
    const canvasCtx = canvas.getContext("2d")

    canvasCtx.clearRect(0, 0, cWidth, cHeight)

    canvasCtx.fillStyle = 'transparent'
    canvasCtx.fillRect(0, 0, cWidth, cHeight)

    if (!freqData || freqData.length < 1) return
    const dataLen = freqData.length

    let barWidth = 10, barHeight, cellHeight = 3, x = 3,
        hspacing = 4, vspacing = 2, step = 2

    let freqCnt = 0
    for (var i = 0; i < dataLen; i = i + step) {
        if ((x + barWidth + hspacing) >= cWidth) break
        //step = i >= (dataLen / 2) && i <= (dataLen * 2 / 3) ? 1 : 2

        //数据量控制一下，减少点CPU占用
        if (++freqCnt >= 88) break

        barHeight = freqData[i] / 255 * cHeight
        barHeight = Math.max(barHeight, cellHeight)
        const cellSize = Math.max(1, Math.floor((barHeight + vspacing) / (cellHeight + vspacing)))

        canvasCtx.fillStyle = spectrumColor
        canvasCtx.strokeStyle = stroke
        //canvasCtx.shadowBlur = 1
        //canvasCtx.shadowColor = stroke

        for (var j = 0; j < cellSize; j++) {
            const _barHeight = (j + 1) * (cellHeight + vspacing)
            //alignment => bottom
            let y = cHeight - _barHeight
            if (alignment == 'top') y = _barHeight
            else if (alignment == 'center') y = y / 2

            canvasCtx.fillRect(x, y, barWidth, cellHeight)
            //canvasCtx.strokeRect(x, y, barWidth, cellHeight)
        }

        x += barWidth + hspacing
  }
}



/* 插件接入规范区 */
//插件启用
export const activate = (plugin) => {
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理函数
   */
  register(plugin, APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Activated ] 频谱 - 能量方格')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 频谱 - 能量方格')
}
