/**
 * @name 音乐平台 - 网易云音乐
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { isBlank, toTrimString, nextInt, toMillis, toYmd, getImageUrlByQuality, } = utils
const { md5, randomText, rsaEncrypt, aesDecryptText, aesEncryptDefault, aesEncryptHexText, } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson, } = nets
const { APIPermissions, access } = permissions




//常量
const MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b72'
    + '5152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbd'
    + 'a92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe48'
    + '75d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const NONCE = '0CoJUm6Qyw8W8jud'
const PUBLIC_KEY = '010001'
const IV = '0102030405060708'
const CHOICE = '012345679abcdef'
const EAPI_KEY = 'e82ckenh8dichen8'
const EAPI_PADDING_KEY = '36cd479b6b5'

//URL
const BASE_URL = 'https://music.163.com'

//Web版本API
const weapi = (text) => {
    if (typeof text === 'object') text = JSON.stringify(text)
    const secretkey = randomText(CHOICE, 16)
    const base64Text = aesEncryptDefault(text, null, NONCE, IV)
    const params = aesEncryptDefault(base64Text, null, secretkey, IV)
    const encSecKey = rsaEncrypt(secretkey.split('').reverse().join(''), PUBLIC_KEY, MODULUS)
    return { params, encSecKey }
}

//客户端版本API，参考：https://github.com/Binaryify/NeteaseCloudMusicApi
const eapi = (url, text) => {
    if (typeof text === 'object') text = JSON.stringify(text)
    const digest = md5(`nobody${url}use${text}md5forencrypt`)
    const data = [url, EAPI_PADDING_KEY, text, EAPI_PADDING_KEY, digest]
    const src = data.join('-')
    const params = aesEncryptHexText(src, 'ecb', EAPI_KEY, '').toUpperCase()
    return { params }
}

const eapiDecrypt = (src) => {
    return aesDecryptText(src, 'ecb', EAPI_KEY, '')
}

const trackIdsParam = (ids) => {
    const c = ids.map(id => ({ id }))
    return {
        c: JSON.stringify(c),
        ids: JSON.stringify(ids)
    }
}

const searchParam = (keyword, type, limit) => {
    return {
        hlpretag: '<span class="s-fc7">',
        hlposttag: '</span>',
        s: keyword,
        type,
        offset: 0,
        total: 0,
        limit: limit || 30,
        csrf_token: '',
    }
}

const searchParam_v1 = (keyword, type, limit) => {
    return {
        s: keyword,
        type: type,
        offset: 0,
        limit: limit || 30,
        total: true
    }
}

const getCoverByQuality = (url) => {
    if (!url) return url

    const index = url.indexOf('?')
    if(index > -1) url = url.substring(0, index)
    
    return getImageUrlByQuality([
        //`${url}?param=140y140`,
        `${url}?param=180y180`,
        `${url}?param=300y300`,
        `${url}?param=500y500`,
        `${url}?param=800y800`,
        `${url}?param=1000y1000`,
    ])
}


class NetEase {
    static CODE = 'netease'
    static TOPLIST_CODE = '排行榜'
    static RADIO_PREFIX = 'DJR_'

    static defaultCategory() {
        const cate = new Category('推荐')
        cate.add('默认', '')    
        cate.add('排行榜', NetEase.TOPLIST_CODE)
        return cate
    }

    //全部分类
    static categories() {
        return new Promise((resolve) => {
            const url = 'https://music.163.com/discover/playlist'
            getDoc(url).then(doc => {
                const result = { platform: NetEase.CODE, data: [], orders: [] }
                result.data.push(NetEase.defaultCategory())

                const listEl = doc.querySelectorAll("#cateListBox .f-cb")
                listEl.forEach(el => {
                    const cate = el.querySelector("dt").textContent
                    const category = new Category(cate)
                    const fcEls = el.querySelectorAll(".s-fc1")
                    fcEls.forEach(item => {
                        const text = item.textContent
                        category.add(text, text)
                    })
                    result.data.push(category)
                })
                resolve(result)
            })
        })
    }

    //歌单(列表)广场
    static square(cate, offset, limit, page, order) {
        if (cate == NetEase.TOPLIST_CODE) return NetEase.toplist(cate, offset, limit, page)
        return new Promise((resolve) => {
            const encCate = encodeURIComponent(cate)
            const url = `https://music.163.com/discover/playlist?cat=${encCate}&order=hot&limit=${limit}&offset=${offset}`
            getDoc(url).then(doc => {
                const result = { platform: NetEase.CODE, cate, offset, limit, page, total: 0, data: [] }
                const listEl = doc.querySelectorAll("#m-pl-container li")
                listEl.forEach(el => {
                    let id = null, cover = null, title = null, itemUrl = null, playCount = 0
                    const coverEl = el.querySelector(".u-cover img")
                    const titleEl = el.querySelector(".dec a")
                    const playCountEl = el.querySelector(".bottom .nb")

                    if (coverEl) {
                        cover = coverEl.getAttribute("src")
                        //cover = coverEl.getAttribute("src").replace("140y140", "500y500")
                        if (cover) cover = cover.split("?")[0]
                    }

                    if (titleEl) {
                        title = titleEl.textContent
                        itemUrl = titleEl.getAttribute('href')
                        id = itemUrl.split('=')[1]
                    }

                    if (playCountEl) {
                        playCount = parseInt(playCountEl.textContent || 0)
                    }

                    if (id && itemUrl) {
                        const playlist = new Playlist(id, NetEase.CODE, getCoverByQuality(cover), title, `${BASE_URL}${itemUrl}`)
                        playlist.playCount = playCount
                        result.data.push(playlist)
                    }
                })
                const pgEls = doc.querySelectorAll("#m-pl-pager .u-page .zpgi")
                if (pgEls && pgEls.length > 0) {
                    const totalEl = pgEls[pgEls.length - 1]
                    if (totalEl) result.total = parseInt(totalEl.textContent)
                }
                resolve(result)
            })
        })
    }

    //排行榜列表
    static toplist(cate, offset, limit, page) {
        return new Promise((resolve) => {
            const result = { platform: NetEase.CODE, cate, offset: 0, limit: 100, page: 1, total: 0, data: [] }
            if (page > 1) {
                resolve(result)
                return
            }
            const url = "https://music.163.com/discover/toplist"
            getDoc(url).then(doc => {
                const listEl = doc.querySelectorAll("#toplist li")
                listEl.forEach(el => {
                    let id = null, cover = null, title = null, itemUrl = null

                    const coverEl = el.querySelector(".mine .left img")
                    const titleEl = el.querySelector(".mine .name a")

                    if (coverEl) {
                        //cover = coverEl.getAttribute("src").replace("40y40", "500y500")
                        cover = coverEl.getAttribute("src")
                        if (cover) cover = cover.split("?")[0]
                    }

                    if (titleEl) {
                        title = titleEl.textContent
                        itemUrl = titleEl.getAttribute('href')
                        id = itemUrl.split('=')[1]
                    }

                    if (id && itemUrl) {
                        const detail = new Playlist(id, NetEase.CODE, getCoverByQuality(cover), title, itemUrl)
                        result.data.push(detail)
                    }
                });
                resolve(result)
            })
        })
    }

    //歌单详情
    static playlistDetail(id, offset, limit, page) {
        if (id.toString().startsWith(Playlist.ANCHOR_RADIO_ID_PREFIX)) return NetEase.anchorRadioDetail(id, offset, limit, page)
        return new Promise((resolve, reject) => {
            const result = new Playlist()
            let url = 'https://music.163.com/weapi/v3/playlist/detail'
            let param = {
                id,
                offset: 0,
                total: true,
                limit: 1000,
                n: 1000,
                csrf_token: ''
            }
            let reqBody = weapi(param)
            postJson(url, reqBody).then(json => {
                const playlist = json.playlist

                result.id = playlist.id
                result.platform = NetEase.CODE
                result.title = playlist.name
                result.cover = playlist.coverImgUrl
                result.about = playlist.description

                const ids = []
                playlist.trackIds.forEach(track => {
                    ids.push(track.id)
                })

                result.total = ids.length
                result.totalPage = Math.ceil(result.total / limit)
                const end = Math.min((offset + limit), result.total)

                url = 'https://music.163.com/weapi/v3/song/detail'
                param = trackIdsParam(ids.slice(offset, end))
                reqBody = weapi(param)
                postJson(url, reqBody).then(json => {
                    const songs = json.songs
                    songs.forEach(song => {
                        const artist = []
                        song.ar.forEach(e => artist.push({ id: e.id, name: e.name }))
                        const album = { id: song.al.id, name: song.al.name }
                        const track = new Track(song.id, NetEase.CODE, song.name, artist, album, song.dt, getCoverByQuality(song.al.picUrl))
                        track.mv = song.mv
                        track.pid = id
                        track.payPlay = (song.fee != 8 && song.fee != 0)
                        track.payDownload = (song.fee != 8 && song.fee != 0)
                        result.addTrack(track)
                    })
                    resolve(result)
                })
            })
        })
    }

    //歌曲播放详情：url、cover、lyric等
    static playDetail(id, track) {
        return new Promise((resolve, reject) => {
            NetEase.resolveAnchorRadio(id, track).then(resolvedId => {
                const url = 'https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token='
                const param = {
                    ids: [resolvedId],
                    level: 'standard',
                    encodeType: 'flac', //aac
                    csrf_token: ''
                }
                const reqBody = weapi(param)
                postJson(url, reqBody).then(json => {
                    const result = new Track(id)
                    const song = json.data[0]
                    result.url = song.url
                    result.cover = getCoverByQuality(track.cover)
                    resolve(result)
                })
            })
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            const url = 'https://music.163.com/weapi/song/lyric?csrf_token='
            const param = {
                id,
                lv: -1,
                tv: -1,
                csrf_token: ''
            }
            const reqBody = weapi(param)
            const result = { id, platform: NetEase.CODE, lyric: null, trans: null }
            postJson(url, reqBody).then(json => {
                const { lrc, tlyric } = json
                Object.assign(result, { lyric: Lyric.parseFromText(lrc.lyric) })
                if (tlyric) {
                    if (!isBlank(tlyric.lyric)) Object.assign(result, { trans: Lyric.parseFromText(tlyric.lyric) })
                }
                resolve(result)
            })
        })
    }

    //歌手详情：Name、Cover、简介(如果有)、热门歌曲等
    static artistDetail(id) {
        return new Promise((resolve, reject) => {
            const url = "https://music.163.com/artist" + "?id=" + id
            getDoc(url).then(doc => {
                const title = doc.querySelector("#artist-name").textContent
                let cover = doc.querySelector(".n-artist img").getAttribute('src')
                //cover = cover.replace('640y300', '500y500')
                if (cover) cover = cover.split('?')[0]

                const data = []
                const jsonText = doc.querySelector('#song-list-pre-data').textContent
                const songlist = JSON.parse(jsonText)
                songlist.forEach(item => {
                    const artist = []
                    const itemArtist = item.artists
                    itemArtist.forEach(ar => {
                        artist.push({ id: ar.id, name: ar.name })
                    })

                    const itemAlbum = item.album
                    const album = { id: itemAlbum.id, name: itemAlbum.name }
                    const albumCover = getCoverByQuality(itemAlbum.picUrl)

                    const track = new Track(item.id, NetEase.CODE, item.name,
                        artist, album, item.duration, albumCover)
                    track.mv = item.mvid
                    data.push(track)
                })

                const result = { id, platform: NetEase.CODE, title, cover: getCoverByQuality(cover), hotSongs: data }
                resolve(result)
            })
        })
    }

    //歌手详情：热门歌曲
    static artistDetailHotSongs(id) {
        return new Promise(async (resolve, reject) => {
            const result = await NetEase.artistDetail(id)
            const data = result.hotSongs
            result.data = data
            Reflect.deleteProperty(result, 'hotSongs')
            resolve(result)
        })
    }

    //歌手详情: 专辑
    static artistDetailAlbums(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const url = `https://music.163.com/artist/album?id=${id}&limit=${limit}&offset=${offset}`
            getDoc(url).then(doc => {
                const data = []

                const list = doc.querySelectorAll('#m-song-module li')
                list.forEach(el => {
                    const coverEl = el.querySelector('.u-cover')
                    const title = coverEl.getAttribute('title')
                    let cover = coverEl.querySelector('img').getAttribute('src')
                    //cover = cover.replace('120y120', '500y500')
                    if (cover) cover = cover.split('?')[0]

                    const id = coverEl.querySelector('.msk').getAttribute('href').split('=')[1]
                    const publishTime = el.querySelector(".s-fc3").textContent

                    const album = new Album(id, NetEase.CODE, title, getCoverByQuality(cover))
                    album.publishTime = publishTime
                    data.push(album)
                })
                const result = { id, offset, limit, page, data }
                resolve(result)
            })
        })
    }

    //歌手详情: 简介
    static artistDetailAbout(id) {
        return new Promise((resolve, reject) => {
            const url = `https://music.163.com/artist/desc?id=${id}`
            getDoc(url).then(doc => {
                const desc = doc.querySelector(".n-artdesc")
                const result = desc ? desc.innerHTML : null
                resolve(result)
            })
        })
    }

    //专辑详情
    static albumDetail(id) {
        return new Promise((resolve, reject) => {
            const url = `https://music.163.com/album?id=${id}`
            getDoc(url).then(doc => {
                const infoEl = doc.querySelector('.m-info ')
                let cover = infoEl.querySelector('.u-cover img').getAttribute('src')
                const title = infoEl.querySelector('.tit').textContent.trim()
                const introEl = infoEl.querySelectorAll('.intr')
                const artistName = introEl[0].querySelector('span').getAttribute('title')
                const artist = [{ id: 0, name: artistName }]
                let publishTime = ''
                let company = ''
                let about = ''
                if (introEl.length > 1) {
                    publishTime = introEl[1].lastChild.textContent
                }
                if (introEl.length > 2) {
                    company = introEl[2].lastChild.textContent
                }

                let pEl = doc.querySelector('.n-albdesc #album-desc-more')
                if (!pEl) {
                    pEl = doc.querySelector('.n-albdesc #album-desc-dot')
                }
                if (pEl) {
                    about = pEl.innerHTML
                }

                if (cover) cover = cover.split('?')[0]
                const result = new Album(id, NetEase.CODE, title, getCoverByQuality(cover), artist, company, publishTime, about)

                const predata = doc.querySelector('#song-list-pre-data')
                if (predata) {
                    const json = JSON.parse(predata.textContent)
                    json.forEach(item => {
                        const trackArtist = []
                        item.artists.forEach(ar => trackArtist.push({ id: ar.id, name: ar.name }))
                        const album = { id, name: title }
                        const trackCover = item.album.picUrl
                        const track = new Track(item.id, NetEase.CODE, item.name, trackArtist, album, item.duration, getCoverByQuality(trackCover))
                        track.mv = item.mvid
                        result.addTrack(track)
                    })
                }
                resolve(result)
            })
        })
    }

    //搜索: 歌曲
    static searchSongs(keyword, offset, limit, page) {
        keyword = toTrimString(keyword)
        return new Promise((resolve, reject) => {
            /*
            const url = 'https://music.163.com/weapi/cloudsearch/get/web'
            const param = searchParam(keyword, 1)
            const reqBody = weapi(param)
            */

            const url = 'https://music.163.com/eapi/cloudsearch/pc'
            const param = searchParam_v1(keyword, 1, 60)
            const reqBody = eapi('/api/cloudsearch/pc', param)

            const result = { platform: NetEase.CODE, offset, limit, page, data: [] }
            postJson(url, reqBody).then(json => {
                const list = json.result.songs
                const data = list.map(item => {
                    const artist = item.ar.map(e => ({ id: e.id, name: e.name }))
                    const album = { id: item.al.id, name: item.al.name }
                    const track = new Track(item.id, NetEase.CODE, item.name, artist, album, item.dt, getCoverByQuality(item.al.picUrl))
                    track.mv = item.mv
                    return track
                })
                if (data && data.length > 0) result.data.push(...data)
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 歌单
    static searchPlaylists(keyword, offset, limit, page) {
        keyword = toTrimString(keyword)
        return new Promise((resolve, reject) => {
            /*
            const url = 'https://music.163.com/weapi/cloudsearch/get/web'
            const param = searchParam(keyword, 1000)
            const reqBody = weapi(param)
            */
            const url = 'https://music.163.com/eapi/cloudsearch/pc'
            const param = searchParam_v1(keyword, 1000, 100)
            const reqBody = eapi('/api/cloudsearch/pc', param)

            const result = { platform: NetEase.CODE, offset, limit, page, data: [] }
            postJson(url, reqBody).then(json => {
                const list = json.result.playlists
                const data = list.map(item => {
                    const playlist = new Playlist(item.id, NetEase.CODE, getCoverByQuality(item.coverImgUrl), item.name)
                    return playlist
                })
                if (data && data.length > 0) result.data.push(...data)
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 专辑
    static searchAlbums(keyword, offset, limit, page) {
        keyword = toTrimString(keyword)
        return new Promise((resolve, reject) => {
            /*
            const url = 'https://music.163.com/weapi/cloudsearch/get/web'
            const param = searchParam(keyword, 10)
            const reqBody = weapi(param)
            */
            const url = 'https://music.163.com/eapi/cloudsearch/pc'
            const param = searchParam_v1(keyword, 10, 75)
            const reqBody = eapi('/api/cloudsearch/pc', param)

            const result = { platform: NetEase.CODE, offset, limit, page, data: [] }
            postJson(url, reqBody).then(json => {
                const list = json.result.albums
                const data = list.map(item => {
                    const artist = item.artists.map(e => ({ id: e.id, name: e.name }))
                    const album = new Album(item.id, NetEase.CODE, item.name, getCoverByQuality(item.picUrl), artist, item.company)
                    album.publishTime = toYmd(item.publishTime)
                    return album
                })
                if (data && data.length > 0) result.data.push(...data)
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 歌手
    static searchArtists(keyword, offset, limit, page) {
        keyword = toTrimString(keyword)
        return new Promise((resolve, reject) => {
            /*
            const url = 'https://music.163.com/weapi/cloudsearch/get/web'
            const param = searchParam(keyword, 100)
            const reqBody = weapi(param)
            */
            const url = 'https://music.163.com/eapi/cloudsearch/pc'
            const param = searchParam_v1(keyword, 100)
            const reqBody = eapi('/api/cloudsearch/pc', param)

            const result = { platform: NetEase.CODE, offset, limit, page, data: [] }
            postJson(url, reqBody).then(json => {
                const list = json.result.artists
                if (list) {
                    result.data = list.map(item => ({
                        id: item.id,
                        platform: NetEase.CODE,
                        title: item.name,
                        cover: getCoverByQuality(item.picUrl)
                    }))
                }
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 视频
    static searchVideos(keyword, offset, limit, page) {
        keyword = toTrimString(keyword)
        return new Promise((resolve, reject) => {
            /*
            const url = 'https://music.163.com/weapi/cloudsearch/get/web'
            const param = searchParam(keyword, 1014)
            const reqBody = weapi(param)
            */
            const url = 'https://music.163.com/eapi/cloudsearch/pc'
            const param = searchParam_v1(keyword, 1014, 60)
            const reqBody = eapi('/api/cloudsearch/pc', param)

            const result = { platform: NetEase.CODE, offset, limit, page, data: [] }
            postJson(url, reqBody).then(json => {
                const list = json.result.videos
                if (list) {
                    result.data = list.map(item => ({
                        id: item.vid,
                        vid: item.vid,
                        platform: NetEase.CODE,
                        title: item.title,
                        cover: getCoverByQuality(item.coverUrl),
                        type: Playlist.VIDEO_TYPE,
                        subtitle: NetEase.getVideoSutitle(item.creator),
                        duration: item.durationms,
                        playCount: item.playTime,
                        vcType: 0,
                    }))
                }
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    static getVideoSutitle(user) {
        let subtitle = ''
        if (user && Array.isArray(user) && user.length > 0) {
            const names = []
            user.forEach(e => names.push(e.userName));
            subtitle = names.join('、')
        }
        return subtitle
    }

    static searchLyrics(keyword, offset, limit, page) {
        keyword = toTrimString(keyword)
        return new Promise((resolve, reject) => {
            const url = 'https://music.163.com/eapi/cloudsearch/pc'
            const param = searchParam_v1(keyword, 1006, 60)
            const reqBody = eapi('/api/cloudsearch/pc', param)

            const result = { platform: NetEase.CODE, offset, limit, page, data: [] }
            postJson(url, reqBody).then(json => {
                console.log(json)
            })
        })
    }

    //歌手分类
    static artistCategories() {
        return new Promise((resolve, reject) => {
            const result = { platform: NetEase.CODE, data: [], alphabet: NetEase.getAlphabetCategory() }
            const url = 'https://music.163.com/discover/artist'
            getDoc(url).then(doc => {
                const els = doc.querySelectorAll('#singer-cat-nav li')
                const category = new Category('默认')
                result.data.push(category)
                els.forEach(el => {
                    const aEl = el.querySelector('a')
                    const href = aEl.getAttribute('href').trim()
                    const dataAttr = aEl.getAttribute('data-cat')
                    const name = aEl.textContent.trim()
                    let value = dataAttr ? dataAttr.trim() : '0'
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
        category.add('全部', '-1')
        category.add('其他', '0')
        const array = alphabet.split('')
        for (let i = 0; i < array.length; i++) {
            category.add(array[i], array[i].charCodeAt(0))
        }
        return category
    }

    //提取分类
    static parseArtistCate(cate) {
        const result = { id: -1, initial: -1 }
        try {
            const source = {
                id: cate['默认'].item.value,
                initial: cate['字母'].item.value
            }
            return Object.assign(result, source)
        } catch (error) {
            //console.log(error)
        }
        return result
    }

    //歌手(列表)广场
    static artistSquare(cate, offset, limit, page) {
        //提取分类
        const resolvedCate = NetEase.parseArtistCate(cate)
        //分类ID
        const cateId = parseInt(resolvedCate.id)
        //推荐歌手
        if (cateId < 1) return NetEase.recommandArtists(cate, offset, limit, page)
        //入驻歌手
        else if (cateId == 5001) return NetEase.signedArtists(cate, offset, limit, page)
        //其他歌手分类
        return new Promise((resolve, reject) => {
            const result = { platform: NetEase.CODE, cate, offset, limit, page, total: 0, data: [] }
            const url = 'https://music.163.com/discover/artist/cat'
            const reqBody = {
                id: cateId,
                initial: resolvedCate.initial
            }
            getDoc(url, reqBody).then(doc => {
                const els = doc.querySelectorAll('.m-sgerlist li')
                els.forEach(el => {
                    let cover = null
                    const coverEl = el.querySelector('.u-cover')
                    if (coverEl) {
                        cover = coverEl.querySelector('img').getAttribute('src')
                        //.replace("130y130", "500y500")
                        if (cover) cover = cover.split('?')[0]
                    }
                    const aEl = el.querySelector('.nm')
                    const id = aEl.getAttribute('href').split('?id=')[1]
                    const title = aEl.textContent
                    const artist = { id, platform: NetEase.CODE, title, cover: getCoverByQuality(cover) }
                    result.data.push(artist)
                })
                resolve(result)
            })
        })
    }

    //热门歌手
    static topArtists() {
        return new Promise((resolve, reject) => {
            const url = 'https://music.163.com/weapi/artist/top'
            const param = {
                offset: 0,
                total: true,
                limit: 100,
                csrf_token: ''
            }
            const reqBody = weapi(param)
            const result = []
            postJson(url, reqBody).then(json => {
                const list = json.artists
                list.forEach(item => {
                    const id = item.id
                    const title = item.name
                    const cover = item.picUrl
                    const artist = { id, platform: NetEase.CODE, title, cover: getCoverByQuality(cover) }
                    result.push(artist)
                    resolve(result)
                })
            })
        })
    }

    //推荐歌手
    static recommandArtists(cate, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: NetEase.CODE, cate, offset, limit, page, total: 0, data: [] }
            if (page > 1) { //TODO
                resolve(result)
                return
            }
            const url = 'https://music.163.com/discover/artist/'
            getDoc(url).then(doc => {
                const els = doc.querySelectorAll('.m-sgerlist li')
                els.forEach(el => {
                    let cover = null
                    const coverEl = el.querySelector('.u-cover')
                    if (coverEl) {
                        cover = coverEl.querySelector('img').getAttribute('src')
                        //.replace("130y130", "500y500")
                        if (cover) cover = cover.split('?')[0]
                    }
                    const aEl = el.querySelector('.nm')
                    const id = aEl.getAttribute('href').split('?id=')[1]
                    const title = aEl.textContent
                    const artist = { id, platform: NetEase.CODE, title, cover: getCoverByQuality(cover), }
                    result.data.push(artist)
                })
                return result
            }).then(result => {
                NetEase.topArtists().then(data => {
                    result.data.push(...data)
                    resolve(result)
                })
            })
        })
    }

    //入驻歌手
    static signedArtists(cate, offset, limit, page) {
        limit = 60
        offset = (page - 1) * limit
        return new Promise((resolve, reject) => {
            const result = { platform: NetEase.CODE, cate, offset, limit, page, total: 0, data: [] }
            //const url = 'https://music.163.com/discover/artist/signed'
            const url = 'https://music.163.com/weapi/artist/list'
            const param = {
                categoryCode: '5001',
                offset,
                total: false,
                limit,
                csrf_token: ''
            }
            const reqBody = weapi(param)
            postJson(url, reqBody).then(json => {
                const list = json.artists
                list.forEach(item => {
                    const id = item.id
                    const title = item.name
                    const cover = item.picUrl
                    const artist = { id, platform: NetEase.CODE, title, cover: getCoverByQuality(cover) }
                    result.data.push(artist)
                })
                resolve(result)
            })
        })
    }

    static radioCategories() {
        return NetEase.anchorRadioCategories()
    }

    static radioSquare(cate, offset, limit, page, order) {
        return NetEase.anchorRadioSquare(cate, offset, limit, page, order)
    }

    static anchorRadioCategories() {
        return new Promise((resolve, reject) => {
            const url = 'https://music.163.com/discover/djradio'
            getDoc(url).then(doc => {
                const result = { platform: NetEase.CODE, data: [], orders: [] }
                const category = new Category("分类")
                result.data.push(category)

                const listEl = doc.querySelectorAll("#id-category-box .f-cb li")
                listEl.forEach(el => {
                    const text = el.querySelector("em").textContent
                    if (['常见问题', '我要做主播'].indexOf(text) > -1) return
                    const href = el.querySelector("a").getAttribute("href")
                    const value = href.split("?id=")[1]
                    category.add(text, value)
                })
                result.orders.push(...[{
                    key: "上升最快",
                    value: 1
                }, {
                    key: "最热电台",
                    value: 2
                }])
                resolve(result)
            })
        })
    }

    static anchorRadioSquare(cate, offset, limit, page, order) {
        order = order || 1
        return new Promise((resolve, reject) => {
            const url = `https://music.163.com/discover/djradio/category?id=${cate}&order=${order}&_hash=allradios&limit=${limit}&offset=${offset}`
            getDoc(url).then(doc => {
                const result = { platform: NetEase.CODE, cate, offset, limit, page, total: 0, data: [] }
                //优质新电台
                let listEl = null
                if (page == 1) {
                    listEl = doc.querySelectorAll(".m-radio > .new li")
                    listEl.forEach(el => {
                        let id = null, cover = null, title = null, itemUrl = null

                        const coverEl = el.querySelector(".u-cover img")
                        const titleEl = el.querySelector(".f-fs2 a")

                        if (coverEl) {
                            cover = coverEl.getAttribute("src")
                            //.replace("200y200", "500y500")
                            if (cover) cover = cover.split('?')[0]
                        }

                        if (titleEl) {
                            title = titleEl.textContent
                            itemUrl = titleEl.getAttribute('href')
                            id = Playlist.ANCHOR_RADIO_ID_PREFIX + itemUrl.split('=')[1]
                        }

                        if (id && itemUrl) {
                            const detail = new Playlist(id, NetEase.CODE, getCoverByQuality(cover), title, `${BASE_URL}${itemUrl}`)
                            result.data.push(detail)
                        }
                    })
                }
                const pgEls = doc.querySelectorAll("#allradios .u-page .zpgi")
                if (pgEls && pgEls.length > 0) {
                    const totalEl = pgEls[pgEls.length - 1]
                    if (totalEl) result.total = parseInt(totalEl.textContent)
                }

                //电台排行榜
                listEl = doc.querySelectorAll("#allradios .rdilist li")
                listEl.forEach(el => {
                    let id = null, cover = null, title = null, itemUrl = null

                    const coverEl = el.querySelector(".u-cover img")
                    const titleEl = el.querySelector(".cnt .f-fs3 a")

                    if (coverEl) {
                        cover = coverEl.getAttribute("src")
                        //.replace("200y200", "500y500")
                        if (cover) cover = cover.split('?')[0]
                    }

                    if (titleEl) {
                        title = titleEl.textContent
                        itemUrl = titleEl.getAttribute('href')
                        id = Playlist.ANCHOR_RADIO_ID_PREFIX + itemUrl.split('=')[1]
                    }

                    if (id && itemUrl) {
                        const detail = new Playlist(id, NetEase.CODE, getCoverByQuality(cover), title, `${BASE_URL}${itemUrl}`)
                        result.data.push(detail)
                    }
                })
                resolve(result)
            })
        })
    }

    static anchorRadioDetail(id, offset, limit, page) {
        const resolvedId = id.replace(Playlist.ANCHOR_RADIO_ID_PREFIX, "")
        const resolveOffset = (page - 1) * 100
        return new Promise((resolve, reject) => {
            const url = `https://music.163.com/djradio?id=${resolvedId}&order=1&_hash=programlist&limit=100&offset=${resolveOffset}`
            getDoc(url).then(doc => {
                const coverEl = doc.querySelector(".m-info .cover img")
                const title = doc.querySelector(".m-info .tit").textContent.trim()
                const about = doc.querySelector(".m-info .intr").textContent.trim()
                const result = new Playlist(id, NetEase.CODE, null, title, url, about)
                result.type = Playlist.ANCHOR_RADIO_TYPE
                if (coverEl) {
                    let cover = coverEl.getAttribute("src")
                    //.replace("200y200", "500y500")
                    if (cover) cover = cover.split('?')[0]
                    result.cover = getCoverByQuality(cover)
                }
                const subtitleEl = doc.querySelector(".n-songtb .u-title .sub")
                if (subtitleEl) {
                    const subtitle = subtitleEl.textContent.replace('共', '').replace('期', '').trim()
                    result.total = parseInt(subtitle)
                }

                const artistName = doc.querySelector(".cnt .name").textContent.trim()
                const trEls = doc.querySelectorAll('.n-songtb tbody tr')
                trEls.forEach(trEl => {
                    const songlistId = trEl.getAttribute("id").replace('songlist-', '')
                    const tid = NetEase.RADIO_PREFIX + trEl.querySelector(".tt a").getAttribute("href").split("=")[1]
                    const tTitle = trEl.querySelector(".tt a").getAttribute("title")
                    const artist = [{ id: '', name: artistName }]
                    const album = { id, name: title }
                    const duration = toMillis(trEl.querySelector(".f-pr .s-fc4").textContent)
                    const updateTime = trEl.querySelector(".col5 .s-fc4").textContent

                    const track = new Track(tid, NetEase.CODE, tTitle, artist, album, duration, result.cover)
                    track.type = result.type
                    track.pid = id
                    track.songlistId = songlistId
                    track.extra2 = updateTime
                    track.lyric.addLine('999:99.000', about)

                    result.addTrack(track)
                })
                resolve(result)
            })
        })
    }

    static resolveAnchorRadio(id, track) {
        return new Promise((resolve, reject) => {
            if (id.toString().startsWith(NetEase.RADIO_PREFIX)) id = track.songlistId
            resolve(id)
        })
    }

    //视频播放详情：url、cover等
    static videoDetail(id, video) {
        return new Promise((resolve, reject) => {
            let url = 'https://music.163.com/weapi/v1/mv/detail?csrf_token='
            let param = {
                id,
                type: 'MP4', //TODO
                csrf_token: ''
            }
            let reqBody = weapi(param)
            postJson(url, reqBody).then(json => {
                let maxQuality = 0
                json.data.brs.forEach(item => {
                    maxQuality = Math.max(maxQuality, item.br)
                })
                maxQuality = maxQuality || 1080
                url = 'https://music.163.com/weapi/song/enhance/play/mv/url?csrf_token='
                param = {
                    id,
                    r: maxQuality,
                    csrf_token: ""
                }
                reqBody = weapi(param)
                postJson(url, reqBody).then(json => {
                    const result = { id, platform: NetEase.CODE, url: '' }
                    result.url = json.data.url
                    resolve(result)
                })
            })
        })
    }

}


/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, { 
    code: NetEase.CODE,
    vendor: NetEase,
    name: '网易云音乐',
    shortName: 'WY',
    online: true,
    types: ['playlists', 'artists', 'albums', 'anchor-radios', 'videos'],
    scopes: ['playlists', 'artists', 'albums', 'radios', 'search', 'userhome', 'random', 'united'],
    artistTabs: [ 'hot-songs', 'albums','about' ],
    searchTabs: [ 'all-songs', 'playlists', 'albums', 'artists', 'videos' ],
    weight: 8
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)
 
  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: NetEase.CODE,
    hosts: ['163.com', '126.net'],
    defaultHeaders: {
        Origin: 'https://music.163.com/',
        Referer: 'https://music.163.com/'
    },
    includes: [{
      pattern: '/cloudsearch/',
      headers: {
        Origin: 'https://music.163.com/search/',
        Referer: 'https://music.163.com/search/'
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - 网易云音乐')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, NetEase.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, NetEase.CODE)
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - 网易云音乐')
}