/**
 * @name 音源 - Demo（空实现版）
 * @version 1.0.0
 * @author WhoamI
 * @about 空实现，什么也没有返回
 * @repository 
 */

/* 默认提供的插件API */
const { common, utils, crypto, events, nets, } = window.lessAPI
const { toMmss, toMillis } = utils
const { randomTextDefault, aesEncryptText, rsaEncryptDefault } = crypto
const { APIEvents, register, unregister } = events
const { getDoc, getJson, postJson } = nets




/* 自由开发代码区 */
const getExTrackPlayUrl = async track => {
  //Demo音源，代码空实现
  /*
  return  {
    url: null,  //播放URL
    exurl: null //额外URL
  }
  */
}



/* 插件接入规范区 */
//插件启用
export const activate = () => {
  /** 注册事件
   * @param apiEvent 事件名称
   * @param handler 事件处理函数，返回类型Promise
   */
  register(APIEvents.TRACK_GET_PLAY_URL, getExTrackPlayUrl)
  console.log('[ PLUGIN - Activated ] 音源 - Demo（空实现版）')
}

//插件停用
export const deactivate = () => {
  //注销事件
  unregister(APIEvents.TRACK_GET_PLAY_URL)
  console.log('[ PLUGIN - Deactivated ] 音源 - Demo（空实现版）')
}
