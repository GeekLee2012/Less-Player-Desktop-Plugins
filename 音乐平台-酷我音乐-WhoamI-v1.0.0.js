/**
 * @name 音乐平台 - 酷我音乐
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toLowerCaseTrimString, toUpperCaseTrimString, toMMssSSS, getImageUrlByQuality,  } = utils
const { randomTextDefault, md5, sha1 } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson } = nets
const { APIPermissions, access } = permissions



//e2db8a61-afdb-11ec-9d7b-c9324a8678ec
//efe8c650-de5c-11ec-9d92-a133baea2d31
//8-4-4-4-12
const randomReqId = () => {
    return toLowerCaseTrimString(randomTextDefault(8)
        + '-' + randomTextDefault(4)
        + '-' + randomTextDefault(4)
        + '-' + randomTextDefault(4)
        + '-' + randomTextDefault(12)
    )
}

//const REQ_ID = randomReqId()

const CONFIG = { withCredentials: true }

const getSecretOffical = (t, e) => {
  if (null == e || e.length <= 0) return console.log('Please enter a password with which to encrypt the message.'),
    null;
  for (var n = '', i = 0; i < e.length; i++) n += e.charCodeAt(i).toString();
  var r = Math.floor(n.length / 5),
    o = parseInt(
      n.charAt(r) + n.charAt(2 * r) + n.charAt(3 * r) + n.charAt(4 * r) + n.charAt(5 * r)
    ),
    l = Math.ceil(e.length / 2),
    c = Math.pow(2, 31) - 1;
  if (o < 2) return console.log(
    'Algorithm cannot find a suitable hash. Please choose a different password. \nPossible considerations are to choose a more complex or longer password.'
  ),
    null;
  var d = Math.round(1000000000 * Math.random()) % 100000000;
  for (n += d; n.length > 10;) n = (
    parseInt(n.substring(0, 10)) + parseInt(n.substring(10, n.length))
  ).toString();
  n = (o * n + l) % c;
  var h = '',
    f = '';
  for (i = 0; i < t.length; i++) f += (h = parseInt(t.charCodeAt(i) ^ Math.floor(n / c * 255))) < 16 ? '0' + h.toString(16) : h.toString(16),
    n = (o * n + l) % c;
  for (d = d.toString(16); d.length < 8;) d = '0' + d;
  return f += d
}


const setupCookie = async () => {
    const hm_iuvt = {
      key: 'Hm_Iuvt_cdb524f42f0ce19b169a8071123a4727',
      value: randomTextDefault(32)
    }
    const kwCookie = await access(APIPermissions.GET_COOKIE, 'https://www.kuwo.cn/')

    if (kwCookie) {
      for (const [key, value] of Object.entries(kwCookie)) {
        if (key.toLowerCase().includes('hm_iuvt_')) {
          Object.assign(hm_iuvt, { key, value })
          break
        }
      }
    }
    const kw_token = toUpperCaseTrimString(randomTextDefault(10))
    //const hm_token = 'JBKeCaitKM6jTWMfdef4kJMF2BBf4T3z'
    const hm_token = randomTextDefault(32)
    //cookie = "Hm_lvt_cdb524f42f0ce19b169a8071123a4797=1651222601; _ga=GA1.2.1036906485.1647595722; kw_token=" + csrf
    const cookie = `kw_token=${kw_token};Hm_token=${hm_token};${hm_iuvt.key}=${hm_iuvt.value};`
    const cross = toLowerCaseTrimString(md5(toLowerCaseTrimString(sha1(hm_token))))
    const secret = getSecretOffical(hm_iuvt.value, hm_iuvt.key)

    return { cookie, cross, secret }
}

//TODO 图片清晰度，硬编码 => 正则
const KW_DEFAULT_COVER_URIS = ['/star/albumcover/300/30/92/3189025836.jpg']


const getAlbumCoverUrl = (url) => {
    return `https://img4.kuwo.cn/star/albumcover/${url}`
}

const getAlbumCoverByQuality = (url, sizes) => {
    if (!url) return url
    //https://img2.kuwo.cn/star/albumcover/500/s4s43/96/2244468602.jpg
    if(!url.includes('/albumcover/')) return url

    const matched = url.match(/\/albumcover\/\d{3,4}\//)
    if(!matched) return url

    let index = 0
    sizes = sizes || [180, 300, 500, 800, 1000]
    return getImageUrlByQuality([
        url.replace(matched[0], `/albumcover/${sizes[index++]}/`),
        url.replace(matched[0], `/albumcover/${sizes[index++]}/`),
        url.replace(matched[0], `/albumcover/${sizes[index++]}/`),
        url.replace(matched[0], `/albumcover/${sizes[index++]}/`),
        url.replace(matched[0], `/albumcover/${sizes[index++]}/`)
    ])
}

const getArtistCoverUrl = (url) => {
    return `https://img4.kuwo.cn/star/starheads/${url}`
}

const getArtistCoverByQuality = (url, sizes) => {
    if (!url) return url
    //https://img2.kuwo.cn/star/starheads/500/45/17/1666363020.jpg
    if(!url.includes('/starheads/')) return url

    const matched = url.match(/\/starheads\/\d{3,4}\//)
    if(!matched) return url

    let index = 0
    sizes = sizes || [180, 300, 500, 800, 1000]
    return getImageUrlByQuality([
        url.replace(matched[0], `/starheads/${sizes[index++]}/`),
        url.replace(matched[0], `/starheads/${sizes[index++]}/`),
        url.replace(matched[0], `/starheads/${sizes[index++]}/`),
        url.replace(matched[0], `/starheads/${sizes[index++]}/`),
        url.replace(matched[0], `/starheads/${sizes[index++]}/`)
    ])
}

const getCoverBySizesAndQuality = (url, sizes) => {
    if (!url) return url

    const matched = url.match(/_\d{3,4}\./)
    if(!matched) return url

    let index = 0
    sizes = sizes || [180, 300, 500, 800, 1000]
    return getImageUrlByQuality([
        url.replace(matched[0], `_${sizes[index++]}.`),
        url.replace(matched[0], `_${sizes[index++]}.`),
        url.replace(matched[0], `_${sizes[index++]}.`),
        url.replace(matched[0], `_${sizes[index++]}.`),
        url.replace(matched[0], `_${sizes[index++]}.`)
    ])
}

const getCoverByQuality = (url, sizes) => {
    if (!url) return url
    sizes = sizes || [180, 300, 500, 800, 1000]

    if(url.includes('/starheads/')) return getArtistCoverByQuality(url, sizes)
    if(url.includes('/albumcover/')) return getAlbumCoverByQuality(url, sizes)
    /*
    if(url.includes('_150.') || url.includes('_700.')) {
        sizes = [150, 300, 500, 700, 1000]
        return getCoverBySizesAndQuality(url, sizes)
    }
    */

    const matched = url.match(/_\d{3,4}\./)
    if(!matched) return url
    return getCoverBySizesAndQuality(url)
}


