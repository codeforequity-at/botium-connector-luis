const BotiumConnectorLuis = require('./src/connector')
const { importHandler, importArgs } = require('./src/intents')
const { exportHandler, exportArgs } = require('./src/intents')
const { getApp } = require('./src/helpers')

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorLuis,
  Import: {
    Handler: importHandler,
    Args: importArgs
  },
  Export: {
    Handler: exportHandler,
    Args: exportArgs
  },
  PluginDesc: {
    name: 'Microsoft LUIS',
    provider: 'Microsoft',
    features: {
      intentResolution: true,
      intentConfidenceScore: true,
      alternateIntents: true,
      entityResolution: true,
      entityConfidenceScore: true
    },
    capabilities: [
      {
        name: 'LUIS_PREDICTION_ENDPOINT_URL',
        label: 'LUIS Prediction Endpoint URL',
        description: 'By default, "https://westus.api.cognitive.microsoft.com" will be used',
        type: 'url',
        required: false
      },
      {
        name: 'LUIS_API_VERSION',
        label: 'LUIS API Version',
        description: '"V2" or "V3"',
        type: 'choice',
        required: true,
        default: 'V2',
        choices: [
          { key: 'V2', name: 'V2' },
          { key: 'V3', name: 'V3' }
        ]
      },
      {
        name: 'LUIS_PREDICTION_ENDPOINT_SLOT',
        label: 'LUIS Prediction Endpoint Slot',
        description: '"staging" or "production"',
        type: 'choice',
        required: false,
        choices: [
          { key: 'staging', name: 'Staging' },
          { key: 'production', name: 'Production' }
        ]
      },
      {
        name: 'LUIS_APP_ID',
        label: 'LUIS App ID',
        description: 'Open your LUIS project, then go to Manage, Application Information, Application ID',
        type: 'string',
        required: true
      },
      {
        name: 'LUIS_ENDPOINT_KEY',
        label: 'LUIS Endpoint Key',
        description: 'Azure Subscription Key for prediction - open your LUIS project, then go to Manage, Azure Resources',
        type: 'secret',
        required: true
      },
      {
        name: 'LUIS_AUTHORING_KEY',
        label: 'LUIS Authoring Key',
        description: 'Azure Subscription Key for authoring - open your LUIS project, then go to Manage, Azure Resources',
        type: 'secret',
        required: false
      },
      {
        name: 'LUIS_PREDICTION_STATIC_PARAMS',
        label: 'Additional Query Parameters',
        description: 'Static parameters to add as endpoint url query parameters',
        type: 'dictionary',
        required: false
      }
    ],
    actions: [
      {
        name: 'GetAgentMetaData',
        description: 'GetAgentMetaData',
        run: async (caps) => {
          if (caps && caps.LUIS_API_VERSION && caps.LUIS_APP_ID && caps.LUIS_AUTHORING_KEY) {
            try {
              const app = await getApp(caps)
              return {
                name: app.name,
                description: app.description,
                metadata: app
              }
            } catch (err) {
              throw new Error(`LUIS App Query failed: ${err.message}`)
            }
          }
        }
      }
    ]
  }
}
