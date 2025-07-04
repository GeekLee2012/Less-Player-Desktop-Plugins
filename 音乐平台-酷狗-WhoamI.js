/**
 * @name 音乐平台 - 酷狗音乐
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, toLowerCaseTrimString, toUpperCaseTrimString, getImageUrlByQuality, } = utils
const { md5, randomTextDefault, } = crypto
const { getDoc, postJson, getJson, parseJsonp, qsStringify } = nets
const { registerPlatform, addRequestHandler } = permissions



const getSignature = (params) => {
    let _params = params
    if(typeof _params == 'object') _params = qsStringify(_params)
    const MD5_KEY = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'
    _params = _params.split('&').sort().join('')
    const signature = md5(`${MD5_KEY}${_params}${MD5_KEY}`)
    //return toUpperCaseTrimString(signature)
    return signature
}


const resizeCoverInUrl = (url, size) => {
    if (!url) return url
    //http://c1.kgimg.com/custom/150/20201207/20201207134716994336.jpg
    //https://imge.kugou.com/temppic/20130807/20130807185439172736.png
    //https://imge.kugou.com/stdmusic/20180712/20180712154305100613.jpg
    //https://imge.kugou.com/stdmusic/240/20180712/20180712154305100613.jpg
    //http://imge.kugou.com/soft/collection/240/20210518/20210518180852210693.jpg
    //https://imgessl.kugou.com/fmlogov2/240/20220121124411107744.jpg
    //http://imge.kugou.com/stdmusic/{size}/20150719/20150719010047203836.jpg
    size = size || 240
    
    if (url.includes('/temppic/')) {
        url = `https://imgessl.kugou.com/custom/${size}/` + url.split('/temppic/')[1]
    } else if (url.includes('/stdmusic/')) {
        url = `https://imge.kugou.com/stdmusic/${size}/` + url.split('/stdmusic/')[1]
    }else if (url.includes('/{size}/')) {
        const parts = url.split('{size}')
        url = parts[0] + size + parts[1]
    }
    return url.replace(`/${size}/150/`, `/${size}/`)
        .replace(`/${size}/240/`, `/${size}/`)
        .replace(`/${size}/480/`, `/${size}/`)
        .replace('/custom/150/', `/custom/${size}/`)
        .replace('/custom/240/', `/custom/${size}/`)
        .replace('/custom/480/', `/custom/${size}/`)
        .replace('/soft/collection/150/', `/soft/collection/${size}/`)
        .replace('/soft/collection/240/', `/soft/collection/${size}/`)
        .replace('/soft/collection/480/', `/soft/collection/${size}/`)
        .replace('/softhead/150/', `/softhead/${size}/`)
        .replace('/softhead/240/', `/softhead/${size}/`)
        .replace('/softhead/480/', `/softhead/${size}/`)
        .replace('/stdmusic/150/', `/stdmusic/${size}/`)
        .replace('/stdmusic/240/', `/stdmusic/${size}/`)
        .replace('/stdmusic/480/', `/stdmusic/${size}/`)
        .replace('/fmlogov2/150/', `/fmlogov2/${size}/`)
        .replace('/fmlogov2/240/', `/fmlogov2/${size}/`)
        .replace('/fmlogov2/480/', `/fmlogov2/${size}/`)
        .replace('/{size}/', `/${size}/`)
}

const getCoverByQuality = (url) => {
    if (!url) return url
     
    return getImageUrlByQuality([
        resizeCoverInUrl(url, 150),
        resizeCoverInUrl(url, 240),
        resizeCoverInUrl(url, 480),
        resizeCoverInUrl(url, 480),
        resizeCoverInUrl(url, 480)
    ])
}

const getCoverUrlByName = (cate, size, name) => {
    if (!name) return ''
    const date = name.substring(0, 8)
    return `https://imgessl.kugou.com/${cate}/${size}/${date}/${name}`
}

const getCoverUrlByQualityAndName = (cate, name) => {
    if (!name) return ''

    return getImageUrlByQuality([
        getCoverUrlByName(cate, 150, name),
        getCoverUrlByName(cate, 240, name),
        getCoverUrlByName(cate, 480, name),
        getCoverUrlByName(cate, 480, name),
        getCoverUrlByName(cate, 480, name)
    ])
}


const jsonify = (text) => {
    text = text.replace(/\/\/ \S*/g, '') //注释
        .replace(/\s/g, '') //空白符
        .replace(/'/g, '"')
        .replace('{', '{"')
        .replace('}', '"}')
        .replace(/,/g, '","')
        .replace(/:/g, '":"')
        .replace(/""/g, '"')
        .replace('https":"', 'https:')
    return JSON.parse(text)
}

//客户端API
class KuGou {
    static CODE = 'kugou'
    static TOPLIST_CODE = "0-0-0"
    static RADIO_CODE = "f-m-0"
    static TOPLIST_PREFIX = "TOP_"
    static RADIO_CACHE = { channel: 0, data: [], page: 1 }
    static ORDERS = [
        { key: "推荐", value: "5" },
        { key: "最热", value: "6" },
        { key: "最新", value: "7" },
        { key: "热藏", value: "3" },
        { key: "飙升", value: "8" },
    ]

