/**
 * @name 频谱 - 跳动方块
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { events } = lessAPI
const { APIEvents, register, unregister } = events



/* 自由开发代码区 */
let flipBarHeights = []
const drawSpectrum = (canvas, { freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke }) => {
    const length = freqBinCount * 44100 / sampleRate | 0
    const byteTimeDomainData = new Uint8Array(length)
    analyser.getByteTimeDomainData(byteTimeDomainData)


    const { width: cWidth, height: cHeight } = canvas

    const canvasCtx = canvas.getContext("2d")
    canvasCtx.clearRect(0, 0, cWidth, cHeight)

    canvasCtx.fillStyle = 'transparent'
    canvasCtx.fillRect(0, 0, cWidth, cHeight)

    if (!freqData || freqData.length < 1) return
    const dataLen = freqData.length
    let barWidth = 3.5, barHeight = null, x = 2, spacing = 3, step = 2
    //barWidth = (cWidth / (dataLen * 3))
    const flipBarHeight = 1, flipStep = 1


    let freqCnt = 0
    for (var i = 0; i < dataLen; i = i + step) {
        //数据量控制一下，减少点CPU占用
        if (++freqCnt >= 80) break
        //if( (x + barWidth + spacing) >= cWidth) break
        //step = i >= (dataLen / 2) && i <= (dataLen * 3 / 4) ? 1 : 2

        barHeight = freqData[i] / 255 * cHeight
        barHeight = barHeight > 0 ? barHeight : 1

        //roundedRect(canvasCtx, x, cHeight - barHeight, barWidth, barHeight, 5)
        const y = (cHeight - barHeight) //alignment => bottom
        const gradient = canvasCtx.createLinearGradient(x, y, x + barWidth, y)
        gradient.addColorStop(0, spectrumColor)
        gradient.addColorStop(0.5, `${spectrumColor}cb`)
        gradient.addColorStop(1, `${spectrumColor}66`)

        canvasCtx.fillStyle = gradient || spectrumColor
        canvasCtx.strokeStyle = gradient || stroke
        //canvasCtx.shadowBlur = 1
        //canvasCtx.shadowColor = gradient || stroke

        canvasCtx.fillRect(x, y, barWidth, barHeight)
        if (barHeight > 0) canvasCtx.strokeRect(x, y, barWidth, barHeight)

        //顶部跳块
        //未初始化时，设置默认值
        flipBarHeights[i] = flipBarHeights[i] || flipBarHeight
        const minFlipHeight = barHeight + flipBarHeight + 1
        const dropHeight = (flipBarHeights[i] - flipStep)
        //const heightGap = minFlipHeight - flipBarHeights[i]
        const flipWeight = 15
        const maxFlipHeight = barHeight > 1 ? barHeight + flipBarHeight * flipWeight : 0

        flipBarHeights[i] = dropHeight >= minFlipHeight ? dropHeight : maxFlipHeight

        //偷懒，不做下落过程的其他过渡色啦
        let flipBarColor = dropHeight >= minFlipHeight ? `${spectrumColor}88` : `${spectrumColor}aa`
        flipBarColor = dropHeight > (barHeight + flipBarHeight * 5 + 1) ? flipBarColor : `${spectrumColor}66`

        canvasCtx.fillStyle = flipBarColor
        canvasCtx.strokeStyle = flipBarColor

        const flipY = (cHeight - flipBarHeights[i])
        canvasCtx.fillRect(x, flipY, barWidth, flipBarHeight)
        canvasCtx.strokeRect(x, flipY, barWidth, flipBarHeight)

        x += barWidth + spacing
    }
}



/* 插件接入规范区 */
//插件启用
export const activate = () => {
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理函数
   */
  register(APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Activated ] 频谱 - 跳动方块')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 跳动方块')
}
