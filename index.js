const initBase = require('./src/initBaseRepo')
const updateBase = require('./src/updateBaseRepo')
const events = ['installation.created', 'installation_repositories']
const baseName = process.env.BASE_REPO

/**
 * The main entrypoint to the Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.log('Personal Archiver is running successfully.')
  app.on(events, async (context) => {
    let newRepos
    let baseCheckNeeded = true
    const rFilter = r => r.filter(r => r.name !== baseName)
    const paramObj = {
      ctx: context,
      evt: { e: context.event, a: context.payload.action },
      own: context.payload.sender.login
    }
    app.log('App is running as per ' + paramObj.evt.e)
    if (paramObj.evt.e === 'installation' && paramObj.evt.a === 'created') {
      newRepos = context.payload.repositories || []
      if (!newRepos.slice().map(r => r.name).includes(baseName)) {
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
          ...paramObj, rep: repo, ini: presentRepos.includes(repo.name)
        })
      }
    }
  })
}
