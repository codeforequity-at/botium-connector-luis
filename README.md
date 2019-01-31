# Botium Connector for Microsoft LUIS

[![NPM](https://nodei.co/npm/botium-connector-luis.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-luis/)

[![Codeship Status for codeforequity-at/botium-connector-luis](https://app.codeship.com/projects/671767d0-0777-0137-514b-1ae61d02a015/status?branch=master)](https://app.codeship.com/projects/325831)
[![npm version](https://badge.fury.io/js/botium-connector-luis.svg)](https://badge.fury.io/js/botium-connector-luis)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Microsoft LUIS intent resolution logic.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works

LUIS is just an NLP. It does not answers, just returns intent, entities. 
So you are not able to test the answers, as for a chatbot engine. 
But you can check intent, and entities, and use other [asserter and logic hook](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting#asserters-and-logic-hooks).

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Prerequisites

* [LUIS account](https://www.luis.ai/home)
* LUIS project (Just to try this connector you can use public IoT project from Microsoft used for the [interactive demonstration](https://azure.microsoft.com/en-us/services/cognitive-services/language-understanding-intelligent-service/))
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

## How to start sample

There is a small demo in [samples/IoT dir](./samples/IoT) with Botium Bindings. 
This tests the public IoT project. 
So to start it you have to cretate botium.json from 
[sample.botium.json](./samples/IoT/sample.botium.json), and add your authoring key to it.

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __luis__ to activate this connector.

### LUIS_APP_ID

See Prerequisites

### LUIS_ENDPOINT_KEY

See Prerequisites
