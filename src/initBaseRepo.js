module.exports = (api, app) => {
  app.log('Initiating the base...')
  return api.repos.createForAuthenticatedUser({
    name: process.env.BASE_REPO,
    description: 'A repository used by Personal Archiver bot',
    private: true
  })
}
