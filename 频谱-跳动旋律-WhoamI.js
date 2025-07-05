/**
 * @name 频谱 - 跳动旋律
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { constants, events, permissions } = lessAPI
const { LESS_IMAGE_PREFIX, DEFAULT_COVER_BASE64 } = constants
const { APIEvents, register, } = events
const { getCurrentTrack, getSpectrumParams } = permissions



/* 自由开发代码区 */
let cachePlugin = null
const setCachePlugin = (plugin) => (cachePlugin = plugin)
const p5 = require('p5')

//参考： https://zhuanlan.zhihu.com/p/104453007
let album = null, cacheTrack = null, isDefaultCover = true
//唱片圆形半径
let r = 156, ratio = 1
//坐标轴旋转角度
let albumTheta = 0.0  
//动效颜色
let c, c1, c2
//每份分割数对应的采样频率数
const step = 8
//圆分割的数目
const num = 16

const isTrackEquals = (t1, t2) => {
    if(!t1 || !t2) return false
    return t1.id == t2.id 
        && t1.platform == t2.platform
}

let canvasCreated = false
const createCanvas = (sketch, containerEl) => {
    const { clientWidth, clientHeight } = containerEl
    if(clientWidth > 0 && clientHeight > 0 && !canvasCreated) {
        sketch.createCanvas(clientWidth, clientHeight)
        canvasCreated = true
    }
}

//圆形唱片图片
const loadAlbum = async (sketch) =>  {
    const track = await getCurrentTrack(cachePlugin)
    if(!track) return 
    if(isTrackEquals(cacheTrack, track)) return 
    const { cover } = track 
    if(!cover) return
    if(cover.startsWith(LESS_IMAGE_PREFIX)) {
        album = sketch.loadImage(DEFAULT_COVER_BASE64)
        isDefaultCover = true
        return
    } 
    cacheTrack = track
    c1 = null
    c2 = null
    c = null

    //图片导入模式为中点
    sketch.imageMode(sketch.CENTER)     
    album = sketch.loadImage(cover, img => {
        //将图片长宽放缩为两倍半径
        img.resize(2 * r, 2 * r)
        isDefaultCover = false
    }, event => {
        album = sketch.loadImage(DEFAULT_COVER_BASE64)
        isDefaultCover = true
    })
}

//唱片边框
const albumBorder = (sketch, stroke, width) => {
    sketch.stroke(stroke)
    sketch.noFill()
    sketch.strokeWeight(width || 1)
    sketch.ellipse(0, 0, r * 2, r * 2)
}

const initColor = (sketch, spectrumColor) => {
    //提取唱片中的颜色
    if(!c1) c1 = sketch.color(spectrumColor) || album.get(0, 0)
    //白色透明
    if(!c2) c2 = sketch.color(360, 1, 100, 1)  
    //将从唱片中心点提取的颜色变透明
    if(!c) c = sketch.color(sketch.red(c1), sketch.green(c1), sketch.blue(c1), 100)
}

