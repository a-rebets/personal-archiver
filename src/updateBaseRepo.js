const getCollabs = require('./getCollaborators')

module.exports = async (context, owner, repo) => {
  context.log('In updateBaseRepo.js...')
  const collabs = await getCollabs(context, owner, repo.name)
  return context.github.repos.createOrUpdateFile({
    owner: owner,
    repo: 'archive',
    path: `${repo.name}/.info`,
    message: `Added repository info for <${repo.name}>`,
    content: Buffer.from(`collaborators:\n- ${collabs.map(c => c.login).join('\n- ')}`).toString('base64')
  })
}
