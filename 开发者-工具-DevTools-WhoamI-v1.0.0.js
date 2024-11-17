/**
 * @name 开发者 - 工具 - DevTools
 * @version 1.0.0
 * @author WhoamI
 * @about 开发者工具插件，普通用户请不要安装本插件
 * @repository 
 */

/* 默认提供的插件API */
const { permissions } = lessAPI
const { APIPermissions, access } = permissions


/* 插件接入规范区 */
//插件启用
export const activate = () => {
  //获取权限
  access(APIPermissions.OPEN_DEV_TOOLS)
  console.log('[ PLUGIN - Activated ] 开发者 - 工具 - DevTools')
}

//插件停用
export const deactivate = () => {
  //归还权限
  access(APIPermissions.CLOSE_DEV_TOOLS)
  console.log('[ PLUGIN - Deactivated ] 开发者 - 工具 - DevTools')
}