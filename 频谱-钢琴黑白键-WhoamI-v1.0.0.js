/**
 * @name 频谱 - 钢琴黑白键
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { utils, events } = window.lessAPI
const { nextInt } = utils
const { APIEvents, register, unregister } = events



/* 自由开发代码区 */
class WhiteKey {
    constructor(name, tone, x, y, width, height, arcRadius) {
        this.name = name
        this.tone = tone
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.arcRadius = arcRadius
    }

    draw(ctx) {
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x, this.y + this.height - this.arcRadius)
        ctx.arcTo(this.x, this.y + this.height,  this.x + this.arcRadius, this.y + this.height ,this.arcRadius)
        ctx.lineTo(this.x + this.width - 2 * this.arcRadius, this.y + this.height)
        ctx.arcTo(this.x + this.width, this.y + this.height, this.x + this.width, this.y + this.height - this.arcRadius, this.arcRadius)
        //ctx.lineTo(this.x + this.width, this.y)
        ctx.stroke()
    }

    fill(ctx) {
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x, this.y + this.height - this.arcRadius)
        ctx.arcTo(this.x, this.y + this.height,  this.x + this.arcRadius, this.y + this.height ,this.arcRadius)
        ctx.lineTo(this.x + this.width - 2 * this.arcRadius, this.y + this.height)
        ctx.arcTo(this.x + this.width, this.y + this.height, this.x + this.width, this.y + this.height - this.arcRadius, this.arcRadius)
        ctx.lineTo(this.x + this.width, this.y)
        ctx.closePath()
        ctx.stroke()
        ctx.fill()
    }
}

class BlackKey {
    constructor(name, tone, x, y, width, height) {
        this.name = name
        this.tone = tone
        this.x = x
        this.y = y
        this.width = width
        this.height = height
    }

    draw(ctx) {
        ctx.fillRect(this.x, this.y, this.width, this.height)
    }
}


const drawSpectrum = (canvas, { freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke, isSimpleLayoutMode }) => {
    const { width: cWidth, height: cHeight } = canvas

    const canvasCtx = canvas.getContext("2d")
    canvasCtx.clearRect(0, 0, cWidth, cHeight)

    canvasCtx.fillStyle = 'transparent'
    canvasCtx.fillRect(0, 0, cWidth, cHeight)

    canvasCtx.lineWidth = 0.5
    canvasCtx.fillStyle = '#ffffff'
    canvasCtx.strokeStyle = '#333333'
    //canvasCtx.shadowBlur = 3
    //canvasCtx.shadowColor = stroke

    //简约布局，设置不一样的大小
    const arcRadius = 4
    const wkw = isSimpleLayoutMode ? 16 : 13
    const wkh = cHeight - 3
    const bkw = isSimpleLayoutMode ? (wkw * 9 / 13) : 9
    const bkh = wkh * 0.618

    let wkeyFill = 0, bkeyFill = 0
    for (var i = 0; i < 52; i++) {
        canvasCtx.fillStyle = '#ffffff'
        const wkey = new WhiteKey(i, i, i * wkw, 0, wkw, wkh, arcRadius)
        wkey.draw(canvasCtx)
        wkey.fill(canvasCtx)

        if(i < 1) continue
        let x = 0, j = (i - 3)
        if(i == 1) {
            x = i * wkw - bkw / 2
        } else if(j % 7 == 1 || j % 7 == 2 || j % 7 == 4 || j % 7 == 5 || j % 7 == 6) {
            x = (i - 1) * wkw - bkw / 2
        } else {
            continue
        }
        canvasCtx.fillStyle = '#000000'
        const bkey = new BlackKey(i, i, x, 0, bkw, bkh)
        bkey.draw(canvasCtx)

        if(i * wkw >= cWidth) break
    }

    canvasCtx.strokeStyle = '#333333'
    canvasCtx.beginPath()
    canvasCtx.moveTo(0, wkh - arcRadius + 1)
    canvasCtx.lineTo(0, 0)
    canvasCtx.lineTo(cWidth, 0)
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
  console.log('[ PLUGIN - Activated ] 频谱 - 钢琴黑白键')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 钢琴黑白键')
}
