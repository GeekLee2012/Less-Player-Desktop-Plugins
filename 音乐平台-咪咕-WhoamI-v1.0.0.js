/**
 * @name 音乐平台 - 咪咕
 * @version 1.0.0
 * @author WhoamI
 * @about 已同步更新至最新版本，现支持独立播放；<br>若歌曲仍播放失败，一般为VIP版本、版权等问题。
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toMmss, toMillis, toTrimString, transformUrl, getImageUrlByQuality } = utils
const { randomTextDefault, randomText, md5, sha1, sha256, aesEncryptDefault, rsaEncryptDefault } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson } = nets
const { APIPermissions, access } = permissions




let userAgent = null, cookieId = null
const PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8asrfSaoOb4je+DSmKdriQJKW\nVJ2oDZrs3wi5W67m3LwTB9QVR+cE3XWU21Nx+YBxS0yun8wDcjgQvYt625ZCcgin\n2ro/eOkNyUOTBIbuj9CvMnhUYiR61lC1f1IGbrSYYimqBVSjpifVufxtx/I3exRe\nZosTByYp4Xwpb1+WAQIDAQAB\n-----END PUBLIC KEY-----"

const uuid = () => {
  for (var t = [], e = 0; e < 36; e++) t[e] = '0123456789abcdef'.substring(Math.floor(16 * Math.random()), 1);
  t[14] = '4',
  t[19] = '0123456789abcdef'.substring(3 & t[19] | 8, 1),
  t[8] = t[13] = t[18] = t[23] = '-';
  var n = t.join('');
  return n
}

const setupMiguCookieId = () => {
  if(!cookieId) cookieId = (uuid() + '-n4' + new Date().getTime())
  return cookieId
}

const getSearchUrl = (keyword, page, type) => {
  const f ='html',s = Date.now() / 1000, c='001002A', v='3.25.6';
  const _i = ((e) => {
    var n = Object.keys(e).sort().map((function (t) {
      return ''.concat(t).concat(e[t])
    })).join('');
    return sha1(encodeURIComponent(n))
  })({ 
    f, 
    s, 
    k: `${cookieId}`, 
    u: `${userAgent}/220001`, 
    c, 
    keyword: encodeURIComponent(keyword), 
    v
  })
  return `https://music.migu.cn/v3/search?page=${page}&type=${type}&i=${_i}&f=html&s=${s}&c=001002A&keyword=${keyword}&v=${v}`
}

//TODO
const getPlayDetailSignedParams = (t) => {
  let e;
  t.rawType === 1 ? e = t.raw : (t.rawType === 2) && (e = JSON.stringify(t.raw));
  const nounce = '4ea5c508a6566e76240543f8feb06fd457777be39549c4016436afda65d2330e'
  const data = aesEncryptDefault(e, null, nounce)
  const secKey = rsaEncryptDefault(nounce, PUBLIC_KEY)
  return {
    dataType: t.rawType,
    data,
    secKey
  }
}


const getCoverByQuality = () => {
  //TODO 暂不支持
  return getImageUrlByQuality()
}

const newDeviceId = () => {
 return randomTextDefault(8).toUpperCase() 
      + '-' + randomTextDefault(4).toUpperCase()
      + '-' + randomTextDefault(4).toUpperCase()
      + '-' + randomTextDefault(4).toUpperCase()
      + '-' + randomTextDefault(12).toUpperCase()
}

const defaultConfig = { 
  headers: { 
    _Origin: 'https://music.migu.cn',
    _Referer: 'https://music.migu.cn/',
  } 
}

const getFullDefaultConfig = () => {
  const { headers } = defaultConfig
  return {
    headers: {
      ...headers,
      channel: '014X031',
      subchannel: '014X031',
      logId: 'cfrom=&appId=h5',
      appId: 'h5',
      platform: 'H5',
      deviceId: newDeviceId(),
      ua: 'Android_migu',
      version: '6.8.8',
      activityId: 'MUSIC-WWW',
      timestamp: Date.now(),
    }
  }
}


//自定义平台
class Migu {
  static CODE = 'migu'
  static NEWEST_CODE = '1000000000'
  static firstTagId = '1001076096'

  static async categories() {
    return new Promise((resolve, reject) => {
      const result = { platform: Migu.CODE, data: [], orders: [] }
      const url = 'https://app.c.nf.migu.cn/pc/v1.0/template/musiclistplaza-taglist/release'
      getJson(url).then(json => {
        const { data } = json
        let isFirstTagId = true
        data.forEach(item => {
          const { header, content } = item
          const { actionUrl, title } = header
          const cate = new Category(title, actionUrl)
          content.forEach(subItem => {
            const { texts } = subItem
            cate.add(texts[0], texts[1])

            if(isFirstTagId) {
              Migu.firstTagId = texts[1]
              isFirstTagId = false
            }
          })
          result.data.push(cate)
        })
        resolve(result)
      })
    })
  }

  static async square(cate, offset, limit, page, order) {
    return new Promise((resolve, reject) => {
      cate = cate || Migu.firstTagId || '1001076096'
      const result = { platform: Migu.CODE, cate, offset, limit, page, total: 0, data: [] }
      const url = `https://app.c.nf.migu.cn/pc/v1.0/template/musiclistplaza-listbytag/release?pageNumber=${page}&templateVersion=2&tagId=${cate}`
      getJson(url).then(json => {
        const { contentItemList } = json.data
        const { itemList } = contentItemList[1]
        itemList.forEach(item => {
          const { title, logEvent, imageUrl: cover } = item
          const { contentId: id, } = logEvent
          const playlist = new Playlist(id, Migu.CODE, cover, title)
          //Object.assign(playlist, { playCount })
          result.data.push(playlist)
        })
        //无法获取分页信息，暂时默认为100
        Object.assign(result, { total: 100 })
        resolve(result)
      })
    })
  }

  static async playlistDetail(id, offset, limit, page) {
    return new Promise((resolve, reject) => {
      let url = `https://app.c.nf.migu.cn/resource/playlist/v2.0?playlistId=${id}`
      getJson(url).then(async json => {
        const { musicListId, title, musicNum, originalImgUrl, imgItem, summary: about } = json.data
        const { img } = imgItem
        const cover = img || originalImgUrl
        const result = new Playlist(id, Migu.CODE, cover, title)
        Object.assign(result, { about })
        
        url = `https://app.c.nf.migu.cn/MIGUM3.0/resource/playlist/song/v2.0?pageNo=${page}&pageSize=50&playlistId=${id}`
        const dataJson = await getJson(url, null, defaultConfig)
        const { songList } = dataJson.data
        songList.forEach(item => {
          const { songId, songName, duration, mvId, resourceType, copyrightId, contentId, albumId, album: albumName, img1, img2, img3, singerList } = item
          const album = { id: albumId, name: albumName }
          const artist = (singerList || []).map(singer => {
            const { id, name, img } = singer
            return { id, name }
          })
          const track = new Track(songId, Migu.CODE, songName, artist, album,)
          Object.assign(track, {
            cover: 'https://d.musicapp.migu.cn' + (img1 || img2 || img3),
            duration: (duration * 1000),
            //mv: mvId,
            resourceType,
            copyrightId,
            contentId,
            pid: id,
          })
          result.data.push(track)
        })
        resolve(result)
      })
    })
  }

  static async playDetail(id, track) {
    return new Promise((resolve, reject) => {
      const { resourceType, copyrightId, contentId, } = track
      const url = `https://app.c.nf.migu.cn/MIGUM3.0/strategy/pc/listen/v1.0?netType=01&resourceType=${resourceType}&copyrightId=${copyrightId}&contentId=${contentId}&toneFlag=PQ&scene=`
      getJson(url, null, getFullDefaultConfig()).then(json => {
        const { url } = json.data || {}
        Object.assign(track, { url })
        resolve(track)
      })
    })
  }

  static async artistDetail(id) {
    return new Promise((resolve, reject) => {
      const result = { id, platform: Migu.CODE , title: '未知歌手', cover: '', hotSongs: [], about: '' }
      const url = `https://app.c.nf.migu.cn/pc/bmw/singer/info/v1.1?singerId=${id}`
      getJson(url).then(json => {
        const { contents } = json.data
        const { contents: data } = contents[0]
        const { txt, img, img2, img3 } = data[0]
        Object.assign(result, {
          title: txt || '未知歌手',
          cover: img || img2 || img3,
        })
        resolve(result)
      })
    })
  }

  //歌手详情：全部歌曲
  static async artistDetailAllSongs(id,  offset, limit, page) {
    return new Promise((resolve, reject) => {
      const result = { id, platform: Migu.CODE, offset, limit, page, total: 0, totalPage: 1, data: [] }
      const url = `https://app.c.nf.migu.cn/pc/bmw/singer/song/v1.0?pageNo=${page}&singerId=${id}&type=1`
      getJson(url).then(json => {
        const { contents } = json.data
        const { contents: list } = contents[0]
        list.forEach(item => {
          const { songItem } = item
          const { songId, songName, duration, resourceType, copyrightId, contentId, albumId, album: albumName, img1, img2, img3, singerList } = songItem
          const album = { id: albumId, name: albumName }
          const artist = (singerList || []).map(singer => {
            const { id, name, img } = singer
            return { id, name }
          })
          const track = new Track(songId, Migu.CODE, songName, artist, album,)
          Object.assign(track, {
            cover: 'https://d.musicapp.migu.cn' + (img1 || img2 || img3),
            duration: (duration * 1000),
            resourceType,
            copyrightId,
            contentId,
          })
          result.data.push(track)
        })
        resolve(result)
      })
    })
  }

  //歌手详情: 专辑
  static async artistDetailAlbums(id, offset, limit, page) {
    return new Promise((resolve, reject) => {
      const result = { id, platform: Migu.CODE, offset, limit, page, total: 0, totalPage: 1, data: [] }
      const url = `https://app.c.nf.migu.cn/pc/bmw/singer/album/v1.0?pageNo=1&singerId=${id}`
      getJson(url).then(json => {
        const { contents: list } = json.data
        list.forEach(item => {
          const { resId: albumId, txt: title, txt2, txt3, img: cover, } = item
          const artist = [{ id, name: txt2 }]
          const album = new Album(albumId, Migu.CODE, title, cover, artist)
          Object.assign(album, {
            publishTime: txt3,
          })
          result.data.push(album)
        })
        resolve(result)
      })
    })
  }

  //专辑详情
  static async albumDetail(id) {
    return new Promise((resolve, reject) => {
      let url = `https://app.c.nf.migu.cn/resource/album/v2.0?albumId=${id}`
      getJson(url).then(async json => {
        const { albumId, title, imgItems, singer, singerId, singerImgs, summary: about, publishTime, publishDate, publishCorp, publishCompany } = json.data
        const { img: cover } = (imgItems[0] || imgItems[1] || imgItems[2] || {} )
        const artist = [ { id: singerId, name: singer }]
        const company = publishCorp || publishCompany
        const result = new Album(id, Migu.CODE, title, cover, artist, company, publishTime, about)
        
        url = `https://app.c.nf.migu.cn/MIGUM3.0/resource/album/song/v2.0?pageNo=1&pageSize=200&albumId=${id}`
        const songsJson = await getJson(url, null, defaultConfig)
        const { songList } = songsJson.data
        songList.forEach(item => {
          const { songId, songName, duration, resourceType, copyrightId, contentId, albumId, album: albumName, img1, img2, img3, singerList } = item
          const album = { id: albumId, name: albumName }
          const artist = (singerList || []).map(singer => {
            const { id, name, img } = singer
            return { id, name }
          })
          const track = new Track(songId, Migu.CODE, songName, artist, album,)
          Object.assign(track, {
            cover: 'https://d.musicapp.migu.cn' + (img1 || img2 || img3),
            duration: (duration * 1000),
            resourceType,
            copyrightId,
            contentId,
          })
          result.data.push(track)
        })
        resolve(result)
      })
    })
  }


  //搜索歌曲
  static async searchSongs(keyword, offset, limit, page) {
    keyword = toTrimString(keyword)
    page = page || 1
    return new Promise((resolve, reject) => {
      const result = { platform: Migu.CODE, offset, limit, page, data: [] }
      const url = `https://app.u.nf.migu.cn/pc/resource/song/item/search/v1.0?text=${keyword}&pageNo=${page}&pageSize=${limit}`
      getJson(url).then(json => {
        const list = json || []
        list.forEach(item => {
          const { songId, songName, duration, resourceType, copyrightId, contentId, albumId, album: albumName, img1, img2, img3, singerList } = item
          const album = { id: albumId, name: albumName }
          const artist = singerList.map(singer => {
            const { id, name, img } = singer
            return { id, name }
          })
          const track = new Track(songId, Migu.CODE, songName, artist, album,)
          Object.assign(track, {
            cover: (img1 || img2 || img3),
            duration: (duration * 1000),
            resourceType,
            copyrightId,
            contentId,
          })
          result.data.push(track)
        })
        resolve(result)
      })
    })
  }

  //搜索歌单
  static async searchPlaylists(keyword, offset, limit, page) {
    keyword = toTrimString(keyword)
    return new Promise((resolve, reject) => {
      const result = { platform: Migu.CODE, offset, limit, page, data: [] }
      const url = `https://app.u.nf.migu.cn/pc/v1.0/content/search_all.do?text=${keyword}&pageNo=${page}&pageSize=${limit}&searchSwitch={"songlist": 1}`
      getJson(url).then(json => {
        const { result: list } = json.songListResultData
        list.forEach(item => {
          const { id, name: title, musicListPicUrl: cover, playNum } = item
          const playlist = new Playlist(id, Migu.CODE, cover, title)
          Object.assign(playlist, { playCount: playNum })
          result.data.push(playlist)
        })
        resolve(result)
      })
    })
  }

  //搜索专辑
  static async searchAlbums(keyword, offset, limit, page) {
    keyword = toTrimString(keyword)
    return new Promise((resolve, reject) => {
      const result = { platform: Migu.CODE, offset, limit, page, data: [] }
      const url = `https://app.u.nf.migu.cn/pc/bmw/album/search/v1.0?text=${keyword}&pageNo=${page}&pageSize=${limit}`
      getJson(url).then(json => {
        const { result: list } = json.data
        list.forEach(item => {
          const { id, name: title, singer, imgItems, publishDate } = item
          const artist = [{ id: '', name: singer }]
          const cover = (imgItems[0] || imgItems[1] || imgItems[2] || {}).img
          const album = new Album(id, Migu.CODE, title, cover, artist)
          Object.assign(album, {
            publishTime: publishDate
          })
          result.data.push(album)
        })
        resolve(result)
      })
    })
  }

  //搜索歌手
  static async searchArtists(keyword, offset, limit, page) {
    keyword = toTrimString(keyword)
    return new Promise((resolve, reject) => {
      const result = { platform: Migu.CODE, offset, limit, page, data: [] }
      const url = `https://app.u.nf.migu.cn/pc/resource/search/singer/v1.0?text=${keyword}`
      getJson(url).then(json => {
        const { data: list } = json
        list.forEach(item => {
          const { singerId, singer, imgs, } = item
          const cover = (imgs[0] || imgs[1] || imgs[2] || {}).img
          result.data.push({
            id: singerId,
            platform: Migu.CODE,
            title: singer,
            cover,
          })
        })
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
    code: Migu.CODE, 
    vendor: Migu,
    name: '咪咕音乐', 
    shortName: 'MG', 
    online: true, 
    types: ['playlists', 'artists', 'albums'], 
    scopes: ['playlists', 'search', 'userhome', 'united'],
    artistTabs: ['all-songs', 'albums', 'about'],
    searchTabs: ['all-songs', 'playlists', 'albums', 'artists'],
    weight: 5
  })

  //获取UserAgent
  userAgent = await access(APIPermissions.GET_USER_AGENT)
  //设置Cookie
  setupMiguCookieId()

  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: Migu.CODE,
    hosts: ['migu.cn'],
    defaultHeaders: {
        Origin: 'https://music.migu.cn',
        Referer: 'https://music.migu.cn/'
    },
    includes: [{
      pattern: '/getPlayInfo',
      headers: {
        Cookie: `migu_cookie_id=${cookieId}` 
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音乐平台 - 咪咕音乐')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, Migu.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, Migu.CODE)
  console.log('[ PLUGIN - Deactivated ] 音乐平台 - 咪咕音乐')
}