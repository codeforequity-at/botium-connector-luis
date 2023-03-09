const request = require('request-promise-native')

const debug = require('debug')('botium-connector-luis-helper')

const Capabilities = {
  LUIS_API_VERSION: 'LUIS_API_VERSION',
  LUIS_PREDICTION_ENDPOINT_URL: 'LUIS_PREDICTION_ENDPOINT_URL',
  LUIS_PREDICTION_ENDPOINT_SLOT: 'LUIS_PREDICTION_ENDPOINT_SLOT',
  LUIS_PREDICTION_STATIC_PARAMS: 'LUIS_PREDICTION_STATIC_PARAMS',
  LUIS_APP_ID: 'LUIS_APP_ID',
  LUIS_ENDPOINT_KEY: 'LUIS_ENDPOINT_KEY',
  LUIS_AUTHORING_KEY: 'LUIS_AUTHORING_KEY',
  LUIS_AUTHORING_ENDPOINT_URL: 'LUIS_AUTHORING_ENDPOINT_URL'
}

const Defaults = {
  [Capabilities.LUIS_PREDICTION_ENDPOINT_URL]: 'https://westus.api.cognitive.microsoft.com',
  [Capabilities.LUIS_PREDICTION_ENDPOINT_SLOT]: 'staging'
}

const getPath = (caps) => {
  const isV2 = caps.LUIS_API_VERSION !== 'V3'
  if (isV2) {
    return '/luis/api/v2.0/apps/'
  } else {
    return '/luis/authoring/v3.0/apps/'
  }
}

const getApp = async (caps) => {
  const requestOptions = {
    uri: `${caps.LUIS_AUTHORING_ENDPOINT_URL || caps.LUIS_PREDICTION_ENDPOINT_URL || Defaults.LUIS_PREDICTION_ENDPOINT_URL}${getPath(caps)}${caps.LUIS_APP_ID}`,
    headers: {
      'Ocp-Apim-Subscription-Key': caps.LUIS_AUTHORING_KEY || caps.LUIS_ENDPOINT_KEY
    },
    json: true
  }
  debug(`getApp request: ${JSON.stringify(requestOptions, null, 2)}`)
  try {
    const response = await request(requestOptions)
    debug(`getApp response: ${JSON.stringify(response, null, 2)}`)
    return response
  } catch (err) {
    throw new Error(`LUIS getApp connection failed: ${err.message}`)
  }
}

const getAppVersion = async (caps, version) => {
  const requestOptions = {
    uri: `${caps.LUIS_AUTHORING_ENDPOINT_URL || caps.LUIS_PREDICTION_ENDPOINT_URL || Defaults.LUIS_PREDICTION_ENDPOINT_URL}${getPath(caps)}${caps.LUIS_APP_ID}/versions/${version}/export`,
    headers: {
      'Ocp-Apim-Subscription-Key': caps.LUIS_AUTHORING_KEY || caps.LUIS_ENDPOINT_KEY
    },
    json: true
  }
  debug(`getAppVersion request: ${JSON.stringify(requestOptions, null, 2)}`)
  try {
    const response = await request(requestOptions)
    debug(`getAppVersion response: ${JSON.stringify(response, null, 2)}`)
    return response
  } catch (err) {
    throw new Error(`LUIS getAppVersion connection failed: ${err.message}`)
  }
}

const uploadAppVersion = async (caps, version, app) => {
  const requestOptions = {
    uri: `${caps.LUIS_AUTHORING_ENDPOINT_URL || caps.LUIS_PREDICTION_ENDPOINT_URL || Defaults.LUIS_PREDICTION_ENDPOINT_URL}${getPath(caps)}${caps.LUIS_APP_ID}/versions/import?${version}`,
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': caps.LUIS_AUTHORING_KEY || caps.LUIS_ENDPOINT_KEY
    },
    json: app
  }
  debug(`uploadAppVersion request: ${JSON.stringify(requestOptions, null, 2)}`)
  try {
    const response = await request(requestOptions)
    debug(`uploadAppVersion response: ${JSON.stringify(response, null, 2)}`)
    return response
  } catch (err) {
    throw new Error(`LUIS uploadAppVersion connection failed: ${err.message}`)
  }
}

const publishAppVersion = async (caps, version, publish) => {
  if (publish !== 'staging' && publish !== 'production') throw new Error('Publish environment staging or production only')

  const requestOptions = {
    uri: `${caps.LUIS_AUTHORING_ENDPOINT_URL || caps.LUIS_PREDICTION_ENDPOINT_URL || Defaults.LUIS_PREDICTION_ENDPOINT_URL}${getPath(caps)}${caps.LUIS_APP_ID}/publish`,
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': caps.LUIS_AUTHORING_KEY || caps.LUIS_ENDPOINT_KEY
    },
    json: {
      versionId: version,
      isStaging: (publish !== 'production'),
      directVersionPublish: false
    }
  }
  debug(`publishAppVersion request: ${JSON.stringify(requestOptions, null, 2)}`)
  try {
    const response = await request(requestOptions)
    debug(`publishAppVersion response: ${JSON.stringify(response, null, 2)}`)
    return response
  } catch (err) {
    throw new Error(`LUIS publishAppVersion connection failed: ${err.message}`)
  }
}

const waitForTraining = async (caps, version, interval) => {
  const requestOptionsTemplate = {
    uri: `${caps.LUIS_AUTHORING_ENDPOINT_URL || caps.LUIS_PREDICTION_ENDPOINT_URL || Defaults.LUIS_PREDICTION_ENDPOINT_URL}${getPath(caps)}${caps.LUIS_APP_ID}/versions/${version}/train`,
    headers: {
      'Ocp-Apim-Subscription-Key': caps.LUIS_AUTHORING_KEY || caps.LUIS_ENDPOINT_KEY
    },
    json: true
  }
  try {
    const response = await request(Object.assign({}, requestOptionsTemplate, { method: 'POST' }))
    debug(`waitForTraining start training response: ${JSON.stringify(response, null, 2)}`)
  } catch (err) {
    throw new Error(`LUIS waitForTraining connection failed: ${err.message}`)
  }
  const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))
  while (true) {
    debug(`LUIS checking training status ${version}`)
    let response = null
    try {
      response = await request(Object.assign({}, requestOptionsTemplate, { method: 'GET' }))
      debug(`waitForTraining check training status response: ${JSON.stringify(response, null, 2)}`)
    } catch (err) {
      debug(`LUIS error on availability check ${err.message}`)
    }
    if (response) {
      if (response.find(model => model.details.status === 'Fail')) {
        throw new Error('LUIS app training failed. See Microsoft LUIS app for details.')
      } else if (response.find(model => model.details.status !== 'UpToDate' && model.details.status !== 'Success')) {
        debug('LUIS app training not finished')
      } else {
        return
      }
    }
    await timeout(interval || 5000)
  }
}

module.exports = {
  Capabilities,
  Defaults,
  getApp,
  getAppVersion,
  uploadAppVersion,
  publishAppVersion,
  waitForTraining
}
