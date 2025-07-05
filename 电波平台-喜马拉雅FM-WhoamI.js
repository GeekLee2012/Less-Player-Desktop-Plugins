/**
 * @name 电波平台 - 喜马拉雅FM
 * @version 1.0.0
 * @author WhoamI
 * @about 
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions } = lessAPI
const { Category, Playlist, Track, Album, Lyric } = common
const { toTrimString, getImageUrlByQuality, } = utils
const { hmacMd5, randomTextDefault, } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson } = nets
const { registerPlatform, addRequestHandler } = permissions


const getCoverByQuality = (url) => {
    if(!url) return ''

    const keywords = ['&name=small', '&name=medium', '&name=large']
    let index = -1
    for(let i = 0; i < keywords.length; i++) {
        index = i
        if(url.includes(keywords[i])) break
    }
    const keyword = keywords[index]
    return getImageUrlByQuality([
        url.replace(keyword, keywords[0]),
        url.replace(keyword, keywords[1]),
        url.replace(keyword, keywords[2]),
        url.replace(keyword, keywords[2]),
        url.replace(keyword, keywords[2])
    ])
}


class Ximalaya {
    static CODE = 'ximalaya'
    static RADIO_PREFIX = 'FM_'
    static VALUE_ALL = 'all'

    //全部电台分类
    static radioCategories() {
        return Ximalaya.fmRadioCategories()
    }

    static radioSquare(cate, offset, limit, page, order) {
        return Ximalaya.fmRadioSquare(cate, offset, limit, page, order)
    }

    //全部电台分类
    static fmRadioCategories() {
        return Ximalaya.fmRadioCategories_v1()
    }

    //全部电台分类
    static fmRadioCategories_v0() {
        return new Promise((resolve, reject) => {
            const url = 'https://www.ximalaya.com/radio/'

            getDoc(url).then(doc => {
                const result = { platform: Ximalaya.CODE, data: [], orders: [], multiMode: true }
                const cateListWraps = doc.querySelectorAll(".category-list .all-wrap .all")
                cateListWraps.forEach(wrapItem => {
                    const category = new Category()
                    result.data.push(category)
                    const list = wrapItem.querySelectorAll(".category-item")
                    list.forEach(item => {
                        const classStyle = item.getAttribute("class")
                        const name = item.getAttribute("title")
                        let value = item.getAttribute("href")
                        if (classStyle.includes('all')) {
                            category.name = name.replace('全部', '')
                            value = Ximalaya.VALUE_ALL
                        } else {
                            value = value.split("/")[2]
                        }
                        category.add(name, value)
                    })
                })
                resolve(result)
            })
        })
    }

    //全部电台分类
    static fmRadioCategories_v1() {
        return new Promise((resolve, reject) => {
            const url = 'https://mobile.ximalaya.com/radio-first-page-app/homePage'

            getJson(url).then(json => {
                const result = { platform: Ximalaya.CODE, data: [], orders: [], multiMode: true }
                const { data } = json
                const { modules } = data
                modules.forEach(item => {
                    const { id, name, type, locations, categories } = item
                    if(name != '找电台' || type != 'SEARCH') return

                    const category1 = new Category('地区')
                    result.data.push(category1)
                    locations.forEach(item => {
                        const { id, name, type } = item
                        const _id = id > 10 ? id : type
                        let key = name, value = `c${_id}`
                        if(key == '全部地区') value = Ximalaya.VALUE_ALL
                        category1.add(key, value)
                    })

                    const category2 = new Category('分类')
                    result.data.push(category2)
                    categories.forEach(item => {
                        const { id, name } = item
                        let key = name, value = `t${id}`
                        if(key == '全部分类') value = Ximalaya.VALUE_ALL
                        category2.add(key, value)
                    })
                })
                resolve(result)
            })
        })
    }

    //提取电台分类
    static parseFMRadioCate(cate) {
        const result = { locationId: 0, locationTypeId: 0, categoryId: 0, location: null, category: null }
        try {
            const valueAll = Ximalaya.VALUE_ALL
            //默认全部
            cate = cate || {
                '地区': {
                    item: { key: '全部', value: valueAll }
                },
                '分类': {
                    item: { key: '全部', value: valueAll }
                }
            }
            const location = cate['地区'].item.value
            const category = cate['分类'].item.value

            Object.assign(result, { location, category })

            if (location != valueAll) {
                const offset = toTrimString(location).startsWith('c') ? 1 : 0
                const value = location.substring(offset)
                //格式: c110000
                if (value.length > 1) {
                    result.locationId = value
                } else {
                    result.locationTypeId = value
                }
            }
            if (category != valueAll) {
                const offset = toTrimString(category).startsWith('t') ? 1 : 0
                const value = category.substring(offset)
                result.categoryId = value
            }
        } catch (error) {
            //console.log(error)
        }
        return result
    }

    static fmRadioSquare(cate, offset, limit, page, order) {
        const parsedCate = Ximalaya.parseFMRadioCate(cate)
        const { location, locationId, locationTypeId, categoryId, category } = parsedCate
        return new Promise((resolve, reject) => {
            const result = { platform: Ximalaya.CODE, cate, offset, limit, page, total: 0, data: [] }

            const pageSize = 48
            const url = 'https://mobile.ximalaya.com/radio-first-page-app/search'
                + `?locationId=${locationId}&locationTypeId=${locationTypeId}`
                + `&categoryId=${categoryId}&pageNum=${page}&pageSize=${pageSize}`

            getJson(url).then(json => {
                const list = json.data.radios
                const total = json.data.total
                result.total = Math.ceil(total / pageSize)
                list.forEach(item => {
                    const { id, name, coverSmall, coverLarge, categoryName, programId, programScheduleId } = item
                    const cover = getCoverByQuality(coverLarge || coverSmall)
                    const playlist = new Playlist(id, Ximalaya.CODE, cover, name)
                    playlist.programId = programId
                    playlist.type = Playlist.FM_RADIO_TYPE

                    const artist = [{ id: '', name: '喜马拉雅FM' }]
                    const album = { id: `${locationTypeId}-${locationId}`, name: categoryName }
                    const channelTrack = new Track(id, playlist.platform, name, artist, album, 0, cover)
                    channelTrack.url = `https://live.ximalaya.com/radio-first-page-app/live/${id}/64.m3u8?transcode=ts`
                    channelTrack.type = playlist.type
                    channelTrack.position = Ximalaya.stringifyPosition({ location, category, categoryName }, offset, limit, page, order)

                    playlist.addTrack(channelTrack)
                    result.data.push(playlist)
                })
                resolve(result)
            })
        })
    }

    static stringifyPosition(cate, offset, limit, page, order) {
        const { location, categoryName, category } = cate
        return `${location};${category};${categoryName};${offset};${limit};${page};${order || ''}`
    }

    static parsePosition(position) {
        try {
            if (position && (typeof position == 'object')) {
                const props = Object.keys(position)
                if (!props.includes('cate') || !props.includes('offset')
                    || !props.includes('limit') || !props.includes('page')) {
                    return null
                }
                return position
            }
            const [location, category, categoryName, offset, limit, page, order] = position.split(';')
            const cate = {
                '地区': {
                    item: {
                        key: location,
                        value: location
                    }
                },
                '分类': {
                    item: {
                        key: categoryName,
                        value: category
                    }
                }
            }
            return { cate, offset, limit, page, order }
        } catch (error) {
            if (isDevEnv()) console.log(error)
        }
        return null
    }

    //歌曲播放详情：url、cover等
    static playDetail(id, track) {
        return new Promise(async (resolve, reject) => {
            const { position } = track
            //由于url存在时效，可能会过期
            if (position) {
                const pPosition = Ximalaya.parsePosition(position)
                if (!pPosition) {
                    return resolve(track)
                }
                const { cate, offset, limit, page, order } = pPosition
                const radiosResult = await Ximalaya.fmRadioSquare(cate, offset, limit, page, order)
                if (radiosResult && radiosResult.data.length > 0) {
                    for (let i = 0; i < radiosResult.data.length; i++) {
                        const radioPlaylist = radiosResult.data[i]
                        if (toTrimString(id) == toTrimString(radioPlaylist.id)
                            && radioPlaylist.data && radioPlaylist.data.length > 0) {
                            const { url, cover } = radioPlaylist.data[0]
                            Object.assign(track, { url, cover: getCoverByQuality(cover) })
                            break
                        }
                    }
                }
            }
            resolve(track)
        })
    }

    //歌词
    static lyric(id, track) {
        return new Promise((resolve, reject) => {
            resolve({ id, platform: Ximalaya.CODE, lyric: new Lyric(), trans: null })
        })
    }

}



/* 插件接入规范区 */
//插件启用
export const activate = async (plugin) => {
  registerPlatform(plugin, {
    code: Ximalaya.CODE,
    vendor: Ximalaya,
    name: '喜马拉雅FM',
    shortName: 'XMLY',
    online: true,
    types: ['fm-radios'],
    scopes: ['radios', 'userhome', 'random'],
    weight: 5
  })

  addRequestHandler(plugin, {
    id: Ximalaya.CODE,
    hosts: ['ximalaya'],
    defaultHeaders: {
        Origin: 'https://www.ximalaya.com',
        Referer: 'https://www.ximalaya.com/',
    }
  })

  console.log('[ PLUGIN - Activated ] 电波平台 - 喜马拉雅FM')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 电波平台 - 喜马拉雅FM')
}