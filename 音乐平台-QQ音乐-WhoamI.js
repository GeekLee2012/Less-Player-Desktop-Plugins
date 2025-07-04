/**
 * @name 音乐平台 - QQ音乐
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, nextInt, getImageUrlByQuality,  } = utils
const { base64Stringify, base64Parse, hexDecode } = crypto
const { getDoc, getJson, getRaw, postJson } = nets
const { registerPlatform, addRequestHandler } = permissions




//@param ignore 是否忽略&字符
const escapeHtml = (text, ignore) => {
    if (!text) return null
    const regex = ignore ? (/#\d+;/g) : (/[&]#\d+;/g)
    return text.replace(regex, '')
        .replace(/&apos;/g, "'")
}

const moduleReq = (module, method, param) => {
    return { module, method, param }
}

const getArtistCover = (artistmid, size) => {
    if (!artistmid) return ''

    size = size || 300
    return `http://y.gtimg.cn/music/photo_new/T001R${size}x${size}M000${artistmid}.jpg`
}

const getAlbumCover = (albummid, size) => {
    if (!albummid) return ''

    size = size || 300
    return `https://y.qq.com/music/photo_new/T002R${size}x${size}M000${albummid}.jpg?max_age=2592000`
}

//TODO 强行转换，可能导致url不存在
const getCoverByQuality = ({ artistMid, albumMid, cover, sizes }) => {
    sizes = sizes || [180, 300, 500, 800, 1000]
    let index = 0
    if (artistMid) {
        return getImageUrlByQuality([
            getArtistCover(artistMid, sizes[index++]),
            getArtistCover(artistMid, sizes[index++]),
            getArtistCover(artistMid, sizes[index++]),
            getArtistCover(artistMid, sizes[index++]),
            getArtistCover(artistMid, sizes[index++])
        ])
    }
    if (albumMid) {
        return getImageUrlByQuality([
            getAlbumCover(albumMid, sizes[index++]),
            getAlbumCover(albumMid, sizes[index++]),
            getAlbumCover(albumMid, sizes[index++]),
            getAlbumCover(albumMid, sizes[index++]),
            getAlbumCover(albumMid, sizes[index++])
        ])
    }
    if(cover) {
        let matched = cover.match(/\/\d{3,4}\?n=1/)
        if(matched) {
            sizes = [180, 300, 600, 600, 1000]
            return getImageUrlByQuality([
                cover.replace(matched[0], `/${sizes[index++]}?n=1`),
                cover.replace(matched[0], `/${sizes[index++]}?n=1`),
                cover.replace(matched[0], `/${sizes[index++]}?n=1`),
                cover.replace(matched[0], `/${sizes[index++]}?n=1`),
                cover.replace(matched[0], `/${sizes[index++]}?n=1`)
            ])
        }
        //http://y.gtimg.cn/music/photo_new/T015R640x360M000003qFPPK1D0stP.jpg
        matched = cover.match(/\/T015R\d{3,4}x\d{3,4}M/)
        if(matched) {
            return getImageUrlByQuality([
                cover.replace(matched[0], `/T015R${sizes[index]}x${sizes[index++]}M`),
                cover.replace(matched[0], `/T015R${sizes[index]}x${sizes[index++]}M`),
                cover.replace(matched[0], `/T015R${sizes[index]}x${sizes[index++]}M`),
                cover.replace(matched[0], `/T015R${sizes[index]}x${sizes[index++]}M`),
                cover.replace(matched[0], `/T015R${sizes[index]}x${sizes[index++]}M`),
            ])
        }
    }
    return cover || ''
}

const getTrackTypeMeta = (typeName) => {
    return {
        m4a: {
            prefix: 'C400',
            ext: '.m4a',
        },
        128: {
            prefix: 'M500',
            ext: '.mp3',
        },
        320: {
            prefix: 'M800',
            ext: '.mp3',
        },
        ape: {
            prefix: 'A000',
            ext: '.ape',
        },
        flac: {
            prefix: 'F000',
            ext: '.flac',
        }
    }[typeName]
}

//TODO
const vkeyReqData = (trackInfo, type) => {
    const { mid: mediaId, type: songtype } = trackInfo
    const filename = [type].map(item => {
        const { prefix, ext } = getTrackTypeMeta(item)
        return `${prefix}${mediaId}${mediaId}${ext}`
    })

    const guid = nextInt(10000000).toFixed(0)
    const uin = "0"
    return {
        comm: {
            uin,
            format: 'json',
            ct: 24,
            cv: 0
        },
        req_1: moduleReq('vkey.GetVkeyServer', 'CgiGetVkey',
            {
                filename,
                guid,
                songmid: [mediaId],
                songtype: [songtype],
                uin,
                loginflag: 1,
                platform: "20"
            })
    }
}

const vkeyReqBody = (trackInfo, type) => {
    return {
        '-': 'getplaysongvkey',
        'g_tk': 5381,
        loginUin: 0,
        hostUin: 0,
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf8',
        notice: 1,
        platform: 'yqq.json',
        needNewCode: 0,
        data: JSON.stringify(vkeyReqData(trackInfo, type))
    }
}

const artistHotSongReqBody = (id, offset, limit) => {
    return {
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0
            },
            req_1: moduleReq('music.web_singer_info_svr', 'get_singer_detail_info', {
                sort: 5,
                singermid: id,
                sin: offset,
                num: limit
            })
        })
    }
}

const artistAlbumReqBody = (id, offset, limit) => {
    return {
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0
            },
            req_1: moduleReq('music.web_singer_info_svr', 'get_singer_album',
                {
                    singermid: id,
                    order: "time",
                    begin: offset,
                    num: limit,
                    exstatus: 1
                })
        })
    }
}

const albumAllSongsReqBody = (id, offset, limit) => {
    return {
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 10000
            },
            req_1: moduleReq('music.musichallAlbum.AlbumSongList', 'GetAlbumSongList',
                {
                    albumMid: id,
                    albumID: 0,
                    begin: offset,
                    num: limit,
                    order: 2
                })
        })
    }
}

const searchParam = (keyword, type, offset, limit, page) => {
    const types = {
        0: 'song',
        2: 'songlist',
        7: 'lyric',
        8: 'album',
        9: 'singer',
        12: 'mv'
    }
    keyword = toTrimString(keyword)
    return {
        format: 'json',
        n: limit,
        p: page,
        w: keyword,
        cr: 1,
        g_tk: 5381,
        t: type
    }
}

const searchParam_v1 = (keyword, type, offset, limit, page) => {
    keyword = toTrimString(keyword)
    return {
        comm: {
            ct: '6',
            cv: '80500'
        },
        req_1: moduleReq('music.search.SearchCgiService', 'DoSearchForQQMusicDesktop',
            {
                num_per_page: 30,
                page_num: page,
                query: keyword,
                search_type: type,
                grp: 1
            })
    }
}

const topListReqBody = () => {
    return {
        _: Date.now(),
        uin: 0,
        format: 'json',
        inCharset: "utf8",
        outCharset: "utf8",
        notice: 0,
        platform: "yqq.json",
        needNewCode: 1,
        g_tk: 5381,
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0
            },
            req_1: moduleReq('musicToplist.ToplistInfoServer', 'GetAll', {})
        })
    }
}

const topListDetailReqBody = (id, offset, limit, page) => {
    return {
        g_tk: 5381,
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0
            },
            req_1: moduleReq('musicToplist.ToplistInfoServer', 'GetDetail',
                {
                    topid: id,
                    offset,
                    num: 100,
                    period: getPerid(id)
                })
        })
    }
}

const playlistRadiosReqBody = () => {
    return {
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf8',
        notice: 0,
        platform: 'yqq.json',
        needNewCode: 1,
        loginUin: 0,
        hostUin: 0,
        g_tk: 5381,
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0
            },
            req_1: moduleReq('pf.radiosvr', 'GetRadiolist', { ct: 24 })
        })
    }
}

const radioSonglistReqBody = (id, firstplay) => {
    if (typeof id == 'string') id = parseInt(id.trim())
    return {
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf8',
        notice: 0,
        platform: 'yqq.json',
        needNewCode: 1,
        loginUin: 0,
        hostUin: 0,
        g_tk: 5381,
        data: JSON.stringify({
            comm: {
                ct: 24,
                cv: 0
            },
            req_1: moduleReq('pf.radiosvr', 'GetRadiosonglist',
                {
                    id,
                    firstplay, //数字：0或1
                    num: 10
                })
        })
    }
}

//TODO 目前部分周期计算不准确
/* 获取更新周期 */
const getPerid = (id) => {
    const date = new Date()
    const yyyy = date.getFullYear()
    let mm = date.getMonth() + 1
    let dd = date.getDate()
    const day = date.getDay()
    mm = mm < 10 ? ('0' + mm) : mm
    const d0 = dd < 10 ? ('0' + dd) : dd
    let period = yyyy + "-" + mm + "-" + d0
    let week = 1
    //默认每天
    switch (id) {
        //每天
        case 27:
        case 62:
            break
        //每周几?
        case 4:
        case 52:
        case 67:
            let d2 = day < 6 ? (dd - day + 1) : dd
            d2 = d2 < 10 ? ('0' + d2) : d2
            period = yyyy + "-" + mm + "-" + d2
            break
        //
        case 130:
            break
        //每n周?
        case 131:
            week = getWeek(period) - 8
            week = week < 10 ? ('0' + week) : week
            period = date.getFullYear() + "_" + week;
            break
        //每周
        default:
            week = getWeek(period) - 1
            week = week < 10 ? ('0' + week) : week
            period = date.getFullYear() + "_" + week;
            break
    }
    return period
}

