const getCollabs = require('./getCollaborators')

module.exports = async (context, owner, repos) => {
  context.log('In updateBaseRepo.js...')
  await repos.forEach(async (repo) => {
    context.github.repos.createOrUpdateFile({
      owner: owner,
      repo: 'archive',
      path: `${repo.name}/.info`,
      message: `Added repository info for "${repo.name}`,
      content: Buffer.from(
        await getCollabs(context, owner, repo.name).toString()
      ).toString('base64')
    })
  })
}
