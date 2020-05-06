module.exports = (context) => {
  context.log('Initiating the base...')
  return context.github.repos.createForAuthenticatedUser({
    name: process.env.BASE_REPO,
    description: 'A repository used by Personal Archiver bot',
    private: true
  })
}
