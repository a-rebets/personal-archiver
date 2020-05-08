const fs = require('fs')
const memjs = require('memjs')
const path = require('path')
const TgBot = require('node-telegram-bot-api')

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

/**
 * The main entrypoint to the Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.log('Personal Archiver is running successfully.')
  initBot(app.route('/tg'))

  /* app.on(events, async (context) => {
    let newRepos
    let baseCheckNeeded = true
    const rFilter = r => r.filter(r => r.name !== baseName)
    const paramObj = {
      ctx: context,
      evt: { e: context.event, a: context.payload.action },
      own: context.payload.sender.login
    }
    app.log(`App is running as per [${paramObj.evt.e}]`)
    if (paramObj.evt.e === 'installation' && paramObj.evt.a === 'created') {
      newRepos = context.payload.repositories || []
      if (![...newRepos].map(r => r.name).includes(baseName)) {
        await initBase(context)
        baseCheckNeeded = false
      }
      app.log('App has been successfully installed.')
    } else if (paramObj.evt.e === 'installation_repositories') {
      newRepos = context.payload.repositories_added || []
    }
    const presentRepos = (baseCheckNeeded) ? (await context.github.repos.getContents({
      owner: paramObj.own, repo: baseName, path: ''
    })).data.filter(el => el.type === 'dir').map(d => d.name) : []

    if (newRepos.length > 0) {
      for (const repo of rFilter(newRepos).slice(0, 2)) {
        await updateBase({
          ...paramObj, rep: repo, ini: !presentRepos.includes(repo.name)
        })
      }
    }
  }) */
  // cache.get()
  // cache.set('hello', 'memcachier', {expires: 0}, cacheSetCallback)
}

function initBot (router) {
  router.use(require('express').json())
  router.post(`/bot${TgToken}`, (req, res) => {
    bot.processUpdate(req.body)
    res.sendStatus(200)
  })
  bot.setWebHook(`${process.env.APP_URL}/bot${TgToken}`)

  bot.onText(/\/start/, async (msg) => {
    const opts = {
      caption: def.welcome_msg(msg.from.first_name),
      parse_mode: 'HTML'
    }
    const file = await Promise.resolve(fs.promises.readFile(
      path.join(__dirname, 'src/static/media/octocat.gif')
    ))
    bot.sendDocument(msg.from.id, file, opts,
      { filename: 'octocat.gif', contentType: 'image/gif' })
    bot.sendSticker(msg.from.id, def.tg_stickers.hey)
  })
  // Matches /editable
  bot.onText(/\/editable/, (msg) => {
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: def.emoji(0x1F44D),
            callback_data: 'skip'
          }],
          [{
            text: def.emoji(0x1F44E),
            callback_data: 'add'
          }]
        ]
      }
    }
    bot.sendMessage(msg.from.id, 'Original Text', opts)
  })

  // Handle callback queries
  bot.on('callback_query', function onCallbackQuery (callbackQuery) {
    const action = callbackQuery.data
    const msg = callbackQuery.message
    const opts = {
      chat_id: msg.chat.id,
      message_id: msg.message_id
    }
    const text = (action === 'skip') ? 'Get lost!' : 'Edited Text'
    bot.editMessageText(text, opts)
  })
}
