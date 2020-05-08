const getContribs = require('./getContributors')
const fs = require('fs')
const path = require('path')
const { registerFont, createCanvas, loadImage } = require('canvas')

const encode64 = inp => Buffer.from(inp).toString('base64')
const decode64 = inp => Buffer.from(inp, 'base64').toString('utf8')
const insert = (i, val) => { replaceMap.set(i, { ...replaceMap.get(i), to: val }) }
const eventMap = new Map([
  ['installation.created', [
    (fn) => fn.repos.createOrUpdateFile, getUpdContentContribs, getUpdContentLogo
  ]],
  ['installation_repositories.added', [getUpdContentContribs, getUpdContentLogo]]
])
const replaceMap = new Map([
  ['d', { tag: 'creation_date' }],
  ['l', { tag: 'repo_link' }],
  ['t', { tag: 'title' }],
  ['c', { tag: 'contibutors_list' }]
])

async function processInfo ({ ctx, own, rep }) {
  const defaults = { owner: own, repo: rep.name }
  insert('c', (await getContribs(ctx, defaults)).map(c => c.login).join(','))
  const { created_at: date, html_url: link } = (await ctx.github.repos.get(defaults)).data
  insert('d', date)
  insert('l', link)
  const title = decode64((await ctx.github.repos.getReadme(defaults)).data.content)
    .match(/#\s+(.*)[\r\n]/)
  insert('t', (title) ? title[1] : rep.name)
  let template = await Promise.resolve(fs.promises.readFile(
    path.join(__dirname, './static/template_info.md'), 'utf8'))
  for (const change of Array.from(replaceMap).map(el => el[1])) {
    const old = `$${change.tag}/$`
    template = template.replace(old, old.replace('/$', `/${change.to}$`))
  }
  return template.replace('$repo_title$', replaceMap.get('t').to)
}

async function processLogo (repo) {
  registerFont('src/static/Inter-ExtraBold.ttf', { family: 'InterExtraBold' })
  const canvas = createCanvas(800, 565, 'svg')
  const ctx2d = canvas.getContext('2d')
  ctx2d.font = 'normal 45px InterExtraBold'
  const croppedText = repo.split('').reduce((acc, curr) => {
    const w = ctx2d.measureText(acc).actualBoundingBoxRight
    return (w < 730) ? acc + curr : acc
  }, '')
  if (repo.length !== croppedText.length) { repo = `${croppedText}...` }
  const expSize = ctx2d.measureText(repo)
  const textH = expSize.actualBoundingBoxAscent + expSize.actualBoundingBoxDescent
  ctx2d.fillText(repo, 35, 28 + textH)
  const template = await loadImage('src/static/media/adhoc_template_2.svg')
  ctx2d.drawImage(template, 0, 0)
  /* await Promise.resolve(fs.promises.writeFile(path.join(__dirname, './static/test.svg'),
    canvas.toBuffer('image/svg+xml'), 'utf8')) */
  return canvas.toBuffer('image/svg+xml')
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

async function getUpdContentLogo ({ own, rep }) {
  const response = (arg) => ({
    owner: own,
    repo: process.env.BASE_REPO,
    path: `${rep.name}/media/logo.svg`,
    content: arg.toString('base64'),
    message: `Added a default logo for <${rep.name}>`
  })
  return response(await processLogo(`/${rep.name}`))
}

module.exports = (params) => {
  params.ctx.log('Updating the base...')
  const tasks = eventMap.get(`${params.evt.e}.${params.evt.a}`)
  return Promise.all(tasks.slice(1).map(async task =>
    (tasks[0](params.ctx.github))(await task(params))
  ))
}
