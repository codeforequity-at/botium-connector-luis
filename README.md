# Botium Connector for Google Assistant

[![NPM](https://nodei.co/npm/botium-connector-google-assistant.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-google-assistant/)

[ ![Codeship Status for codeforequity-at/botium-connector-google-assistant](https://app.codeship.com/projects/f379ece0-ee76-0136-6e85-5afc45d94643/status?branch=master)](https://app.codeship.com/projects/320125)
[![npm version](https://badge.fury.io/js/botium-connector-google-assistant.svg)](https://badge.fury.io/js/botium-connector-google-assistant)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Action in Google Assistant.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works

LUIS is jut an NLP. It does not answers, just returns intent, entities. 
So you are not able to test the answers, as for a chatbot engine. 
But you can check intent, and entities, and use other [asserter and logic hook](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting#asserters-and-logic-hooks).

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Prerequisites

* [LUIS account](https://www.luis.ai/home)
* LUIS project (Just to try this connector you can use public IoT project used for the [interactive demonstration](https://azure.microsoft.com/en-us/services/cognitive-services/language-understanding-intelligent-service/))
* Application ID
    * Open your project, then go to Manage, Application Information, Application ID    
    * The Id for the public IoT project is df67dcdb-c37d-46af-88e1-8b97951ca1c2
* LUIS key
    * [authoring key](https://docs.microsoft.com/en-us/azure/cognitive-services/luis/luis-get-started-node-get-intent#get-luis-key) (up to 1000 queries to the prediction endpoint API per month for all your LUIS apps)
    * [subscription keys](https://docs.microsoft.com/en-us/azure/cognitive-services/LUIS/luis-how-to-azure-subscription) (Azure account required, free tier possible)
    
The connector repository includes a tool to compose the Botium capabilities (including private keys, access tokens etc). Create a project directory of your choice, and follow the steps below.

## How to use

### Create your testcases

### Create botium.json

Create a botium.json with Application ID, and LUIS key:
```javascript
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "Botium Project LUIS",
      "CONTAINERMODE": "luis",
      "LUIS_APP_ID": "xxx",
      "LUIS_ENDPOINT_KEY": "xxx"
    }
  }
}
```

### Run your testcases

It depending how you want to run them:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __luis__ to activate this connector.

### LUIS_APP_ID

See Prerequisites

### LUIS_ENDPOINT_KEY

See Prerequisites
