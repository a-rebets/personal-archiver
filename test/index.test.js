const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const payload = require('./fixtures/installation')
const repoCreatedBody = {
  name: 'archive',
  description: 'A repository used by Personal Archiver bot',
  private: true
}
const fs = require('fs')
const path = require('path')

nock.disableNetConnect()

describe('Personal Archiver', () => {
  let probot
  let mockCert

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
    probot.load(myProbotApp)
  })

  test('intiates a repository after receiving an installation event', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/8585524/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a repo is created
    nock('https://api.github.com')
      .post('/user/repos', (body) => {
        expect(body).toMatchObject(repoCreatedBody)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'installation', payload })
  }, 25000)

  afterEach(() => {
    nock.cleanAll()
  })
})
