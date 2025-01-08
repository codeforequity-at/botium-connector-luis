const debug = require('debug')('botium-connector-luis')
const util = require('util')
const querystring = require('querystring')
const _ = require('lodash')

const { Capabilities, Defaults } = require('./helpers')

const INCOMPREHENSION_INTENT = 'None'

const INCOMPREHENSION_INTENT_STRUCT = {
  name: INCOMPREHENSION_INTENT,
  incomprehension: true,
  confidence: 1
}

const isIncomprehension = (intent) => {
  if (intent.intent === INCOMPREHENSION_INTENT) {
    return true
  }
}

class BotiumConnectorLuis {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  async Validate () {
    debug('Validate called')
    const version = this.caps[Capabilities.LUIS_API_VERSION] || 'V2'
    this.caps = Object.assign({
      [Capabilities.LUIS_API_VERSION]: version
    }, Defaults, this.caps)

    if (!this.caps[Capabilities.LUIS_PREDICTION_ENDPOINT_URL]) throw new Error('LUIS_PREDICTION_ENDPOINT_URL capability required')
    if (!this.caps[Capabilities.LUIS_APP_ID]) throw new Error('LUIS_APP_ID capability required')
    if (!this.caps[Capabilities.LUIS_ENDPOINT_KEY]) throw new Error('LUIS_ENDPOINT_KEY capability required')
    if (!['V2', 'V3'].includes(this.caps[Capabilities.LUIS_API_VERSION])) throw new Error(`Unknown API version ${this.caps[Capabilities.LUIS_API_VERSION]}. Just V2 and V3 is supported`)
  }

