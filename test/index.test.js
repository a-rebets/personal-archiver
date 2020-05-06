const nock = require('nock')
const fs = require('fs')
const path = require('path')
// Requiring our app implementation
const archiver = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const payloadEmpty = require('./fixtures/installation1')
const payloadFull = require('./fixtures/installation2')
const contribResponse = require('./fixtures/contributors')
const contentResponse = require('./fixtures/archive.contents')
const details1 = require('./fixtures/w8.details')
const details2 = require('./fixtures/distributa.details')
const readme = require('./fixtures/readme')

const possibleRepoNames = Object.assign({}, payloadFull).repositories.slice(1).map(x => x.name)
const baseCreatedBody = {
  name: process.env.BASE_REPO,
  description: 'A repository used by Personal Archiver bot',
  private: true
}

nock.disableNetConnect()

describe('Personal Archiver request/response tests', () => {
  let probot
  let mockCert
  let mockMd1
  let mockMd2
  const readmeCreate = (text) => {
    const res = Object.assign({}, readme)
    res.content = Buffer.from(text).toString('base64')
    return res
  }
  const getTestObj = (repname, inp) => ({
    message: `Updated repository INFO.md file for <${repname}>`,
    content: Buffer.from(inp).toString('base64')
  })

  beforeAll(() => {
    const promArr = []
    promArr.push(fs.promises.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), 'utf8'))
    promArr.push(fs.promises.readFile(path.join(__dirname, 'fixtures/distributa.info.md'), 'utf8'))
    promArr.push(fs.promises.readFile(path.join(__dirname, 'fixtures/w8.info.md'), 'utf8'))
    return Promise.all(promArr).then((vals) => {
      [mockCert, mockMd2, mockMd1] = vals
    })
  })
  // const promises = []
  // fs.readFile(, (err, cert) => {
  //   if (err) return done(err)
  //   mockCert = cert
  //   done()
  // })
  // promises.push(fs.readFile(
  //   path.join(__dirname, 'fixtures/distributa.info.md'), 'utf8',
  //   (err, file) => {
  //     if (err) return done(err)
  //     mockMd2 = file
  //   }
  // ))
  // promises.push(fs.readFile(
  //   path.join(__dirname, 'fixtures/w8.info.md'), 'utf8',
  //   (err, file) => {
  //     if (err) return done(err)
  //     mockMd1 = file
  //   }
  // ))
  // Promise.all(promises).then(() => done())

  beforeEach(() => {
    probot = new Probot({ id: 123, cert: mockCert })
    // Load our app into probot
    probot.load(archiver)
  })

  test('intiates a repository after receiving an installation event', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/8585524/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a base repo is created
    nock('https://api.github.com')
      .post('/user/repos', (body) => {
        expect(body).toMatchObject(baseCreatedBody)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'installation', payload: payloadEmpty })
  }, 10000)

  test('creates directories with new files inside the base repo', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/8585524/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${process.env.BASE_REPO}/contents/`)
      .reply(200, contentResponse)

    // Test that contributors are requested for repo No 1
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[0]}/contributors`)
      .reply(200, contribResponse)

    // Test that repo info is requested for repo No 1
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[0]}`)
      .reply(200, details1)

    // Test that README is requested for repo No 1
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[0]}/readme`)
      .reply(200, readmeCreate(`#  WIZ Faculty Math bot
      
      some more info`))

    // Test that the repo No 1 is updated
    nock('https://api.github.com')
      .put(`/repos/apopelyshev/archive/contents/${possibleRepoNames[0]}/INFO.md`, (body) => {
        expect(body).toMatchObject(getTestObj(possibleRepoNames[0], mockMd1))
        return true
      })
      .reply(200)

    // Test that contributors are requested for repo No 2
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[1]}/contributors`)
      .reply(200, contribResponse)

    // Test that repo info is requested for repo No 2
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[1]}`)
      .reply(200, details2)

    // Test that README is requested for repo No 2
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[1]}/readme`)
      .reply(200, readmeCreate(`#   Distributa - social media contest tool
      
      some more info`))

    // Test that the repo No 2 is updated
    nock('https://api.github.com')
      .put(`/repos/apopelyshev/archive/contents/${possibleRepoNames[1]}/INFO.md`, (body) => {
        expect(body).toMatchObject(getTestObj(possibleRepoNames[1], mockMd2))
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'installation', payload: payloadFull })
  }, 30000)

  afterEach(() => {
    nock.cleanAll()
  })
})
