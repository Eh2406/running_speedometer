function geoOnError(error) {
    $("#error").text('Error occurred. Error message: ' + error.message);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 3958.756 // Mile = 6371 km
    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

Number.prototype.toRad = function () {
    return this * Math.PI / 180;
}

function speed(old_pos, new_pos) {
    let dist = calculateDistance(
        old_pos.latitude, old_pos.longitude,
        new_pos.latitude, new_pos.longitude);
    let time_ms = new_pos.timestamp - old_pos.timestamp;
    let time_h = time_ms * 2.77778e-7;
    let mph = dist / time_h;
    return mph
}

var locations = [];
var start_time;
var old_index = 0;

$(function () {
    // check for Geolocation support
    if (!navigator.geolocation) {
        $("#error").text('Geolocation is not supported for this Browser/OS version yet.');
        return;
    }
    if (!navigator.clipboard) {
        $("#clipboard").attr("disabled", "disabled");
    } else {
        $("#clipboard").click(() => {
            navigator.clipboard.writeText(
                JSON.stringify(
                    {
                        latitude: locations.map((i) => i.latitude),
                        longitude: locations.map((i) => i.longitude),
                        timestamp: locations.map((i) => i.timestamp),
                        accuracy: locations.map((i) => i.accuracy),
                        speed: locations.map((i) => i.speed),
                    }
                )
            )
        })
    }

    var map = L.map('map');

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(map);

    map.locate({ watch: true, setView: true, maxZoom: 16, enableHighAccuracy: true });

    map.on('locationfound', function (position) {
        if (position.accuracy > 100) { return; }
        position.circle = L.circle(position.latlng, position.accuracy).addTo(map);
        if (!start_time) {
            start_time = position.timestamp;
        }
        while (locations[old_index + 1] && locations[old_index + 1].timestamp < (position.timestamp - 15 * 1000)) {
            old_index += 1;
        }
        locations.push(position);
        if (locations.length >= 2) {
            let mph = speed(locations[0], position);
            let target_mph = +$(target_speed).val();
            $("#speed").text(mph.toFixed(1) + " mph.").toggleClass('.too-slow', mph - target_mph < -0.15).toggleClass('.too-fast', mph - target_mph > 0.15);
            $("#info").text("With " + (locations.length - old_index) + "/" + locations.length + " test points. Last updated " + (position.timestamp - start_time) + ". Raw speed report " + (position.speed * 2.23694).toFixed(1));
        }
    });

    map.on('locationerror', geoOnError);
})