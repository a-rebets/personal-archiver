const getContribs = require('./getContributors')
const fs = require('fs')
const path = require('path')

const encode64 = inp => Buffer.from(inp).toString('base64')
const decode64 = inp => Buffer.from(inp, 'base64').toString('utf8')
const insert = (i, val) => { replaceMap.set(i, { ...replaceMap.get(i), to: val }) }
const eventMap = new Map([
  ['installation.created', [getUpdContentContribs]],
  ['installation_repositories.added', [getUpdContentContribs]]
])
const replaceMap = new Map([
  ['d', { tag: 'creation_date' }],
  ['l', { tag: 'repo_link' }],
  ['t', { tag: 'title' }],
  ['c', { tag: 'contibutors_list' }]
])

async function processInfo ({ ctx, own, rep }) {
  let template
  const defaults = { owner: own, repo: rep.name }
  insert('c', (await getContribs(ctx, defaults)).map(c => c.login).join(','))
  const { created_at: date, html_url: link } = (await ctx.github.repos.get(defaults)).data
  insert('d', date)
  insert('l', link)
  const title = decode64((await ctx.github.repos.getReadme(defaults)).data.content)
    .match(/#\s+(.*)[\r\n]/)
  insert('t', (title) ? title[1] : rep.name)
  await Promise.resolve(fs.promises.readFile(
    path.join(__dirname, './template_info.md'), 'utf8').then((val) => { template = val }))
  for (const change of Array.from(replaceMap).map(el => el[1])) {
    const old = `$${change.tag}/$`
    template = template.replace(old, old.replace('/$', `/${change.to}$`))
  }
  return template.replace('$repo_title$', replaceMap.get('t').to)
}

async function getUpdContentContribs ({ ctx, own, rep, ini }) {
  const msgPart = (ini) ? 'Added' : 'Updated'
  const response = (arg) => ({
    owner: own,
    repo: process.env.BASE_REPO,
    path: `${rep.name}/INFO.md`,
    content: encode64(arg),
    message: `${msgPart} repository INFO.md file for <${rep.name}>`
  })
  return response(await processInfo({ ctx, own, rep }))
}

module.exports = (params) => {
  params.ctx.log('Updating the base...')
  const tasks = eventMap.get(`${params.evt.e}.${params.evt.a}`)
  return Promise.all(tasks.map(async task =>
    params.ctx.github.repos.createOrUpdateFile(await task(params))
  ))
}
