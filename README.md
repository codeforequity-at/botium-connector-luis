# Botium Connector for Microsoft LUIS

[![NPM](https://nodei.co/npm/botium-connector-luis.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-luis/)

[![Codeship Status for codeforequity-at/botium-connector-luis](https://app.codeship.com/projects/671767d0-0777-0137-514b-1ae61d02a015/status?branch=master)](https://app.codeship.com/projects/325831)
[![npm version](https://badge.fury.io/js/botium-connector-luis.svg)](https://badge.fury.io/js/botium-connector-luis)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Microsoft LUIS intent resolution logic.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works

LUIS is just a stateless NLP. It does send answer, just returns intent, entities.
So you are not able to test the answers, as for a chatbot engine.
But you can check intent, and entities, and use other [asserter and logic hook](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting#asserters-and-logic-hooks).

You can assert composite entities too:
```
INTENT <CompositeEntityName>.<EntityName>
```

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Prerequisites

* __Node.js and NPM__
* [LUIS account](https://www.luis.ai/home)
* LUIS project (Just to try this connector you can use public IoT project from Microsoft used for the [interactive demonstration](https://azure.microsoft.com/en-us/services/cognitive-services/language-understanding-intelligent-service/))
* Application ID
    * Open your project, then go to Manage, Application Information, Application ID
    * The Id for the public IoT project is df67dcdb-c37d-46af-88e1-8b97951ca1c2
* LUIS key
    * [authoring key](https://docs.microsoft.com/en-us/azure/cognitive-services/luis/luis-get-started-node-get-intent#get-luis-key) (up to 1000 queries to the prediction endpoint API per month for all your LUIS apps)
    * [subscription keys](https://docs.microsoft.com/en-us/azure/cognitive-services/LUIS/luis-how-to-azure-subscription) (Azure account required, free tier possible)
* a __project directory__ on your workstation to hold test cases and Botium configuration

## Install Botium and Microsoft LUIS Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-luis
> botium-cli init
> botium-cli run
```

When using __Botium Bindings__:

```
> npm install -g botium-bindings
> npm install -g botium-connector-luis
> botium-bindings init mocha
> npm install && npm run mocha
```

When using __Botium Box__:

_Already integrated into Botium Box, no setup required_

## Connecting Microsoft Luis to Botium

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

Botium setup is ready, you can begin to write your [BotiumScript](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting) files.

## How to start sample

There is a small demo in [samples/IoT dir](./samples/IoT) with Botium Bindings. This tests the public IoT project.
So to start it you have to create botium.json from [sample.botium.json](./samples/IoT/sample.botium.json), and add your authoring key to it. Afterwards:

    > npm install
    > npm test

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __luis__ to activate this connector.

### LUIS_APP_ID

See Prerequisites

### LUIS_ENDPOINT_KEY

See Prerequisites
