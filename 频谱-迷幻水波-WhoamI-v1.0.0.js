/**
 * @name 频谱 - 迷幻水波
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { constants, utils, events, permissions } = lessAPI
const { LESS_IMAGE_PREFIX, DEFAULT_COVER_BASE64 } = constants
const { nextInt } = utils
const { APIEvents, register, unregister } = events
const { APIPermissions, access } = permissions



/* 自由开发代码区 */
const p5 = require('p5')

//参考： https://zhuanlan.zhihu.com/p/104271430
let album = null, cacheTrack = null, isDefaultCover = true
//唱片圆形半径
let r = 156, ratio = 1
//坐标轴旋转角度
let albumTheta = 0.0  
//动效颜色
let c, c1, c2
//小球集合
const balls = []
//小球初始半径
let ballRadius = 20
//水波纹半径
const curveRadius = 56

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


class Ball {         
    constructor(sketch, ballTheta, ballRadius, r) {
        //运动角度
        this.ballTheta = ballTheta
        //半径
        this.ballRadius = ballRadius
        //唱片半径
        this.r = r
         //位置
        this.ballLocation = new p5.Vector(r * sketch.cos(ballTheta), r * sketch.sin(ballTheta))
        //运动速度
        this.speed = new p5.Vector(sketch.cos(ballTheta) * 2, sketch.sin(ballTheta) * 2)
        //生命周期
        this.lifespan = 50
    }

    //展示小球，更新 
    display(sketch) {
        sketch.noStroke()
        sketch.fill(c)
        sketch.ellipse(this.ballLocation.x, this.ballLocation.y, this.ballRadius, this.ballRadius)
        this.ballLocation.add(this.speed)
        this.ballRadius *= 0.99
        this.lifespan -= 1.0
    }

    //判定小球是否应当消失 
    isDead() {
        return this.lifespan <= 0.0
    }
}

const createBall = (sketch) =>  {
    //骰子随机生成数字
    const dice = nextInt(10)
    if (dice == 1) {
        const ballTheta = sketch.random(0, 2 * sketch.PI)
        balls.push(new Ball(sketch, ballTheta, ballRadius, r))
    }
  
    //循环绘制小球, 并消除部分小球
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i]
        if (balls[i].isDead()) {
            balls.splice(i, 1)
            continue
        }
        ball.display(sketch)
    }
}

//左声道水波
const leftChannelCurve = (sketch, freqData) => {
    //创建点的集合
    const points = []  
    const r0 = 100, dataLen = 50
    for (let i = 0; i < dataLen; i++) {
        const rTheta = sketch.map(i, 0, dataLen, 0, 2 * sketch.PI)
        const l = (freqData[i + 10] - r0) / (256 - r0) * curveRadius
        const v = (r + 10 + l)
        const point = new p5.Vector(v * sketch.cos(rTheta), v * sketch.sin(rTheta))
        points.push(point)
    }

    sketch.fill(c)
    sketch.noStroke()

    sketch.beginShape()
    
    for (let i = 0; i < points.length; i++) {
        const point = points[i]
        sketch.curveVertex(point.x, point.y)
    }

    for (let i = 0; i < 3; i++) {
        const point = points[i]
        sketch.curveVertex(point.x, point.y)
    }
    sketch.endShape()
}

//右声道水波
const rightChannelCurve = (sketch, freqData) => {
    //创建点的集合
    const points = []  
    const r0 = 100, dataLen = 25
    for (let i = 0; i < dataLen; i++) {
        const rTheta = sketch.map(i, 0, dataLen, 0, 2 * sketch.PI)
        const l = (freqData[i * 3 + 15] - r0) / (256 - r0) * curveRadius * 0.387
        const v = (r + 5 + l)
        const point = new p5.Vector(v * sketch.cos(rTheta), v * sketch.sin(rTheta))
        points.push(point)
    }

    sketch.fill(c)
    sketch.noStroke()

    sketch.beginShape()
    
    for (let i = 0; i < points.length; i++) {
        const point = points[i]
        sketch.curveVertex(point.x, point.y)
    }

    for (let i = 0; i < 3; i++) {
        const point = points[i]
        sketch.curveVertex(point.x, point.y)
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
                if(album) album.resize(2 * r, 2 * r)
            }

            sketch.draw = async () => {
                createCanvas(sketch, containerEl)
                if(!canvasCreated) return
                loadAlbum(sketch)

                const spectrumParams = await access(APIPermissions.TRACK_SPECTRUM_PARAMS)
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

                //小球
                createBall(sketch)
                //左声道水波
                leftChannelCurve(sketch, leftFreqData)
                //右声道水波
                rightChannelCurve(sketch, rightFreqData)

                sketch.push()
                sketch.clip(() => {
                    sketch.circle(0, 0, 2 * r)
                })
                //坐标轴旋转
                sketch.rotate(albumTheta) 
                //绘制圆形图片 
                sketch.image(album, 0, 0)   
                sketch.pop()

                albumBorder(sketch, stroke, 2)

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
  console.log('[ PLUGIN - Activated ] 频谱 - 迷幻水波')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_VISUAL_CANVAS, visualCanvas)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 迷幻水波')
}