const getWeek = (dt) => {
    let d1 = new Date(dt)
    let d2 = new Date(d1.getFullYear() + "-" + "01-01")
    let millis = d1 - d2
    let days = Math.ceil(millis / (24 * 60 * 60 * 1000))
    let num = Math.ceil(days / 7)
    return num
}

//新版本歌词信息
const lyricExtReqBody = (id, track) => {
    const { title, artist, album, duration, songID } = track
    const songName = base64Stringify(title)
    const singerName = base64Stringify(artist[0].name)
    const albumName = base64Stringify(album.name)
    const interval = parseInt(duration / 1000)
    return {
        data: JSON.stringify({
            comm: {
                "tmeAppID": "qqmusic",
                "authst": "",
                "uid": "5019772269",
                "gray": "1",
                "OpenUDID": "2057708153c9fc13f0e801c14d39af5fccdfdc60",
                "ct": "6",
                "patch": "2",
                "sid": "202304202127285019772269",
                "wid": "2722428046011261952",
                "cv": "80605",
                //"gzip" : "1",
                "qq": "",
                "nettype": "2"
            },
            req_1: moduleReq('music.musichallSong.PlayLyricInfo', 'GetPlayLyricInfo',
                {
                    "trans_t": 0,
                    "roma_t": 0,
                    "crypt": 0,
                    "lrc_t": 0,
                    interval,
                    "trans": 1,
                    "ct": 6,
                    singerName,
                    "type": 0,
                    "qrc_t": 0,
                    "cv": 80605,
                    "roma": 1,
                    songID,
                    "qrc": 0,
                    albumName,
                    songName
                })
        })
    }
}

const shuffle = (arr) => {
    let i = arr.length
    while (i) {
        let j = Math.floor(Math.random() * i--);
        [arr[j], arr[i]] = [arr[i], arr[j]]
    }
}

//旧版API，参考： https://github.com/jsososo/QQMusicApi/
class QQ {
    static CODE = "qq"
    static DEFAULT_CATE = 10000000
    static NEW_CODE = 22222222
    static TOPLIST_CODE = 99999999
    static RADIO_CODE = 88888888
    static TOPLIST_PREFIX = "TOP_"
    static RADIO_CACHE = { channel: 0, data: [] }

    //全部分类
    static categories() {
        return QQ.categories_v1()
    }

