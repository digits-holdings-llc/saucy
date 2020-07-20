#!/usr/bin/env node

const {
  createServer,
  IncomingMessage,
  ServerResponse,
} = require('unit-http');

const {
  PORT,
} = process.env;

// Must perform NGINX Unit check and set ServerResponse and IncomingMessage before initializing express app through vht-automations-sdk
if (!PORT) {
  console.error('no port specified');
  require('http').ServerResponse = ServerResponse;
  require('http').IncomingMessage = IncomingMessage;
}

const { initSDK, app } = require('vht-automations-sdk');

const express = require('express');
app.use(express.static('public'))

const faker = require('faker');

initSDK({ applicationName: "Saucy", pug_views: ["views"] })
  .then(() => {
    initializeRoutes();
    if (!PORT) {
      createServer(app).listen(); // nginx unit listen entry point
    }
    else {
      require('http').createServer(app).listen(PORT, () => {
        var startupMessage = `Started on ${PORT}`;
        console.log(startupMessage);
      });
    }
  }
);

function initializeRoutes(){
  app.post('/', async function (request, response) {
    const inboundMsg = request.body;

    // If this is a session end event, ignore
    if (inboundMsg.type == 'session_end' || inboundMsg.type == 'new_session') {
      response.send({});
      return;
    }
    if (!inboundMsg.msg) {
      response.send({});
      return;
    }
    if (request.body.msg.direction == 'egress') {
      if (inboundMsg.msg.txt.toUpperCase().includes('QUIT')) {
        console.error('Quitting');
        response.send({
          commands: {
            end_session: true
          }
        });
      } else {
        response.send({});
      }
      return;
    }

    const jsonResponse = {};
    const trigger = request.config.trigger.toUpperCase();
    console.error('New message : ', inboundMsg.msg.src, ':', inboundMsg.msg.txt);
    if (trigger && inboundMsg.msg.txt.toUpperCase().includes(trigger)) {
      const respText = request.config.response_msg || 'No respnse_msg found in the configuration';
      if (request.config.fake_language.toUpperCase().trim() == 'TRUE') {
        respText = faker.lorem.sentences(4);
      }
      jsonResponse.messages = [{ txt: respText }];
      const extraMsgCount = parseInt(request.config.extra_sauce);
      for (count = 0; count < extraMsgCount; count++) {
        jsonResponse.messages.push({ txt: sauce[Math.floor(Math.random() * sauce.length)] });
      }
    }

    if (request.config.tags != '') {
      jsonResponse.agentTags = [request.config.tags];
    }
    if (request.config.whisper.toUpperCase().trim() == 'TRUE') {
      jsonResponse.whispers = [{ txt: faker.lorem.sentences(4) }];
    }

    if (inboundMsg.msg.txt.toUpperCase().includes('QUIT')) {
      jsonResponse.commands = {
        end_session: true
      };
      console.error('Quitting');
    }

    if (request.config.transfer && inboundMsg.msg.txt.toUpperCase().includes('TRANSFER')) {
      console.error('Transferring to ', request.config.transfer);
      if (jsonResponse.commands) {
        jsonResponse.commands.transfer = request.config.transfer;
      } else {
        jsonResponse.commands = {
          transfer: request.config.transfer
        };
      }
    }
    response.send(jsonResponse);
  });

  app.get('/', async function (request, response) {
    const version = process.env.COMMIT_HASH ? process.env.COMMIT_HASH : "";
    response.render('index', { config: request.config, version });
  });
}

const sauce = [
  'What blind man dressed you?',
  'More of your conversation would infect my brain.',
  'He has not so much brain as ear-wax.',
  'Thou cream faced loon!',
  'If I agreed with you we’d both be wrong.'
];