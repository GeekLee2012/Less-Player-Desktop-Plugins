/**
 * @name 开发者 - 视频平台 - Demo
 * @version 1.0.0
 * @author WhoamI
 * @about 本插件无法直接使用，为开发者Demo插件，普通用户请不要安装本插件
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { isBlank, toTrimString, nextInt, toMillis, toYmd, getImageUrlByQuality, 
    escapeHtml, transformUrl, parseXML, buildXML, 
} = utils
const { md5, randomText, rsaEncrypt, aesDecryptText, aesEncryptDefault, aesEncryptHexText, } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson, } = nets
const { APIPermissions, access } = permissions





const setupCookie = async () => {
    const cookie = await access(APIPermissions.GET_COOKIE, 'https://www.demo.com', true)
    //其他处理逻辑

}

//流程调用逻辑是由播放器控制的，插件只需填充流程涉及的相关函数（方法）
//主要流程说明
//【搜索播放】
//searchVideos() => videos (视频列表)
//               -> video (vcType = 0) => 播放视频 =>videoDetail()
//               -> video (vcType = 1) => videoCollectionDetail() => 播放合集中的单个视频 => videoDetail()
//
//【解析播放】
//canExtractVideo() => fasle => 解析失败，直接返回
//                  => true => extracVideo() => 其余流程同searchVideos()
//【视频播放】
//videoDetail() => onSetVideo() => 视频播放
class Demo {
    static CODE = 'demo'

    //搜索: 视频
    static searchVideos(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: Demo.CODE, offset, limit, page, data: [] }
            //视频对象属性
            const video = {
                id,
                vid: id,    //部分平台在后续获取数据时，需要vid（不一定等同于id）
                platform: Demo.CODE,
                type: Playlist.VIDEO_TYPE,
                title,
                cover,      //非必须
                subtitle,   //非必须
                duration,   //非必须，单位为ms
                playCount,  //非必须

                //非必须，视频合集类型Video Collection
                //取值：0 => 非合集，普通视频；1 => 合集；空值 => 未知
                //空值：即vcType为null，或undefined
                //当取值为空值时，程序会优先按合集类型处理；若确定为普通视频，请显示设置取值为0
                //视频合集：包括视频合集（如Bilibili）、动漫番剧、电视剧、综艺等
                vcType,

                //非必须，当vcType为1时的附加属性，数组元素为video对象
                //当data属性相关的数据无法直接获取时，可不设置该属性
                //然后，通过videoCollectionDetail()方法获取相关
                data: [], 
            }
            result.data.push(video)

            resolve(result)
        })
    }

    //视频合集详情
    //触发场景：searchVideos()返回结果中，存在某个视频vcType属性为1时，
    //在播放器中点击播放该视频后触发，以获取视频合集的详情信息
    static videoCollectionDetail(id, video) {
        return new Promise(async (resolve, reject) => {
            //主要场景：填充video对象的data属性
            //video.data.push(videoItem)
            //videoItem为视频对象（非合集），属性参见searchVideos()

            //数据结构补充说明：
            //视频合集video = { 
            //  type: Playlist.VIDEO_TYPE, 
            //  vcType: 1, 
            //  data: [非合集video1, ..., 非合集videoN]
            //}
            resolve(video)
        })
    }

    //视频播放详情：url、cover等
    static videoDetail(id, video) {
        return new Promise(async (resolve, reject) => {
            //video为单个视频，即如果为
            return resolve(video)
        })
    }


    static canExtractVideo(url) {
        return new Promise((resolve, reject) => {
            //返回boolean类型
            resolve(false)
        })
    }


    static extractVideo(url) {
        return new Promise((resolve, reject) => {
            const video = {
                id: aid,
                vid: bvid,
                platform: Demo.CODE,
                type: Playlist.VIDEO_TYPE,  
                title,  
                cover,      //非必须
                subtitle,   //非必须
                duration,   //非必须
                //其他属性，参见searchVideos()
            }
            resolve(video)
        }) 
    }

    //视频被设置为当前播放时触发
    //通常用来设置请求头，避免被平台反爬策略阻止视频播放
    static onSetVideo = (video) => {
        appendRequestHandler({
            includes: [{
                pattern: '.demo.com',
                headers: {
                    Origin: origin,
                    Referer: referer
                }
            }]
        })
    }

}


//追加模式，添加请求头
const appendRequestHandler = (options) => {
    if(!options) return 
    access(APIPermissions.UPDATE_REQUEST_HANDLER, {
        id: Demo.CODE,
        appendMode: true,
        ...options
    })
}


/* 插件接入规范区 */
//插件启用
export const activate = async () => {
    //添加平台
    access(APIPermissions.ADD_PLATFORM, { 
        code: Demo.CODE,
        vendor: Demo,
        name: 'Demo',
        shortName: 'DM',
        online: true,
        types: ['videos'],
        scopes: ['search', 'video-extract'],
        artistTabs: [ ],
        searchTabs: [ 'videos' ],
        weight: 3
    })

    //设置cookie
    setupCookie()

    //覆盖模式，添加请求头
    access(APIPermissions.ADD_REQUEST_HANDLER, {
        id: Demo.CODE,
        hosts: ['demo.'],
        defaultHeaders: {
            Origin: 'https://www.demo.com',
            Referer: 'https://www.demo.com'
        },
    })

    console.log('[ PLUGIN - Activated ] 开发者 - 视频平台 - Demo')
}

//插件停用
export const deactivate = () => {
    //归还权限
    access(APIPermissions.REMOVE_PLATFORM, Demo.CODE)
    access(APIPermissions.REMOVE_REQUEST_HANDLER, Demo.CODE)
    console.log('[ PLUGIN - Deactivated ] 开发者 - 视频平台 - Demo')
}