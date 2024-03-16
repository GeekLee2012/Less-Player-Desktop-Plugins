/**
 * @name 音乐平台 - jango音乐
 * @version 1.0.0
 * @author WhoamI
 * @about 纯外文歌曲，电台歌单，音质很一般，播放体验一般
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, nextInt, getImageUrlByQuality, toLowerCaseTrimString, } = utils
const { base64Stringify, base64Parse, hexDecode, randomTextDefault } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, getRaw, postJson } = nets
const { APIPermissions, access } = permissions


//04f74cc5d6b9ac11e553225fa99ad085
let sid = null

class Jango {
    static CODE = "jango"
    static DEFAULT_CATE = 'Recommended'
    static RADIO_CACHE = { channel: 0, data: [] }

    //全部分类
    static categories() {
        return new Promise((resolve, reject) => {
            const url = "https://www.jango.com/browse_music/genres"
            const result = { platform: Jango.CODE, data: [], orders: [], isWhiteWrap: true }
            getJson(url).then(json => {
                const cateNameCached = []
                const list = json.genres
                const category = new Category('电台')
                result.data.push(category)
                list.forEach(cate => {
                    const { name, url } = cate
                    category.add(name, name)
                })
                resolve(result)
            })
        })
    }

    //电台：下一首歌曲
    static nextPlaylistRadioTrack(channel, track, playlist) {
        return new Promise((resolve, reject) => {
            const firstplay = !track ? 1 : 0
            //拉取数据
            const so = (track && track.id) || null
            const ar = (track && track.artist && track.artist.length > 0 && track.artist[0]._id) || null
            const offset = nextInt(20) + 10
            const cb = new Date().getTime()

            const url = `https://www.jango.com/streams/info?sid=${sid}&stid=${channel}&ver=304&skipped=1&clicked=1&mo=false&as=null&so=${so}&ar=${ar}&offset=${offset}&cb=${cb}`
            const config = { 
                headers: { 
                    'X-NewRelic-ID': 'XAUOUUVVCwEG',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            }
            getJson(url, null, config).then(json => {
                const { url, station_id, station_type, 
                    artist, artist_id, album_art, 
                    song, song_id, album, } = json
                const _url = url.startsWith('http') ? url : `https:${url}`
                const result = new Track(song_id || station_id, Jango.CODE)
                Object.assign(result, { 
                    url: _url, 
                    title: song || (playlist && playlist.title),
                    type: Playlist.NORMAL_RADIO_TYPE, 
                    channel, 
                    cover: album_art || (playlist && playlist.cover), 
                    album: { id: '', name: album, _id: channel },
                    playlist
                })
                if(artist && artist_id)  Object.assign(result, { artist: [{ id: '', name: artist, _id: artist_id }]})
                resolve(result)
            })
        })
    }

    //歌单广场(列表) - 推荐
    static recommandStations(cate, offset, limit, page) {
        return new Promise((resolve, reject) => {
            const result = { platform: Jango.CODE, cate, offset, limit, page, total: 100, data: [] }
            const _Referer = `https://www.jango.com/browse_music/genre_stations/${cate}`
            const url = `${_Referer}?page=${page}`
            const config = { 
              headers: { 
                    _Referer,
                    'X-NewRelic-ID': 'XAUOUUVVCwEG', 
                    'X-Requested-With': 'XMLHttpRequest', 
                }
            }
            getJson(url, null, config).then(json => {
                if (json && json.stations) {
                    const { recommended, trending } = json.stations
                    if(recommended && recommended.length > 0) {
                        recommended.forEach(item => {
                            const imgsLen = item.imgs.length
                            const cover = item.imgs[nextInt(imgsLen)].url || item.imgs[0].url
                            const playlist = new Playlist(item.id, Jango.CODE, cover, item.name)
                            playlist.type = Playlist.NORMAL_RADIO_TYPE 
                            result.data.push(playlist)
                        })
                    }
                    if(trending && trending.length > 0) {
                        trending.forEach(item => {
                            const imgsLen = item.imgs.length
                            const cover = item.imgs[nextInt(imgsLen)].url || item.imgs[0].url
                            const playlist = new Playlist(item.id, Jango.CODE, cover, item.name)
                            playlist.type = Playlist.NORMAL_RADIO_TYPE
                            result.data.push(playlist)
                        })
                    }
                }
                resolve(result)
            })
        })
    }

    //歌单广场(列表)
    static square(cate, offset, limit, page) {
        const originCate = cate
        let resolvedCate = cate || Jango.DEFAULT_CATE
        if(resolvedCate == Jango.DEFAULT_CATE) return Jango.recommandStations(resolvedCate, offset, limit, page)

        return new Promise((resolve, reject) => {
            const result = { platform: Jango.CODE, cate: originCate, offset, limit, page, total: 30, data: [] }
            const _Referer = `https://www.jango.com/browse_music/genre_stations/${resolvedCate}`
            const url = `${_Referer}?page=${page}`
            const config = { 
              headers: { 
                    _Referer,
                    'X-NewRelic-ID': 'XAUOUUVVCwEG',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            }
            getJson(url, null, config).then(json => {
                if (json && json.stations) {
                    const list = json.stations
                    list.forEach(item => { 
                        const imgsLen = item.imgs.length
                        const cover = item.imgs[nextInt(imgsLen)].url || item.imgs[0].url
                        const playlist = new Playlist(item.id, Jango.CODE, cover, item.name)
                        playlist.type = Playlist.NORMAL_RADIO_TYPE
                        result.data.push(playlist)
                    })
                }
                resolve(result)
            })
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            const result = { id, platform: Jango.CODE, lyric: null, trans: null }
            resolve(result)
        })
    }
 

}


/* 插件接入规范区 */
//插件启用
export const activate = async () => {
  if(!sid) sid = toLowerCaseTrimString(randomTextDefault(32))
  //获取权限
  access(APIPermissions.ADD_PLATFORM, { 
    code: Jango.CODE,
    vendor: Jango,
    name: 'jango音乐',
    shortName: 'JG',
    online: true,
    types: ['playlists'],
    scopes: ['playlists', 'userhome', 'random'],
    artistTabs: [],
    searchTabs: [],
    weight: 8
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)

  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: Jango.CODE,
    hosts: ['jango.com'],
    defaultHeaders: {
        //Origin: 'https://www.jango.com/',
        Referer: 'https://www.jango.com/',
    },
    includes: [{
      pattern: 'https://www.jango.com/browse_music/genres',
      headers: {
        //Origin: 'https://www.jango.com/',
        Referer: 'https://www.jango.com/browse_music/genre/Recommended',
        'X-NewRelic-ID': 'XAUOUUVVCwEG',
        'X-Requested-With': 'XMLHttpRequest',
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - jango音乐')
}

//插件停用
export const deactivate = () => {
  sid = null
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, Jango.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, Jango.CODE)
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - jango音乐')
}