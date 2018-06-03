function geoOnError(error) {
    $("#error").text('Error occurred. Error code: ' + error.code);
    // error.code can be:
    //   0: unknown error
    //   1: permission denied
    //   2: position unavailable (error response from locaton provider)
    //   3: timed out
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

var locations = [];

$(function () {
    // check for Geolocation support
    if (!navigator.geolocation) {
        $("#error").text('Geolocation is not supported for this Browser/OS version yet.');
        return;
    }

    navigator.geolocation.watchPosition(function (position) {
        if (position.coords.accuracy > 100) { return; }
        if (Math.abs(position.coords.latitude) < 10) { return; }
        if (Math.abs(position.coords.longitude) < 10) { return; }
        while (locations[1] && locations[1].timestamp < (position.timestamp - 30 * 1000)) {
            locations.shift();
        }
        locations.push(position)
        if (locations.length >= 2) {
            let old = locations[0];
            let dist = calculateDistance(old.coords.latitude, old.coords.longitude,
                position.coords.latitude, position.coords.longitude);
            let time_ms = position.timestamp - old.timestamp;
            let time_h = time_ms * 2.77778e-7;
            let mph = dist / time_h;
            $("#speed").text(mph.toFixed(2) + " mph");

        }
    });

})