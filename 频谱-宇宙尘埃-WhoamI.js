/**
 * @name 频谱 - 宇宙尘埃
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

//参考： https://zhuanlan.zhihu.com/p/104681465
let album = null, cacheTrack = null, isDefaultCover = true
//唱片圆形半径
let r = 156, ratio = 1
//坐标轴旋转角度
let albumTheta = 0.0  
//动效颜色
let c, c1, c2
//粒子集合
const particles = []
//每帧生成粒子的数量
const num = 512, maxNum = 2048

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


class Particle {
    constructor(sketch, ptheta, lifespan, size) {
        //产生角度
        this.ptheta = ptheta
        //位置，根据角度产生初始位置
        this.position = new p5.Vector(r * sketch.cos(ptheta), r * sketch.sin(ptheta))
        this.distance = 0
        //运动速度，根据角度产生运动速度，往外扩散
        this.speed = new p5.Vector(sketch.cos(ptheta) * sketch.random(-1, 1), sketch.sin(ptheta) * sketch.random(-1, 1))
        //透明度
        this.alpha = 100  
        //粒子颜色，提取专辑颜色并修改透明度
        this.c = sketch.color(sketch.hue(c1), sketch.saturation(c1), sketch.brightness(c1), this.alpha)
        //生命周期 
        this.lifespan = lifespan
        //大小
        this.size = size
    }

    //粒子绘制及更新
    run(sketch) {
      this.display(sketch)
      this.update(sketch)
    }

    //运动更新
    update(sketch) {
        this.position.add(this.speed)
        //根据距离计算透明度，越远越透明
        this.alpha = sketch.map(this.lifespan, 0,this.lifespan, 0, 100)  
        //更新粒子的颜色
        this.c = sketch.color(sketch.hue(c), sketch.saturation(c), sketch.brightness(c), this.alpha) 
        this.lifespan -= 0.05
        //提取粒子到原点距离
        this.distance = sketch.mag(this.position.x, this.position.y)
    }
    
    //绘制粒子
    display(sketch) {
        sketch.noStroke()
        sketch.fill(c1)
        //为了观察方便先将半径增大
        sketch.ellipse(this.position.x, this.position.y, this.size, this.size)
    }
}

const createParticle = (sketch) => {
    if(particles.length >= maxNum) return
    const len = Math.min(num, (maxNum - particles.length))
    //因为每次产生粒子少效果不好，所以用循环增加每帧产生粒子的数量
    for (let i = 0; i < len; i++) {
        //随机生成初始角度
        const ptheta = sketch.map(i, 0, len, 0, 2 * sketch.PI)
        //生命值
        const lifespan = 100                      
        //产生新的粒子 
        const p = new Particle(sketch, ptheta, lifespan, 2)
        //将粒子放入集合之中
        particles.push(p)
    }
}

const runParticle = (sketch) => {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        //绘制粒子
        p.run(sketch)

        //随机生成数字
        const rNum = sketch.random(0, 1) 
        //随机生成的数字小于（距离 / 最大距离）
        if (rNum < (100 - p.lifespan) / 100 || p.lifespan < 0 || p.distance < r) {  
            //移除粒子
            particles.splice(i, 1)   
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
                r = 156 * ratio
                if(album) album.resize(2 * r, 2 * r)
            }

            sketch.draw = async () => {
                createCanvas(sketch, containerEl)
                if(!canvasCreated) return
                loadAlbum(sketch)

                const spectrumParams = await getSpectrumParams(cachePlugin)
                if(!spectrumParams) return

                const { isPlaying, freqData, freqBinCount, sampleRate, analyser, spectrumColor, stroke } = spectrumParams
                if(!isPlaying || !freqData) return
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

                albumBorder(sketch, c, 3)

                 //产生粒子
                createParticle(sketch) 
                 //绘制粒子  
                runParticle(sketch)      

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
  console.log('[ PLUGIN - Activated ] 频谱 - 宇宙尘埃')
}

//插件停用
export const deactivate = (plugin) => {
  setCachePlugin(null)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 宇宙尘埃')
}