    //全部分类
    static categories_v0() {
        return new Promise((resolve, reject) => {
            const url = "https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_tag_conf.fcg"
            const reqBody = {
                format: 'json',
                inCharset: 'utf8',
                outCharset: 'utf8'
            }
            const result = { platform: QQ.CODE, data: [], orders: [] }
            getJson(url, reqBody).then(json => {
                const cateNameCached = []
                const list = json.data.categories
                list.forEach(cate => {
                    const cateName = cate.categoryGroupName
                    const category = new Category(cateName)
                    const items = cate.items
                    items.forEach(item => {
                        const name = item.categoryName
                        const id = item.categoryId
                        category.add(name, id)
                    })
                    if (cateNameCached.includes(cateName)) return
                    result.data.push(category)
                    cateNameCached.push(cateName)
                })
                const firstCate = result.data[0]
                firstCate.data.splice(1, 0, { key: '最新', value: QQ.NEW_CODE })
                firstCate.data.splice(2, 0, { key: '排行榜', value: QQ.TOPLIST_CODE })
                firstCate.data.splice(3, 0, { key: '电台', value: QQ.RADIO_CODE })
                resolve(result)
            })
        })
    }

    //全部分类
    static categories_v1() {
        return new Promise((resolve, reject) => {
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = JSON.stringify({
                req_1: moduleReq('music.playlist.PlaylistSquare', 'GetAllTag', { qq: '' }),
                comm: {
                    g_tk: 5381,
                    uin: '0',
                    format: 'json',
                    ct: 6,
                    cv: 80605,
                    platform: 'wk_v17',
                    uid: '5019772269',
                    guid: '2057708153c9fc13f0e801c14d39af5fccdfdc60',
                    mesh_devops: 'DevopsBase'
                }
            })
            const result = { platform: QQ.CODE, data: [], orders: [] }
            const recommandCategory = new Category('推荐', 0)
            recommandCategory.add('默认', QQ.DEFAULT_CATE)
            recommandCategory.add('排行榜', QQ.TOPLIST_CODE)
            recommandCategory.add('电台', QQ.RADIO_CODE)

            //是否允许更多推荐
            const enableMoreRecommand = false
            
            postJson(url, reqBody).then(json => {
                const recommandTagNames = [
                    '国语', '英语', '粤语',
                    '轻音乐', '校园', '民谣',
                    '思念', '学习工作', '治愈', 
                    '古典', '摇滚', '爵士', 
                    '运动', '乡村', '乐器', 
                    '婚礼', '安静', '快乐',
                    '00年代',  '90年代', 
                    '法语', '睡前']
                const ignoreTagNames = ['AI歌单']
                result.data.push(recommandCategory)

                const list = json.req_1.data.v_group
                list.forEach(cate => {
                    const cateName = cate.group_name
                    const cateCode = cate.group_id
                    const category = new Category(cateName, cateCode)
                    const items = cate.v_item
                    items.forEach(item => {
                        const { id, name } = item
                        if (ignoreTagNames.includes(name)) return
                        if (enableMoreRecommand && recommandTagNames.includes(name)) {
                            recommandCategory.add(name, id)
                        }
                        category.add(name, id)
                    })
                    result.data.push(category)
                })
                //随机打乱推荐分类
                //shuffle(recommandCategory.data)
                
                resolve(result)
            })
        })
    }

    //排行榜列表
    static toplist(cate, offset, limit, page, order) {
        return new Promise((resolve, reject) => {
            let result = { platform: QQ.CODE, cate, offset: 0, limit: 100, page: 1, total: 0, data: [] }
            if (page > 1) {
                resolve(result)
                return
            }
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = topListReqBody()
            getJson(url, reqBody).then(json => {
                const groupList = json.req_1.data.group
                groupList.forEach(group => {
                    group.toplist.forEach(item => {
                        const id = QQ.TOPLIST_PREFIX + item.topId
                        const cover = item.frontPicUrl || item.headPicUrl
                        const detail = new Playlist(id, QQ.CODE, getCoverByQuality({ cover }), item.title)
                        detail.about = item.intro
                        result.data.push(detail)
                    })
                })
                resolve(result)
            })
        })
    }

