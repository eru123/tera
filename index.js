const autoload = require('auto-load')
const fp = require('fastify-plugin')
const path = require('path')
const _ = require('lodash')


const plugin = async (fastify, options, done) => {
    const globalOpts = options.options || {}
    const excluded = options.excluded || []
    const last = options.last || []
    const order = options.order || []
    const plugins = {}
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

    const installOrder = async (orderList) => {
        if(!(typeof orderList === 'object')) throw new Error(`[PLUGIN] 'order' must be an array`)
        if(!Array.isArray(orderList)) throw new Error(`[PLUGIN] 'order' must be an array`)
        orderList.forEach(async (key) => {
            if(typeof key === 'string') await install(key)
            else await installOrder(key)
        })
    }

    await installOrder(order)

    for(const key in plugins) if (last.indexOf(key) > -1) await install(key)
    for(const key in plugins) await install(key)
    
    done()
}

module.exports = fp(plugin, {fastify: '>=3.0.0', name: 'tuos-tera'})