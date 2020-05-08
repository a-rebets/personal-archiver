const memjs = require('memjs')
const TgBot = require('node-telegram-bot-api')
const initBase = require('./src/initBaseRepo')
const updateBase = require('./src/updateBaseRepo')
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
  if (err) console.error('An error occured while trying to set a value to the Memcachier')
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
  bot.on('message', function onMessage (msg) {
    bot.sendMessage(msg.chat.id, 'I am alive on Heroku!')
  })
  // Matches /editable
  bot.onText(/\/editable/, function onEditableText (msg) {
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Edit Text',
              // we shall check for this value when we listen
              // for "callback_query"
              callback_data: 'edit'
            }
          ]
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
    let text

    if (action === 'edit') {
      text = 'Edited Text'
    }

    bot.editMessageText(text, opts)
  })
}
