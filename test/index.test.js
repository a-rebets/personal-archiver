const nock = require('nock')
const fs = require('fs')
const path = require('path')
// Requiring our app implementation
const archiver = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const payloadEmpty = require('./fixtures/installation1')
const payloadFull = require('./fixtures/installation2')
const contribJSON = require('./fixtures/getContributors')
const contentResponse = require('./fixtures/contents')

const possibleRepoNames = Object.assign({}, payloadFull).repositories.slice(1).map(x => x.name)
const contribResponse = contribJSON.data.viewer.repositories.all
  .filter(el => possibleRepoNames.includes(el.name)).map(el => el.contributors.userList)
const baseCreatedBody = {
  name: process.env.BASE_REPO,
  description: 'A repository used by Personal Archiver bot',
  private: true
}

nock.disableNetConnect()

describe('Personal Archiver request/response tests', () => {
  let probot
  let mockCert

  const getTestObj = (repname, collabs) => ({
    message: `Updated repository info file for <${repname}>`,
    content: Buffer.from(
      `contributors:\n- ${collabs.map(c => c.login).join('\n- ')}`
    ).toString('base64')
  })

  beforeAll((done) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err, cert) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

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
      .reply(200, contribResponse[0])

    // Test that the repo No 1 is updated
    nock('https://api.github.com')
      .put(`/repos/apopelyshev/archive/contents/${possibleRepoNames[0]}/.info`, (body) => {
        expect(body).toMatchObject(getTestObj(possibleRepoNames[0], contribResponse[0]))
        return true
      })
      .reply(200)

    // Test that contributors are requested for repo No 2
    nock('https://api.github.com')
      .get(`/repos/apopelyshev/${possibleRepoNames[1]}/contributors`)
      .reply(200, contribResponse[1])

    // Test that the repo No 2 is updated
    nock('https://api.github.com')
      .put(`/repos/apopelyshev/archive/contents/${possibleRepoNames[1]}/.info`, (body) => {
        expect(body).toMatchObject(getTestObj(possibleRepoNames[1], contribResponse[1]))
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'installation', payload: payloadFull })
  }, 10000)

  afterEach(() => {
    nock.cleanAll()
  })
})
