/**
 * @name 电波平台 - RadioStationUSA
 * @version 1.0.0
 * @author WhoamI
 * @about Radio Station USA. <br>收录美国大多数广播电台，由于国内网络因素可能体验不佳。
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


const getCoverByQuality = (url) => {
    if(!url) return ''

    return getImageUrlByQuality([
        url.replace('/radio/180/', '/radio/100/'),
        url.replace('/radio/180/', '/radio/100/'),
        url.replace('/radio/100/', '/radio/180/'),
        url.replace('/radio/100/', '/radio/180/'),
        url.replace('/radio/100/', '/radio/180/')
    ])
}



class RadioStationUSA {
    static CODE = 'radiostationusa'
    static BASE_URL = 'https://radiostationusa.fm'

    //全部电台分类
    static radioCategories() {
        return RadioStationUSA.fmRadioCategories()
    }

    static radioSquare(cate, offset, limit, page, order) {
        return RadioStationUSA.fmRadioSquare(cate, offset, limit, page, order)
    }


    static transformCateName(name) {
        const mappings = {
            'Local': '地方',
            'Formats': '风格',
            'States': '州名',
            'Categories': '分类',
            'Location': '地区',
            'Markets': '地方',
            'Format': '风格',
        }
        return mappings[name] || '其他'
    }

    //全部电台分类
    static fmRadioCategories() {
        return new Promise((resolve, reject) => {
            const url = `${RadioStationUSA.BASE_URL}/online`
            getDoc(url).then(doc => {
                const result = { platform: RadioStationUSA.CODE, data: [], orders: [], isWhiteWrap: true  }
                
                const list = doc.querySelectorAll('.filters li') || []
                if(list.length < 1) return resolve(result)

                const cateMetas = [], docPromises = []
                list.forEach(item => {
                    const aEl = item.querySelector('a')
                    const meta = {
                        name: aEl.textContent,
                        code: aEl.getAttribute('href'),
                    }
                    cateMetas.push(meta)
                    docPromises.push(getDoc(`${RadioStationUSA.BASE_URL}/${meta.code}`))
                })
                Promise.all(docPromises).then(docs => {
                    docs.forEach((doc, index) => {
                        const list = doc.querySelectorAll('.list-group-item') || []

                        const { name, code } = cateMetas[index]
                        const cate = new Category(RadioStationUSA.transformCateName(name), code)
                        result.data.push(cate)

                        list.forEach(item => {
                            const aEl = item.querySelector('a')
                            const key = toTrimString(aEl.textContent)
                            const value = toTrimString(aEl.getAttribute('href'))
                            cate.add(key, { key, value })
                        })

                    })
                    resolve(result)
                })
            })
        })
    }

    static fmRadioSquare(cate, offset, limit, page, order) {
        const { key: cateName, value: cateValue }  = cate || {}
        return new Promise((resolve, reject) => {
            if(!cateValue) return

            const result = { platform: RadioStationUSA.CODE, cate, offset, limit, page, total: 0, data: [] }
            

            result.total = 100
            const pageParam = (page > 1 ? `?page=${page}` : '')
            const url = `${RadioStationUSA.BASE_URL}/${cateValue}${pageParam}`
            getDoc(url).then(doc => {
                const list = doc.querySelectorAll('.content .panel')
                list.forEach(item => {
                    const aEl = item.querySelector('a')
                    const coverEl = item.querySelector('.media img')
                    if(!aEl || !coverEl) return
                    const name = coverEl.getAttribute('alt')
                    const imgSrc = coverEl.getAttribute('src')
                    const cover = `${RadioStationUSA.BASE_URL}/${imgSrc}`

                    const id = md5(name)
                    const playlist = new Playlist(id, RadioStationUSA.CODE, getCoverByQuality(cover), name)
                    playlist.type = Playlist.FM_RADIO_TYPE
                    playlist.coverFit = 0 //封面 - 显示方式
                    playlist.url = RadioStationUSA.BASE_URL + '/' + aEl.getAttribute('href')

                    const artist = [{ id: '', name: 'RadioStationUSA' }]
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
            const { purl, cover } = track
            if(!purl) return resolve(track)

            getDoc(purl).then(doc => {
                const playEl = doc.querySelector('.media .play') || doc.querySelector('#radio-steam')
                if(playEl) {
                    const url = playEl.getAttribute('url')
                    Object.assign(track, { url, cover: getCoverByQuality(cover) })
                }
                resolve(track)
            })
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: RadioStationUSA.CODE, lyric: new Lyric(), trans: null })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, {
    code: RadioStationUSA.CODE,
    vendor: RadioStationUSA,
    name: 'RSU',
    shortName: 'RSU',
    online: true,
    types: ['fm-radios'],
    scopes: ['radios', 'userhome'],
    weight: 5
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)
 
  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: RadioStationUSA.CODE,
    hosts: ['radiostationusa', 'streamtheworld'],
    defaultHeaders: {
        //Origin: 'https://radiostationusa.fm/',
        Referer: 'https://radiostationusa.fm/',
    }
  })

  console.log('[ PLUGIN - Activated ] 电波平台 - RadioStationUSA')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, RadioStationUSA.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, RadioStationUSA.CODE)
  console.log('[ PLUGIN - Deactivated ] 电波平台 - RadioStationUSA')
}