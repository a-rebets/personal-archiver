module.exports = (context, owner, repo) => {
  console.log('In getCollaborators.js...')
  let collaborators
  context.github.paginate(
    context.github.repos.listCollaborators,
    { owner: owner, repo: repo }
  ).then((res) => { collaborators = res })
  return collaborators
}
