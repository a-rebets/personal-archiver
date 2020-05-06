const getContribs = require('./getContributors')
const fs = require('fs')
const path = require('path')

const encode64 = inp => Buffer.from(inp).toString('base64')
const decode64 = inp => Buffer.from(data, 'base64').toString('utf8')
const eventMap = new Map([
  ['installation.created', [getUpdContentContribs]],
  ['installation_repositories.added', [getUpdContentContribs]]
])
const replaceMap = new Map([
  ['d', {tag: 'creation_date'}],
  ['l', {tag: 'repo_link'}],
  ['t', {tag: 'title'}],
  ['c', {tag: 'contibutors_list'}]
])

async function processInfo({ctx, own, rep}) {
  let template
  let insert = (i, val) => replaceMap.set(i, {...replaceMap.get(i), to: val})
  const defaults = {owner: own, repo: rep.name}
  insert('c', (await getContribs(ctx, own, rep.name)).map(c => c.login).join(','))
  const {created_at: date, html_url: link} = (await ctx.github.repos.get(defaults)).data
  insert('d', date)
  insert('l', link)
  insert('t', decode64((await ctx.github.repos.getReadme(defaults)).data.content)
    .match(/#\s+(.*)[\r\n]/)[1])
  fs.readFile(
    path.join(__dirname, './template_info.md'), 'utf8',
    (err, file) => {
      if (err) ctx.log.error('Cannot load the template MD');
      template = file
    }
  )
  for (let change of Array.from(replaceMap).map(el => el[1])) {
    template.replace(`$${change.tag}/$`, change.to)
  }
  return template.replace('$repo_title$', replaceMap.get('t').to)
}

async function getUpdContentContribs ({ ctx, own, rep, ini }) {
  const msgPart = (ini) ? 'Updated' : 'Added'
  const response = (arg) => ({
    owner: own,
    repo: process.env.BASE_REPO,
    path: `${rep.name}/INFO.md`,
    content: encode64(arg),
    message: `${msgPart} repository INFO.md file for <${rep.name}>`
  })
  return response(await processInfo({ctx, own, rep}))
}

module.exports = (params) => {
  params.ctx.log('In updateBaseRepo.js...')
  const tasks = eventMap.get(`${params.evt.e}.${params.evt.a}`)
  return Promise.all(tasks.map(async task =>
    params.ctx.github.repos.createOrUpdateFile(await task(params))
  ))
}
