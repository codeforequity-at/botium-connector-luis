const debug = require('debug')('botium-connector-luis')
const util = require('util')
const request = require('request')
const querystring = require('querystring')
const _ = require('lodash')

const INCOMPREHENSION_INTENT = 'None'

const isIncomprehension = (intent) => {
  if (intent.intent === INCOMPREHENSION_INTENT) {
    return true
  }
}

const Capabilities = {
  LUIS_PREDICTION_ENDPOINT_URL: 'LUIS_PREDICTION_ENDPOINT_URL',
  LUIS_PREDICTION_ENDPOINT_SLOT: 'LUIS_PREDICTION_ENDPOINT_SLOT',
  LUIS_APP_ID: 'LUIS_APP_ID',
  LUIS_ENDPOINT_KEY: 'LUIS_ENDPOINT_KEY'
}

const Defaults = {
  [Capabilities.LUIS_PREDICTION_ENDPOINT_URL]: 'https://westus.api.cognitive.microsoft.com',
  [Capabilities.LUIS_PREDICTION_ENDPOINT_SLOT]: 'staging'
}

class BotiumConnectorLuis {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  async Validate () {
    debug('Validate called')
    this.caps = Object.assign({}, Defaults, this.caps)

    if (!this.caps[Capabilities.LUIS_PREDICTION_ENDPOINT_URL]) throw new Error('LUIS_PREDICTION_ENDPOINT_URL capability required')
    if (!this.caps[Capabilities.LUIS_APP_ID]) throw new Error('LUIS_APP_ID capability required')
    if (!this.caps[Capabilities.LUIS_ENDPOINT_KEY]) throw new Error('LUIS_ENDPOINT_KEY capability required')
  }

  UserSays ({ messageText }) {
    const queryParams = {
      verbose: true,
      q: messageText,
      'subscription-key': this.caps[Capabilities.LUIS_ENDPOINT_KEY]
    }

    if (this.caps[Capabilities.LUIS_PREDICTION_ENDPOINT_SLOT] === 'staging') {
      queryParams.staging = true
    }


    // flattens composite entities
    // extracts entity value from resolution structure if possible
    // sets confidence to 1 if it is not returned by NLP
    const normalizeEntities = ({ entities, compositeEntities }) => {
      if (!entities) {
        return []
      }
      const toKey = (entity) => {
        return JSON.stringify({ entity: entity.entity, startIndex: entity.startIndex, endIndex: entity.endIndex })
      }
      const normalizeEntity = (entity) => {
        const r = entity.resolution
        const normalizeValue = (entity) => {
          if (r) {
            if (r.values) {
              // like
              // {
              //   "entity": "business",
              //   "type": "TravelClass",
              //   "startIndex": 14,
              //   "endIndex": 21,
              //   "resolution": {
              //   "values": [
              //     "Business"
              //   ]
              // }
              if (r.values.length > 1) {
                debug(`Entity values length is greater as 1 in ${util.inspect(entity)}`)
              }
              if (r.values.length) {
                return r.values[0]
              }
              debug(`Entity values length is 0 ${util.inspect(entity)}`)
            } else if (r.value) {
              // like
              // "resolution": {
              //   "subtype": "integer",
              //     "value": "2"
              // }
              return r.value
            } else {
              debug(`Entity value cant be determined using resolution ${util.inspect(entity)}`)
            }

            return entity.entity
          }

          return entity.entity
        }
        return { name: entity.type, role: entity.role, confidence: entity.score, value: normalizeValue(entity) }
      }
      const compositeEntityNames = compositeEntities ? compositeEntities.map(compositeEntity => compositeEntity.parentType) : null
      const keyToCompositeEntity = {}
      if (compositeEntityNames) {
        entities.forEach(entity => {
          if (compositeEntityNames.includes(entity.type)) {
            keyToCompositeEntity[toKey(entity)] = entity
          }
        })
      }

      const result = []
      entities.forEach(entity => {
        const key = toKey(entity)

        if (keyToCompositeEntity[key]) {
          if (compositeEntityNames.includes(entity.type)) {
            // We dont have to do anything with this, it has just a confidence (score) for us
            // example
            // {
            //   "entity": "business",
            //   "type": "TestCompositeEntity",
            //   "startIndex": 14,
            //   "endIndex": 21,
            //   "score": 0.9600661
            // },
          } else {
            const normalized = normalizeEntity(entity)
            if (_.isNil(normalized.confidence)) {
              debug(`Entity has already a confidence, it will be overwritten because composite entity ${util.inspect(entity)}`)
            }
            normalized.confidence = keyToCompositeEntity[key].score
            normalized.name = `${keyToCompositeEntity[key].type}.${normalized.name}`
            if (!_.isNumber(normalized.confidence)) {
              // Luis does not always returns confidence. But for as it looks more exact to retuen 1 in this case
              // At least Trainer can quess better wether intent confidence is supported or not
              // example:
              // {
              //   entity: 'vienna',
              //   type: 'builtin.geographyV2.city',
              //   startIndex: 32,
              //   endIndex: 37,
              //   role: 'TRAVELTO'
              // }
              normalized.confidence = 1
            }
            result.push(normalized)
          }
        } else {
          const normalized = normalizeEntity(entity)
          if (!_.isNumber(normalized.confidence)) {
            // Luis does not always returns confidence. But for as it looks more exact to retuen 1 in this case
            // At least Trainer can quess better wether intent confidence is supported or not
            // example:
            // {
            //   entity: 'vienna',
            //   type: 'builtin.geographyV2.city',
            //   startIndex: 32,
            //   endIndex: 37,
            //   role: 'TRAVELTO'
            // }
            normalized.confidence = 1
          }
          result.push(normalized)
        }
      })
      return result
    }
    // append query string to endpoint URL
    const luisRequest = `${this.caps[Capabilities.LUIS_PREDICTION_ENDPOINT_URL]}/luis/v2.0/apps/${this.caps[Capabilities.LUIS_APP_ID]}?${querystring.stringify(queryParams)}`
    debug(`LUIS Request URL: ${luisRequest}`)

    return new Promise((resolve, reject) => {
      request(luisRequest, (err, response, body) => {
        if (err) {
          return reject(new Error(`LUIS answered with error ${err.message}`))
        } else {
          if (response.statusCode !== 200) {
            return reject(new Error(`LUIS response code: ${response.statusCode} response body: ${body}`))
          }
          const data = JSON.parse(body)
          debug(`LUIS Response: ${JSON.stringify(data, null, 2)}`)
          if (!data.intents || !data.intents.length) {
            debug('Empty response skipped')
            setTimeout(() => this.queueBotSays({
              sender: 'bot',
              nlp: {
                intent: {
                  name: INCOMPREHENSION_INTENT,
                  incomprehension: true,
                  confidence: 1
                },
                entities: []
              }
            }), 0)
            return resolve()
          }
          const structuredResponse = {
            sender: 'bot',
            nlp: {
              intent: {
                name: data.topScoringIntent.intent,
                incomprehension: isIncomprehension(data.topScoringIntent),
                confidence: data.topScoringIntent.score,
                intents: data.intents ? data.intents.map((intent) => {
                  return { name: intent.intent, confidence: intent.score, incomprehension: isIncomprehension(intent) }
                }) : []
              },
              entities: normalizeEntities(data)
            }
          }
          debug(`Structured response: ${JSON.stringify(structuredResponse, null, 2)}`)
          setTimeout(() => this.queueBotSays(structuredResponse), 0)
          return resolve()
        }
      })
    })
  }
}

module.exports = BotiumConnectorLuis
