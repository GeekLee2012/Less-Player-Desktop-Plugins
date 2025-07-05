/**
 * @name 电波平台 - RadioMixer
 * @version 1.0.0
 * @author WhoamI
 * @about Online radio - listen live music for free without downloading. <br>收录世界多数主流广播电台，由于国内网络因素可能体验不佳。
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, nets, permissions } = lessAPI
const { Category, Playlist, Track, Lyric } = common
const { toTrimString, } = utils
const { getDoc, getJson, parseHtml } = nets
const { registerPlatform, addRequestHandler } = permissions




class RadioMixer {
    static CODE = 'radiomixer'

    //全部电台分类
    static radioCategories() {
        return RadioMixer.fmRadioCategories()
    }

    static radioSquare(cate, offset, limit, page, order) {
        return RadioMixer.fmRadioSquare(cate, offset, limit, page, order)
    }

    //全部电台分类
    static fmRadioCategories() {
        return new Promise((resolve, reject) => {
            const url1 = 'https://radiomixer.net/en/'
            const url2 = 'https://radiomixer.net/en/genres?jx=1'

            Promise.all([getDoc(url1), getJson(url2)]).then(values => {
                const result = { platform: RadioMixer.CODE, data: [], orders: [], isWhiteWrap: true  }
                //获取国家列表
                const list1 = values[0].querySelectorAll('.sidebar .dropdown-content .dropdown-item')
                const cate1 = new Category('国家')
                result.data.push(cate1)

                list1.forEach(item => {
                    const name = toTrimString(item.textContent)
                    const hrefAttr = toTrimString(item.getAttribute('href'))
                    const index = hrefAttr.lastIndexOf('/')
                    const value = hrefAttr.substring(index + 1, hrefAttr.length)
                    cate1.add(name, { key: name, value })
                })

                //获取分类
                const { html } = values[1]
                const list2 = parseHtml(html).querySelectorAll('.b_genres .jx')
                const cate2 = new Category('分类')
                result.data.push(cate2)
                list2.forEach(item => {
                    const name = toTrimString(item.textContent)
                    const hrefAttr = toTrimString(item.getAttribute('href'))
                    const index = hrefAttr.lastIndexOf('/')
                    const value = hrefAttr.substring(index + 1, hrefAttr.length)
                    cate2.add(name, { key: name, value: `genre/${value}` })
                })
                resolve(result)
            })
        })
    }

    static fmRadioSquare(cate, offset, limit, page, order) {
        const { key: cateName, value: cateValue }  = cate || {}
        return new Promise((resolve, reject) => {
            if(!cateValue) return
            const result = { platform: RadioMixer.CODE, cate, offset, limit, page, total: 0, data: [] }

            result.total = 100
            const url = `https://radiomixer.net/en/${cateValue}?page=${page}`
            getDoc(url).then(doc => {
                const list = doc.querySelectorAll('.container .col-md .s')
                list.forEach(item => {
                    const coverEl = item.querySelector('.img')
                    const name = coverEl.getAttribute('title')
                    const coverImgEl = coverEl.querySelector('img')
                    let imgSrc = coverImgEl.getAttribute('src').replace('/80x80/', '/240x240/')
                    imgSrc = imgSrc.startsWith('/') ? imgSrc.substring(1) : imgSrc
                    const cover = `https://radiomixer.net/${imgSrc}`

                    const id = item.querySelector('button').dataset['id']
                    const playlist = new Playlist(id, RadioMixer.CODE, cover, name)
                    playlist.type = Playlist.FM_RADIO_TYPE
                    playlist.coverFit = 1 //封面 - 平铺显示

                    const artist = [{ id: '', name: 'RadioMixer' }]
                    const album = { id: '', name: cateName }
                    const channelTrack = new Track(id, playlist.platform, name, artist, album, 0, cover)
                    channelTrack.url = `https://radiomixer.net/en/api/station/${id}/stream`
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
            resolve(track)
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: RadioMixer.CODE, lyric: new Lyric(), trans: null })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async (plugin) => {
  registerPlatform(plugin, {
    code: RadioMixer.CODE,
    vendor: RadioMixer,
    name: 'RadioMixer',
    shortName: 'RM',
    online: true,
    types: ['fm-radios'],
    scopes: ['radios', 'userhome'],
    weight: 5
  })
 
  addRequestHandler(plugin, {
    id: RadioMixer.CODE,
    hosts: ['radiomixer'],
    defaultHeaders: {
        //Origin: 'https://radiomixer.net/',
        Referer: 'https://radiomixer.net/',
    }
  })

  console.log('[ PLUGIN - Activated ] 电波平台 - RadioMixer')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 电波平台 - RadioMixer')
}