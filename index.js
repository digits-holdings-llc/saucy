const express = require('express')
const app = express()
var http = require('http').createServer(app);

const port = process.env.WEB_PORT || 80
var MongoClient = require('mongodb').MongoClient
const { GraphQLClient } = require('graphql-request')
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/saucy'
const parts = mongoURL.split("/")
const DB_NAME = parts[parts.length - 1]
var contactTimeout
var botSDK = require('greenbot-sdk')
var faker = require('faker');


// Parse JSON bodies (as sent by API clients)
app.use(express.json());
app.use(express.urlencoded());
app.engine('pug', require('pug').__express)
app.set('view engine', 'pug')
app.set('views', './views')
app.use(express.static('public'))
botSDK.init(app, http)

 

const sauce = [
  "What blind man dressed you?",
  "More of your conversation would infect my brain.",
  "He has not so much brain as ear-wax.",
  "Thou cream faced loon!",
  "If I agreed with you we’d both be wrong."
]

// Access the parse results as request.body
app.post('/', async function(request, response){
  var inboundMsg = request.body;

  // If this is a session end event, ignore
  if (inboundMsg.type == 'session_end' || inboundMsg.type == 'new_session') {
    response.send({})
    return;
  }
  if (!inboundMsg.msg) {
    response.send({})
    return;
  } 
  if (request.body.msg.direction == "egress") {
    response.send({})
    return;
  } 

  botSDK.log("New message : ", inboundMsg.msg.src, ":", inboundMsg.msg.txt)
  var respText = request.config.response_msg || "No message found"
  if (request.config.fake_language.toUpperCase().trim() == "TRUE") {
    respText = faker.lorem.sentences(4)
  }
  var jsonResponse = {
    messages: [ 
      { txt: respText}
    ]
  }
  const extraMsgCount = parseInt(request.config.extra_sauce)
  for (count=0; count < extraMsgCount; count++) {
    jsonResponse.messages.push({txt: sauce[Math.floor(Math.random()*sauce.length)]})
  }
  if (request.config.tags != "") {
    jsonResponse.agentTags = [ request.config.tags ]
  }
  if (request.config.whisper.toUpperCase().trim() == "TRUE") {
    jsonResponse.whispers = [{txt: faker.lorem.sentences(4) }]
  }

  if (inboundMsg.msg.txt.toUpperCase().includes("QUIT")) {
    jsonResponse.commands = {
      "end_session": true
    }
    botSDK.log("Quitting")
  }

  if (request.config.transfer && inboundMsg.msg.txt.toUpperCase().includes("TRANSFER")) {
    botSDK.log("Transferring to ", request.config.transfer)
    if (jsonResponse.commands) {
      jsonResponse.commands.transfer = request.config.transfer
    } else {
      jsonResponse.commands = {
        "transfer": request.config.transfer
      }  
    }
  }
  response.send(jsonResponse)
})



app.get('/', async function(request, response) {
  response.render('index', { config: request.config })
})

http.listen(port, () => botSDK.log(`Automation running on ${port}!`))