    //全部歌单分类
    static categories() {
        return new Promise((resolve, reject) => {
            const result = { platform: KuGou.CODE, data: [], orders: [] }
            const url = 'http://mac.kugou.com/v2/musicol/yueku/v1/special/index/getData/getData.html&cdn=cdn&t=5&c='

            getDoc(url).then(doc => {
                //specail? 拼写错误！正确：special
                const menulist = doc.querySelectorAll('.pc_specail_menu')
                    || doc.querySelectorAll('.pc_special_menu')
                menulist.forEach(menu => {
                    let cateName = menu.querySelector('h3').textContent
                    cateName = cateName == '默认' ? '推荐' : cateName

                    const category = new Category(cateName)
                    const list = menu.querySelectorAll('.pc_specail_menu_content a')
                        || menu.querySelectorAll('.pc_special_menu_content a')
                    list.forEach(item => {
                        let name = item.textContent
                        const value = item.getAttribute('href').split('&c=')[1].split("'")[0]
                        if (name == '全部') name = '默认'
                        category.add(name, value)
                    })
                    result.data.push(category)
                })
                
                if(result.data.length > 0) {
                    result.data[0].add("榜单", KuGou.TOPLIST_CODE)
                        .add("电台", KuGou.RADIO_CODE)
                }

                result.orders.push(...KuGou.ORDERS)
                resolve(result)
            })
        })
    }

    //榜单列表
    static toplist(cate, offset, limit, page, order) {
        const result = { platform: KuGou.CODE, cate, offset, limit, page, total: 0, data: [] }
        return new Promise((resolve, reject) => {
            if (page > 1) return resolve(result)

            const url = 'https://www.kugou.com/yy/html/rank.html'

            getDoc(url).then(doc => {
                const liEls = doc.querySelectorAll('.pc_temp_side li')
                liEls.forEach(el => {
                    const href = el.querySelector('a').getAttribute('href')
                    const style = el.querySelector('span').getAttribute('style')
                    const title = el.querySelector('a').getAttribute('title')

                    const id = KuGou.TOPLIST_PREFIX + href.split('-')[1].split('.html')[0]
                    let cover = style.split('(')[1].split(')')[0]
                    cover = getCoverByQuality(cover)

                    const playlist = new Playlist(id, KuGou.CODE, cover, title)
                    playlist.url = href
                    result.data.push(playlist)
                })
                resolve(result)
            })
        })
    }

