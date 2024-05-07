/**
 * @name 音乐平台 - 千千音乐
 * @version 1.0.0
 * @author WhoamI
 * @about 不支持直接独立播放，但配合其他平台可播放；<br>即当前平台仅提供歌单，其他平台提供音乐源。
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toLowerCaseTrimString, toMMssSSS, getImageUrlByQuality, toTrimString, isBlank,  } = utils
const { randomTextDefault, md5, sha1 } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, getRaw } = nets
const { APIPermissions, access } = permissions



const secret = '0b50b02fd0d73a9c4c8c3a781c30845f'
const appid = 16073360, pageSize = 50

const createSign = (e) => {
    if ('[object Object]' !== Object.prototype.toString.call(e)) {
        throw new Error('The parameter of query must be a Object.')
    }
    var t = Math.floor(Date.now() / 1000)
    Object.assign(e, { timestamp: t })
    var n = Object.keys(e)
    n.sort()
    for (var r = '', i = 0; i < n.length; i++) {
        var o = n[i]
        r += (0 == i ? '' : '&') + o + '=' + e[o]
    }
    return {
        sign: md5(r += secret),
        timestamp: t,
    }
}


class QianQian {
    static CODE = 'qianqian'

    //全部分类
    static categories() {
        return new Promise((resolve, reject) => {
            const result = { platform: QianQian.CODE, data: [], orders: [] }
            const { sign, timestamp } = createSign({ appid })
            const url = `https://music.91q.com/v1/tracklist/category?sign=${sign}&appid=${appid}&timestamp=${timestamp}`
            getJson(url).then(json => {
                const cateArray = json.data || []
                cateArray.forEach(cate => {
                    const { categoryName, id, subCate: cateItems } = cate
                    const category = new Category(categoryName, id)
                    cateItems.forEach(item => {
                        category.add(item.categoryName, item.id)
                    })
                    if (category.data.length > 0) result.data.push(category)
                })
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌单(列表)广场
    static square(cate, offset, limit, page, order) {
        const originCate = cate
        let resolvedCate = toTrimString(cate)
        return new Promise((resolve, reject) => {
            const result = { platform: QianQian.CODE, cate: originCate, offset, limit, page, total: 0, data: [] }
            const params = { appid, pageSize, subCateId: resolvedCate }
            let pageInfo = `&pageSize=${pageSize}`
            if(page > 1) {
                Object.assign(params, { pageNo: page })
                pageInfo = `&pageNo=${page}&pageSize=${pageSize}`
            }
            const { sign, timestamp } = createSign(params)
            const url = `https://music.91q.com/v1/tracklist/list?sign=${sign}&subCateId=${resolvedCate}&${pageInfo}&appid=${appid}&timestamp=${timestamp}`
            getJson(url).then(json => {
                const pagination = json.data
                const data = pagination.result
                result.total = Math.ceil(pagination.total / pageSize)
                data.forEach(item => {
                    const { id, title, pic: cover, desc: about, trackCount } = item
                    //const cover = getCoverByQuality(item.img)
                    const playlist = new Playlist(id, QianQian.CODE, cover, title)
                    playlist.total = trackCount
                    //playlist.playCount = parseInt(item.listencnt || 0)
                    result.data.push(playlist)
                })
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌单详情
    static playlistDetail(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const params = { appid, pageSize, id }
            let pageInfo = `&pageSize=${pageSize}`
            if(page > 1) {
                Object.assign(params, { pageNo: page })
                pageInfo = `&pageNo=${page}&pageSize=${pageSize}`
            }
            const { sign, timestamp } = createSign(params)
            const url = `https://music.91q.com/v1/tracklist/info?sign=${sign}&${pageInfo}&id=${id}&appid=${appid}&timestamp=${timestamp}`
            const result = new Playlist(id, QianQian.CODE)

            getJson(url).then(json => {
                const { title, pic: cover, desc: about, trackCount: total, trackList } = json.data
                Object.assign(result, { 
                    cover,
                    title,
                    about,
                    total: total,
                    totalPage: Math.ceil(total / pageSize)
                })
                const playlist = trackList
                playlist.forEach(item => {
                    const artist = item.artist.map(ar => ({ id: ar.artistCode, name: ar.name }))
                    const album = { id: item.albumAssetCode, name: item.albumTitle }
                    const duration = item.duration * 1000
                    const cover = item.pic

                    const track = new Track(item.id, QianQian.CODE, item.title, artist, album, duration, cover)
                    track.pid = id
                    track.payPlay = item.isVip
                    track.payDownload = item.isVip
                    track.lyricUrl = item.lyric
                    result.addTrack(track)
                })
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌曲播放详情：url、cover、lyric等
    static playDetail(id, track) {
        return new Promise((resolve, reject) => {
            const result = new Track(id, QianQian.CODE)
            resolve(result)
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            const result = { id, platform: QianQian.CODE, lyric: null, trans: null }
            const { lyricUrl } = track
            if(isBlank(lyricUrl)) return resolve(result)

            getRaw(lyricUrl).then(text => {
                Object.assign(result, { lyric: Lyric.parseFromText(text) })
                resolve(result)
            }, error => resolve(result)).catch(error => resolve(result))
        })
    }

    //歌手详情：Name、Cover、简介(如果有)等
    static artistDetail(id) {
        return new Promise((resolve, reject) => {
            const params = { appid, artistCode: id }
            const { sign, timestamp } = createSign(params)
            const url = `https://music.91q.com/v1/artist/info?sign=${sign}&artistCode=${id}&appid=${appid}&timestamp=${timestamp}`
            getJson(url).then(json => {
                const { name: title, pic: cover, introduce } = json.data
                const about = toTrimString(introduce).replace(/\n/g, '<br>')
                const result = { id, title, cover, about }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //歌手详情: 全部歌曲
    static artistDetailAllSongs(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const params = { appid, pageSize, artistCode: id }
            let pageInfo = `&pageSize=${pageSize}`
            if(page > 1) {
                Object.assign(params, { pageNo: page })
                pageInfo = `&pageNo=${page}&pageSize=${pageSize}`
            }
            const { sign, timestamp } = createSign(params)
            const url = `https://music.91q.com/v1/artist/song?sign=${sign}&${pageInfo}&artistCode=${id}&appid=${appid}&timestamp=${timestamp}`

            getJson(url).then(json => {
                const { total, result: list } = json.data
                const totalPage = Math.ceil(total / pageSize)
                const data = []
                list.forEach(item => {
                    const artist = item.artist.map(ar => ({ id: ar.artistCode, name: ar.name }))
                    const album = { id: item.albumAssetCode, name: item.albumTitle }
                    const duration = item.duration * 1000
                    const cover = item.pic

                    const track = new Track(item.id, QianQian.CODE, item.title, artist, album, duration, cover)
                    data.push(track)
                })
                const result = { offset, limit, page, total, totalPage, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    static transformReleaseDate(releaseDate) {
        //偷（wa）个懒（keng），暂时不进行格式转换
        return toTrimString(releaseDate).split('T')[0]
    }

    //歌手详情: 专辑
    static artistDetailAlbums(id, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const params = { appid, pageSize, artistCode: id }
            let pageInfo = `&pageSize=${pageSize}`
            if(page > 1) {
                Object.assign(params, { pageNo: page })
                pageInfo = `&pageNo=${page}&pageSize=${pageSize}`
            }
            const { sign, timestamp } = createSign(params)
            const url = `https://music.91q.com/v1/artist/album?sign=${sign}&${pageInfo}&artistCode=${id}&appid=${appid}&timestamp=${timestamp}`

            getJson(url).then(json => {
                const { total, result: list } = json.data
                const data = []
                list.forEach(item => {
                    const artist = item.artist.map(ar => ({ id: ar.artistCode, name: ar.name }))
                    const cover = item.pic
                    const album = new Album(item.albumAssetCode, QianQian.CODE, item.title, cover, artist,
                        null, QianQian.transformReleaseDate(item.releaseDate), item.introduce)
                    data.push(album)
                })
                const result = { offset, limit, page, total, data }
                resolve(result)
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

    //专辑详情
    static albumDetail(id) {
        return new Promise(async (resolve, reject) => {
            let page = 1, limit = pageSize, totalPage = 1
            let detail = await QianQian.doGetAlbumDetail(id, page++, limit)
            if (!detail) return resolve(null)
            let { album, total, data } = detail
            totalPage = Math.ceil(total / limit)
            //TODO 暂时只返回50首歌曲，一张专辑50首歌也挺多啦
            /*
            while (totalPage >= page) {
                if (page > 3) break
                detail = await QianQian.doGetAlbumDetail(id, page++, limit)
                if (!detail) return resolve(null)
                data.push(...detail.data)
            }
            */
            const result = album
            album.data = data
            resolve(result)
        })
    }

    //专辑详情
    static doGetAlbumDetail(id, page, limit) {
        return new Promise((resolve, reject) => {
            const params = { appid, pageSize, albumAssetCode: id }
            let pageInfo = `&pageSize=${pageSize}`
            if(page > 1) {
                Object.assign(params, { pageNo: page })
                pageInfo = `&pageNo=${page}&pageSize=${pageSize}`
            }
            const { sign, timestamp } = createSign(params)
            const url = `https://music.91q.com/v1/album/info?sign=${sign}&${pageInfo}&albumAssetCode=${id}&appid=${appid}&timestamp=${timestamp}`

            getJson(url).then(json => {
                const data = []
                const { title: name, pic: cover, artist: aArtist, introduce: about, trackList: list, releaseDate } = json.data
                const artist = aArtist.map(ar => ({ id: ar.artistCode, name: ar.name }))
                
                list.forEach(item => {
                    const trackArtist = item.artist.map(ar => ({ id: ar.artistCode, name: ar.name }))
                    const trackAlbum = { id, name }
                    const duration = item.duration * 1000
                    const trackCover = item.pic || cover
                    const track = new Track(item.assetId, QianQian.CODE, item.title, trackArtist, trackAlbum, duration, trackCover)
                    track.payPlay = item.isVip
                    track.payDownload = item.isVip
                    data.push(track)
                })

                const album = new Album(id, QianQian.CODE, name, cover, artist,
                    null, QianQian.transformReleaseDate(releaseDate), about)
                resolve({ album, page, limit, total: data.length, data })
            }, error => resolve(null)).catch(error => resolve(null))
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, { 
    code: QianQian.CODE,
    vendor: QianQian,
    name: '千千音乐',
    shortName: '91Q',
    online: true,
    types: ['playlists', ],
    scopes: ['playlists', 'userhome', 'random'],
    artistTabs: [ 'all-songs', 'albums', 'about' ],
    //searchTabs: [],
    weight: 6
  })


  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: QianQian.CODE,
    hosts: ['91q.com'],
    defaultHeaders: {
        Origin: 'https://music.91q.com/',
        Referer: 'https://music.91q.com/',
    },
    /*
    includes: [{
      pattern: '',
      headers: {
        Referer: 'https://music.91q.com/'
      }
    }]
    */
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - 千千音乐')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, QianQian.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, QianQian.CODE)
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - 千千音乐')
}