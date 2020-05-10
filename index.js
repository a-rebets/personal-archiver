const fs = require('fs')
const memjs = require('memjs')
const path = require('path')
const TgBot = require('node-telegram-bot-api')
const enforce = require('express-sslify')
const { createAppAuth } = require('@octokit/auth-app')
const { Octokit } = require('probot')

const initBase = require('./src/initBaseRepo')
const updateBase = require('./src/updateBaseRepo')
const def = require('./src/defaults')
const events = ['installation.created', 'installation_repositories']

const baseName = process.env.BASE_REPO
const TgToken = process.env.TELEGRAM_TOKEN
const bot = new TgBot(TgToken)
const cache = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  failover: true,
  timeout: 1,
  keepAlive: true
})

const cacheSetCallback = (err, val) => {
  if (err) console.error(def.cache_err_msg)
}
const getKeyboardOptsReq = ({ fullName, id }) => ({
  inline_keyboard: [
    [
      { text: def.emoji(0x1F44E), callback_data: `skip_${id}` },
      { text: def.emoji(0x1F44D), callback_data: `add_${id}` }
    ],
    [{ text: `${def.emoji(0x1F310)} View on Github`, url: `https://github.com/${fullName}` }]
  ]
})
const getKeyboardOptsResp = (path) => ({
  inline_keyboard: [
    [{ text: `${def.emoji(0x1F5C2)} View in Archive`, url: `https://github.com/${path}` }]
  ]
})

/**
 * The main entrypoint to the Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.route().use(enforce.HTTPS({ trustProtoHeader: true }))
  app.log('Personal Archiver is running successfully.')
  initBot(app.route('/tg'))
  app.route().get('/setup', async (req, res) => {
    app.log(`${req.query.code} ${req.query.installation_id} ${process.env.PRIVATE_KEY.replace(/\\n/g, '\n')}`)
    const auth = createAppAuth({
      id: Number.parseInt(process.env.APP_ID),
      privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: Number.parseInt(req.query.installation_id)
    });
    const authData = await auth({ type: "oauth", code: Number.parseInt(req.query.code) });
    app.log(authData)
    const baseOctokit = new Octokit({ auth: authData.token })
    baseOctokit.repos.createForAuthenticatedUser({
      name: process.env.BASE_REPO,
      description: 'A repository used by Personal Archiver bot',
      private: true
    })
    res.sendStatus(200)
  })

  app.on(events, async (context) => {
    let receivedRepos
    const baseCheckNeeded = true
    const rFilter = r => r.filter(r => r.name !== baseName)
    const paramObj = {
      ctx: context,
      evt: { e: context.event, a: context.payload.action },
      own: context.payload.sender.login
    }
    const fromCache = await Promise.resolve(cache.get(paramObj.own)).value
    const cacheObj = (fromCache) ? JSON.parse(fromCache.toString('utf8'))
      : { id: null, waitlist: [], track: [], omit: [] }

    app.log(`App is running as per [${paramObj.evt.e}]`)

    /* if (paramObj.evt.e === 'installation' && paramObj.evt.a === 'created') {
      bot.onText(/\B\/start\b/, async (msg) => {
        if (!cacheObj.id) {
          cacheObj.id = msg.from.id
          // cache.set(paramObj.own, toStore, {expires: 0}, cacheSetCallback)
          let opts = {
            caption: def.welcome_msg(msg.from.first_name),
            parse_mode: 'HTML'
          }
          const file = await Promise.resolve(fs.promises.readFile(
            path.join(__dirname, 'src/static/media/octocat.gif')
          ))
          await Promise.resolve(bot.sendDocument(msg.from.id, file, opts,
            { filename: 'octocat.gif', contentType: 'image/gif' }))
          bot.sendSticker(msg.from.id, def.tg_stickers.hey)
        } else {

        }
      })

      receivedRepos = context.payload.repositories || []
      if (![...receivedRepos].map(r => r.name).includes(baseName)) {
        await initBase(context)
        baseCheckNeeded = false
      }
      app.log('App has been successfully installed.')
    } else if (paramObj.evt.e === 'installation_repositories') {
      receivedRepos = context.payload.repositories_added || []
    }
    receivedRepos = rFilter(receivedRepos)
    const presentRepos = (baseCheckNeeded) ? (await context.github.repos.getContents({
      owner: paramObj.own, repo: baseName, path: ''
    })).data.filter(el => el.type === 'dir').map(d => d.name) : []
    const newRepos = receivedRepos.filter(r => !presentRepos.includes(r.name))
    if (receivedRepos.length > 0) {
      if (newRepos.length > 0) {
        const userId =
        bot.sendMessage(userId, def.begin_asking_msg)
        for (const repo of newRepos) {
          const opts = { reply_markup: getKeyboardOptsReq(repo) }
          bot.sendMessage(userId, def.ask_msg(), opts)
        }
        bot.on('callback_query', (callbackQuery) => {
          const [action, repoId] = callbackQuery.data.split('_')
          const msg = callbackQuery.message
          const opts = {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: getKeyboardOptsResp(`${baseName}/${newRepos.find(
              r => r.id === Number.parseInt(repoId)).name}`),
            parse_mode: 'HTML'
          }
          bot.editMessageText(def.repo_added_msg(), opts)
        })
      }
      for (const repo of rFilter(receivedRepos).slice(0, 2)) {
        await updateBase({
          ...paramObj, rep: repo, ini: !presentRepos.includes(repo.name)
        })
      }
    } */
  })
}

function initBot (router) {
  router.use(require('express').json())
  router.post(`/bot${TgToken}`, (req, res) => {
    bot.processUpdate(req.body)
    res.sendStatus(200)
  })
  bot.setWebHook(`${process.env.APP_URL}/bot${TgToken}`)
  cache.set('tg_id_mapping', JSON.stringify({}), { expires: 0 }, cacheSetCallback)
  bot.onText(/^(?:(?!\B\/start\b).)*$/s, (msg) => {
    const ind = Math.floor(Math.random() * def.confused_msg_list.length)
    bot.sendMessage(msg.from.id, def.confused_msg_list[ind])
  })
}
