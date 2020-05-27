const BotiumConnectorLuis = require('./src/connector')

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorLuis,
  PluginDesc: {
    name: 'Microsoft LUIS',
    provider: 'Microsoft',
    capabilities: [
      {
        name: 'LUIS_PREDICTION_ENDPOINT_URL',
        label: 'LUIS Prediction Endpoint URL',
        description: 'By default, "https://westus.api.cognitive.microsoft.com" will be used',
        type: 'url',
        required: false
      },
      {
        name: 'LUIS_PREDICTION_ENDPOINT_SLOT',
        label: 'LUIS Prediction Endpoint Slot',
        description: '"staging" or "production"',
        type: 'choice',
        required: false,
        choices: [
          { key: "staging", name: "Staging" },
          { key: "production", name: "Production" }
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
        description: 'Azure Subscription Key - open your LUIS project, then go to Manage, Azure Resources, Primary Key',
        type: 'string',
        required: true
      }
    ]
  }  
}
