const path = require('path')
const moment = require('moment')
const botium = require('botium-core')
const _ = require('lodash')
const debug = require('debug')('botium-connector-luis-intents')

const { getApp, getAppVersion, uploadAppVersion, waitForTraining, publishAppVersion } = require('./helpers')

const getCaps = (caps) => {
  const result = caps || {}
  result[botium.Capabilities.CONTAINERMODE] = path.resolve(__dirname, '..', 'index.js')
  return result
}

const importLuisIntents = async ({ caps, versionId, buildconvos }) => {
  const driver = new botium.BotDriver(getCaps(caps))
  const container = await driver.Build()

  const app = await getApp(container.pluginInstance.caps)
  const appVersion = await getAppVersion(container.pluginInstance.caps, versionId || app.activeVersion)

  debug(`LUIS app got utterances: ${JSON.stringify(appVersion.utterances, null, 2)}`)

  const convos = []
  const utterances = []

  for (const utterance of appVersion.utterances) {
    if (!utterances.find(u => u.name === utterance.intent)) utterances.push({ name: utterance.intent, utterances: [utterance.text] })
    else utterances.find(u => u.name === utterance.intent).utterances.push(utterance.text)
  }

  if (buildconvos) {
    for (const utterance of utterances) {
      const convo = {
        header: {
          name: utterance.name
        },
        conversation: [
          {
            sender: 'me',
            messageText: utterance.name
          },
          {
            sender: 'bot',
            asserters: [
              {
                name: 'INTENT',
                args: [utterance.name]
              }
            ]
          }
        ]
      }
      convos.push(convo)
    }
  }

  return { convos, utterances }
}

const exportLuisIntents = async ({ caps, versionId, newVersionName, publish, waitfortraining }, { convos, utterances }, { statusCallback }) => {
  const driver = new botium.BotDriver(getCaps(caps))
  const container = await driver.Build()

  const app = await getApp(container.pluginInstance.caps)
  const appVersion = await getAppVersion(container.pluginInstance.caps, versionId || app.activeVersion)

  const status = (log, obj) => {
    debug(log, obj)
    if (statusCallback) statusCallback(log, obj)
  }

  if (!appVersion.utterances) appVersion.utterances = []
  for (const utt of utterances) {
    const aintent = appVersion.intents.find(i => i.name === utt.name)
    if (!aintent) {
      appVersion.intents.push({ name: utt.name })
    }
    for (const ex of (utt.utterances || [])) {
      const autt = appVersion.utterances.find(u => u.text === ex)
      if (autt) {
        autt.intent = utt.name
      } else {
        appVersion.utterances.push({
          text: ex,
          intent: utt.name,
          entities: []
        })
      }
    }
  }

  if (newVersionName) {
    appVersion.versionId = newVersionName
  } else {
    appVersion.versionId = `Botium_${moment().format('YYYYMMDDHHmmSS')}`
  }
  await uploadAppVersion(container.pluginInstance.caps, appVersion.versionId, appVersion)
  status(`Updated LUIS app ${appVersion.name} to new version ${appVersion.versionId}`, { versionId: appVersion.versionId })

  if (waitfortraining) {
    try {
      status(`Waiting for app version ${appVersion.versionId} training`, { versionId: appVersion.versionId })
      await waitForTraining(container.pluginInstance.caps, appVersion.versionId)
      status(`App version ${appVersion.versionId} is available and ready for use`, { versionId: appVersion.versionId })
    } catch (err) {
      status(err.message, { versionId: appVersion.versionId })
    }
  }
  if (publish) {
    try {
      status(`Publishing app version ${appVersion.versionId} to ${publish}`, { versionId: appVersion.versionId })
      await publishAppVersion(container.pluginInstance.caps, appVersion.versionId, publish)
      status(`App version ${appVersion.versionId} is published to ${publish}`, { versionId: appVersion.versionId })
    } catch (err) {
      status(err.message, { versionId: appVersion.versionId })
    }
  }

  const newCaps = _.pickBy(driver.caps, (value, key) => key.startsWith('LUIS_'))
  if (publish) {
    newCaps.LUIS_PREDICTION_ENDPOINT_SLOT = publish
  }
  return { caps: newCaps, versionId: appVersion.versionId }
}

module.exports = {
  importHandler: ({ caps, versionId, buildconvos, ...rest } = {}) => importLuisIntents({ caps, versionId, buildconvos, ...rest }),
  importArgs: {
    caps: {
      describe: 'Capabilities',
      type: 'json',
      skipCli: true
    },
    versionId: {
      describe: 'LUIS app version (will use active version by default)',
      type: 'string'
    },
    buildconvos: {
      describe: 'Build convo files for intent assertions (otherwise, just write utterances files)',
      type: 'boolean',
      default: false
    }
  },
  exportHandler: ({ caps, versionId, newVersionName, publish, waitfortraining, ...rest } = {}, { convos, utterances } = {}, { statusCallback } = {}) => exportLuisIntents({ caps, versionId, newVersionName, publish, waitfortraining, ...rest }, { convos, utterances }, { statusCallback }),
  exportArgs: {
    caps: {
      describe: 'Capabilities',
      type: 'json',
      skipCli: true
    },
    versionId: {
      describe: 'LUIS app version (will use active version by default)',
      type: 'string'
    },
    newVersionName: {
      describe: 'New LUIS app version name (if not given will be generated)',
      type: 'string'
    },
    publish: {
      describe: 'Publishes the LUIS app version',
      choices: ['staging', 'production']
    },
    waitfortraining: {
      describe: 'Wait until version finished training',
      type: 'boolean',
      default: false
    }
  }
}
