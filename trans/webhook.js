'use strict'

const request = require('request')
const { WebClient } = require('@slack/client')
const web = new WebClient(process.env.SLACK_TOKEN)
const SLACK_VERIFICATION_TOKEN = process.env.SLACK_VERIFICATION_TOKEN
const GAS_ENDPOINT = process.env.GAS_ENDPOINT
const JA_USERS = process.env.JA_USERS.split(',')

function verify(body, callback) {
    if (body.token === SLACK_VERIFICATION_TOKEN) {
        respond(200, body.challenge, callback)
    } else {
        respond(403, 'verification failed', callback)
    }
}

async function handleEvent(event, callback) {
    if (event.bot_id) {
        respond(200, null, callback)
        return
    }

    const isHuman = await isHumanMessage(event)
    if (isHuman) {
        translate(event)
        return
    }

    respond(200, null, callback)
}

function translate(event) {
    let url = GAS_ENDPOINT + "?text=" + encodeURIComponent(event['text'])
    if (JA_USERS.includes(event['user'])) {
        url += "&source=ja&target=vi" // ja to vi
    } else {
        url += "&source=vi&target=ja" // vi to ja
    }

    request({url: url}, function(err, res, json) {
        if (err) {
            throw err
        }

        if (event['text'] == json) {
            return
        }

        web.chat.postMessage({ channel: event['channel'], text: json, icon_emoji: ':robot_face:', thread_ts: event['ts'] }).then(function(res) {
            console.log(res)
        })
    })
}

async function isHumanMessage(event) {
    console.log(event)
    let ret = (event.type === 'message'
                && ('user' in event)
                && !('message' in event)
                && !('subtype' in event))
    return ret
}

function respond(code, body, callback) {
    const response = {
        statusCode: code,
        body: JSON.stringify(body)
    }

    callback(null, response)
}

exports.handler = (data, context, callback) => {
    const headers = data.headers
    if (headers['X-Slack-Retry-Num'] && Number(headers['X-Slack-Retry-Num']) > 0) {
        respond(200, '', callback)
        return
    }

    const body = JSON.parse(data.body)
    switch (body.type) {
        case 'url_verification':
            verify(body, callback)
            break
        case 'event_callback':
            handleEvent(body.event, callback)
            break
        default:
            respond(200, '', callback)
    }
}