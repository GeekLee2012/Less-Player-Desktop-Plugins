/**
 * @name 电波平台 - RadioLiveUK
 * @version 1.0.0
 * @author WhoamI
 * @about List of the best free online radio stations from the UK. Listen to your favorite radio live in good quality. <br>收录英国大多数广播电台，由于国内网络因素可能体验不佳。
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, getImageUrlByQuality, toLowerCaseTrimString, } = utils
const { hmacMd5, randomTextDefault, md5 } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson, parseHtml } = nets
const { APIPermissions, access } = permissions




class RadioLiveUK {
    static CODE = 'radioliveuk'
    static ALL_GENRES = ''
    static BASE_URL = 'https://radio-live-uk.com'

    //全部电台分类
    static radioCategories() {
        return RadioLiveUK.fmRadioCategories()
    }

    static radioSquare(cate, offset, limit, page, order) {
        return RadioLiveUK.fmRadioSquare(cate, offset, limit, page, order)
    }


    static transformCateName(name) {
        const mappings = {
            'by formats:': '风格',
            'formats': '风格',
            'format': '风格',
            'markets': '地方',
            'states': '州名',
            'categories': '分类',
            'location': '地区',
            'by cities:': '城市',
            'by countries:': '地区',
        }
        return mappings[toLowerCaseTrimString(name)] || '其他'
    }

    //全部电台分类
    static fmRadioCategories() {
        return new Promise((resolve, reject) => {
            const url = `${RadioLiveUK.BASE_URL}`
            getDoc(url).then(doc => {
                const result = { platform: RadioLiveUK.CODE, data: [], orders: [], isWhiteWrap: true  }
                
                const list = doc.querySelectorAll('.content-tags div') || []
                if(list.length < 1) return resolve(result)

                const recommandCate = new Category('推荐')
                result.data.push(recommandCate)
                const sectionList = doc.querySelectorAll('.section .h2_link') || []
                sectionList.forEach(item => {
                    const key = item.querySelector('h2').textContent
                    const alEl = item.querySelector('a')
                    const value = alEl && alEl.getAttribute('href')
                    if(key && value) recommandCate.add(key, { key, value })
                })

                list.forEach(item => {
                    const name = item.querySelector('p').textContent
                    const liEls = item.querySelectorAll('li') || []

                    const cate = new Category(RadioLiveUK.transformCateName(name))
                    result.data.push(cate)

                    liEls.forEach(item => {
                        const aEl = item.querySelector('a')
                        const key = toTrimString(aEl.textContent)
                        let value = toTrimString(aEl.getAttribute('href'))
                        if(value.startsWith('../../../')) {
                            value = value.substring(8)
                        } else if(value.startsWith('../../')) {
                            value = value.substring(5)
                        } else if(value.startsWith('../')) {
                            value = value.substring(2)
                        }
                        cate.add(key, { key, value })
                    })
                })

                resolve(result)
            })
        })
    }

    static fmRadioSquare(cate, offset, limit, page, order) {
        const { key: cateName, value: cateValue }  = cate || {}
        return new Promise((resolve, reject) => {
            if(!cateValue) return

            const result = { platform: RadioLiveUK.CODE, cate, offset, limit, page, total: 0, data: [] }
            
            result.total = 100
            const pageParam = (page > 1 ? `?page=${page}` : '')
            const url = `${RadioLiveUK.BASE_URL}${cateValue}${pageParam}`
            getDoc(url).then(doc => {
                let list = doc.querySelectorAll('.list_radios .radios-table-sort') || []
                if(list.length < 1) list = doc.querySelectorAll('#radios li') || []
                list.forEach(item => {
                    const aEl = item.querySelector('a')
                    const coverEl = item.querySelector('img')
                    if(!aEl || !coverEl) return
                    const name = aEl.getAttribute('title') || coverEl.getAttribute('alt')
                    const imgSrc = coverEl.getAttribute('src')
                    const cover = `${RadioLiveUK.BASE_URL}${imgSrc}`

                    const id = md5(name)
                    const playlist = new Playlist(id, RadioLiveUK.CODE, cover, name)
                    playlist.type = Playlist.FM_RADIO_TYPE
                    playlist.coverFit = 0 //封面 - 显示方式
                    playlist.url = RadioLiveUK.BASE_URL + aEl.getAttribute('href')

                    const artist = [{ id: '', name: 'RadioLiveUK' }]
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
                const urlEls = doc.querySelectorAll('#player #stream source') || []
                if(urlEls.length > 0) {
                    const url = urlEls[0].getAttribute('src') || ''
                    Object.assign(track, { url })
                    //重新校验streamType
                    if(url.endsWith('.m3u8') || url.indexOf('.m3u8?')) {
                        Object.assign(track, { streamType: 0 })
                    }
                }
                resolve(track)
            })
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: RadioLiveUK.CODE, lyric: new Lyric(), trans: null })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, {
    code: RadioLiveUK.CODE,
    vendor: RadioLiveUK,
    name: 'RadioLiveUK',
    shortName: 'RUK',
    online: true,
    types: ['fm-radios'],
    scopes: ['radios', 'userhome'],
    weight: 5
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)
 
  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: RadioLiveUK.CODE,
    hosts: ['radio-live-uk'],
    defaultHeaders: {
        //Origin: 'https://radio-live-uk.com/',
        Referer: 'https://radio-live-uk.com/',
    },
    includes: [{
        pattern: 'files.bbci.co.uk',
        headers: {
            Origin: 'https://radio-live-uk.com/',
            Referer: 'https://radio-live-uk.com/',
        }
    }]
  })

  console.log('[ PLUGIN - Activated ] 电波平台 - RadioLiveUK')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, RadioLiveUK.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, RadioLiveUK.CODE)
  console.log('[ PLUGIN - Deactivated ] 电波平台 - RadioLiveUK')
}