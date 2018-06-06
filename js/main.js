/*global L */
function geoOnError(error) {
    $("#error").text(`Error occurred. Error message: ${error.message}`);
}

function speed(old_pos, new_pos) {
    let dist = old_pos.latlng.distanceTo(new_pos.latlng);
    let time_ms = new_pos.timestamp - old_pos.timestamp;
    let time_s = time_ms * 0.001;
    return dist / time_s
}

function geoOnFound(position) {
    $("#error").text('');
    position.circle = L.circle(position.latlng, position.accuracy).addTo(map);
    polyline.addLatLng(position.latlng);
    map.fitBounds(polyline.getBounds());
    while (locations[old_index + 1] && locations[old_index + 1].timestamp < (position.timestamp - 15 * 1000)) {
        map.removeLayer(locations[old_index].circle);
        old_index += 1;
    }
    locations.push(position);
    if (locations.length >= 2) {
        let smoothing_start = Math.max(0, locations.length - smoothing_overcount - 1);
        total_distance_m += locations[smoothing_start].latlng.distanceTo(position.latlng);
        total_time_s += (position.timestamp - locations[smoothing_start].timestamp) * 0.001;

        let bump_on_m = +$("#bump_on").val() / 0.000621371;
        if ((total_distance_m / smoothing_overcount) > last_bump_m + bump_on_m) {
            $("#target_speed").val((+$("#target_speed").val() + +$("#bump_up").val()).toFixed(1))
            last_bump_m += bump_on_m;
        }

        let total_speed = (total_distance_m / total_time_s) * 2.23694;
        let a_5k_time = 5000 * (total_time_s / total_distance_m) / 60;

        chart_data.series[0].push({ x: total_distance_m / smoothing_overcount, y: (position.timestamp - locations[0].timestamp) * 0.001 / 60 });
        chart.update(chart_data);

        let mph = speed(locations[old_index], position) * 2.23694;
        let target_mph = +$("#target_speed").val();
        $("#speed").text(`${mph.toFixed(1)} mph.`).toggleClass('too-slow', mph < target_mph - 0.15).toggleClass('too-fast', mph > target_mph + 0.15);
        $("#total").text(
            `${(total_distance_m * 0.000621371 / smoothing_overcount).toFixed(2)} miles in ${((position.timestamp - locations[0].timestamp) * 0.001 / 60).toFixed(1)} min is ${total_speed.toFixed(1)} mph.
            5k in ${a_5k_time.toFixed(1)} min.`
        );
        $("#info").text(`With ${locations.length - old_index}/${locations.length} test points. Raw speed report ${(position.speed * 2.23694).toFixed(1)}`);
    }
}

/* exported reconstruct */
function reconstruct(i) {
    /*global data */
    geoOnFound({
        latlng: L.latLng(data.latitude[i], data.longitude[i]),
        timestamp: data.timestamp[i],
        accuracy: data.accuracy[i],
        speed: data.speed[i]
    })
}


/* exported reset */
function reset() {
    locations.forEach((i) => map.removeLayer(i.circle));
    total_distance_m = 0;
    total_time_s = 0;
    last_bump_m = 0;
    locations = []
    old_index = 0
    map.removeLayer(polyline)
    polyline = new L.Polyline([]);
    polyline.addTo(map);
    $("#error").text('');
    $("#speed").text('').removeClass('too-slow').removeClass('too-fast');
    $("#total").text('');
    $("#info").text('');
    chart_data = {
        series: [[
            { x: 0, y: 0 }
        ]]
    };
    chart.update(chart_data);
}

var map;
var polyline;

var chart;
var chart_data = {
    series: [[
        { x: 0, y: 0 }
    ]]
};

var locations = [];
var old_index = 0;

const smoothing_overcount = 50;
var total_distance_m = 0;
var total_time_s = 0;
var last_bump_m = 0;

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

    chart = new Chartist.Line('.ct-chart', chart_data, {
        axisX: {
            type: Chartist.FixedScaleAxis,
            low: 0,
            high: 5000,
            ticks: [1609, 2 * 1609, 3 * 1609]
        },
        axisY: {
            type: Chartist.AutoScaleAxis,
            low: 0,
            high: 40,
            onlyInteger: true,
        },
        lineSmooth: false,
        showPoint: false,
    });

    $("#start").click(reset)

    map = L.map('map');

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(map);

    polyline = new L.Polyline([]);
    polyline.addTo(map);

    map.locate({ watch: true, setView: false, enableHighAccuracy: true });
    map.on('locationfound', geoOnFound);
    map.on('locationerror', geoOnError);
})