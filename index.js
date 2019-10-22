const debug = require('debug')('botium-connector-luis')
const util = require('util')
const request = require('request')
const querystring = require('querystring')

// endpoint URL
const ENDPOINT =
  'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/'

const Capabilities = {
  LUIS_APP_ID: 'LUIS_APP_ID',
  LUIS_ENDPOINT_KEY: 'LUIS_ENDPOINT_KEY'
}

class BotiumConnectorLuis {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.LUIS_APP_ID]) throw new Error('LUIS_APP_ID capability required')
    if (!this.caps[Capabilities.LUIS_ENDPOINT_KEY]) throw new Error('LUIS_ENDPOINT_KEY capability required')

    return Promise.resolve()
  }

  Build () {
    debug('Build called')
    return Promise.resolve()
  }

  Start () {
    debug('Start called')
    return Promise.resolve()
  }

  UserSays ({messageText}) {
    const queryParams = {
      'verbose': true,
      'q': messageText,
      'subscription-key': this.caps[Capabilities.LUIS_ENDPOINT_KEY]
    }

    // append query string to endpoint URL
    const luisRequest =
      ENDPOINT + this.caps[Capabilities.LUIS_APP_ID] +
      '?' + querystring.stringify(queryParams)
    debug(`Request: ${luisRequest}`)

    return new Promise((resolve, reject) => {
      request(luisRequest, (err, response, body) => {
        if (err) {
          return reject(new Error(`LUIS answered with error ${util.inspect(err)}`))
        } else {
          const data = JSON.parse(body)
          debug(`Response: ${util.inspect(data)}`)
          if (!data.intents || !data.intents.length) {
            debug(`Empty response skipped`)
            return resolve()
          }
          const structuredResponse = {
            sender: 'bot',
            nlp: {
              intent: {
                name: data.topScoringIntent.intent,
                confidence: data.topScoringIntent.score,
                intents: data.intents
                  ? data.intents.map((intent) => { return {name: intent.intent, confidence: intent.score} })
                  : []
              },
              entities: data.entities
                ? data.entities.map((entity) => { return {name: entity.type, confidence: entity.score, value: entity.entity} })
                : []
            }
          }
          debug(`Converted response: ${util.inspect(structuredResponse)}`)
          this.queueBotSays(structuredResponse)
          return resolve()
        }
      })
    })
  }

  Stop () {
    debug('Stop called')
  }

  Clean () {
    debug('Clean called')

    return Promise.resolve()
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorLuis
}
