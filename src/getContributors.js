module.exports = (context, { owner, repo }) => {
  context.log('Getting contributors...')
  return context.github.paginate(
    context.github.repos.listContributors.endpoint.merge({
      owner: owner, repo: repo
    }),
    res => res.data
  )
}