    //榜单详情
    static toplistDetail(id, offset, limit, page) {
        id = id.replace(KuGou.TOPLIST_PREFIX, '')
        return new Promise((resolve, reject) => {
            const result = new Playlist()
            const url = `https://www.kugou.com/yy/rank/home/${page}-${id}.html?from=rank`

            getDoc(url).then(doc => {
                const title = doc.querySelector('#pc_temp_title h3').textContent
                const about = doc.querySelector('#pc_temp_title .rank_update').textContent

                result.title = title
                result.about = about

                //Tracks
                const scripts = doc.body.getElementsByTagName('script')
                let key = 'var global ='
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    scriptText = scriptText.split(key)[1]
                    key = 'global.features ='

                    let paginationText = scriptText.split(key)[0]
                    paginationText = paginationText.split(';')[0].trim()

                    const pagination = jsonify(paginationText)
                    const pagesize = parseInt(pagination.pagesize)
                    result.total = parseInt(pagination.total)
                    result.totalPage = Math.ceil(result.total / pagesize)

                    scriptText = scriptText.split(key)[1]
                    key = '(function()'
                    scriptText = scriptText.split(key)[0].trim()
                    scriptText = scriptText.substring(0, scriptText.length - 1)
                    const json = JSON.parse(scriptText)

                    json.forEach(item => {
                        const artist = [{ id: '', name: item.author_name }]
                        const album = { id: item.album_id, name: '' } //TODO 获取不到专辑信息
                        const duration = item.timeLen * 1000
                        const track = new Track(item.audio_id, KuGou.CODE, item.FileName, artist, album, duration)
                        track.hash = item.Hash
                        track.artistNotCompleted = true
                        track.pid = id
                        result.addTrack(track)
                    })
                }
                resolve(result)
            })
        })
    }

    //电台列表
    static playlistRadios(cate, offset, limit, page, order) {
        const result = { platform: KuGou.CODE, cate, offset, limit, page, total: 0, data: [] }
        return new Promise((resolve, reject) => {
            if (page > 1) return resolve(result)

            const url = 'https://www.kugou.com/fmweb/html/index.html'

            getDoc(url).then(doc => {
                const list = doc.body.querySelectorAll('.main .radio')
                list.forEach(item => {
                    const url = item.getAttribute('href')
                    const fmid = url.split('#fm_id=')[1].split('&')[0]
                    const cover = item.querySelector('.cover img').getAttribute('src')
                    const title = item.querySelector('.name').textContent
                    const playlist = new Playlist(fmid, KuGou.CODE, getCoverByQuality(cover), title, url)
                    playlist.type = Playlist.NORMAL_RADIO_TYPE
                    result.data.push(playlist)
                })
                resolve(result)
            })
        })
    }

    //电台：下一首歌曲
    static nextPlaylistRadioTrack(channel, track) {
        return new Promise((resolve, reject) => {
            let result = null
            const index = !track ? 0 :
                KuGou.RADIO_CACHE.data.findIndex(item => item.id == track.id)
            const length = KuGou.RADIO_CACHE.data.length
            //是否命中缓存
            if (channel == KuGou.RADIO_CACHE.channel) {
                if (length > 0 && index > -1 && index < (length - 1)) {
                    result = KuGou.RADIO_CACHE.data[index + 1]
                    return resolve(result)
                }
                KuGou.RADIO_CACHE.page += 1
            } else { //不命中，重置缓存分页参数
                KuGou.RADIO_CACHE.page = 1
            }
            //不命中，重置缓存
            KuGou.RADIO_CACHE.channel = channel
            KuGou.RADIO_CACHE.data.length = 0

            const page = KuGou.RADIO_CACHE.page
            const limit = 20
            const offset = (page - 1) * limit

            const url = 'https://gateway.kugou.com/openapicdn/broadcast/v2/get_songlist'

            const reqBody = {
                radio_id: channel,
                offset,
                pagesize: limit
            }
            getJson(url, reqBody).then(json => {
                const list = json.data.songlist
                list.forEach(item => {
                    if (!item.audio_info) return
                    const artist = [{ id: '', name: item.author_name }]
                    const album = { id: item.album_info.album_id, name: item.album_info.album_name }
                    const duration = item.audio_info.duration_128
                    const cover = getCoverByQuality(item.album_info.sizable_cover)
                    const cache = new Track(item.album_audio_id, KuGou.CODE, item.audio_name, artist, album, duration, cover)
                    //cache.isRadioType = true
                    cache.type = Playlist.NORMAL_RADIO_TYPE
                    cache.channel = channel
                    cache.hash = item.audio_info.hash_128
                    cache.artistNotCompleted = true
                    KuGou.RADIO_CACHE.data.push(cache)
                })
                result = KuGou.RADIO_CACHE.data[0]
                resolve(result)
            })
        })
    }


    //精选歌单
    static getRecommandPlaylists(cate, offset, limit, page, order) {
        const result = { platform: KuGou.CODE, cate, order, offset, limit, page, total: 0, data: [] }
        return new Promise((resolve, reject) => {
            //分类为默认、排序为推荐，否则其他情况直接返回
            if (toTrimString(cate).length > 0 || order != KuGou.ORDERS[0].value || page > 1) {
                return resolve(result)
            }

            //正常情况
            const url = 'https://www.kugou.com/'

            getDoc(url).then(doc => {
                let id = null, cover = null, title = null

                //大图片歌单
                const st1El = doc.querySelector('#secoundContent .homep_cm_item_st1')
                let coverEl = st1El.querySelector('img')

                if (coverEl) {
                    cover = coverEl.getAttribute('_src')
                    if (cover) cover = getCoverByQuality(cover)
                }
                let titleEl = st1El.querySelector('.homep_cm_item_st1_a2')
                if (titleEl) {
                    title = titleEl.textContent
                    const href = titleEl.getAttribute('href')
                    id = 'gcid_' + href.split('/gcid_')[1]
                }
                if (id) result.data.push(new Playlist(id, KuGou.CODE, cover, title))

                //其他小图歌单
                const st2Els = doc.querySelectorAll('#secoundContent .homep_d1_d1_d2_d1_d1')
                st2Els.forEach(el => {
                    coverEl = el.querySelector('.homep_cm_item_st1_a1 img')
                    titleEl = el.querySelector('.homep_cm_item_st1_a2')
                    if (coverEl) {
                        cover = coverEl.getAttribute('_src')
                        if (cover) cover = getCoverByQuality(cover)
                    }
                    if (titleEl) {
                        title = titleEl.textContent
                        const href = titleEl.getAttribute('href')
                        id = 'gcid_' + href.split('/gcid_')[1]
                    }
                    if (id) result.data.push(new Playlist(id, KuGou.CODE, cover, title))
                })
                resolve(result)
            })
        })
    }

    //歌单(列表)广场
    static square(cate, offset, limit, page, order) {
        const originCate = cate
        let resolvedCate = (cate || '').toString().trim()
        const orders = KuGou.ORDERS
        const defaultOrder = orders[Math.floor((Math.random() * 1000) % orders.length)]
        order = order || defaultOrder.value

        //榜单
        if (resolvedCate === KuGou.TOPLIST_CODE) return KuGou.toplist(cate, offset, limit, page, order)
        //电台
        if (resolvedCate === KuGou.RADIO_CODE) return KuGou.playlistRadios(cate, offset, limit, page, order)
        //普通歌单
        return new Promise(async (resolve, reject) => {
            const result = { platform: KuGou.CODE, cate: originCate, order, offset, limit, page, total: 0, data: [] }
            const url = `http://mac.kugou.com/v2/musicol/yueku/v1/special/index/getData/getData.html&cdn=cdn&p=${page}&pagesize=20&t=${order}&c=${resolvedCate}`

            // 精选歌单
            const rPlaylists = await KuGou.getRecommandPlaylists(cate, offset, limit, page, order)
            if (rPlaylists.data.length > 0) result.data.push(...rPlaylists.data)
            //分类歌单
            getDoc(url).then(doc => {
                let key = 'global.special ='
                const scripts = doc.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    const globalData = Function(scriptText + ' return global')()
                    result.total = Math.ceil(parseInt(globalData.total) / limit)

                    const list = globalData.special
                    list.forEach(item => {
                        const id = item.specialid
                        const cover = getCoverByQuality(item.img)
                        const title = item.specialname
                        const about = item.intro
                        const playlist = new Playlist(id, KuGou.CODE, cover, title, null, about)
                        result.data.push(playlist)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌单详情
    //TODO 获取不到歌手信息、封面等
    static playlistDetail_v1(id, offset, limit, page, cate, order) {
        id = toTrimString(id)
        if (id.startsWith(KuGou.TOPLIST_PREFIX)) return KuGou.toplistDetail(id, offset, limit, page)
        if (id.startsWith('gcid_')) return KuGou.recomandPlaylistDetail(id, offset, limit, page)
        return new Promise((resolve, reject) => {
            cate = cate || '9999'
            let url = `http://mac.kugou.com/v2/musicol/yueku/v1/special/single/${id}-${order}-${cate}.html`
           
            getDoc(url).then(doc => {
                const result = new Playlist(id, KuGou.CODE)

                const aboutEl = doc.querySelector('.pc_specail_text')
                if(aboutEl) {
                    const about = toTrimString(aboutEl.textContent).replace('介绍：', '')
                    Object.assign(result, { about: toTrimString(about) })
                }

                let key = 'var global ='
                const scripts = doc.body.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    let json = Function(`${scriptText}; return global;`)()
                    const { name: title, cover, data: list } = json
                    Object.assign(result, { title, cover })

                    list.forEach(item => {
                        const { songname, singername, album_id, album_name } = item
                        const artist = []
                        const album = { id: album_id, name: album_name }
                        const duration = item.duration
                        let trackCover = null
                        const authors = singername.split('、')
                        if (authors && authors.length > 0) {
                            //trackCover = getCoverByQuality(authors[0].sizable_avatar)
                            for(var i = 0; i < authors.length; i++) {
                                artist.push({ id: '', name: authors[i] })
                            }
                        }
                        const track = new Track(item.audio_id, KuGou.CODE, songname, artist, album, duration, getCoverByQuality(trackCover))
                        track.hash = item.high_mv_hash || item.hash
                        track.mv = item.mv_hash
                        track.pid = id
                        track.payPlay = (item.vip != 0)
                        //track.highHash = [item.hash_flac, item.hash_320, item.hash_128]
                        const { hash_flac, hash_320, hash_128, hash_ape, hash_high } = item
                        track.extraHash = { hash_flac, hash_320, hash_128, hash_ape, hash_high }
                        result.addTrack(track)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌单详情
    static playlistDetail_v0(id, offset, limit, page) {
        id = (id + '').trim()
        if (id.startsWith(KuGou.TOPLIST_PREFIX)) return KuGou.toplistDetail(id, offset, limit, page)
        return new Promise((resolve, reject) => {
            const url = `http://mac.kugou.com/v2/musicol/yueku/v1/special/single/${id}-5-9999.html`

            getDoc(url).then(doc => {
                const result = new Playlist(id, KuGou.CODE)
                //Tracks
                let key = 'var global'
                const scripts = doc.body.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    const json = Function(`${scriptText}; return global`)()

                    result.cover = json.cover.replace("/240/", '/480/')
                    result.title = json.name

                    json.data.forEach(item => {
                        const artist = []
                        const album = { id: item.album_id, name: item.album_name }
                        const duration = item.duration
                        let trackCover = null
                        const authors = item.authors
                        if (authors && authors.length > 0) {
                            trackCover = getCoverByQuality(authors[0].sizable_avatar)
                            const arData = authors.map(ar => ({
                                id: ar.author_id, name: ar.author_name
                            }))
                            artist.push(...arData)
                        }
                        const track = new Track(item.audio_id, KuGou.CODE, item.songname, artist, album, duration, trackCover)
                        track.hash = item.hash
                        result.addTrack(track)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌单详情
    static playlistDetail(id, offset, limit, page) {
        id = toTrimString(id)
        if (id.startsWith(KuGou.TOPLIST_PREFIX)) return KuGou.toplistDetail(id, offset, limit, page)
        if (id.startsWith('gcid_')) return KuGou.recomandPlaylistDetail(id, offset, limit, page)
        return new Promise((resolve, reject) => {
            const url = `https://www.kugou.com/yy/special/single/${id}.html`
            //const url = `http://mac.kugou.com/v2/musicol/yueku/v1/special/single/${id}-5-9999.html`

            getDoc(url).then(doc => {
                let cover = doc.querySelector('.specialPage .pic img').getAttribute('_src')
                if (cover) cover = getCoverByQuality(cover)
                const title = doc.querySelector('.specialPage .pic img').getAttribute('alt')
                const about = doc.querySelector('.specialPage .more_intro').textContent

                const result = new Playlist(id, KuGou.CODE, cover, title, null, about)
                //Tracks
                let key = 'var data='
                const scripts = doc.head.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    const json = Function(`${scriptText}; return data`)()
                    json.forEach(item => {
                        const artist = []
                        const album = { id: item.album_id, name: item.album_name }
                        const duration = item.duration
                        let trackCover = null
                        const authors = item.authors
                        if (authors && authors.length > 0) {
                            trackCover = getCoverByQuality(authors[0].sizable_avatar)
                            const arData = authors.map(ar => ({
                                id: ar.author_id, name: ar.author_name
                            }))
                            artist.push(...arData)
                        }
                        const track = new Track(item.audio_id, KuGou.CODE, item.songname, artist, album, duration, trackCover)
                        track.hash = item.hash
                        track.pid = id
                        track.payPlay = (item.vip != 0)
                        //track.highHash = [item.hash_flac, item.hash_320, item.hash_128]
                        const { hash_flac, hash_320, hash_128, hash_ape, hash_high } = item
                        track.extraHash = { hash_flac, hash_320, hash_128, hash_ape, hash_high }
                        result.addTrack(track)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌单详情 - 推荐歌单
    static recomandPlaylistDetail(id, offset, limit, page) {
        id = toTrimString(id)
        return new Promise((resolve, reject) => {
            const url = `https://www.kugou.com/songlist/${id}/`

            getDoc(url).then(doc => {
                const result = new Playlist(id, KuGou.CODE)
                //Tracks
                let key = 'var nData='
                const scripts = doc.head.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    const json = Function(`${scriptText}; return { nData, data, specialData }`)()
                    const { listinfo, songs: list } = json.nData
                    Object.assign(result, {
                        title: listinfo.name,
                        cover: getCoverByQuality(listinfo.pic),
                        about: listinfo.intro
                    })

                    list.forEach(item => {
                        const artist = []
                        const album = { id: item.album_id, name: item.albuminfo.name }
                        const duration = item.timelen
                        const trackCover = getCoverByQuality(item.cover)

                        const singers = item.singerinfo
                        if (singers && singers.length > 0) {
                            singers.forEach(singer => {
                                const { id, name } = singer
                                if (id > 0 && name) artist.push({ id, name })
                            })
                        }
                        const track = new Track(item.audio_id, KuGou.CODE, item.name, artist, album, duration, trackCover)
                        track.hash = item.hash
                        track.pid = id
                        track.payPlay = (item.feetype != 0)
                        track.highHash = null
                        track.mv = item.mvhash
                        result.addTrack(track)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌曲播放详情：url、cover、lyric等
    static playDetail(id, track) {
        return new Promise(async (resolve, reject) => {
            const result = new Track(id, KuGou.CODE)
            try {
                const { hash, album, extraHash } = track
                const albumId = album.id
                const hashList = []
                if(extraHash) {
                    Object.entries(extraHash).forEach(([key, value]) => {
                        if(value) hashList.push(value)
                    })
                }
                hashList.push(hash)

                for (var i = 0; i < hashList.length; i++) {
                    const _hash = hashList[i]
                    if (!_hash) continue

                    const dfid = randomTextDefault(24)
                    const mid = toUpperCaseTrimString(randomTextDefault(32))
                    const url = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${_hash}&dfid=${dfid}&appid=1014&mid=${mid}&platid=4&album_id=${albumId}&_=`

                    const json = await getJson(url)
                    console.log(json)
                    const { play_url, img, lyrics, authors } = json.data
                    if ((play_url || '').trim().length > 0) {
                        Object.assign(result, {
                            url: play_url,
                            cover: getCoverByQuality(img),
                            lyric: Lyric.parseFromText(lyrics)
                        })
                        if (authors) {
                            result.artist = authors.map(ar => ({ id: ar.author_id, name: ar.author_name }))
                        }
                        break
                    }
                }
            } catch(error) {
                console.log(error)
            }
            resolve(result)
            /*
            const url = "https://wwwapi.kugou.com/yy/index.php?r=play/getdata"
                + `&hash=${tryHash}&dfid=${kg_dfid}&appid=1014&mid=${kg_mid}&platid=4&album_id=${albumId}&_=`
            const result = new Track(id, KuGou.CODE)
            getJson(url).then(json => {
                result.url = json.data.play_url
                result.cover = json.data.img
                const lyricText = json.data.lyrics
                result.lyric = Lyric.parseFromText(lyricText)
                if (json.data.authors) {
                    result.artist = json.data.authors.map(ar => ({ id: ar.author_id, name: ar.author_name }))
                }
                resolve(result)
            })
            */
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: KuGou.CODE, lyric: null, trans: null })
        })
    }

    //歌手详情：Name、Cover、简介(如果有)等
    static artistDetail(id) {
        return new Promise((resolve, reject) => {
            //const url = `https://www.kugou.com/singer/${id}.html`
            const url = `https://www.kugou.com/singer/info/${id}/`

            getDoc(url).then(doc => {
                const coverEl = doc.querySelector('.sng_ins_1 .top img')
                let cover = null
                if (coverEl) cover = getCoverByQuality(coverEl.getAttribute('_src'))

                const title = doc.querySelector('.sng_ins_1 .top .intro strong').textContent
                const about = doc.querySelector('.sng_ins_1 #singer_content').textContent

                const result = { id, title, cover, about }
                resolve(result)
            })
        })
    }

    static artistDetail_v1(id) {
        return new Promise((resolve, reject) => {
            //const url = `https://www.kugou.com/singer/${id}.html`
            const url = `https://www.kugou.com/singer/info/${id}/`
            console.log(url)

            getDoc(url).then(doc => {
                let key = 'var songsTotal'
                const scripts = doc.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }
                if (scriptText) {
                    const { singerID, singername, songsdata } = Function(scriptText + ' return { singerID, singername, songsdata }')()
                    //const total = Math.ceil(parseInt(songdata.length) / limit)
                    const result = { 
                        id, 
                        title: singername,
                        cover: null,
                        about: '',
                        total: -1,
                    }

                    //const list = songsdata
                    resolve(result)
                }
            })
        })
    }


    //歌手详情: 全部歌曲
    static artistDetailAllSongs(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { offset, limit, page, total: 0, data: [] }
            if (page > 1) return resolve(result)

            const _now = Date.now()
            const url = `https://www.kugou.com/yy/?r=singer/song&sid=${id}&p=${page}&t=${_now}`

            postJson(url).then(json => {
                result.total = json.total

                const data = []
                const list = json.data
                list.forEach(item => {
                    const artist = [{ id, name: item.author_name }]
                    const album = { id: item.album_id, name: item.album_name }
                    const duration = item.duration
                    const track = new Track(item.songid, KuGou.CODE, item.songname, artist, album, duration)
                    track.hash = item.hash
                    data.push(track)
                })
                if (data && data.length > 0) result.data.push(...data)
                //const result = { offset, limit, page, total, data }
                resolve(result)
            })
        })
    }

    //歌手详情: 专辑
    static artistDetailAlbums(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const _now = Date.now()
            const url = `https://www.kugou.com/yy/?r=singer/album&sid=${id}&p=${page}&t=${_now}`

            postJson(url).then(json => {
                const total = json.total
                const data = []
                const list = json.data
                list.forEach(item => {
                    const artist = [{ id, name: item.singername }]
                    const album = new Album(item.albumid, KuGou.CODE, item.albumname, getCoverByQuality(item.img), artist)
                    data.push(album)
                })
                const result = { offset, limit, page, total, data }
                resolve(result)
            })
        })
    }

    //专辑详情
    static albumDetail(id) {
        return new Promise((resolve, reject) => {
            const url = `https://www.kugou.com/album/${id}.html`

            getDoc(url).then(doc => {
                const coverEl = doc.querySelector('.pic img')
                let cover = null
                if (coverEl) cover = getCoverByQuality(coverEl.getAttribute('_src'))
                const detailItems = doc.querySelector('.detail').childNodes
                const title = detailItems.item(2).textContent
                const artistName = detailItems.item(6).textContent
                const publishTime = detailItems.item(12) ? detailItems.item(12).textContent : null
                const about = toTrimString(doc.querySelector('.intro').textContent).replace('简介：', '')
                const artist = [{ id: 0, name: artistName }]

                //Tracks
                let key = 'var data='
                const scripts = doc.body.getElementsByTagName('script')
                let scriptText = null
                for (var i = 0; i < scripts.length; i++) {
                    const scriptCon = scripts[i].innerHTML
                    if (scriptCon && scriptCon.includes(key)) {
                        scriptText = scriptCon
                        break
                    }
                }

                const data = []
                if (scriptText) {
                    scriptText = scriptText.split(key)[1]
                    key = '];'
                    scriptText = scriptText.split(key)[0].trim()
                    scriptText = scriptText + "]"
                    const json = JSON.parse(scriptText)

                    json.forEach(item => {
                        const artist = []
                        const album = { id: item.album_id, name: item.album_name }
                        const duration = item.duration
                        let trackCover = null
                        const authors = item.authors
                        if (authors && authors.length > 0) {
                            //trackCover = authors[0].sizable_avatar.replace('{size}', '400')
                            trackCover = authors[0].sizable_avatar.replace('{size}', '240')
                            const arData = authors.map(ar => ({
                                id: ar.author_id, name: ar.author_name
                            }))
                            artist.push(...arData)
                        }
                        const track = new Track(item.audio_id, KuGou.CODE, item.songname, artist, album, duration, getCoverByQuality(trackCover))
                        track.hash = item.hash
                        data.push(track)
                    })
                }

                const result = new Album(id, KuGou.CODE, title, cover, artist, null, publishTime, toTrimString(about), data)
                resolve(result)
            })
        })
    }

    //搜索: 歌曲
    static searchSongs_v0(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: KuGou.CODE, offset, limit, page, data: [] }

            keyword = toTrimString(keyword)
            const _now = Date.now()
            const callbackFn = 'callback123'
            const param = `callback=${callbackFn}&keyword=${keyword}&page=${page}&pagesize=${limit}`
                + '&bitrate=0&isfuzzy=0&inputtype=0&platform=WebFilter&userid=0&clientver=2000&iscorrection=1&privilege_filter=0&token=&srcappid=2919'
                + `&clienttime=${_now}&mid=${_now}&uuid=${_now}&dfid=-`
            const signature = getSignature(param)
            const url = `https://complexsearch.kugou.com/v2/search/song?${param}&signature=${signature}`

            getJson(url).then(jsonp => {
                /*let jsonText = jsonp.split( + "(")[1].trim()
                jsonText = jsonText.substring(0, jsonText.length - 1)
                const json = JSON.parse(jsonText)*/
                const json = parseJsonp(jsonp)

                const data = json.data.lists.map(item => {
                    const artist = item.Singers
                    const album = { id: item.AlbumID, name: item.AlbumName }
                    const duration = item.Duration * 1000
                    const cover = getCoverByQuality(item.pic)
                    const track = new Track(item.ID, KuGou.CODE, item.SongName, artist, album, duration, cover)
                    track.hash = item.FileHash
                    track.mv = item.MvHash
                    track.highHash = [/*item.ResFileHash,*/ item.SQFileHash, item.HQFileHash]
                    return track
                })
                if (data && data.length > 0) result.data.push(...data)
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 歌曲
    static searchSongs(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: KuGou.CODE, offset, limit, page, data: [] }

            keyword = toTrimString(keyword)
            const _now = Date.now()
            const mid = toUpperCaseTrimString(randomTextDefault(32)) || 'e463b0b4d6b10509c05f270142d87a7d'
            const uuid = toUpperCaseTrimString(randomTextDefault(32)) || '78a817e0c734bad66fe5c34b54e29995'
            const param = `appid=1155&area_code=1&clienttime=${_now}&clientver=312&dfid=-&iscorrection=7&keyword=${keyword}&mid=${mid}&page=${page}&pagesize=${limit}&platform=WebFilter&requestid=2&srcappid=2919&tag=em&token=&userid=0&uuid=${uuid}`
            const signature = getSignature(param)
            const url = `https://complexsearch.kugou.com/v2/search/song?${param}&signature=${signature}`

            getJson(url).then(json => {
                const data = json.data.lists.map(item => {
                    const artist = item.Singers
                    const album = { id: item.AlbumID, name: item.AlbumName }
                    const duration = item.Duration * 1000
                    const cover = getCoverByQuality(item.pic || item.Image)
                    const track = new Track(item.ID, KuGou.CODE, item.SongName, artist, album, duration, cover)
                    track.hash = item.FileHash
                    track.mv = item.MvHash
                    track.highHash = [/*item.ResFileHash,*/ item.SQFileHash, item.HQFileHash]
                    return track
                })
                if (data && data.length > 0) result.data.push(...data)
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 歌单
    static searchPlaylists(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const _now = Date.now()
            const mid = toUpperCaseTrimString(randomTextDefault(32))
            const uuid = toUpperCaseTrimString(randomTextDefault(32))
            const param = `appid=1155&area_code=1&clienttime=${_now}&clientver=312&dfid=-&iscorrection=7&keyword=${keyword}&mid=${mid}&page=${page}&pagesize=${limit}&platform=WebFilter&requestid=2&srcappid=2919&tag=em&token=&userid=0&uuid=${uuid}`
            const signature = getSignature(param)
            const url = `https://complexsearch.kugou.com/v1/search/special?${param}&signature=${signature}`

            getJson(url).then(json => {
                const data = json.data.lists.map(item => {
                    const cover = getCoverByQuality(item.img)
                    const track = new Playlist(item.specialid, KuGou.CODE, cover, item.specialname, item.intro)
                    return track
                })
                const result = { platform: KuGou.CODE, offset, limit, page, data }
                resolve(result)
            })
        })
    }

    //搜索: 专辑
    static searchAlbums(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const _now = Date.now()
            const param = `appid=1155&clienttime=${_now}&clientver=304&dfid=-&keyword=${keyword}`
                + `&mid=e463b0b4d6b10509c05f270142d87a7d&page=${page}&pagesize=20`
                + `&platform=WebFilter&requestid=5&srcappid=2919&tag=em&token=&userid=0&uuid=e35cb5213b6619ec5c61e5cecb61bcf4`
            const signature = getSignature(param)

            const url = `https://complexsearch.kugou.com/v1/search/album?${param}&signature=${signature}`

            getJson(url).then(json => {
                const data = json.data.lists.map(item => {
                    const cover = getCoverByQuality(item.img)
                    const artist = item.singers
                    const album = new Album(item.albumid, KuGou.CODE, item.albumname, cover, artist)
                    album.publishTime = item.publish_time
                    album.about = item.intro
                    return album
                })
                const result = { platform: KuGou.CODE, offset, limit, page, data }
                resolve(result)
            })
        })
    }

    //搜索: 歌手
    static searchArtists(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: KuGou.CODE, offset, limit, page, data: [] }
            resolve(result)
        })
    }

    //搜索: 视频
    static searchVideos(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const _now = Date.now()
            const param = `appid=1155&clienttime=${_now}&clientver=304&dfid=-&keyword=${keyword}`
                + `&mid=e463b0b4d6b10509c05f270142d87a7d&page=${page}&pagesize=20`
                + `&platform=WebFilter&requestid=5&srcappid=2919&tag=em&token=&userid=0&uuid=e35cb5213b6619ec5c61e5cecb61bcf4`
            const signature = getSignature(param)

            const url = `https://complexsearch.kugou.com/v1/search/mv?${param}&signature=${signature}`

            getJson(url).then(json => {
                const data = json.data.lists.map(item => ({
                    id: item.MvID,
                    mvid: item.MvID,
                    vid: item.MvHash,
                    platform: KuGou.CODE,
                    title: item.MvName,
                    cover: getCoverUrlByQualityAndName('mvhdpic', item.Pic),
                    type: Playlist.VIDEO_TYPE,
                    subtitle: item.SingerName,
                    duration: (item.Duration * 1000),
                    publishTime: item.PublishDate,
                    playCount: item.MvHot,
                    vcType: 0,
                }))
                const result = { platform: KuGou.CODE, offset, limit, page, data }
                resolve(result)
            })
        })
    }

    //歌手分类
    static artistCategories() {
        return new Promise((resolve, reject) => {
            const alphabet = KuGou.getAlphabetCategory()
            const result = { platform: KuGou.CODE, data: [], alphabet }
            const url = 'https://www.kugou.com/yy/html/singer.html'

            getDoc(url).then(doc => {
                const list = doc.querySelectorAll('.sng .l li')
                const category = new Category("默认")
                result.data.push(category)
                const key = '/index/'
                list.forEach(item => {
                    const aEl = item.querySelector('a')
                    const name = aEl.textContent
                    const href = aEl.getAttribute('href')
                    let value = '1-all-1'
                    if (href.includes(key)) {
                        value = href.split(key)[1].split(".html")[0]
                    }
                    category.add(name, value)
                })
                resolve(result)
            })
        })
    }

    //字母表分类
    static getAlphabetCategory() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const category = new Category("字母")
        category.add('全部', 'all')
        category.add('其他', 'null')
        const array = alphabet.split('')
        for (var i = 0; i < array.length; i++) {
            category.add(array[i], array[i].toLowerCase())
        }
        return category
    }

    //TODO 格式：page-filter-id
    static parseArtistCate(cate, offset, limit, page) {
        try {
            const source = cate['默认'].item.value.split('-')
            source[0] = page
            source[1] = cate['字母'].item.value
            return source.join('-')
        } catch (error) {
            //console.log(error)
        }
        return '1-all-1'
    }

    //歌手(列表)广场
    static artistSquare(cate, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: KuGou.CODE, cate, offset, limit, page, total: 0, data: [] }
            if (page > 5) { //TODO
                result.page = 5
                return resolve(result)
            }
            //const url = 'https://www.kugou.com/yy/html/singer.html'
            const resolvedCate = KuGou.parseArtistCate(cate, offset, limit, page)
            const url = `https://www.kugou.com/yy/singer/index/${resolvedCate}.html`

            getDoc(url).then(doc => {
                let els = doc.querySelectorAll('.sng .r #list_head li')
                els.forEach(el => {
                    const aEl = el.querySelector('.pic')
                    //const id = aEl.getAttribute('href').split('/singer/home/')[1].split('.html')[0]
                    const id = aEl.getAttribute('href').split('/singer/info/')[1].split('/')[0]
                    const title = aEl.getAttribute('title')
                    let cover = aEl.querySelector('img').getAttribute('_src')
                    cover = cover.replace('/100/', '/240/')
                    cover = getCoverByQuality(cover)
                    const artist = { id, platform: KuGou.CODE, title, cover }
                    result.data.push(artist)
                })
                els = doc.querySelectorAll('.sng .r .list1 li')
                els.forEach(el => {
                    const aEl = el.querySelector('.text')
                    const id = aEl.getAttribute('href').split('/singer/info/')[1].split('/')[0]
                    const title = aEl.getAttribute('title')
                    //TODO
                    const cover = null
                    const artist = { id, platform: KuGou.CODE, title, cover }
                    result.data.push(artist)
                })
                resolve(result)
            })
        })
    }

    static videoDetail(id, video) {
        return new Promise((resolve, reject) => {
            const _now = Date.now()
            const param = `srcappid=2919&clientver=20000&clienttime=${_now}&mid=${_now}&uuid=${_now}&dfid=-&cmd=123&ext=mp4&hash=${id}&ismp3=0&key=kugoumvcloud&pid=6&ssl=1&appid=1014`
            const signature = getSignature(param)
            const url = `https://gateway.kugou.com/v2/interface/index?${param}&signature=${signature}`

            getJson(url).then(json => {
                const result = { id, platform: KuGou.CODE, url: '' }
                if(json.data) {
                    const urlData = json.data[toLowerCaseTrimString(id)]
                    if(urlData) {
                        Object.assign(result, {
                            url: urlData.downurl
                        })
                    }
                }
                resolve(result)
            })
        })
    }
}



/* 插件接入规范区 */
//插件启用
export const activate = async (plugin) => {
  registerPlatform(plugin, { 
    code: KuGou.CODE,
    vendor: KuGou,
    name: '酷狗音乐',
    shortName: 'KG',
    online: true,
    types: ['playlists', 'artists', 'albums'],
    scopes: ['playlists', 'artists', 'albums', 'search', 'userhome', 'random', 'united', 'resource-search'],
    artistTabs: [ 'all-songs', 'albums','about' ],
    searchTabs: [ 'all-songs', 'playlists', 'albums', 'videos' ],
    weight: 7
  })

  addRequestHandler(plugin, {
    id: KuGou.CODE,
    hosts: ['kugou'],
    defaultHeaders: {
        Origin: 'https://www.kugou.com/',
        Referer: 'https://www.kugou.com/'
    },
    includes: [{
      pattern: 'mac.kugou.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16) AppleWebKit/605.1.15 (KHTML, like Gecko)'
      }
    }, {
      pattern: '&cmd=123&ext=mp4&hash=',
      headers: {
        'X-Router': 'trackermv.kugou.com',
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - 酷狗音乐')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - 酷狗音乐')
}