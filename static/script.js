var home, uni

function initMap() {
    var options = {
        componentRestrictions: {
            country: "us"
        }
    };

    home = new google.maps.places.SearchBox(document.getElementById('homeinput'), options);
    uni = new google.maps.places.SearchBox(document.getElementById('uniinput'), options);

    google.maps.event.addListener(home, 'places_changed', handleChange);
    google.maps.event.addListener(uni, 'places_changed', handleChange);

    document.getElementById('go-back').addEventListener('click', function(e) {
        const page = document.getElementById('app');
        ['result-page', 'result-home', 'result-school', 'result-tossup'].forEach((className) => {
            page.classList.remove(className);
        });
        page.classList.add('home-page');
        return false;
    });
}

function handleChange() {
    var home_place = home.getPlaces();
    var uni_place = uni.getPlaces();

    var results_el = document.getElementById("results");

    if (home_place && uni_place) {
        var home_coords = home_place[0].geometry.location;
        var uni_coords = uni_place[0].geometry.location;

        getPriorities(home_coords, uni_coords, function(response) {
            var priorities = JSON.parse(response);

            renderResults(priorities);
        });

        document.getElementById('homeinput').value = '';  
        document.getElementById('uniinput').value = '';  
    }
}

function getPriorities(home_c, uni_c, cb) {
    let home_coords = home_c.lat() + ',' + home_c.lng();
    let uni_coords = uni_c.lat() + ',' + uni_c.lng();
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            cb(xmlHttp.responseText);
    }
    xmlHttp.open("GET", '/priorities?home=' + encodeURIComponent(home_coords) + '&uni=' + encodeURIComponent(uni_coords), true);
    xmlHttp.send();
}

function renderResults(results) {
    "use strict";

    Array.from(document.getElementsByClassName('home-name')).forEach((el) => {
        el.innerHTML = results.home.district_name.name;
    });

    Array.from(document.getElementsByClassName('school-name')).forEach((el) => {
        el.innerHTML = results.uni.district_name.name;
    });

    const page = document.getElementById('app');

    ['home-page', 'result-home', 'result-school', 'result-tossup'].forEach((className) => {
        page.classList.remove(className);
    });
    page.classList.add('result-page');

    let className;

    if (results.home.priority > results.uni.priority) {
        className = 'result-home';
    }
    if (results.uni.priority > results.home.priority) {
        className = 'result-school';
    }
    if (results.uni.priority == results.home.priority) {
        className = 'result-tossup';
    }

    page.classList.add(className);
}