  async UserSaysV2 (msg) {
    const { messageText } = msg

    const queryParams = {
      verbose: true,
      q: messageText,
      'subscription-key': this.caps[Capabilities.LUIS_ENDPOINT_KEY]
    }
    this.__addStaticParams(msg, queryParams)

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

    try {
      const response = await fetch(luisRequest)
      if (!response.ok) {
        throw new Error(`LUIS response code: ${response.status}/${response.statusText}`)
      }
      const data = await response.json()
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
          },
          sourceData: {
            request: luisRequest,
            response: data
          }
        }), 0)
        return
      }
      const structuredResponse = {
        sender: 'bot',
        nlp: {
          intent: {
            name: data.topScoringIntent.intent,
            incomprehension: isIncomprehension(data.topScoringIntent),
            confidence: data.topScoringIntent.score,
            intents: data.intents ? data.intents.map((intent) => ({
              name: intent.intent,
              confidence: intent.score,
              incomprehension: isIncomprehension(intent)
            })) : []
          },
          entities: normalizeEntities(data)
        },
        sourceData: {
          request: luisRequest,
          response: data
        }
      }
      debug(`Structured response: ${JSON.stringify(structuredResponse, null, 2)}`)
      setTimeout(() => this.queueBotSays(structuredResponse), 0)
    } catch (err) {
      throw new Error(`LUIS answered with error ${err.message}`)
    }
  }

  async UserSaysV3 (msg) {
    const { messageText } = msg

    const queryParams = {
      verbose: true,
      'show-all-intents': true,
      query: messageText,
      'subscription-key': this.caps[Capabilities.LUIS_ENDPOINT_KEY]
    }
    this.__addStaticParams(msg, queryParams)

    // append query string to endpoint URL
    const luisRequest = `${this.caps[Capabilities.LUIS_PREDICTION_ENDPOINT_URL]}/luis/prediction/v3.0/apps/${this.caps[Capabilities.LUIS_APP_ID]}/slots/${this.caps[Capabilities.LUIS_PREDICTION_ENDPOINT_SLOT]}/predict?${querystring.stringify(queryParams)}`

    debug(`LUIS Request URL: ${luisRequest}`)

    try {
      const response = await fetch(luisRequest)
      if (!response.ok) {
        throw new Error(`LUIS response code: ${response.status}/${response.statusText}`)
      }
      const data = await response.json()
      const intents = Object.entries(data.prediction.intents || {}).map(([key, value]) => ({
        name: key,
        confidence: value.score,
        incomprehension: isIncomprehension(key)
      }))
      const entities = []
      try {
        // vals is an array. Its different for simple and composite entity:
        // simple entry:
        // "HomeAutomation.Location": [
        //   "living room"
        // ],
        // composite: (want to buy 2 business ticket)
        // "TestCompositeEntity": [
        //   {},
        //   {
        //     "TravelClass": [
        //       [
        //         "Business"
        //       ]
        //     ],
        //     "$instance": ...
        //   }
        // ]
        for (const [name, vals] of Object.entries(data.prediction.entities || {})) {
          if (name === '$instance') {
            continue
          }
          if (vals.length === 0) {
            debug(`Variable ${name} has no value`)
            continue
          }

          const isCompositeEntity = typeof vals[0] === 'object'

          // val:
          //  - primitive type, like 2 or "2"
          //  - struct, like {} or
          //    {
          //     "TravelClass": [
          //       [
          //         "Business"
          //       ]
          //     ],
          //     "$instance": ...
          //   }
          vals.forEach((val, index) => {
            if (isCompositeEntity) {
              //     subName: "TravelClass"
              //     subValues: [["Business"]]
              for (const [subName, subValues] of Object.entries(val)) {
                if (subName === '$instance') {
                  continue
                }
                if (subValues.length === 0) {
                  debug(`Subvalues not found in compound entity ${JSON.stringify(val)}`)
                } else {
                  subValues.forEach((subValue, subValueIndex) => {
                    const extractedName = `${name}.${subName}.${subValueIndex + 1}`
                    entities.push({
                      name: extractedName,
                      // compound entities have 2 scrores, like:
                      // "entities": {
                      //   "TestCompositeEntity": [
                      //     {},
                      //     {
                      //       "TravelClass": [
                      //         [
                      //           "Business"
                      //         ]
                      //       ],
                      //       "$instance": {
                      //         "TravelClass": [
                      //           {
                      //             "type": "TravelClass",
                      //             "text": "business",
                      //             "score": 0.98643816,
                      //           }
                      //         ]
                      //       }
                      //     }
                      //   ],
                      //   "$instance": {
                      //     "TestCompositeEntity": [
                      //       {
                      //         "type": "TestCompositeEntity",
                      //         "text": "business",
                      //         "score": 0.979149
                      //       }
                      //     ]
                      //   }
                      // }
                      confidence: (val.$instance[subName][subValueIndex].score + data.prediction.entities.$instance[name][index].score) / 2,
                      // maybe we had to extract all entries of the array? But how they got confidence score?
                      value: subValue[0]
                    })
                  })
                }
              }
            } else {
              const metadata = data.prediction.entities.$instance[name][index]
              entities.push({
                name,
                // converting 2 to '2'
                value: `${val}`,
                // number has no confidence score.
                // {
                //   "type": "builtin.number",
                //   "text": "2",
                //   "startIndex": 12,
                //   "length": 1,
                //   "modelTypeId": 2,
                //   "modelType": "Prebuilt Entity Extractor",
                //     "recognitionSources": [
                //     "model"
                //   ]
                // }
                confidence: metadata.score
              })
            }
          })
        }
      } catch (err) {
        debug(`Failed to parse entities from : ${JSON.stringify(data.prediction.entities)}`)
      }
      const structuredResponse = {
        sender: 'bot',
        nlp: {
          intent: intents.length === 0 ? INCOMPREHENSION_INTENT_STRUCT : Object.assign({}, intents[0], { intents: intents.slice(1) }),
          entities
        },
        sourceData: {
          request: luisRequest,
          response: data
        }
      }
      debug(`Structured response: ${JSON.stringify(structuredResponse, null, 2)}`)
      setTimeout(() => this.queueBotSays(structuredResponse), 0)
    } catch (err) {
      return new Error(`LUIS answered with error ${err.message}`)
    }
  }

  UserSays (msg) {
    const isV2 = this.caps[Capabilities.LUIS_API_VERSION] === 'V2'
    if (isV2) {
      return this.UserSaysV2(msg)
    } else {
      return this.UserSaysV3(msg)
    }
  }

  __addStaticParams (msg, queryParams) {
    if (this.caps[Capabilities.LUIS_PREDICTION_STATIC_PARAMS]) {
      for (const [key, value] of Object.entries(this.caps[Capabilities.LUIS_PREDICTION_STATIC_PARAMS])) {
        queryParams[key] = `${value}`
      }
    }
    if (msg.LUIS_PARAM && _.isObject(msg.LUIS_PARAM)) {
      for (const [key, value] of Object.entries(msg.LUIS_PARAM)) {
        queryParams[key] = `${value}`
      }
    }
    return queryParams
  }
}

module.exports = BotiumConnectorLuis