    //排行榜详情
    static toplistDetail(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = new Playlist()
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const topid = parseInt(id.replace(QQ.TOPLIST_PREFIX, ''))
            const reqBody = topListDetailReqBody(topid, offset, limit, page)
            getJson(url, reqBody).then(json => {
                const playlist = json.req_1.data.data

                result.id = playlist.topId
                result.platform = QQ.CODE
                result.title = playlist.title
                result.cover = getCoverByQuality({ cover: (playlist.frontPicUrl || playlist.headPicUrl) })
                result.about = playlist.intro

                let songs = json.req_1.data.songInfoList || []
                if(songs.length < 1) songs = json.req_1.data.data.song || []
                songs.forEach(song => {
                    let artist = []
                    if(song.singer) {
                        artist = song.singer.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    } else if(song.singerMid) {
                        artist.push({
                            id: song.singerMid,
                            name: song.singerName,
                            _id: song.singerId
                        })
                    }

                    let album = { id: null, name: '' }
                    if(song.album) {
                        album = { id: song.album.mid, name: song.album.name }
                    } else if(song.albumMid) {
                        Object.assign(album, { id: song.albumMid, name: song.albumName})
                    }
                    
                    const duration = (song.interval || 0) * 1000
                    const cover = getCoverByQuality({ albumMid: album.id }) || getCoverByQuality({ cover: song.cover })
                    const tId = song.mid || song.songMid || song.songId
                    const tTitle = song.name || song.title
                    const track = new Track(tId, QQ.CODE, tTitle, artist, album, duration, cover)
                    track.pid = id
                    track.songID = song.id || song.songId
                    result.addTrack(track)
                })
                resolve(result)
            })
        })
    }

    //歌单电台列表
    static playlistRadios(cate, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: QQ.CODE, cate, offset, limit, page, total: 0, data: [] }
            if (page > 1) {
                resolve(result)
                return
            }
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = playlistRadiosReqBody()
            getJson(url, reqBody).then(json => {
                const radioList = json.req_1.data.radio_list
                radioList.forEach(group => {
                    group.list.forEach(item => {
                        const cid = item.id
                        const title = group.title + '｜' + item.title
                        const playlist = new Playlist(cid, QQ.CODE, item.pic_url, title)
                        //playlist.isRadioType = true
                        playlist.type = Playlist.NORMAL_RADIO_TYPE
                        result.data.push(playlist)
                    })
                })
                resolve(result)
            })
        })
    }

    //电台：下一首歌曲
    static nextPlaylistRadioTrack(channel, track) {
        return new Promise((resolve, reject) => {
            let result = null
            const firstplay = !track ? 1 : 0
            //是否命中缓存
            if (channel == QQ.RADIO_CACHE.channel) {
                const index = (firstplay == 1) ? 0 :
                    QQ.RADIO_CACHE.data.findIndex(item => item.id == track.id)
                const length = QQ.RADIO_CACHE.data.length
                if (length > 0 && index > -1 && index < (length - 1)) {
                    result = QQ.RADIO_CACHE.data[index + 1]
                    resolve(result)
                    return
                }
            }
            //不命中，重置缓存
            QQ.RADIO_CACHE.channel = channel
            QQ.RADIO_CACHE.data.length = 0
            //拉取数据
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = radioSonglistReqBody(channel, firstplay)
            getJson(url, reqBody).then(json => {
                const list = json.req_1.data.track_list
                list.forEach(item => {
                    const artist = item.singer.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    const album = { id: item.album.mid, name: item.album.name }
                    const duration = item.interval * 1000
                    const cover = getCoverByQuality({ albumMid: item.album.mid })
                    const cache = new Track(item.mid, QQ.CODE, item.title, artist, album, duration, cover)
                    cache.type = Playlist.NORMAL_RADIO_TYPE
                    cache.channel = channel
                    QQ.RADIO_CACHE.data.push(cache)
                })
                result = QQ.RADIO_CACHE.data[0]
                resolve(result)
            })
        })
    }

    //歌单广场(列表)
    static square(cate, offset, limit, page) {
        return QQ.square_v1(cate, offset, limit, page)
    }

    //歌单广场(列表)
    static square_v0(cate, offset, limit, page) {
        const originCate = cate || QQ.DEFAULT_CATE
        let resolvedCate = cate
        if (typeof resolvedCate == 'string') resolvedCate = parseInt(resolvedCate.trim())
        resolvedCate = resolvedCate > 0 ? resolvedCate : QQ.DEFAULT_CATE
        //榜单
        if (resolvedCate == QQ.TOPLIST_CODE) return QQ.toplist(cate, offset, limit, page)
        //电台
        if (resolvedCate == QQ.RADIO_CODE) return QQ.playlistRadios(cate, offset, limit, page)
        //普通歌单
        let sortId = 5 //最热
        if (resolvedCate == QQ.NEW_CODE) {
            sortId = 2 //最新
            resolvedCate = QQ.DEFAULT_CATE
        }
        return new Promise((resolve, reject) => {
            const result = { platform: QQ.CODE, cate: originCate, offset, limit, page, total: 0, data: [] }
            const url = "https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_by_tag.fcg"
            const reqBody = {
                format: 'json',
                inCharset: 'utf8',
                outCharset: 'utf8',
                sortId: sortId, //5 => 最热, 2 => 最新
                categoryId: resolvedCate,
                sin: offset,
                ein: (offset + limit - 1)
            }
            getJson(url, reqBody).then(json => {
                if (json && json.data) {
                    result.total = Math.ceil(json.data.sum / limit)
                    const list = json.data.list
                    list.forEach(item => {
                        const cover = item.imgurl
                        const playlist = new Playlist(item.dissid, QQ.CODE, getCoverByQuality({ cover }), item.dissname)
                        playlist.about = item.introduction
                        playlist.playCount = item.listennum
                        result.data.push(playlist)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌单广场(列表)
    static square_v1(cate, offset, limit, page) {
        const originCate = cate || 0
        let resolvedCate = cate
        if (typeof resolvedCate == 'string') resolvedCate = parseInt(resolvedCate.trim())
        resolvedCate = resolvedCate > 0 ? resolvedCate : QQ.DEFAULT_CATE
        //榜单
        if (resolvedCate == QQ.TOPLIST_CODE) return QQ.toplist(cate, offset, limit, page)
        //电台
        if (resolvedCate == QQ.RADIO_CODE) return QQ.playlistRadios(cate, offset, limit, page)
        //普通歌单
        if (resolvedCate == QQ.DEFAULT_CATE || resolvedCate == QQ.NEW_CODE) {
            return QQ.square_v0(cate, offset, limit, page)
        }
        return new Promise((resolve, reject) => {
            const result = { platform: QQ.CODE, cate: originCate, offset, limit, page, total: 0, data: [] }
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = JSON.stringify({
                req_1: moduleReq('playlist.PlayListCategoryServer',
                    'get_category_content',
                    {
                        caller: "0",
                        category_id: resolvedCate,
                        page: (page - 1),
                        use_page: 1,
                        size: limit
                    })
            })

            postJson(url, reqBody).then(json => {
                const { content } = json.req_1.data
                result.total = Math.ceil(content.total_cnt / limit)
                const list = content.v_item
                list.forEach(lItem => {
                    const item = lItem.basic
                    const cover = item.cover.medium_url || item.cover.big_url || item.cover.small_url 
                    const playlist = new Playlist(item.tid, QQ.CODE, getCoverByQuality({ cover }), item.title)
                    playlist.about = item.desc
                    playlist.playCount = item.play_cnt
                    playlist.total = item.song_cnt
                    result.data.push(playlist)
                })
                resolve(result)
            })
        })
    }

    //歌单详情
    static playlistDetail(id, offset, limit, page) {
        if (id.toString().startsWith(QQ.TOPLIST_PREFIX)) {
            return QQ.toplistDetail(id, offset, limit, page)
        }
        return new Promise((resolve, reject) => {
            const result = new Playlist(id, QQ.CODE)
            const url = "http://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg"
            const reqBody = {
                format: 'json',
                type: 1,
                utf8: 1,
                disstid: id, // 歌单的id
                loginUin: 0,
            }
            getJson(url, reqBody).then(json => {
                const playlist = json.cdlist[0]

                result.dissid = playlist.dissid
                result.title = playlist.dissname

                result.cover = getCoverByQuality({ cover: playlist.logo, sizes: [180, 300, 600, 600, 1000 ] })
                result.about = playlist.desc

                const songs = playlist.songlist
                songs.forEach(song => {
                    const artist = song.singer.map(e => ({ id: e.mid, name: e.name, _id: e.id }))
                    const album = { id: song.albummid, name: song.albumname, _id: song.albumid }
                    const duration = song.interval * 1000
                    const cover = getCoverByQuality({ albumMid: song.albummid })
                    const track = new Track(song.songmid, QQ.CODE, song.songname, artist, album, duration, cover)
                    track.mv = song.vid
                    track.pid = id
                    track.payPlay = (song.pay.payplay == 1)
                    track.payDownload = (song.pay.paydownload == 1)
                    track.songID = song.songid
                    track.strMediaMid = song.strMediaMid
                    result.addTrack(track)
                })
                resolve(result)
            })
        })
    }

    //歌曲播放详情：url、cover、lyric等
    static playDetail(id, track) {
        return new Promise((resolve, reject) => {
            const result = new Track(id, QQ.CODE)
            const url = "http://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = {
                format: 'json',
                data: JSON.stringify({
                    req_1: moduleReq('music.pf_song_detail_svr', 'get_song_detail_yqq', { song_mid: id })
                })
            }
            getJson(url, reqBody).then(async (json) => {
                try {
                    const trackInfo = json.req_1.data.track_info
                    const types = ['320', '128', 'm4a']
                    for (var i = 0; i < types.length; i++) {
                        const vkeyJson = await QQ.getVKeyJson(trackInfo, types[i])
                        const { midurlinfo, sip } = vkeyJson.req_1.data
                        const urlInfo = midurlinfo[0]
                        const { vkey } = urlInfo

                        if ((vkey || '').trim().length > 0) {
                            result.url = sip[0] + urlInfo.purl
                            break
                        }
                    }
                } catch(error) {
                    console.log(error)
                }
                resolve(result)
            })
        })
    }

    //获取VKey、purl和sip服务器等信息
    static getVKeyJson(trackInfo, type) {
        return new Promise((resolve, reject) => {
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = vkeyReqBody(trackInfo, type)
            getJson(url, reqBody).then(json => resolve(json))
        })
    }

    //歌词
    static lyric(id, track) {
        if (id) return QQ.lyricExt(id, track)
        return new Promise((resolve, reject) => {
            const result = { id, platform: QQ.CODE, lyric: null, trans: null }

            const url = "http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg"
            const reqBody = {
                songmid: id,
                pcachetime: Date.now(),
                g_tk: 5381,
                loginUin: 0,
                hostUin: 0,
                format: 'json',
                inCharset: 'utf8',
                outCharset: 'utf8',
                notice: 0,
                platform: 'yqq',
                needNewCode: 0
            }
            getJson(url, reqBody).then(json => {
                const { lyric, trans } = json
                //lyric = escapeHtml(lyric)
                Object.assign(result, { lyric: Lyric.parseFromText(base64Parse(lyric)) })
                if (trans) {
                    Object.assign(result, { trans: Lyric.parseFromText(base64Parse(trans)) })
                }
                resolve(result)
            })
        })
    }

    //新版歌词 - 翻译、罗马发音等
    static lyricExt(id, track) {
        return new Promise((resolve, reject) => {
            const url = "http://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = lyricExtReqBody(id, track)
            const result = { id, platform: QQ.CODE, lyric: null, trans: null }
            getJson(url, reqBody).then(json => {
                const { lyric, roma, trans } = json.req_1.data
                Object.assign(result, { lyric: Lyric.parseFromText(base64Parse(lyric)) })
                if (roma) { //TODO
                    Object.assign(result, { roma: Lyric.parseFromText(hexDecode(roma)) })
                }
                if (trans) {
                    Object.assign(result, { trans: Lyric.parseFromText(base64Parse(trans)) })
                }
                resolve(result)
            })
        })
    }

    //歌手详情：Name、Cover、简介(如果有)、热门歌曲等
    static artistDetail_v0(id) {
        return new Promise((resolve, reject) => {
            const result = { id, title: '未知歌手', cover: '', data: [], about: '' }

            const url = `https://y.qq.com/n/ryqq/singer/${id}`
            getDoc(url).then(doc => {
                const scriptEls = doc.querySelectorAll("script")
                const key = "window.__INITIAL_DATA__"

                let scriptText = null
                for (var scriptEl of scriptEls) {
                    scriptText = scriptEl.textContent
                    if (!scriptText) continue
                    scriptText = scriptText.trim()
                    if (scriptText.includes(key)) break
                }

                if (scriptText) {
                    scriptText = scriptText.split(key)[1].trim().substring(1)
                    scriptText = scriptText.replace(/:undefined,/g, ':"",')
                    const json = JSON.parse(scriptText)
                    const detail = json.singerDetail
                    result.title = detail.basic_info.name
                    result.cover = getCoverByQuality({ artistMid: detail.basic_info.singer_mid }) || detail.pic.pic
                    result.about = detail.descstr
                }
                resolve(result)
            })
        })
    }

    //歌手详情：Name、Cover、简介(如果有)、热门歌曲等
    static artistDetail(id) {
        return new Promise((resolve, reject) => {
            const result = { id, title: '未知歌手', cover: '', data: [], about: '' }

            const url = 'https://u6.y.qq.com/cgi-bin/musicu.fcg'
            const reqBody = JSON.stringify({
                comm: {
                    cv: 4747474,
                    ct: 24,
                    format: 'json',
                    inCharset: 'utf-8',
                    outCharset: 'utf-8',
                    notice: 0,
                    platform: 'yqq.json',
                    needNewCode: 1,
                    uin: 0,
                    g_tk_new_20200303: 5381,
                    g_tk: 5381
                },
                req_1: moduleReq('music.musichallSinger.SingerInfoInter', 'GetSingerDetail', {
                    singer_mids: [id],
                    ex_singer: 1,
                    wiki_singer: 1,
                    group_singer: 0,
                    pic: 1,
                    photos: 0
                })
            })

            postJson(url, reqBody).then(json => {
                const singer = json.req_1.data.singer_list[0]
                const { basic_info, ex_info, wiki } = singer || {}
                
                Object.assign(result, { 
                    title: basic_info && basic_info.name,
                    about: ex_info && ex_info.desc,
                    cover: getCoverByQuality({ artistMid: id })
                })
                
                resolve(result)
            })
        })
    }

    //@Deprecated 弃用 
    static artistDetailDesc(id) {
        return new Promise((resolve, reject) => {
            const url = "http://c.y.qq.com/splcloud/fcgi-bin/fcg_get_singer_desc.fcg"
            const reqBody = {
                singermid: id,
                format: 'xml',
                utf8: 1,
                outCharset: 'utf8'
            }
            getRaw(url, reqBody).then(xml => {
                const result = { id, name: '', cover: '', data: [] }
                resolve(result)
            })
        })
    }

    //歌手详情：热门歌曲
    static artistDetailHotSongs(id) {
        return new Promise((resolve, reject) => {
            const url = "http://u.y.qq.com/cgi-bin/musicu.fcg"
            const offset = 0
            const limit = 365
            const page = 1
            const reqBody = artistHotSongReqBody(id, offset, limit)
            getJson(url, reqBody).then(json => {
                const result = { id, offset, limit, page, data: [] }
                const songList = json.req_1.data.songlist
                songList.forEach(item => {
                    const artist = item.singer.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    const album = { id: item.album.mid, name: item.album.name }
                    const duration = item.interval * 1000
                    const cover = getCoverByQuality({ albumMid: item.album.mid })

                    const track = new Track(item.mid, QQ.CODE, item.title,
                        artist, album, duration, cover)
                    track.mv = item.mv.vid
                    track.payPlay = (item.pay.pay_play == 1)
                    track.payDownload = (item.pay.pay_down == 1)
                    result.data.push(track)
                })
                resolve(result)
            })
        })
    }

    //歌手详情: 专辑
    static artistDetailAlbums(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const url = "http://u.y.qq.com/cgi-bin/musicu.fcg"
            const reqBody = artistAlbumReqBody(id, offset, limit)
            getJson(url, reqBody).then(json => {
                const result = { id, platform: QQ.CODE, offset, limit, page, data: [] }
                const albumList = json.req_1.data.list
                albumList.forEach(item => {
                    const artist = item.singers.map(ar => ({ id: ar.singer_mid, name: ar.singer_name }))
                    const cover = getCoverByQuality({ albumMid: item.album_mid })
                    const album = new Album(item.album_mid, QQ.CODE, item.album_name, cover, artist)
                    album.publishTime = item.pub_time
                    result.data.push(album)
                })
                resolve(result)
            })
        })
    }

    //专辑详情
    static albumDetail_v0(id) {
        return new Promise((resolve, reject) => {
            const url = "https://y.qq.com/n/ryqq/albumDetail/" + id
            getDoc(url).then(doc => {
                const scriptEls = doc.querySelectorAll("script")
                const key = "window.__INITIAL_DATA__"

                let scriptText = null
                for (var scriptEl of scriptEls) {
                    scriptText = scriptEl.textContent
                    if (!scriptText) continue
                    scriptText = scriptText.trim()
                    if (scriptText.includes(key)) break
                }
                const result = new Album(id, QQ.CODE)
                if (scriptText) {
                    scriptText = scriptText.split(key)[1].trim().substring(1)
                    scriptText = scriptText.replace(/:undefined,/g, ':"",')
                    const json = JSON.parse(scriptText)

                    const detail = json.detail
                    //const cover = detail.picurl.startsWith("//") ? ("https:" + detail.picurl) : detail.picurl
                    result.title = detail.albumName
                    result.cover = getCoverByQuality({ albumMid: detail.albumMid })
                    result.artist = detail.singer.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    result.publishTime = detail.ctime
                    result.company = detail.company
                    result.about = detail.desc
                }
                resolve(result)
            })
        })
    }

    //专辑详情
    static albumDetail(id) {
        return new Promise((resolve, reject) => {
            const url = `https://c6.y.qq.com/v8/fcg-bin/musicmall.fcg?_=1709281071876&cv=4747474&ct=24&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=1&uin=0&g_tk_new_20200303=5381&g_tk=5381&cmd=get_album_buy_page&albummid=${id}&albumid=0`
            getJson(url).then(json => {

                const result = new Album(id, QQ.CODE)
                const detail = json.data
                result.title = detail.album_name
                result.cover = getCoverByQuality({ albumMid: id })
                result.artist = detail.singerinfo.map(ar => ({ id: ar.singermid, name: ar.singername, _id: ar.singerid }))
                result.publishTime = detail.publictime
                result.company = detail.companyname
                result.about = detail.desc
                resolve(result)
            })
        })
    }

    //专辑详情: 歌曲
    static albumDetailAllSongs(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const url = "https://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=5381&format=json&inCharset=utf8&outCharset=utf8"
            const reqBody = albumAllSongsReqBody(id, offset, limit)
            getJson(url, reqBody).then(json => {
                const result = new Album(id)
                const songList = json.req_1.data.songList
                songList.forEach(item => {
                    const song = item.songInfo
                    const artist = song.singer.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    const album = { id, name: song.album.name }
                    const cover = getCoverByQuality({ albumMid: id })
                    const duration = song.interval * 1000
                    const track = new Track(song.mid, QQ.CODE, song.name, artist, album, duration, cover)
                    track.mv = song.mv.vid
                    track.payPlay = (song.pay.pay_play == 1)
                    track.payDownload = (song.pay.pay_down == 1)
                    result.addTrack(track)
                })
                resolve(result)
            })
        })
    }

    static doMultiPageSearch_old({ keyword, type, offset, limit, page, count }, { getList, mapItem }) {
        return new Promise(async (resolve, reject) => {
            count = count || 2
            const result = { platform: QQ.CODE, offset, limit, page, data: [] }
            const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'

            for (var i = 0; i < count; i++) {
                const reqBody = JSON.stringify(searchParam_v1(keyword, type, offset, limit, (page + i)))
                const json = await postJson(url, reqBody)
                const { list } = getList(json)
                const hitNum = list ? list.length : 0
                if (hitNum < 1) break
                const data = list.map(item => mapItem(item))
                const dataSize = data ? data.length : 0
                if (dataSize > 0) result.data.push(...data)
                if (dataSize < 30) break
            }
            resolve(result)
        })
    }

    static doMultiPageSearch({ keyword, type, offset, limit, page, count }, { getList, mapItem, beforeResolve }) {
        return new Promise((resolve, reject) => {
            count = count || 2
            const result = { platform: QQ.CODE, offset, limit, page, data: [] }
            const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'

            const tasks = []
            for (var i = 0; i < count; i++) {
                const reqBody = JSON.stringify(searchParam_v1(keyword, type, offset, limit, (page + i)))
                tasks.push(postJson(url, reqBody))
            }
            Promise.all(tasks).then(jsons => {
                for (var i = 0; i < jsons.length; i++) {
                    const { list } = getList(jsons[i])
                    const hitNum = list ? list.length : 0
                    if (hitNum < 1) continue
                    const data = list.map(item => mapItem(item))
                    const dataSize = data ? data.length : 0
                    if (dataSize > 0) result.data.push(...data)
                    //if (dataSize < 30) break
                }
                if (beforeResolve && (typeof beforeResolve == 'function')) beforeResolve(result)
                resolve(result)
            }).catch(error => resolve(result))
        })
    }

    //搜索: 歌曲
    static searchSongs(keyword, offset, limit, page) {
        //const url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
        return QQ.doMultiPageSearch({ keyword, type: 0, offset, limit, page },
            {
                getList: json => json.req_1.data.body.song,
                mapItem: item => {
                    const artist = item.singer.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    const album = { id: item.album.mid, name: item.album.name }
                    const duration = item.interval * 1000
                    const cover = getCoverByQuality({ albumMid: album.id })
                    const track = new Track(item.mid, QQ.CODE, item.name, artist, album, duration, cover)
                    track.mv = item.mv.vid
                    track.payPlay = (item.pay.pay_play == 1)
                    track.payDownload = (item.pay.pay_down == 1)
                    return track
                }
            })
    }

    //搜索: 歌单
    static searchPlaylists(keyword, offset, limit, page) {
        return QQ.doMultiPageSearch({ keyword, type: 3, offset, limit, page },
            {
                getList: json => json.req_1.data.body.songlist,
                mapItem: item => {
                    const sizes = [180, 300, 600, 600, 1000]
                    const cover = getCoverByQuality({ cover: item.imgurl, sizes })
                    const playlist = new Playlist(item.dissid, QQ.CODE, cover, item.dissname)
                    //playlist.about = item.introduction
                    return playlist
                }
            })
    }

    //搜索: 专辑
    static searchAlbums(keyword, offset, limit, page) {
        return QQ.doMultiPageSearch({ keyword, type: 2, offset, limit, page },
            {
                getList: json => json.req_1.data.body.album,
                mapItem: item => {
                    //const cover = item.albumPic
                    const artist = item.singer_list.map(ar => ({ id: ar.mid, name: ar.name, _id: ar.id }))
                    const cover = getCoverByQuality({ albumMid: item.albumMID })
                    const album = new Album(item.albumMID, QQ.CODE, item.albumName, cover, artist)
                    album.publishTime = item.publicTime
                    return album
                }
            })
    }

    //搜索: 歌手
    static searchArtists(keyword, offset, limit, page) {
        return QQ.doMultiPageSearch({ keyword, type: 1, offset, limit, page },
            {
                getList: json => json.req_1.data.body.singer,
                mapItem: item => ({
                    id: item.singerMID,
                    platform: QQ.CODE,
                    title: item.singerName,
                    //cover: item.singerPic
                    cover: getCoverByQuality({ artistMid: item.singerMID })
                })
            })
    }

    //搜索: MV视频
    static searchVideos(keyword, offset, limit, page) {
        return QQ.doMultiPageSearch({ keyword, type: 4, offset, limit, page },
            {
                getList: json => json.req_1.data.body.mv,
                mapItem: item => ({
                    id: item.mv_id,
                    vid: item.v_id,
                    mvid: item.mv_id,
                    watchid: item.watchid,
                    platform: QQ.CODE,
                    title: item.mv_name,
                    subtitle: item.singer_name,
                    cover: getCoverByQuality({ cover: item.mv_pic_url }),
                    type: Playlist.VIDEO_TYPE,
                    publicTime: item.publish_date,
                    pay: (item.pay > 0),
                    duration: (item.duration * 1000),
                    playCount: item.play_count,
                    vcType: 0,
                })
            })
    }

    //歌手分类名称映射
    static artistTagsMap() {
        return {
            index: '字母',
            area: '地区',
            sex: '性别',
            genre: '流派',
        }
    }

    //歌手分类
    static artistCategories() {
        return new Promise((resolve, reject) => {
            const result = { platform: QQ.CODE, data: [], alphabet: new Category('字母') }
            const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
            const reqBody = {
                data: JSON.stringify({
                    comm: {
                        ct: 24,
                        cv: 0
                    },
                    req_1: moduleReq('Music.SingerListServer', 'get_singer_list', {
                        area: -100,
                        sex: -100,
                        genre: -100,
                        index: -100,
                        sin: 0,
                        cur_page: 1
                    })
                })
            }
            getJson(url, reqBody).then(json => {
                const tags = json.req_1.data.tags
                const artistTagsMap = QQ.artistTagsMap()
                const keys = ['area', 'sex', 'genre']
                keys.forEach(key => {
                    const category = new Category(artistTagsMap[key])
                    const list = tags[key]
                    list.forEach(item => {
                        category.add(item.name, item.id)
                    })
                    result.data.push(category)
                })
                //字母表
                tags.index.forEach(item => {
                    result.alphabet.add(item.name, item.id)
                })
                resolve(result)
            })
        })
    }

    //提取分类
    static parseArtistCate(cate) {
        const result = { area: -100, sex: -100, genre: -100, index: -100 }
        const source = {}
        const artistTagsMap = QQ.artistTagsMap()
        for (var key in cate) {
            for (var tag in artistTagsMap) {
                if (key == artistTagsMap[tag]) {
                    source[tag] = cate[key].item.value
                }
            }
        }
        return Object.assign(result, source)
    }

    //歌手(列表)广场
    static artistSquare(cate, offset, limit, page) {
        limit = 80
        offset = (page - 1) * limit
        return new Promise((resolve, reject) => {
            const result = { platform: QQ.CODE, cate, offset, limit, page, total: 0, data: [] }
            const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
            const resolvedCate = QQ.parseArtistCate(cate)
            const reqBody = {
                data: JSON.stringify({
                    comm: {
                        ct: 24,
                        cv: 0
                    },
                    req_1: moduleReq('Music.SingerListServer', 'get_singer_list', {
                        area: resolvedCate.area,
                        sex: resolvedCate.sex,
                        genre: resolvedCate.genre,
                        index: resolvedCate.index,
                        sin: offset,
                        cur_page: page
                    })
                })
            }
            getJson(url, reqBody).then(json => {
                const list = json.req_1.data.singerlist
                list.forEach(item => {
                    const id = item.singer_mid
                    const title = item.singer_name
                    //const cover = item.singer_pic
                    const cover = getCoverByQuality({ artistMid: id })
                    const artist = { id, platform: QQ.CODE, title, cover }
                    result.data.push(artist)
                })
                resolve(result)
            })
        })
    }

    static videoDetail_v0(id, video) {
        return new Promise((resolve, reject) => {
            const url = 'http://u.y.qq.com/cgi-bin/musicu.fcg'
            const reqBody = {
                data: JSON.stringify({
                    req_1: {
                        module: 'gosrf.Stream.MvUrlProxy',
                        method: 'GetMvUrls',
                        param: {
                            vids: [id],
                            request_type: 10001,
                            /*
                            "request_type": 10003,
                            "addrtype": 3,
                            "format": 265,
                            "maxFiletype": 60
                            */
                        }
                    }
                })
            }
            getJson(url, reqBody).then(json => {
                const data = json.req_1.data
                const mvData = {}
                Object.keys(data).forEach(vid => {
                    const mp4Arr = data[vid].mp4 || []
                    mvData[vid] = mp4Arr.map(item => {
                        return item.freeflow_url[0] || ''
                    })
                })
                const result = { id, platform: QQ.CODE, url: '' }
                const mvUrls = mvData[id]
                //TODO 其实应该全部返回给客户端，由客户端决定播放url，播放失败时也方便重试
                result.url = mvUrls.length > 0 ? mvUrls[mvUrls.length - 1] : ''
                resolve(result)
            })
        })
    }

    static videoDetail(id, video) {
        return new Promise((resolve, reject) => {
            const url = 'http://u.y.qq.com/cgi-bin/musicu.fcg'
            const reqBody = {
                data: JSON.stringify({
                    req_1: {
                        module: 'music.stream.MvUrlProxy',
                        method: 'GetMvUrls',
                        param: {
                            vids: [id],
                            request_type: 10003
                        }
                    }
                })
            }
            const result = { id, platform: QQ.CODE, url: '' }
            getJson(url, reqBody).then(json => {
                const data = json.req_1.data
                if (!data) return resolve(result)
                const mvData = {}
                Object.keys(data).forEach(vid => {
                    let keyHits = 0
                    for (const [key, value] of Object.entries(data[vid])) {
                        if (keyHits >= 2) break
                        if (key === 'mp4' || key === 'hls') {
                            ++keyHits
                            mvData[key] = []
                            value.forEach(item => {
                                const url = item.freeflow_url[0]
                                if (!url || url.trim().length < 1) return
                                mvData[key].push(url)
                            })
                        }
                    }
                })
                for (const [key, value] of Object.entries(mvData)) {
                    if (value.length > 0) {
                        result.url = value[value.length - 1]
                        break
                    }
                }
                //TODO 其实应该全部返回给客户端，由客户端决定播放url，播放失败时也方便重试
                resolve(result)
            })
        })
    }

}


/* 插件接入规范区 */
//插件启用
export const activate = async (plugin) => {
  registerPlatform(plugin, { 
    code: QQ.CODE,
    vendor: QQ,
    name: 'QQ音乐',
    shortName: 'QQ',
    online: true,
    types: ['playlists', 'artists', 'albums', 'videos'],
    scopes: ['playlists', 'artists', 'albums', 'search', 'userhome', 'random', 'united', 'resource-search'],
    artistTabs: [ 'hot-songs', 'albums','about' ],
    searchTabs: [ 'all-songs', 'playlists', 'albums', 'artists', 'videos' ],
    resourceSearchTabs: [ 'all-songs', 'playlists', 'albums' ],
    weight: 8
  })

  addRequestHandler(plugin, {
    id: QQ.CODE,
    hosts: ['qq.com'],
    defaultHeaders: {
        Origin: 'https://y.qq.com/',
        Referer: 'https://y.qq.com/',
    },
    includes: [{
      pattern: 'moviets.tc.qq.com',
      headers: {
        Origin: 'https://v.qq.com/',
        Referer: 'https://v.qq.com/'
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - QQ音乐')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - QQ音乐')
}