/**
 * @name 电波平台 - 蜻蜓FM（广播电台）
 * @version 1.0.0
 * @author WhoamI
 * @about 广播电台独立版本
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, getImageUrlByQuality, transformUrl } = utils
const { hmacMd5, randomTextDefault, } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson } = nets
const { APIPermissions, access } = permissions


const getSign = (src) => (hmacMd5(src, 'Lwrpu$K5oP'))

class Qingting {
    static CODE = 'qingtingfm'
    static RADIO_PREFIX = 'FM_'

    //全部分类
    static radioCategories() {
        return new Promise((resolve, reject) => {
            const url = 'https://www.qingting.fm/radiopage/'

            getDoc(url).then(doc => {
                const result = { platform: Qingting.CODE, data: [], orders: [] }
                const defaultCate = new Category('默认')
                const cate1 = new Category('地区')
                const cate2 = new Category('分类')
                result.data.push(defaultCate)
                result.data.push(cate1)
                result.data.push(cate2)
                
                const menuList = doc.querySelectorAll('.catSec .channelMenu')
                menuList.forEach((wrapItem, index) => {
                    let list = null, cate = null
                    if(index == 0) { //地区
                        list = wrapItem.querySelectorAll('.regionsSec .regionBtn')
                        cate = cate1
                    } else if(index == 1) { //默认 - 网络台
                        const item = wrapItem.querySelector('.menuContents')
                        const name = item.textContent
                        const href = item.getAttribute('href')
                        if(href) {
                            const id = href.split('/')[2]
                            defaultCate.add(name, { key: name, value: id })
                        }
                        return 
                    } else if(index == 2) {
                        list = wrapItem.querySelectorAll('.classesSec .classBtn')
                        cate = cate2
                    }
                    if(list && cate) {
                        list.forEach(item => {
                            const name = item.textContent
                            const id = item.getAttribute('id')
                            cate.add(name, { key: name, value: id })
                        })
                    }
                })
                resolve(result)
            })
        })
    }

    static radioSquare(cate, offset, limit, page, order) {
        const { key: cateName, value: cateValue }  = cate || {}
        return new Promise((resolve, reject) => {
            if(!cateValue) return

            const result = { platform: Qingting.CODE, cate, offset, limit, page, total: 0, data: [] }
            const url = `https://www.qingting.fm/radiopage/${cateValue}/${page}`
            getDoc(url).then(doc => {
                const list = doc.querySelectorAll('.contentSec .content-item-root')
                list.forEach(item => {
                    const titleEl = item.querySelector('.link')
                    const title = titleEl.textContent
                    const id = titleEl.getAttribute('href').split('/')[2]
                    const coverEl = item.querySelector('.coverImg img')
                    const cover = transformUrl(coverEl.getAttribute('src'))
                    
                    const playlist = new Playlist(id, Qingting.CODE, cover, title)
                    playlist.type = Playlist.FM_RADIO_TYPE

                    const artist = [{ id: '', name: '蜻蜓FM电台' }]
                    const album = { id: '', name: cateName }
                    const channelTrack = new Track(id, playlist.platform, title, artist, album, 0, cover)
                    channelTrack.streamType = 1 //普通音频Live
                    channelTrack.type = playlist.type

                    playlist.addTrack(channelTrack)
                    result.data.push(playlist)
                })
                const pagination = doc.querySelectorAll('.paging-root .paging-item-a')
                if(pagination) {
                    const lastPageItem = pagination[pagination.length - 1]
                    if(lastPageItem) result.total = parseInt(lastPageItem.textContent)
                }
                resolve(result)
            })
        })
    }

    //播放详情：url、cover、lyric等
    static playDetail(id, track) {
        return new Promise((resolve, reject) => {
            const result = new Track(id, Qingting.CODE)
            
            const appid = encodeURIComponent('web')
            const path = `/live/${id}/64k.mp3`
            const _path = encodeURIComponent(path)
            const tsOffset = 1 * 60 * 60 * 1000
            const unixTime = Math.floor((Date.now() + tsOffset) / 1000)
            const ts = encodeURIComponent(unixTime.toString(16))
            const src = `app_id=${appid}&path=${_path}&ts=${ts}`
            const sign = getSign(src)
            const _sign = encodeURIComponent(sign)

            result.url = `https://lhttp.qtfm.cn${path}?app_id=${appid}&ts=${ts}&sign=${_sign}`
            resolve(result)
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: Qingting.CODE, lyric: null, trans: null })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, { 
    code: Qingting.CODE,
    vendor: Qingting,
    name: '蜻蜓FM广播',
    shortName: 'QTR',
    online: true,
    types: ['fm-radios'],
    scopes: ['radios', 'userhome', 'random'],
    weight: 5
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)
 
  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: Qingting.CODE,
    hosts: ['qingting', 'qtfm.cn'],
    defaultHeaders: {
        //Origin: 'https://www.qingting.fm/',
        Referer: 'https://www.qingting.fm/',
    }
  })

  console.log('[ PLUGIN - Activated ] 电波平台 - 蜻蜓FM（广播电台）')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, Qingting.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, Qingting.CODE)
  console.log('[ PLUGIN - Deactivated ] 电波平台 - 蜻蜓FM（广播电台）')
}