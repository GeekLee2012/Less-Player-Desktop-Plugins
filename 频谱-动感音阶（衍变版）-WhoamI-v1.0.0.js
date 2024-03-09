/**
 * @name 频谱 - 动感音阶（衍变版）
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { constants, events, permissions, utils } = lessAPI
const { LESS_IMAGE_PREFIX, DEFAULT_COVER_BASE64 } = constants
const { APIEvents, register, unregister } = events
const { APIPermissions, access } = permissions
const { nextInt } = utils



/* 自由开发代码区 */
const p5 = require('p5')

//参考： https://zhuanlan.zhihu.com/p/104097992
let album = null, cacheTrack = null, isDefaultCover = true
//唱片圆形半径
let r = 156, ratio = 1
//坐标轴旋转角度
let albumTheta = 0.0  
//动效颜色
let c, c1, c2

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
    c1 = sketch.color(spectrumColor) || album.get(0, 0)
    //白色透明
    c2 = sketch.color(360, 1, 100, 1) 
}

const transformFrequencyData = (freqData) => {
    const limit = 10
    const data = Array.from(freqData).slice(limit)
    return data
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

                const spectrumParams = await access(APIPermissions.TRACK_SPECTRUM_PARAMS)
                if(!spectrumParams) return

                const { isPlaying, freqData, freqBinCount, leftFreqData, leftFreqBinCount, sampleRate, analyser, spectrumColor, stroke } = spectrumParams
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

                //albumBorder(sketch, stroke)

                //绘制动态音效
                sketch.stroke(c1) //线颜色
                sketch.strokeWeight(4)   //线粗
                const data = transformFrequencyData(freqData)
                const maxHeight = 56
                const transformedData = []
                for (let i = 0; i < 12; i++) {
                    transformedData[i] = data[20 + i * 8]
                }
                transformedData.push(...transformedData.slice().reverse())
                transformedData.push(...transformedData.slice().reverse())
                transformedData.push(...transformedData.slice().reverse())
                transformedData.push(...transformedData.slice().reverse())

                const baseHeight = 100
                const dataLen = transformedData.length
                for (let i = 0; i < dataLen; i++) {
                    //旋转角度
                    const rTheta = sketch.map(i, 0, dataLen - 1, -0.5 * sketch.PI,  1.5 * sketch.PI)  
                    sketch.push()
                    sketch.rotate(rTheta)
                    const height = (Math.abs(transformedData[i]) - baseHeight) / (255 - baseHeight) * maxHeight
                    sketch.line(0, r + 10, 0, r + 10 + Math.abs(height))
                    sketch.pop()
                }
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
  console.log('[ PLUGIN - Activated ] 频谱 - 动感音阶（衍变版）')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_VISUAL_CANVAS, visualCanvas)
  console.log('[ PLUGIN - Deactivated ] 频谱 - 动感音阶（衍变版）')
}
