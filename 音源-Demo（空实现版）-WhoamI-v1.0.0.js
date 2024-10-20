/**
 * @name 音源 - Demo（空实现版）
 * @version 1.0.0
 * @author WhoamI
 * @about 空实现，什么也没有返回
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, permissions, } = lessAPI
const { toMmss, toMillis } = utils
const { randomTextDefault, aesEncryptText, rsaEncryptDefault } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson } = nets
const { APIPermissions, access } = permissions




/* 自由开发代码区 */
class Demo {
    static CODE = "demo"

    //获取歌曲播放详情：url、cover、lyric等
    //注意：无法成功获取有效数据时，约定返回值为null
    //返回值（属性列表）：{ ...track, url, cover, lyric, lyricTrans, lyricRoma }
    static transferTrack(track, options) {
      return new Promise((resolve, reject) => {
        resolve(null)
      })
    }

}

/* 插件接入规范区 */
//插件启用
export const activate = () => {
  //获取权限
  access(APIPermissions.ADD_PLATFORM, { 
    code: Demo.CODE,
    vendor: Demo,
    name: '自定义音源（空实现）',
    shortName: 'DM',
    online: true,
    types: [],
    scopes: ['united'], //使用范围：统一平台，即歌曲无法播放时，
    artistTabs: [],
    searchTabs: [],
    weight: 8
  })

  //获取UserAgent
  //const userAgent = await access(APIPermissions.GET_USER_AGENT)

  access(APIPermissions.ADD_REQUEST_HANDLER, {
    id: Demo.CODE,
    hosts: ['abc.xyz'],
    defaultHeaders: {
        Origin: 'https://abc.xyz/',
        Referer: 'https://abc.xyz/',
    },
    includes: [{
      pattern: 'abc.xyz',
      headers: {
        Origin: 'abc.xyz',
        Referer: 'abc.xyz/'
      }
    }]
  })

  console.log('[ PLUGIN - Activated ] 音源 - Demo（空实现版）')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.REMOVE_PLATFORM, Demo.CODE)
  access(APIPermissions.REMOVE_REQUEST_HANDLER, Demo.CODE)
  console.log('[ PLUGIN - Deactivated ] 音源 - Demo（空实现版）')
}