//左/右声道线条
const lineJump = (sketch, freqData, l, alpha) => {
    //创建数组储存点
    const points = [] 
    //每份圆弧的角度
    const rTheta = 2 * sketch.PI / num         
    //初始化点的坐标，绕着唱片图案间隔20
    const padding = 10
    for (let i = 0; i < num; i++) {
        const a = (r + padding) * sketch.cos(rTheta * i)
        const b = (r + padding) * sketch.sin(rTheta * i)
        const point = new p5.Vector(a, b)
        points.push(point)
    }

    //当提取的音乐强度绝对值大于0.01时，abs(freqData / 256) > 0.01，我们赋予点2、3、4、5振动的能力
    const percent = sketch.abs(freqData[0] / 256)
    if (percent > 0.2) {
        l = l / 2
        for (let i = 1; i < 6; i++) {
            const a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
            const b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
            const point = new p5.Vector(a, b)
            points.push(point)
        }
    }
  
    if (percent > 0.4) {
        l = l / 2
        let i = 9
        let a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
        let b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
        points[i] = new p5.Vector(a, b)

        i = 13
        a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
        b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
        points[i] = new p5.Vector(a, b)
    }
  
    if (percent > 0.5) {
        l = l / 2
        for (let i = 6; i < 10; i++) {
            const a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
            const b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
            points[i] = new p5.Vector(a, b)
        }
        for (let i = 13; i < 16; i++) {
            const a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
            const b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
            points[i] = new p5.Vector(a, b)
        }
        let i = 0
        const a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
        const b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
        points[i] = new p5.Vector(a, b)
    }
  
    if (percent > 0.6) {
        l = l / 2
        for (let i = 10; i < 13; i++) {
            const a = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.cos(rTheta * i)
            const b = (r + padding + sketch.abs(freqData[i * step]) / 256 * l) * sketch.sin(rTheta * i)
            points[i] = new p5.Vector(a, b)
        }
    }

    const stroke = sketch.color(sketch.red(c1), sketch.green(c1), sketch.blue(c1), alpha)
    sketch.noFill()
    sketch.strokeWeight(2)
    sketch.stroke(stroke)
  
    //绘制图形
    sketch.beginShape()
    for (let i = 0; i < num; i++) {
        sketch.curveVertex(points[i].x, points[i].y)
    }
    //提取前三点
    for (let i = 0; i < 3; i++) {
        sketch.curveVertex(points[i].x, points[i].y)
    }
    sketch.endShape()
}

let visualCanvas =  {
    myp5: null,
    //插件已启用，且当前显示中
    mounted(containerEl) {
        if(this.myp5) return
        if(!containerEl) return
        containerEl.innerHTML = ''

        this.myp5 = new p5((sketch) => {
            sketch.setup = () => {
                createCanvas(sketch, containerEl)
                loadAlbum(sketch)
            }
    
            sketch.windowResized = () => {
                const { clientWidth, clientHeight } = containerEl
                sketch.resizeCanvas(clientWidth, clientHeight)

                ratio = clientWidth / 480
                r = 156 * ratio
                album.resize(2 * r, 2 * r)
            }

            sketch.draw = async () => {
                createCanvas(sketch, containerEl)
                if(!canvasCreated) return
                loadAlbum(sketch)

                const spectrumParams = await getSpectrumParams(cachePlugin)
                if(!spectrumParams) return

                const { isPlaying, leftFreqData, rightFreqData, freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke } = spectrumParams
                if(!isPlaying || !leftFreqData || !rightFreqData) return
                if(!album) return
                if(isDefaultCover) album.resize(2 * r, 2 * r)

                initColor(sketch, spectrumColor)

                sketch.clear()
                const { clientWidth, clientHeight } = containerEl
                const x0 = clientWidth / 2
                const y0 = clientHeight / 2
                //将坐标原点放在画布中心
                sketch.translate(x0, y0) 

                sketch.push()
                sketch.clip(() => {
                    sketch.circle(0, 0, 2 * r)
                })
                //坐标轴旋转
                sketch.rotate(albumTheta) 
                //绘制圆形图片 
                sketch.image(album, 0, 0)   
                sketch.pop()

                //albumBorder(sketch, stroke, 2)

                const lineRotate = sketch.PI
                sketch.rotate(lineRotate)
                //线条跳动
                lineJump(sketch, leftFreqData, 200, 100) 
                lineJump(sketch, rightFreqData, 300, 80)
                lineJump(sketch, rightFreqData, 150, 60)

                albumTheta += 0.01
            }
        }, containerEl)
    },
    //插件已启用，但非当前显示
    unmounted() {
        if(this.myp5) {
            this.myp5.remove()
            this.myp5 = null
        }
        cacheTrack = null
        album = null
        canvasCreated = false
        isDefaultCover = true
    }
}

/* 插件接入规范区 */
//插件启用
export const activate = (plugin) => {
  setCachePlugin(plugin)
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理对象
   */
  register(plugin, APIEvents.TRACK_VISUAL_CANVAS, visualCanvas)
  console.log('[ PLUGIN - Activated ] 频谱 - 跳动旋律')
}

//插件停用
export const deactivate = (plugin) => {
  setCachePlugin(null)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 跳动旋律')
}
