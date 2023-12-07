/**
 * @name 频谱 - 钢琴黑白键（乱弹版）
 * @version 1.0.0
 * @author WhoamI
 * @about Demo
 * @repository 
 */

/* 默认提供的插件API */
const { utils, events } = window.lessAPI
const { nextInt } = utils
const { APIEvents, register, unregister } = events



/* 自由开发代码区 */
class WhiteKey {
    constructor(name, tone, x, y, width, height) {
        this.name = name
        this.tone = tone
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.arcRadius = 4
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
        this.arcRadius = 4
    }

    draw(ctx) {
        ctx.fillRect(this.x, this.y, this.width, this.height)
    }
}


let count = 0
const drawSpectrum = (canvas, { freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke }) => {
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

    canvasCtx.beginPath()
    canvasCtx.moveTo(0, 0)
    canvasCtx.lineTo(cWidth, 0)
    canvasCtx.stroke()

    const wkw = 13
    const wkh = cHeight - 3
    const bkw = 9
    const bkh = wkh * 0.618
    ++count
    let wkeyFill = 0, bkeyFill = 0
    for (var i = 0; i < 52; i++) {
        canvasCtx.fillStyle = '#ffffff'
        const wkey = new WhiteKey(i, i, i * wkw, 0, wkw, wkh)
        wkey.draw(canvasCtx)
        if((nextInt(100) % 30 == 3 || nextInt(100) % 30 == 5 || nextInt(100) % 30 == 7) 
            && (count % 20 == 0) && wkeyFill < 4) {
            canvasCtx.fillStyle = spectrumColor
            wkey.fill(canvasCtx)
            ++wkeyFill
        }

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
        if((nextInt(100) % 30 == 3 || nextInt(100) % 30 == 5 || nextInt(100) % 30 == 7) 
            && (count % 20 == 0) && bkeyFill < 2) {
            canvasCtx.fillStyle = stroke
            ++bkeyFill
        }
        bkey.draw(canvasCtx)
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
  console.log('[ PLUGIN - Activated ] 频谱 - 钢琴黑白键（乱弹版）')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_DRAW_SPECTRUM, drawSpectrum)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 钢琴黑白键（乱弹版）')
}
