const { onRequest } = require("firebase-functions/v2/https");
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

// from Apple Developer WeatherKit config
const {
  kid,
  privateKey,
  sub,
  tid,
} = require('./private_key.js')

const allow = 'https://weather-et.web.app'

function getAuthHeader() {
  const token = jwt.sign(
    { sub },
    privateKey,
    {
      issuer: tid,
      expiresIn: "1m",
      keyid: kid,
      algorithm: "ES256",
      header: {
        id: tid,
      },
    }
  )

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function available (lat, lng, headers) {
  const reqUrl = `https://weatherkit.apple.com/api/v1/availability/${lat}/${lng}`

  const resp = await fetch(reqUrl, { headers })

  const data = await resp.json()

  return data
}

exports.weather = onRequest({cors: true}, async(req, res) => {
  const { FIREBASE_DEV } = process.env
  if (FIREBASE_DEV !== 'FOOBAR') {
    // cors
    res.set('Access-Control-Allow-Origin', allow)
  
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET')
      res.set('Access-Control-Allow-Headers', 'Content-Type')
      res.set('Access-Control-Max-Age', '3600')
      res.status(204).send('')
      return
    }
  }

  const { lat, lng } = req.query

  const headers = getAuthHeader()

  const avail = await available(lat, lng, headers)

  const dataSets = avail.join(',')

  // can add &timezone=America/Toronto if needed
  const reqUrl = `https://weatherkit.apple.com/api/v1/weather/en/${lat}/${lng}?dataSets=${dataSets}`

  const resp = await fetch(reqUrl, { headers })

  const data = await resp.json()

  const keys = Object.keys(data)
  
  res.send({keys, ...data})
})