class KuWo {
    static CODE = 'kuwo'
    static TOPLIST_CODE = 'KW_RANKLIST'
    static TOPLIST_PREFIX = 'TOP_'
    static CACHE_TOPLISTS = new Map()

    //全部分类
    static categories() {
        return new Promise((resolve, reject) => {
            const result = { platform: KuWo.CODE, data: [], orders: [] }
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/www/playlist/getTagList?httpsStatus=1&reqId=${reqId}&plat=web_www`
            getJson(url, null, CONFIG).then(json => {
                const cateArray = json.data || []

                if (cateArray && cateArray.length > 0) {
                    const defaultCategory = new Category('精选')
                    defaultCategory.add('最新', '#new')
                    defaultCategory.add('最热', '#hot')
                    defaultCategory.add('排行榜', KuWo.TOPLIST_CODE)
                    result.data.push(defaultCategory)
                }

                cateArray.forEach(cate => {
                    const category = new Category(cate.name)
                    const cateItems = cate.data
                    cateItems.forEach(item => {
                        category.add(item.name, item.id)
                    })
                    if (category.data.length > 0) {
                        result.data.push(category)
                    }
                })
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌单(列表)广场
    static square(cate, offset, limit, page, order) {
        const originCate = cate
        let resolvedCate = (cate || '').toString().trim()
        resolvedCate = resolvedCate.length > 0 ? resolvedCate : '#new'
        if (resolvedCate == KuWo.TOPLIST_CODE) return KuWo.toplist(cate, offset, limit, page)
        return new Promise((resolve, reject) => {
            const result = { platform: KuWo.CODE, cate: originCate, offset, limit, page, total: 0, data: [] }
            //官方 rn = 20
            /*
            if (resolvedCate.startsWith('#')) {
                resolvedCate = resolvedCate.substring(1)
                url = `https://www.kuwo.cn/api/www/classify/playlist/getRcmPlayList?pn=${page}&rn=${limit}&order=${resolvedCate}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`
            } else {
                url = `https://www.kuwo.cn/api/www/classify/playlist/getTagPlayList?pn=${page}&rn=${limit}&id=${resolvedCate}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`
            }
            */
            /*
            const action = resolvedCate.startsWith('#') ? 'getRcmPlayList' : 'getTagPlayList'
            const cateIdName = resolvedCate.startsWith('#') ? 'order' : 'id'
            resolvedCate = resolvedCate.startsWith('#') ? resolvedCate.substring(1) : resolvedCate
            */

            const reqId = randomReqId()
            let action = 'getTagPlayList', cateIdName = 'id'
            if (resolvedCate.startsWith('#')) { //最新、最热
                resolvedCate = resolvedCate.substring(1)
                action = 'getRcmPlayList'
                cateIdName = 'order'
            }

            const url = `https://www.kuwo.cn/api/www/classify/playlist/${action}?pn=${page}&rn=${limit}&${cateIdName}=${resolvedCate}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`
            getJson(url, null, CONFIG).then(json => {
                const pagination = json.data
                //const page = pagination.pn
                const data = pagination.data
                result.total = Math.ceil(pagination.total / limit)

                data.forEach(item => {
                    const id = item.id
                    const cover = getCoverByQuality(item.img)
                    const title = item.name

                    if (id) {
                        const playlist = new Playlist(id, KuWo.CODE, cover, title)
                        playlist.total = item.total
                        playlist.playCount = parseInt(item.listencnt || 0)
                        result.data.push(playlist)
                    }
                })
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //排行榜列表
    static toplist(cate, offset, limit, page) {
        return new Promise((resolve) => {
            let result = { platform: KuWo.CODE, cate, offset: 0, limit: 100, page: 1, data: [] }
            if (page > 1) {
                resolve(result)
                return
            }
            const url = 'https://www.kuwo.cn/rankList'
            KuWo.CACHE_TOPLISTS.clear()
            getDoc(url).then(doc => {
                let scriptText = doc.querySelector('script').textContent
                let key = 'window.__NUXT__='
                if (scriptText.indexOf(key) != -1) {
                    scriptText = scriptText.split(key)[1]
                    //const json = eval(scriptText)
                    const json = Function(`return ${scriptText}`)()
                    //参考官方页面
                    const bangList = json.data[0].bangMenu
                    for (var i = 0; i < 3; i++) {
                        const bang = bangList[i]
                        bang.list.forEach(item => {
                            const id = KuWo.TOPLIST_PREFIX + item.sourceid
                            const detail = new Playlist(id, KuWo.CODE, getCoverByQuality(item.pic), item.name)
                            detail.about = item.intro
                            result.data.push(detail)

                            KuWo.CACHE_TOPLISTS.set(id, detail)
                        })
                    }
                }
                resolve(result)
            })
        })
    }

    //排行榜详情
    static toplistDetail(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const bangId = id.replace(KuWo.TOPLIST_PREFIX, '').trim()
            const url = 'https://www.kuwo.cn/api/www/bang/bang/musicList'
            const reqBody = {
                bangId,
                pn: page,
                rn: 20,
                httpsStatus: 1,
                reqId: randomReqId(),
                plat: 'web_www',
                from: ''
            }
            const result = new Playlist(id, KuWo.CODE)
            getJson(url, reqBody, CONFIG).then(json => {
                if (json.code != 200) {
                    resolve(result)
                    return
                }
                const cache = KuWo.CACHE_TOPLISTS.get(id)
                if (cache) {
                    result.cover = cache.cover
                    result.title = cache.title
                    result.about = cache.about
                }
                const { num: total, musicList } = json.data
                result.total = total
                const maxPage = Math.ceil(total / 20)
                if (page > maxPage) { // 超出最大页数后，KW居然还返回数据！！！
                    resolve(result)
                    return
                }

                const playlist = musicList
                playlist.forEach(item => {
                    const artist = [{ id: item.artistid, name: item.artist }]
                    const album = { id: item.albumid, name: item.album }
                    const duration = item.duration * 1000
                    const cover = getCoverByQuality(item.pic)
                    const track = new Track(item.rid, KuWo.CODE, item.name, artist, album, duration, getCoverByQuality(cover))
                    result.addTrack(track)
                })
                resolve(result)
            })
        })
    }

    //歌单详情
    static playlistDetail(id, offset, limit, page) {
        if (id.toString().startsWith(KuWo.TOPLIST_PREFIX)) return this.toplistDetail(id, offset, limit, page)
        return new Promise((resolve, reject) => {
            //TODO 官方 rn = 30
            const reqId = randomReqId()
            //const url = `https://www.kuwo.cn/api/www/playlist/playListInfo?pid=${id}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`
            const url = `https://www.kuwo.cn/api/www/playlist/playListInfo?pid=${id}&pn=${page}&rn=100&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`
            const result = new Playlist(id, KuWo.CODE)
            /*
            result.cover = json.data.img500
            result.title = json.data.name
            result.about = json.data.info
            result.total = json.data.total
            */
            
            getJson(url, null, CONFIG).then(json => {
                const { img500, img700, img300, info, total } = json.data
                Object.assign(result, {
                    cover: getCoverByQuality(img500 || img300 || img700),
                    title: json.data.name,
                    about: info,
                    total: total,
                    totalPage: Math.ceil(total / 100) //官方默认30，实际最多可以返回100首
                })
                const playlist = json.data.musicList
                playlist.forEach(item => {
                    const artist = [{ id: item.artistid, name: item.artist }]
                    const album = { id: item.albumid, name: item.album }
                    const duration = item.duration * 1000
                    const cover = getCoverByQuality(item.pic)

                    const track = new Track(item.rid, KuWo.CODE, item.name, artist, album, duration, cover)
                    if (item.hasmv == 1) track.mv = item.rid
                    track.pid = id
                    track.payPlay = item.isListenFee
                    track.payDownload = item.isListenFee
                    result.addTrack(track)
                })
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌曲播放详情：url、cover、lyric等
    static playDetail(id, track) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/v1/www/music/playUrl?mid=${id}&type=music&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`
            const result = new Track(id, KuWo.CODE)
            getJson(url, null, CONFIG).then(json => {
                try {
                    if (json.data) Object.assign(result, { url: json.data.url })
                    Object.assign(result, { cover: getCoverByQuality(cover) })
                } catch(error) {
                    console.log(error)
                }
                resolve(result)
            }, error => resolve(result)).catch(error => resolve(result))
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${id}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url, null, CONFIG).then(json => {
                const result = { id, platform: KuWo.CODE, lyric: new Lyric(), trans: null }
                if (!json.data) {
                    return resolve(result)
                }
                const lrclist = json.data.lrclist
                if (lrclist) {
                    lrclist.forEach(lineObj => {
                        const mmssSSS = toMMssSSS(lineObj.time * 1000)
                        const text = lineObj.lineLyric
                        result.lyric.addLine(mmssSSS, text)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌手详情：Name、Cover、简介(如果有)等
    static artistDetail(id) {
        return new Promise((resolve, reject) => {
            let url = `http://www.kuwo.cn/singer_detail/${id}`
            getDoc(url).then(doc => {
                let title = '', cover = '', about = ''

                let scriptText = doc.querySelector('script').textContent
                let key = 'window.__NUXT__='
                if (scriptText.indexOf(key) != -1) {
                    scriptText = scriptText.split(key)[1]
                    //const json = eval(scriptText)
                    const json = Function('return ' + scriptText)()

                    const singerInfo = json.data[0].singerInfo
                    title = singerInfo.name
                    //cover = singerInfo.pic300
                    cover = getCoverByQuality(singerInfo.pic300)
                    about = singerInfo.info
                }
                const result = { id, title, cover, about }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌手详情: 全部歌曲
    static artistDetailAllSongs(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `http://www.kuwo.cn/api/www/artist/artistMusic?artistid=${id}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url, null, CONFIG).then(json => {
                const total = json.data.total
                const totalPage = Math.ceil(total / 30)
                const data = []
                const list = json.data.list
                list.forEach(item => {
                    const artist = [{ id: item.artistid, name: item.artist }]
                    const album = { id: item.albumid, name: item.album }
                    const duration = item.duration * 1000
                    const cover = getCoverByQuality(item.pic)
                    const track = new Track(item.rid, KuWo.CODE, item.name, artist, album, duration, cover)
                    if (item.hasmv) track.mv = item.rid
                    data.push(track)
                })
                const result = { offset, limit, page, total, totalPage, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌手详情: 专辑
    static artistDetailAlbums(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `http://www.kuwo.cn/api/www/artist/artistAlbum?artistid=${id}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}`

            getJson(url, null, CONFIG).then(json => {
                const total = json.data.total
                const data = []
                const list = json.data.albumList
                list.forEach(item => {
                    const artist = [{ id: item.artistid, name: item.artist }]
                    const cover = getCoverByQuality(item.pic)
                    const album = new Album(item.albumid, KuWo.CODE, item.album, cover, artist,
                        null, item.releaseDate, item.albuminfo)
                    data.push(album)
                })
                const result = { offset, limit, page, total, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //专辑详情
    static albumDetail_v0(id) {
        return new Promise((resolve, reject) => {
            const url = `http://www.kuwo.cn/album_detail/${id}`

            getDoc(url).then(doc => {
                let name = '', cover = '', artist = [], company = '', publishTime = '', about = '', data = []

                let scriptText = doc.querySelector('script').textContent
                let key = 'window.__NUXT__='
                if (scriptText.indexOf(key) != -1) {
                    scriptText = scriptText.split(key)[1]
                    //const json = eval(scriptText)
                    const json = Function('return ' + scriptText)()
                    const pageData = json.data[0].pageData
                    const albumInfo = json.data[0].albumInfo

                    name = albumInfo.album
                    cover = getCoverByQuality(albumInfo.pic)
                    artist.push({ id: albumInfo.artistid, name: albumInfo.artist })
                    publishTime = albumInfo.releaseDate
                    about = albumInfo.albuminfo

                    albumInfo.musicList.forEach(item => {
                        const trackArtist = [{ id: item.artistid, name: item.artist }]
                        const trackAlbum = { id: item.albumid, name: item.album }
                        const duration = item.duration * 1000
                        const trackCover = getCoverByQuality(item.pic)
                        const track = new Track(item.rid, KuWo.CODE, item.name, trackArtist, trackAlbum, duration, trackCover)
                        if (item.hasmv) track.mv = item.rid
                        data.push(track)
                    })
                }
                const result = new Album(id, KuWo.CODE, name, cover, artist,
                    company, publishTime, about, data)
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //专辑详情
    static albumDetail(id) {
        return new Promise(async (resolve, reject) => {
            let page = 1, limit = 20, totalPage = 1
            let detail = await KuWo.doGetAlbumDetail(id, page++, limit)
            if (!detail) return resolve(null)
            let { album, total, data } = detail
            totalPage = Math.ceil(total / limit)
            while (totalPage >= page) {
                //目前KW太不稳定，经常返回599或430错误，所以数据不宜过多，截断就好
                if (page > 3) break
                detail = await KuWo.doGetAlbumDetail(id, page++, limit)
                if (!detail) return resolve(null)
                data.push(...detail.data)
            }
            const result = album
            album.data = data
            resolve(result)
        })
    }

    //专辑详情
    static doGetAlbumDetail(id, page, limit) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/www/album/albumInfo?albumId=${id}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www`

            getJson(url).then(json => {
                const artist = [], data = []
                const { album: name, pic, artistid, artist: aArtist, albuminfo: about, musicList, releaseDate: publishTime, total } = json.data
                const cover = getCoverByQuality(pic)
                artist.push({ id: artistid, name: aArtist })

                musicList.forEach(item => {
                    const trackArtist = [{ id: item.artistid, name: item.artist }]
                    const trackAlbum = { id: item.albumid, name: item.album }
                    const duration = item.duration * 1000
                    const trackCover = getCoverByQuality(item.pic)
                    const track = new Track(item.rid, KuWo.CODE, item.name, trackArtist, trackAlbum, duration, trackCover)
                    if (item.hasmv) track.mv = item.rid
                    data.push(track)
                })

                const album = new Album(id, KuWo.CODE, name, cover, artist,
                    null, publishTime, about)
                resolve({ album, page, limit, total, data })
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //搜索: 歌曲
    static searchSongs(keyword, offset, limit, page) {
        return KuWo.searchSongs_v1(keyword, offset, limit, page)
    }

    //搜索: 歌曲
    static searchSongs_v0(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            keyword = keyword.trim()
            const url = "https://www.kuwo.cn/api/www/search/searchMusicBykeyWord"
                + "?key=" + keyword + "&pn=" + page + "&rn=" + limit
                + "&httpsStatus=1&reqId=" + randomReqId()
                + "&plat=web_www&from="
            const result = { platform: KuWo.CODE, offset, limit, page, data: [] }
            getJson(url, null, CONFIG).then(json => {
                if (json.code == 200) {
                    const data = json.data.list.map(item => {
                        const artist = [{ id: item.artistid, name: item.artist }]
                        const album = { id: item.albumid, name: item.album }
                        const duration = item.duration * 1000
                        const cover = getCoverByQuality(item.pic)
                        const track = new Track(item.rid, KuWo.CODE, item.name, artist, album, duration, cover)
                        if (item.hasmv) track.mv = item.rid
                        return track
                    })
                    if (data && data.length > 0) result.data.push(...data)
                }
                resolve(result)
            }, error => resolve(result)).catch(error => resolve(result))
        })
    }

    //搜索: 歌曲
    static searchSongs_v1(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: KuWo.CODE, offset, limit, page, data: [] }

            keyword = keyword.trim()
            const url = 'http://search.kuwo.cn/r.s'
                + '?user=7cd972c0119949e98ebd20f18d508f62&idfa=&'
                + 'openudid=2057708153c9fc13f0e801c14d39af5fccdfdc60'
                + '&uuid=7cd972c0119949e98ebd20f18d508f62'
                + '&prod=kwplayer_mc_1.7.5&corp=kuwo'
                + '&source=kwplayer_mc_1.7.5&uid=2557120276'
                + '&ver=kwplayer_mc_1.7.3&loginid=0'
                + '&client=kt&cluster=0&strategy=2012'
                + '&ver=mbox&show_copyright_off=1'
                + '&encoding=utf8&rformat=json'
                + '&mobi=1&vipver=1'
                + `&pn=0&rn=${limit}`
                + `&all=${keyword}&ft=music`

            getJson(url, null, CONFIG).then(json => {
                const list = json.abslist
                const data = list.map(item => {
                    const artist = [{ id: item.ARTISTID, name: item.ARTIST }]
                    const album = { id: item.ALBUMID, name: item.ALBUM }
                    const duration = parseInt(item.DURATION) * 1000
                    const id = item.MUSICRID.replace('MUSIC_', '')
                    const track = new Track(id, KuWo.CODE, item.SONGNAME, artist, album, duration)
                    let cover = item.web_albumpic_short && getAlbumCoverUrl(item.web_albumpic_short)
                    if(!cover) cover = item.web_artistpic_short && getArtistCoverUrl(item.web_artistpic_short)
                    Object.assign(track, {
                        cover: getAlbumCoverByQuality(cover),
                    })
                    if (item.MVFLAG == "1") track.mv = id
                    return track
                })
                if (data && data.length > 0) result.data.push(...data)
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //搜索: 歌单
    static searchPlaylists(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/www/search/searchPlayListBykeyWord?key=${keyword}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url, null, CONFIG).then(json => {
                const data = json.data.list.map(item => {
                    const cover = getCoverByQuality(item.img)
                    const playlist = new Playlist(item.id, KuWo.CODE, cover, item.name)
                    return playlist
                })
                const result = { platform: KuWo.CODE, offset, limit, page, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //搜索: 专辑
    static searchAlbums(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/www/search/searchAlbumBykeyWord?key=${keyword}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url, null, CONFIG).then(json => {
                const data = json.data.albumList.map(item => {
                    const artist = [{ id: item.artistid, name: item.artist }]
                    const albumName = item.album
                    const cover = getCoverByQuality(item.pic)
                    const album = new Album(item.albumid, KuWo.CODE, albumName, cover, artist)
                    album.publishTime = item.releaseDate
                    return album
                })
                const result = { platform: KuWo.CODE, offset, limit, page, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //搜索: 歌手
    static searchArtists(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/www/search/searchArtistBykeyWord?key=${keyword}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url, null, CONFIG).then(json => {
                const data = json.data.artistList.map(item => {
                    return {
                        id: item.id,
                        platform: KuWo.CODE,
                        title: item.name,
                        //cover: item.pic300
                        cover: getCoverByQuality(item.pic300)
                    }
                })
                const result = { platform: KuWo.CODE, offset, limit, page, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //搜索: 视频
    static searchVideos(keyword, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/www/search/searchMvBykeyWord?key=${keyword}&pn=${page}&rn=${limit}&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url, null, CONFIG).then(json => {
                const data = json.data.mvlist.map(item => {
                    return {
                        id: item.id,
                        vid: item.id,
                        platform: KuWo.CODE,
                        title: item.name,
                        cover: getCoverByQuality(item.pic),
                        type: Playlist.VIDEO_TYPE,
                        subtitle: item.artist,
                        duration: (item.duration * 1000),
                        playCount: item.mvPlayCnt,
                        vcType: 0,
                    }
                })
                const result = { platform: KuWo.CODE, offset, limit, page, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌手分类
    static artistCategories() {
        return new Promise((resolve, reject) => {
            const result = { platform: KuWo.CODE, data: [], alphabet: new Category('字母') }
            const url = 'https://www.kuwo.cn/singers'

            getDoc(url).then(doc => {
                let els = doc.querySelectorAll(".main_con .tag_en li")
                els.forEach(el => {
                    const key = el.textContent.trim()
                    const value = key.replace('热门', '')
                    result.alphabet.add(key, value)
                })

                const category = new Category('默认')
                result.data.push(category)
                els = doc.querySelectorAll(".main_con .tag_kind li")
                for (var i = 0; i < els.length; i++) {
                    const key = els[i].textContent.trim()
                    const value = i
                    category.add(key, value)
                }
                resolve(result)
            })
        })
    }

    //提取分类
    static parseArtistCate(cate) {
        const result = { category: 0, prefix: '' }
        try {
            const source = {
                category: cate['默认'].item.value,
                prefix: encodeURIComponent(cate['字母'].item.value)
            }
            return Object.assign(result, source)
        } catch (error) {
            //console.log(error)
        }
        return result
    }

    //歌手(列表)广场
    static artistSquare(cate, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: KuWo.CODE, cate, offset, limit, page, total: 0, data: [] }
            const url = 'https://www.kuwo.cn/api/www/artist/artistInfo'

            const resolvedCate = KuWo.parseArtistCate(cate)
            const reqBody = {
                category: resolvedCate.category,
                prefix: '' + resolvedCate.prefix,
                pn: page,
                rn: 102,
                httpsStatus: 1,
                reqId: randomReqId()
            }
            getJson(url, reqBody).then(json => {
                const list = json.data.artistList
                list.forEach(item => {
                    const id = item.id
                    const title = item.name
                    //const cover = item.pic300 || item.pic || item.pic120 || item.pic70
                    const cover = getCoverByQuality(item.pic300)
                    const artist = { id, platform: KuWo.CODE, title, cover }
                    result.data.push(artist)
                })
                resolve(result)
            })
        })
    }

    static videoDetail(id, video) {
        return new Promise((resolve, reject) => {
            const reqId = randomReqId()
            const url = `https://www.kuwo.cn/api/v1/www/music/playUrl?mid=${id}&type=mv&httpsStatus=1&reqId=${reqId}&plat=web_www&from=`

            getJson(url).then(json => {
                const result = { id, platform: KuWo.CODE, url: '' }
                if (json.data) result.url = json.data.url || ''
                resolve(result)
            })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, { 
    code: KuWo.CODE,
    vendor: KuWo,
    name: '酷我音乐',
    shortName: 'KW',
    online: true,
    types: ['playlists', 'artists', 'albums', 'videos'],
    scopes: ['playlists', 'artists', 'albums', 'search', 'userhome', 'random', 'united', 'resource-search'],
    artistTabs: [ 'all-songs', 'albums','about' ],
    searchTabs: [ 'all-songs', 'playlists', 'albums', 'artists', 'videos' ],
    weight: 7
  })


  const { cookie, cross, secret } = await setupCookie()

  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: KuWo.CODE,
    hosts: ['kuwo'],
    ignoreHosts: ['u6.kuwo.cn'],
    defaultHeaders: {
        Origin: 'https://www.kuwo.cn/',
        Referer: 'https://www.kuwo.cn/',
        Cookie: cookie,
        Cross: cross,
        Secret: secret,
    },
    includes: [{
      pattern: 'bangId',
      headers: {
        Referer: 'https://www.kuwo.cn/rankList'
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - 酷我音乐')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, KuWo.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, KuWo.CODE)
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - 酷我音乐')
}