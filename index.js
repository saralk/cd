const env = require('env2')('.env');

const API_KEY = process.env.API_KEY;
const AUTH_KEY = process.env.AUTH_KEY;

const https = require('https');
const fs = require('fs');
const express = require('express');
const rp = require('request-promise-native');
const winston = require('winston');
const expressWinston = require('express-winston');
const generate = require('mapkit-token')

const app = express();
const port = process.env.PORT || 3000;

app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        }),
    ],
    colorize: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    meta: false
}));

if (!API_KEY) {
    throw new Error('No API_KEY environment variable set');
}

app.listen(port);
console.log(`Listening on port ${port}`);

//build the data
const priorities = JSON.parse(fs.readFileSync('data/data.json')).reduce((map, obj) => {
    map[obj['District'].toLowerCase()] = {
        category: obj['Category'],
        priority: obj['Priority Number']
   }

    return map;
}, {});

function addLeadingZero(num) {
  num = num.toString();
  if (num.length === 1) {
    return '0' + num; 
  }
  return num;
}

async function getPriorityForCoordinates(lat, lon) {
    let url = `https://www.googleapis.com/civicinfo/v2/representatives?key=${API_KEY}&address=${lat},${lon}&includeOffices=false`;
    return rp(url).then((response) => {
        return new Promise((resolve, reject) => {
            let r = JSON.parse(response);
            Object.keys(r.divisions).forEach((key) => {
                let m = key.match(/cd-division\/country:us\/state:([a-z]{2})\/cd:([0-9]{1,2})/);
                if (m) {
                    let p = priorities[m[1] + '-' + addLeadingZero(m[2])];
                    p['district_name'] = r.divisions[key];
                    resolve(p);
                }
            });
        });
    });
}

app.get('/priorities', async (req, res) => {
    let home = await getPriorityForCoordinates(...req.query.home.split(','));
    let uni = await getPriorityForCoordinates(...req.query.uni.split(','));

    res.json({
        home: home,
        uni: uni
    });
});

app.get('/jwt', (req, res) => {
    const token = generate(AUTH_KEY, 'maps.vote.college', 'BC43SS2RL7');
    console.log(token);
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.use('/static', express.static('static'));
