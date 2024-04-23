/**
 * @name 音乐平台 - 咪咕
 * @version 1.0.0
 * @author WhoamI
 * @about 不支持直接独立播放，但配合其他平台可播放；<br>即当前平台仅提供歌单，其他平台提供音乐源。
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toMmss, toMillis, toTrimString, transformUrl } = utils
const { randomTextDefault, randomText, md5, sha1, sha256, aesEncryptDefault, rsaEncryptDefault } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson } = nets
const { APIPermissions, access } = permissions




let userAgent = null, cookieId = null
const PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8asrfSaoOb4je+DSmKdriQJKW\nVJ2oDZrs3wi5W67m3LwTB9QVR+cE3XWU21Nx+YBxS0yun8wDcjgQvYt625ZCcgin\n2ro/eOkNyUOTBIbuj9CvMnhUYiR61lC1f1IGbrSYYimqBVSjpifVufxtx/I3exRe\nZosTByYp4Xwpb1+WAQIDAQAB\n-----END PUBLIC KEY-----"

const uuid = () => {
  for (var t = [], e = 0; e < 36; e++) t[e] = '0123456789abcdef'.substr(Math.floor(16 * Math.random()), 1);
  t[14] = '4',
  t[19] = '0123456789abcdef'.substr(3 & t[19] | 8, 1),
  t[8] = t[13] = t[18] = t[23] = '-';
  var n = t.join('');
  return n
}

const setupMiguCookieId = () => {
  if(!cookieId) cookieId = (uuid() + '-n4' + (new Date).getTime())
  return cookieId
}

const getSearchUrl = (keyword, page, type) => {
  const f ="html",s = Date.now() / 1000, c="001002A", v = "3.25.6";
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



//自定义平台
class Migu {

  static CODE = 'migu'
  static NEWEST_CODE = '1000000000'


  static async categories() {
    const config = { 
      headers: { 
        _Referer: 'https://music.migu.cn/v3'
      } 
    }

    const result = { platform: Migu.CODE, data: [], orders: [] }
    const url = 'https://music.migu.cn/v3/music/playlist'
    const doc = await getDoc(url, null, config)
    const hottagEls = doc.querySelectorAll('.songlist-tag .hottag')
    const hotCategory = new Category('热门')
    hotCategory.add('最新', Migu.NEWEST_CODE)
    result.data.push(hotCategory)
    hottagEls.forEach(el => {
      const aEl = el.querySelector('a')
      const name = aEl.textContent
      if(name == '更多') return
      const href = aEl.getAttribute('href')
      const tagId = href.split('=')[1]
      hotCategory.add(name, tagId)
    })
    const moretagEls = doc.querySelectorAll('.songlist-tag .filter')
    moretagEls.forEach(el => {
      const cateName = el.querySelector('.tag-name').textContent
      const category = new Category(cateName)
      result.data.push(category)

      let listEls = el.querySelectorAll('.ptag_normal .tag-list li')
      listEls.forEach(liEl => {
        const aEl = liEl.querySelector('a')
        const name = aEl.textContent
        if(name == '更多') return
        const href = aEl.getAttribute('href')
        const tagId = href.split('=')[1]
        category.add(name, tagId)
      })

      listEls = el.querySelectorAll('.ptag_normal .container li')
      listEls.forEach(liEl => {
        const aEl = liEl.querySelector('a')
        const name = aEl.textContent
        if(name == '更多') return
        const href = aEl.getAttribute('href')
        const tagId = href.split('=')[1]
        category.add(name, tagId)
      })

    })
    return result
  }

  static async square(cate, offset, limit, page, order) {
    const config = { 
      headers: { 
        _Referer: 'https://music.migu.cn/v3/music/playlist'
      } 
    }

    const result = { platform: Migu.CODE, cate, offset, limit, page, total: 0, data: [] }

    if(cate == Migu.NEWEST_CODE) cate = ''
    const cateInfo = cate ? `tagId=${cate}&` : ''
    const url = `https://music.migu.cn/v3/music/playlist?${cateInfo}page=${page}`
    const doc = await getDoc(url, null, config)
    const listEls = doc.querySelectorAll('.song-list-cont li')
    listEls.forEach(el => {
      const coverEl = el.querySelector('.music-cover img')
      const titleEl = el.querySelector('.song-list-name a')
      const playCountEl = el.querySelector('.desc-text')
      const playBtnEl = el.querySelector('.play-btn')

      const id = toTrimString(playBtnEl && playBtnEl.getAttribute('data-id'))
      const title = toTrimString(titleEl && titleEl.textContent)
      const cover = transformUrl(coverEl && coverEl.getAttribute('data-original'))
      const playCount = toTrimString(playCountEl && playCountEl.textContent)

      const playlist = new Playlist(id, Migu.CODE, cover, title)
      Object.assign(playlist, { playCount })
      result.data.push(playlist)
    })

    const pageEls = doc.querySelectorAll('.page a')
    pageEls.forEach(el => {
      try {
        if(!el.textContent) return
        const total = parseInt(el.textContent)
        Object.assign(result, { total })
      } catch(error) {
        console.log(error)
      }
    })
    return result
  }

  static async playlistDetail(id, offset, limit, page) {
    const pageInfo = page > 1 ? `?page=${page}` : ''
    const url = `https://music.migu.cn/v3/music/playlist/${id}${pageInfo}`
    const doc = await getDoc(url)

    const infoEl = doc.querySelector('.mpd-playlist-info')
    const coverEl = infoEl.querySelector('.thumb-img')
    const titleEl = infoEl.querySelector('.title')
    const introEl = infoEl.querySelector('.intro')
    const aboutEl = infoEl.querySelector('.intro-details')

    const cover = transformUrl(coverEl.getAttribute('src'))
    const title = titleEl.textContent
    const about = (aboutEl && aboutEl.textContent) || (introEl && introEl.getAttribute('title'))


    const result = new Playlist(id, Migu.CODE, cover, title)
    Object.assign(result, { about })

    const listEls = doc.querySelectorAll('.songlist-body .row')
    const data = []
    listEls.forEach(el => {
      const cid = el.getAttribute('data-cid')
      const aid = el.getAttribute('data-aid')
      const mid = el.getAttribute('data-mid')

      const titleEl = el.querySelector('.song-name .song-name-txt')
      const mvEl = el.querySelector('.song-name .flag-mv')
      const artistEls = el.querySelectorAll('.song-singers a')
      const albumEl = el.querySelector('.song-belongs a')

      let index = -1, mv = null, album = null
      const title = titleEl.getAttribute('title')
      if(mvEl) {
        const mvHref = mvEl.getAttribute('href')
        index = mvHref.lastIndexOf('/')
        mv = mvHref.substring(index + 1)
      }
      
      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      if(albumEl) {
        const alHref = albumEl.getAttribute('href')
        index = alHref.lastIndexOf('/')
        album = { id: alHref.substring(index + 1), name: albumEl.textContent }
      }

      const track = new Track(cid, Migu.CODE, title, artist, album)
      Object.assign(track, {
        aid, mid, mv, pid: id
      })
      data.push(track)
    })
    if (data && data.length > 0) result.data.push(...data)

    const pageEls = doc.querySelectorAll('.page a')
    pageEls.forEach(el => {
      try {
        if(!el.textContent) return
        const totalPage = parseInt(el.textContent)
        Object.assign(result, { totalPage })
      } catch(error) {
        console.log(error)
      }
    })
    if(result.totalPage > 1) Object.assign(result, { total: -1 })
    return result
  }


  static async playDetail(id, track) {
    const result = { ...track }
    const config = { 
      headers: { 
        _Referer: 'https://music.migu.cn/v3/music/player/audio'
      } 
    }

    const { mid } = track
    //封面
    let url = `https://music.migu.cn/v3/api/music/audioPlayer/getSongPic?songId=${mid}`
    let json = await getJson(url, null, config)
    const { smallPic, mediumPic, largePic } = json 
    const cover = transformUrl(mediumPic || smallPic || largePic)
    Object.assign(result, { cover })

    //歌词
    url = `https://music.migu.cn/v3/api/music/audioPlayer/getLyric?copyrightId=${id}`
    json = await getJson(url, null, config)
    const { lyric, sbslyric, translatedLyric } = json
    Object.assign(result, { lyric: Lyric.parseFromText(lyric) })

    //播放url
    const t = { rawType:2, raw:{ copyrightId: id, type:1, auditionsFlag:0 }}
    const { dataType, data, secKey } = getPlayDetailSignedParams(t)
    
    url = `https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?dataType=${dataType}&data=${data}&secKey=${secKey}`
    json = await getJson(url, null, config)
    const { returnCode, data: retData } = json
    if(retData) Object.assign(result, { url: retData.playUrl })
    
    return result
  }


  static async artistDetail(id) {
    const result = { id, platform: Migu.CODE ,title: '未知歌手', cover: '', hotSongs: [], about: '' }
    const url = `https://music.migu.cn/v3/music/artist/${id}`
    const doc = await getDoc(url, null, { 
      headers: {  
        _Referer: 'https://music.migu.cn/v3/playlist', 
      }
    })
    const infoEl = doc.querySelector('.artist-info')
    const coverEl = infoEl.querySelector('.artist-avatar img')
    const titleEl = infoEl.querySelector('.artist-name a')
    const aboutEl = infoEl.querySelector('.artist-intro .content')

    const cover = transformUrl(coverEl && coverEl.getAttribute('src'))
    const title = toTrimString(titleEl && titleEl.textContent)
    const about = toTrimString(aboutEl && aboutEl.textContent)
    Object.assign(result, { cover, title, about })


    const list = doc.querySelectorAll('.page-songlist .songlist-body .row')
    const data = []
    list.forEach(el => {
      const id = el.getAttribute('data-cid')
      const aid = el.getAttribute('data-aid')
      const mid = el.getAttribute('data-mid')

      const titleEl = el.querySelector('.song-name .song-name-txt')
      const mvEl = el.querySelector('.song-name .flag-mv')
      const artistEls = el.querySelectorAll('.song-singers a')
      const albumEl = el.querySelector('.song-belongs a')

      let index = -1, mv = null, album = null
      const title = titleEl.getAttribute('title')
      if(mvEl) {
        const mvHref = mvEl.getAttribute('href')
        index = mvHref.lastIndexOf('/')
        mv = mvHref.substring(index + 1)
      }
      
      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      if(albumEl) {
        const alHref = albumEl.getAttribute('href')
        index = alHref.lastIndexOf('/')
        album = { id: alHref.substring(index + 1), name: albumEl.textContent }
      }

      const track = new Track(id, Migu.CODE, title, artist, album)
      Object.assign(track, {
        aid, mid, mv
      })
      data.push(track)
    })
    if (data && data.length > 0) result.hotSongs.push(...data)
    return result
  }

  //歌手详情：全部歌曲
  static async artistDetailAllSongs(id,  offset, limit, page) {
    const result = { id, platform: Migu.CODE, offset, limit, page, total: 0, totalPage: 1, data: [] }
    const url = `https://music.migu.cn/v3/music/artist/${id}/song?page=${page}`
    const doc = await getDoc(url, null, { 
      headers: {  
        _Referer: 'https://music.migu.cn/v3/playlist',
      }
    })

    const list = doc.querySelectorAll('.page-songlist .songlist-body .row')
    const data = []
    list.forEach(el => {
      const id = el.getAttribute('data-cid')
      const aid = el.getAttribute('data-aid')
      const mid = el.getAttribute('data-mid')

      const titleEl = el.querySelector('.song-name .song-name-txt')
      const mvEl = el.querySelector('.song-name .flag-mv')
      const artistEls = el.querySelectorAll('.song-singers a')
      const albumEl = el.querySelector('.song-belongs a')

      let index = -1, mv = null, album = null
      const title = titleEl.getAttribute('title')
      if(mvEl) {
        const mvHref = mvEl.getAttribute('href')
        index = mvHref.lastIndexOf('/')
        mv = mvHref.substring(index + 1)
      }
      
      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      if(albumEl) {
        const alHref = albumEl.getAttribute('href')
        index = alHref.lastIndexOf('/')
        album = { id: alHref.substring(index + 1), name: albumEl.textContent }
      }

      const track = new Track(id, Migu.CODE, title, artist, album)
      Object.assign(track, {
        aid, mid, mv
      })
      data.push(track)
    })
    if (data && data.length > 0) result.data.push(...data) 
    
    const pageEls = doc.querySelectorAll('.page a')
    pageEls.forEach(el => {
      try {
        if(!el.textContent) return
        const totalPage = parseInt(el.textContent)
        Object.assign(result, { totalPage })
      } catch(error) {
        console.log(error)
      }
    })
    if(result.totalPage > 1) Object.assign(result, { total: -1 })

    const sectionTitleEl = doc.querySelector('.artist-section-title span')
    if(sectionTitleEl) {
      const secTitle = sectionTitleEl.textContent
      try {
        const total = parseInt(secTitle.replace('（', '(').replace('）', ')').split('(')[1].split(')')[0])
        Object.assign(result, { total })
      } catch(error) {
        console.log(error)
      }
    }
    return result
  }


  //歌手详情: 专辑
  static async artistDetailAlbums(id, offset, limit, page) {
    const result = { id, platform: Migu.CODE, offset, limit, page, total: 0, totalPage: 1, data: [] }
    const url = `https://music.migu.cn/v3/music/artist/${id}/album?page=${page}`
    const doc = await getDoc(url, null, { 
      headers: {  
        _Referer: 'https://music.migu.cn/v3/playlist',
      }
    })

    const list = doc.querySelectorAll('.artist-album-list li')
    const data = []
    list.forEach(el => {
      const coverEl = el.querySelector('.thumb-img')
      const titleEl = el.querySelector('.album-name')
      const artistEls = el.querySelectorAll('.album-singers .singer')

      let index = -1
      const alHref = titleEl.getAttribute('href')
      index = alHref.lastIndexOf('/')
      const albumId = alHref.substring(index + 1)

      const title = titleEl.getAttribute('title')
      const cover = transformUrl(coverEl && coverEl.getAttribute('data-original'))

      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      const album = new Album(albumId, Migu.CODE, title, cover, artist)
      data.push(album)
    })
    if (data && data.length > 0) result.data.push(...data) 
    
    const pageEls = doc.querySelectorAll('.page a')
    pageEls.forEach(el => {
      try {
        if(!el.textContent) return
        const totalPage = parseInt(el.textContent)
        Object.assign(result, { totalPage })
      } catch(error) {
        console.log(error)
      }
    })
    if(result.totalPage > 1) Object.assign(result, { total: -1 })

    const sectionTitleEl = doc.querySelector('.artist-section-title span')
    if(sectionTitleEl) {
      const secTitle = sectionTitleEl.textContent
      try {
        const total = parseInt(secTitle.replace('（', '(').replace('）', ')').split('(')[1].split(')')[0])
        Object.assign(result, { total })
      } catch(error) {
        console.log(error)
      }
    }
    return result
  }


  //专辑详情
  static async albumDetail(id) {
    const url = `https://music.migu.cn/v3/music/album/${id}`
    const doc = await getDoc(url, null, { 
      headers: {  
        _Referer: 'https://music.migu.cn/v3/playlist', 
      }
    })

    const infoEl = doc.querySelector('.mad-album-info')
    const coverEl = infoEl.querySelector('.thumb-img')
    const titleEl = infoEl.querySelector('.content .title')
    const artistEls = infoEl.querySelectorAll('.singer-name a')
    const companyEl = infoEl.querySelector('.content .pub-company')
    const publishTimeEl = infoEl.querySelector('.content .pub-date')
    const aboutEl = infoEl.querySelector('.content .intro .J_IntroInline')

    const cover = transformUrl(coverEl && coverEl.getAttribute('src'))
    const title = toTrimString(titleEl && titleEl.textContent)
    const company = toTrimString(companyEl && companyEl.textContent).replace('发行公司：', '')
    const publishTime = toTrimString(publishTimeEl && publishTimeEl.textContent).replace('发行时间：', '')
    const about = toTrimString(aboutEl && aboutEl.textContent)

    let index = -1
    const artist = []
    if(artistEls) {
      artistEls.forEach(arEl => {
        const href = arEl.getAttribute('href')
        index = href.lastIndexOf('/')
        artist.push({
          id: href.substring(index + 1),
          name: arEl.textContent
        })
      })
    }

    const result = new Album(id, Migu.CODE, title, cover, artist, company, publishTime, about)

    const listEls = doc.querySelectorAll('.songlist-body .row')
    const data = []
    listEls.forEach(el => {
      const cid = el.getAttribute('data-cid')
      const aid = el.getAttribute('data-aid')
      const mid = el.getAttribute('data-mid')

      const titleEl = el.querySelector('.song-name .song-name-txt')
      const mvEl = el.querySelector('.song-name .flag-mv')
      const artistEls = el.querySelectorAll('.song-singers a')
      const albumEl = el.querySelector('.song-belongs a')
      const durationEl = el.querySelector('.song-duration')

      let index = -1, mv = null, album = null
      const tTitle = titleEl.getAttribute('title')
      if(mvEl) {
        const mvHref = mvEl.getAttribute('href')
        index = mvHref.lastIndexOf('/')
        mv = mvHref.substring(index + 1)
      }
      
      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      if(albumEl) {
        const alHref = albumEl.getAttribute('href')
        index = alHref.lastIndexOf('/')
        album = { id: alHref.substring(index + 1), name: albumEl.textContent }
      } else {
        album = { id, name: title }
      }

      const duration = toMillis(toTrimString(durationEl && durationEl.textContent))

      const track = new Track(cid, Migu.CODE, tTitle, artist, album)
      Object.assign(track, {
        aid, mid, mv, pid: id, duration
      })
      data.push(track)
    })
    if (data && data.length > 0) result.data.push(...data)

    const pageEls = doc.querySelectorAll('.page a')
    pageEls.forEach(el => {
      try {
        if(!el.textContent) return
        const totalPage = parseInt(el.textContent)
        Object.assign(result, { totalPage })
      } catch(error) {
        console.log(error)
      }
    })
    if(result.totalPage > 1) Object.assign(result, { total: -1 })
    return result
  }


  //搜索歌曲
  static async searchSongs(keyword, offset, limit, page) {
    const result = { platform: Migu.CODE, offset, limit, page, data: [] }
    const url = getSearchUrl(keyword, page, 'song')
    const doc = await getDoc(url, null, { 
      headers: {  
        _Referer: 'https://music.migu.cn/v3', 
        _Cookie: `migu_cookie_id=${cookieId}` 
      }
    })
   
    const list = doc.querySelectorAll('.page-songlist .songlist-body .row')
    const data = []
    list.forEach(el => {
      const id = el.getAttribute('data-cid')
      const aid = el.getAttribute('data-aid')
      const mid = el.getAttribute('data-mid')

      const titleEl = el.querySelector('.song-name .song-name-txt')
      const mvEl = el.querySelector('.song-name .flag-mv')
      const artistEls = el.querySelectorAll('.song-singers a')
      const albumEl = el.querySelector('.song-belongs a')

      let index = -1, mv = null, album = null
      const title = titleEl.getAttribute('title')
      if(mvEl) {
        const mvHref = mvEl.getAttribute('href')
        index = mvHref.lastIndexOf('/')
        mv = mvHref.substring(index + 1)
      }
      
      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      if(albumEl) {
        const alHref = albumEl.getAttribute('href')
        index = alHref.lastIndexOf('/')
        album = { id: alHref.substring(index + 1), name: albumEl.textContent }
      }

      const track = new Track(id, Migu.CODE, title, artist, album)
      Object.assign(track, {
        aid, mid, mv
      })
      data.push(track)
    })
    if (data && data.length > 0) result.data.push(...data)
    return result
  }

  //搜索歌单
  static async searchPlaylists(keyword, offset, limit, page) {
      const result = { platform: Migu.CODE, offset, limit, page, data: [] }
      const url = getSearchUrl(keyword, page, 'playlist')
      const doc = await getDoc(url, null, { 
        headers: {  
          _Referer: 'https://music.migu.cn/v3', 
          _Cookie: `migu_cookie_id=${cookieId}` 
        }
      })
     
      const listEls = doc.querySelectorAll('#artist-playlist-cont li')
      listEls.forEach(el => {
        const coverEl = el.querySelector('.music-cover img')
        const titleEl = el.querySelector('.song-list-name a')
        const playCountEl = el.querySelector('.desc-text')
        const playBtnEl = el.querySelector('.play-btn')

        const id = toTrimString(playBtnEl && playBtnEl.getAttribute('data-id'))
        const title = toTrimString(titleEl && titleEl.textContent)
        const cover = transformUrl(coverEl && coverEl.getAttribute('data-original'))
        const playCount = toTrimString(playCountEl && playCountEl.textContent)

        const playlist = new Playlist(id, Migu.CODE, cover, title)
        Object.assign(playlist, { playCount })
        result.data.push(playlist)
      })

      const pageEls = doc.querySelectorAll('.page a')
      pageEls.forEach(el => {
        try {
          if(!el.textContent) return
          const total = parseInt(el.textContent)
          Object.assign(result, { total })
        } catch(error) {
          console.log(error)
        }
      })
      return result
  }


  //搜索专辑
  static async searchAlbums(keyword, offset, limit, page) {
      const result = { platform: Migu.CODE, offset, limit, page, data: [] }
      const url = getSearchUrl(keyword, page, 'album')
      const doc = await getDoc(url, null, { 
        headers: {  
          _Referer: 'https://music.migu.cn/v3', 
          _Cookie: `migu_cookie_id=${cookieId}` 
        }
      })

    const listEls = doc.querySelectorAll('#artist-album-cont li')
    const data = []
    listEls.forEach(el => {
      const coverEl = el.querySelector('.thumb-img')
      const titleEl = el.querySelector('.album-name')
      const artistEls = el.querySelectorAll('.album-singers .singer')
      const publishTimeEl = el.querySelector('.album-release-date')

      let index = -1
      const alHref = titleEl.getAttribute('href')
      index = alHref.lastIndexOf('/')
      const albumId = alHref.substring(index + 1)

      const title = toTrimString(titleEl && titleEl.textContent)
      const cover = transformUrl(coverEl && coverEl.getAttribute('data-original'))
      const publishTime = toTrimString(publishTimeEl && publishTimeEl.textContent)

      const artist = []
      if(artistEls) {
        artistEls.forEach(arEl => {
          const href = arEl.getAttribute('href')
          index = href.lastIndexOf('/')
          artist.push({
            id: href.substring(index + 1),
            name: arEl.textContent
          })
        })
      }

      const album = new Album(albumId, Migu.CODE, title, cover, artist)
      Object.assign(album, { publishTime })
      data.push(album)
    })
    if (data && data.length > 0) result.data.push(...data)
    return result
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
    scopes: ['playlists', 'search', 'userhome'],
    artistTabs: ['hot-songs', 'all-songs', 'albums', 'about'],
    searchTabs: ['all-songs', 'playlists', 'albums'],
    weight: 8
  })

  //获取UserAgent
  userAgent = await access(APIPermissions.GET_USER_AGENT)
  //设置Cookie
  setupMiguCookieId()

  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: Migu.CODE,
    hosts: ['migu.cn'],
    defaultHeaders: {
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