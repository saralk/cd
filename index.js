const API_KEY = process.env.API_KEY;

const https = require('https');
const fs = require('fs');
const express = require('express');
const rp = require('request-promise-native');

var app = express();
app.listen(process.env.PORT || 3000);

//build the data
const priorities = JSON.parse(fs.readFileSync('data/data.json')).reduce((map, obj) => {
    map[obj['District'].toLowerCase()] = {
        category: obj['Category'],
        priority: obj['Priority Number']
    }

    return map;
}, {});

async function getPriorityForCoordinates(lat, lon) {
    let url = 'https://www.googleapis.com/civicinfo/v2/representatives?key=' + API_KEY + '&address=' + lat + ',' + lon + '&includeOffices=false';
    return rp(url).then((response) => {
        console.log(response);
        return new Promise((resolve, reject) => {
            let r = JSON.parse(response);
            Object.keys(r.divisions).forEach((key) => {
                let m = key.match(/cd-division\/country:us\/state:([a-z]{2})\/cd:([0-9]{2})/);
                if (m) {
                    let p = priorities[m[1] + '-' + m[2]];
                    p['district_name'] = r.divisions[key];
                    resolve(p);
                }
            });
        });
    });
}

app.get('/priorities', async (req, res) => {
    console.log(req.query);
    let home = await getPriorityForCoordinates(...req.query.home.split(','));
    let uni = await getPriorityForCoordinates(...req.query.uni.split(','));

    res.json({
        home: home,
        uni: uni
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});
