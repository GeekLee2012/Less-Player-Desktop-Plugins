/**
 * @name 频谱 - 孤独星球
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { constants, events, permissions } = lessAPI
const { LESS_IMAGE_PREFIX, DEFAULT_COVER_BASE64 } = constants
const { APIEvents, register, unregister } = events
const { APIPermissions, access } = permissions



/* 自由开发代码区 */
const p5 = require('p5')

//参考： https://zhuanlan.zhihu.com/p/104482336
let album = null, cacheTrack = null, isDefaultCover = true
//唱片圆形半径
let r = 136, ratio = 1
//坐标轴旋转角度
let albumTheta = 0.0  
//动效颜色
let c, c1, c2
//星环
const starRings = []
//星环最近距离
const minDistance = 25, ringStep = 0.25
//循环帧数
let n = 0

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
    const track = await access(APIPermissions.TRACK_CURRENT_PLAYING)
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
    sketch.strokeWeight(width)
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


class StarRing {
    constructor(rStarRing, cRing, alpha, rStar, starTheta) {
        //星环半径
        this.rStarRing = rStarRing
        //星环颜色
        this.cRing = cRing
        //星环颜色透明度
        this.alpha = alpha
        //星球半径
        this.rStar = rStar || 10
        //星球出现的角度
        this.starTheta = starTheta
        //星环最大半径
        this.rStarMax = 233 * ratio
    }

     //绘制星环
   displayRing(sketch) {
        //星环半径大于rStarMax时消失
        if (this.rStarRing < this.rStarMax) {   
            //设置星环边缘颜色
            sketch.stroke(this.cRing)        
            sketch.noFill()
            //设置星环粗细
            sketch.strokeWeight(3)
            //绘制星环
            sketch.ellipse(0, 0, this.rStarRing * 2, this.rStarRing * 2)  
            //星环半径增加
            this.rStarRing += ringStep
            //星环透明度更新         
            this.alpha *= 0.9965

            if(this.rStarRing < this.rStarMax * 0.618) return
            //星环透明度更新
            this.cRing = sketch.color(sketch.red(c1), sketch.green(c1), sketch.blue(c1), this.alpha)
        }
    }

    displayStar(sketch) {
        if (this.rStarRing < this.rStarMax) {
            sketch.noStroke()
            sketch.fill(this.cRing)
            //绘制星球
            sketch.ellipse(this.rStarRing * sketch.cos(this.starTheta), this.rStarRing * sketch.sin(this.starTheta), this.rStar, this.rStar)
            //星球逆时针旋转
            this.starTheta -= 0.015
            //星球逐渐变小
            this.rStar *= 0.999
            sketch.noFill()
        }
    }
}

const createStarRing = (sketch, freqData) => {
    //星环半径
    const rStarRing = r
    //星环透明度
    const alpha = 100
    const rStar = sketch.random(10, 20)
    const starTheta = sketch.random(0, 2 * sketch.PI)
    const cStar = c
  
    //两个星环最近距离为minDistance
    //频率大于0.2则绘制星环
    if (sketch.abs(freqData[0] / 255) > 0.2 && n++ % (1 / ringStep * minDistance) == 0) { 
        starRings.push(new StarRing(rStarRing, cStar, alpha, rStar, starTheta))
    }
}

//绘制星环
const drawStarRing = (sketch) =>{
    for (let i = 0; i < starRings.length; i++) {
      const nowRing = starRings[i]
      nowRing.displayRing(sketch)
      nowRing.displayStar(sketch)
      //删去半径过大的元素
      if (nowRing.rStarRing >= nowRing.rStarMax) {
        starRings.splice(i, 1)
      }
    }
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
                //sketch.translate(clientWidth / 2, clientHeight / 2)
                //sketch.colorMode(p5.HSB, 360, 100, 100, 100)
                loadAlbum(sketch)
            }
    
            sketch.windowResized = () => {
                const { clientWidth, clientHeight } = containerEl
                sketch.resizeCanvas(clientWidth, clientHeight)

                ratio = clientWidth / 480
                r = 136 * ratio
                if(album) album.resize(2 * r, 2 * r)
            }

            sketch.draw = async () => {
                createCanvas(sketch, containerEl)
                if(!canvasCreated) return
                loadAlbum(sketch)

                const spectrumParams = await access(APIPermissions.TRACK_SPECTRUM_PARAMS)
                if(!spectrumParams) return

                const { isPlaying, leftFreqData, leftFreqBinCount, sampleRate, analyser, spectrumColor, stroke } = spectrumParams
                if(!isPlaying || !leftFreqData) return
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

                albumBorder(sketch, stroke, 5)

                sketch.push()
                createStarRing(sketch, leftFreqData)
                drawStarRing(sketch)
                sketch.pop()
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
export const activate = () => {
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理对象
   */
  register(APIEvents.TRACK_VISUAL_CANVAS, visualCanvas)
  console.log('[ PLUGIN - Activated ] 频谱 - 孤独星球')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_VISUAL_CANVAS, visualCanvas)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 孤独星球')
}
