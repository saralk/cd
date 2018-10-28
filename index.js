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
const redirectToHTTPS = require('express-http-to-https').redirectToHTTPS

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

app.use(redirectToHTTPS([/localhost:(\d{4})/], [], 301));

if (!API_KEY) {
    throw new Error('No API_KEY environment variable set');
}

app.listen(port);
console.log(`Listening on port ${port}`);

// build the data
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

function convertSpecialCase(name) {
    // states with only one congressional district are stored in our
    // database in a slightly different format to what we get from
    // google's civic api.
    // this maps the exceptions
    const data = {
        'ak-01': 'ak-al',
        'de-01': 'de-al',
        'mt-01': 'mt-al',
        'nd-01': 'nd-al',
        'sd-01': 'sd-al',
        'vt-01': 'vt-al',
        'wy-01': 'wy-al'
    }

    if (name in data) {
        return data[name];
    }

    return name;
}

async function getPriorityForAddress(address) {
    const regex = /cd-division\/country:us\/state:([a-z]{2})\/cd:([0-9]{1,2})/;
    let url = `https://www.googleapis.com/civicinfo/v2/representatives?key=${API_KEY}&address=${address}&includeOffices=false`;
    return rp(url).then((response) => {
        return new Promise((resolve, reject) => {
            let r = JSON.parse(response);
            let resolved = false;
            Object.keys(r.divisions).forEach((key) => {
                let division = r.divisions[key];
                let m = key.match(regex);

                // in states with only one congressional district (like Alaska)
                // the division is stored in the "alsoKnownAs" array
                if (!m && division.alsoKnownAs && division.alsoKnownAs.length > 0) {
                    alias = division.alsoKnownAs.find((d) => {
                        return d.match(regex);
                    });

                    if (alias) {
                        m = alias.match(regex);
                    }
                }

                if (m) {
                    let district_name = convertSpecialCase(m[1] + '-' + addLeadingZero(m[2])); 
                    let p = priorities[district_name];
                    p['district_name'] = r.divisions[key];
                    resolved = true;
                    resolve(p);
                }
            });
            if (!resolved) {
                resolve({
                    priority: -1
                });
            }
        });
    });
}

app.get('/priorities', async(req, res) => {
    console.log(req.query.h, req.query.u);
    let home = await getPriorityForAddress(req.query.h);
    let uni = await getPriorityForAddress(req.query.u);

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
