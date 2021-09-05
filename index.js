const autoload = require('auto-load')
const fp = require('fastify-plugin')
const path = require('path')
const _ = require('lodash')


const plugin = async (fastify, options, done) => {
    const name = options.name || 'tuos'
    const globalOpts = options.options || {}
    const custom = options.custom || {}
    const excluded = options.excluded || []
    const last = options.last || []
    const order = options.order || []
    const only = options.only || []
    let plugins = {}
    const dir = path.resolve(options.dir) 
    const raw = _.omit(autoload(dir), excluded)
    for (const key in raw) if ('index' in raw[key] && 'plugin' in raw[key].index) plugins[key] = raw[key].index

    const installed = []

    const install = async (key) => {
        console.log(`[PLUGIN] ${key}: Installing...`)
        try {
            if (installed.indexOf(key) > -1) {
                console.log('[PLUGIN] ' + key + ': Already installed')
            } else if (!(key in plugins)) {
                console.warn('[PLUGIN] ' + key + ': Not listed')
            } else {
                installed.push(key)
                await fastify.after()
                await fastify.register(plugins[key].plugin, globalOpts)
                console.log('[PLUGIN] ' + key + ': Installed')
            }
        } catch (e) {
            console.error('[PLUGIN] ' + key + ': Failed to install', e)
            process.exit(1)
        }
    }

    if (only.length > 0) plugins = _.pick(plugins, only)

    const installOrder = async (orderList) => {
        if(!(typeof orderList === 'object')) throw new Error(`[PLUGIN] 'order' must be an array`)
        if(!Array.isArray(orderList)) throw new Error(`[PLUGIN] 'order' must be an array`)
        orderList.forEach(async (key) => {
            if(typeof key === 'string' && installed.indexOf(key) === -1) await install(key)
            else if (Array.isArray(key)) await installOrder(key)
        })
    }

    await installOrder(order)

    for(const key in _.omit(plugins,installed)) if (last.indexOf(key) > -1) await install(key)
    for(const key in  _.omit(plugins,installed)) await install(key)
    
    if(name in fastify) {
        for(const key in plugins) fastify[name].plugins[key] = plugins[key]
        for(const key in globalOpts) fastify[name].options[key] = globalOpts[key]
    } else fastify.decorate(name, {plugins, options: globalOpts, custom})

    done()
}

module.exports = fp(plugin, {fastify: '>=3.0.0', name: 'tuos-tera'})