/**
 * @name 开发者 - 工具 - DevTools
 * @version 1.0.0
 * @author WhoamI
 * @about 开发者工具插件，普通用户请不要安装本插件
 * @repository 
 */

/* 默认提供的插件API */
const { permissions } = lessAPI
const { openDevTools } = permissions


/* 插件接入规范区 */
//插件启用
export const activate = (plugin) => {
  openDevTools(plugin)
  console.log('[ PLUGIN - Activated ] 开发者 - 工具 - DevTools')
}

//插件停用
export const deactivate = (plugin) => {
  console.log('[ PLUGIN - Deactivated ] 开发者 - 工具 - DevTools')
}

//插件配置更新（可选函数，非需要时可不必定义该函数）
export const optionsUpdated = (plugin) => {
  console.log('[ PLUGIN - OptionsUpdated ] 开发者 - 工具 - DevTools')
}