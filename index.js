const initBase = require('./src/initBaseRepo')
const updateBase = require('./src/updateBaseRepo')
const events = ['installation.created', 'installation_repositories']
const checkForBase = (repo, present) => present ? repo.name === 'archive' : repo.name !== 'archive'

/**
 * The main entrypoint to the Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.log('Personal Archiver is running successfully.')

  app.on(events, async (context) => {
    app.log('App has been successfully installed.')
    app.log('App is running as per ' + context.event)

    let repoList = []
    const owner = context.payload.sender.login
    if (context.event === 'installation' && context.payload.action === 'created') {
      repoList = context.payload.repositories
      console.log(repoList)
      if (repoList.filter(r => checkForBase(r, true)).length === 0) { await initBase(context) }
      // await updateBase(context, repoList.filter(r => checkForBase(r, false)))
    } else if (context.event === 'installation_repositories') {
      repoList = context.payload.repositories_added
      console.log(repoList)
      await updateBase(context, owner, repoList)
    }
  })
}
