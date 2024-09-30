/**
 * @name 电波平台 - RadioSpinner
 * @version 1.0.0
 * @author WhoamI
 * @about Radio online: listen to the best live radio stations for free. <br>一个免费的纯外语、在线歌单型电台，由于国内网络因素可能体验不佳。
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, getImageUrlByQuality, } = utils
const { hmacMd5, randomTextDefault, md5 } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson, parseHtml } = nets
const { APIPermissions, access } = permissions




class RadioSpinner {
    static CODE = 'radiospinner'
    static ALL_GENRES = '/stations'
    static BASE_URL = 'https://radiospinner.com'

    //全部电台分类
    static radioCategories() {
        return RadioSpinner.fmRadioCategories()
    }

    static radioSquare(cate, offset, limit, page, order) {
        return RadioSpinner.fmRadioSquare(cate, offset, limit, page, order)
    }

    //全部电台分类
    static fmRadioCategories() {
        return new Promise((resolve, reject) => {
            const url = `${RadioSpinner.BASE_URL}/stations`
            getDoc(url).then(doc => {
                const result = { platform: RadioSpinner.CODE, data: [], orders: [], isWhiteWrap: true  }
                
                const list = doc.querySelectorAll('.genres-list a') || []
                const cate = new Category('电台')
                result.data.push(cate)

                const allGenresName = 'All genres'
                if(list.length > 0) {
                    cate.add(allGenresName, { key: allGenresName, value: RadioSpinner.ALL_GENRES })
                
                    const orderList = doc.querySelectorAll('.genre-page .ordering .ordering-button') || []
                    orderList.forEach(item => {
                        const key = toTrimString(item.textContent)
                        const value = toTrimString(item.dataset.order || '')
                        if(key && value) result.orders.push({ key, value })
                    })
                }

                list.forEach(item => {
                    const key = toTrimString(item.textContent).replace('#', '')
                    const value = toTrimString(item.getAttribute('href'))
                    cate.add(key, { key, value })
                })
                resolve(result)
            })
        })
    }

    static fmRadioSquare(cate, offset, limit, page, order) {
        const { key: cateName, value: cateValue }  = cate || {}
        return new Promise((resolve, reject) => {
            if(!cateValue) return

            const result = { platform: RadioSpinner.CODE, cate, offset, limit, page, total: 0, data: [] }
            order = order || 'popular'

            result.total = 100
            const url = `${RadioSpinner.BASE_URL}${cateValue}?page=${page}&order=${order}`
            getDoc(url).then(doc => {
                const list = doc.querySelectorAll('.stations-list .station-in-list-small')
                list.forEach(item => {
                    const coverEl = item.querySelector('.station-in-list-logo')
                    const name = item.querySelector('.station-in-list-title').textContent
                    const imgSrc = coverEl.dataset.src || coverEl.getAttribute('src')
                    const cover = `${RadioSpinner.BASE_URL}${imgSrc}`

                    const id = md5(name)
                    const playlist = new Playlist(id, RadioSpinner.CODE, cover, name)
                    playlist.type = Playlist.FM_RADIO_TYPE
                    playlist.coverFit = 0 //封面 - 显示方式
                    playlist.url = RadioSpinner.BASE_URL + item.getAttribute('href')

                    const artist = [{ id: '', name: 'RadioSpinner' }]
                    const album = { id: '', name: cateName }
                    const channelTrack = new Track(id, playlist.platform, name, artist, album, 0, cover)
                    //channelTrack.url = ''
                    channelTrack.type = playlist.type
                    channelTrack.streamType = 1 //普通音频Live

                    playlist.addTrack(channelTrack)
                    result.data.push(playlist)
                })
                resolve(result)
            })
        })
    }

    //歌曲播放详情：url、cover等
    static playDetail(id, track) {
        return new Promise(async (resolve, reject) => {
            const { purl } = track
            if(!purl) return resolve(track)

            getDoc(purl).then(doc => {
                const list = doc.querySelectorAll('.player-block .quality-selector') || []
                const qualityUrls = []
                list.forEach(item => {
                    const { quality } = item.dataset
                    if(quality) qualityUrls.push(quality)
                })
                if(qualityUrls.length > 0) {
                    const url = qualityUrls.length > 1 ? qualityUrls[1] : qualityUrls[0]
                    resolve(Object.assign(track, { url }))
                }
            })
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: RadioSpinner.CODE, lyric: new Lyric(), trans: null })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, {
    code: RadioSpinner.CODE,
    vendor: RadioSpinner,
    name: 'RadioSpinner',
    shortName: 'RS',
    online: true,
    types: ['fm-radios'],
    scopes: ['radios', 'userhome'],
    weight: 5
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)
 
  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: RadioSpinner.CODE,
    hosts: ['radiospinner'],
    defaultHeaders: {
        //Origin: 'https://radiospinner.com/',
        Referer: 'https://radiospinner.com/',
    }
  })

  console.log('[ PLUGIN - Activated ] 电波平台 - RadioSpinner')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, RadioSpinner.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, RadioSpinner.CODE)
  console.log('[ PLUGIN - Deactivated ] 电波平台 - RadioSpinner')
}