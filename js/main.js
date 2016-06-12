(function(){
    var turf = require("turf");
    var mapboxgl = require("mapbox-gl");
    var Geo = require("./geo");

    //initialize map
    mapboxgl.accessToken = 'pk.eyJ1IjoiZ2VvaXJpcyIsImEiOiJjaWw5azhyd3AwMDRtdzRrcmYxdG1wbWhyIn0.5ZiWM2RgGBsLKEmU5aHXlw';

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/geoiris/cin60lrf90084d4nkf32finri',
        center: [8.208947, 47.078852],
        zoom: 8,
        attributionControl: false
    });

    map.on('load', function() {

        //add the neighbourhoods as polygons
        map.addSource('neighbourhood-polygons-source', {
            'type': 'geojson',
            'data': 'data/final_data/neighbourhoodPolygons.json'
        });

        map.addLayer({
            'id': 'neighbourhood-polygons-layer',
            'type': 'line',
            'source': 'neighbourhood-polygons-source',
            'minzoom': 9,
            'layout': { 
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#aaa',
                'line-width': 1,
                'line-opacity': 1
            }
        }, 'place_label_city');

        //add neighbourhood centroids for the proportional symbols visualization
        map.addSource('neighbourhood-centroid-source', {
            'type': 'geojson',
            'data': 'data/final_data/neighbourhoodCentroids.json'
        });

        map.addLayer({
            'id': 'neighbourhood-centroid-layer',
            'type': 'circle',
            'source': 'neighbourhood-centroid-source',
            'minzoom': 10,
            'layout':{
                'visibility':'none'
            },
            'paint': {
                'circle-radius': {
                    'property': 'noPeople',
                    'stops':[
                    [0, 5],
                    [2000, 30]
                    ]
                },
                'circle-color': '#786583',
                'circle-blur': 0.6
            }
        }, 'place_label_city');

        //add layers connected to the flow lines
        mapboxgl.util.getJSON('data/final_data/inflow.json', function(err, data){

            var origin = Geo.getOrigin(data),
                duration = 3 //animation duration in seconds;

            //add the points where the flow lines start
            map.addSource('inflow-origin-source', {
                'type': 'geojson',
                'data': origin
            });

            map.addLayer({
                'id': 'inflow-origin-layer',
                'type': 'circle',
                'source': 'inflow-origin-source',
                'paint': {
                    'circle-radius': 2,
                    'circle-color': '#444'
                }
            });

            //add the flow lines with no data in the beginning
            var dummy = {
                'type': 'FeatureCollection',
                'features': []
            };

            map.addSource('flows-source',{
                'type': 'geojson',
                'data': dummy
            });

            map.addLayer({
                'id': 'flows-20-layer',
                'type': 'line',
                'source': 'flows-source',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'filter': ['all', ['>=', 'noPeople', 20], ['<', 'noPeople', 30]],
                'paint': {
                    'line-color': '#786583',
                    'line-width': 1,
                    'line-opacity': 0.4
                }
            }, 'neighbourhood-centroid-layer');

            map.addLayer({
                'id': 'flows-30-layer',
                'type': 'line',
                'source': 'flows-source',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'filter': ['all', ['>=', 'noPeople', 30], ['<', 'noPeople', 50]],
                'paint': {
                    'line-color': '#786583',
                    'line-width': 3,
                    'line-opacity': 0.4
                }
            }, 'neighbourhood-centroid-layer');

            map.addLayer({
                'id': 'flows-50-layer',
                'type': 'line',
                'source': 'flows-source',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'filter': ['all', ['>=', 'noPeople', 50], ['<', 'noPeople', 71]],
                'paint': {
                    'line-color': '#786583',
                    'line-width': 5,
                    'line-opacity': 0.4
                }
            }, 'neighbourhood-centroid-layer');

            map.addLayer({
                'id': 'flows-highlighted-layer',
                'type': 'line',
                'source': 'flows-source',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'filter': ['==', 'id', ''],
                'paint': {
                    'line-color': '#9e0052',
                    'line-width': 3,
                    'line-opacity': 0.8
                }
            }, 'neighbourhood-centroid-layer');

            //calculate stop points for the animation
            var stopPoints = data.features.map(function(e) {
                var lineDist = turf.lineDistance(e, 'kilometers');
                var points = [];
                for (var i = 0; i <= 60*duration; i++) {
                    points.push(turf.along(e, (i/(60*duration)) * lineDist, 'kilometers').geometry.coordinates);
                }
                return points;
            })
            
            var counter;

            function animate(){
                var currentCoords = stopPoints.map(function(e){return e[counter]});
                var newLines = Geo.changeDestinationPoint(data, currentCoords);
                map.getSource('flows-source').setData(newLines);
                counter++;
                if (counter != stopPoints[0].length) {
                    requestAnimationFrame(animate);
                } 
                else {
                    map.flyTo({
                        zoom: 11,
                        center: [8.498947, 47.378852]
                    });
                    map.setLayoutProperty('neighbourhood-centroid-layer', 'visibility', 'visible');
                    document.getElementById('replay').classList.remove('not-active');
                }
            }

            function startAnimation() {
                document.getElementById('replay').classList.add('not-active');
                map.getSource('flows-source').setData(dummy);
                map.setLayoutProperty('neighbourhood-centroid-layer', 'visibility', 'none');
                map.flyTo({
                        zoom: 8,
                        center: [8.208947, 47.078852]
                    });
                counter = 0;
                window.setTimeout(animate, 1000);
            }

            document.getElementById('replay').addEventListener('click', startAnimation);

            window.setTimeout(startAnimation, 3000)
        });

        var popup = new mapboxgl.Popup({closeButton: false});

        map.on('mousemove', function (e) {

            var features = map.queryRenderedFeatures(e.point, {layers: ['flows-20-layer', 'flows-50-layer', 'flows-30-layer', 'neighbourhood-centroid-layer']});
            
            map.getCanvas().style.cursor = features.length ? 'pointer' : 'auto';
            
            if (!features.length) {
                popup.remove();
                map.setFilter('flows-highlighted-layer', ['==', 'id', '']);
                return;
            }

            var feature = features[0];
            
            if (feature.layer.id === 'neighbourhood-centroid-layer') {
                popup.setLngLat(map.unproject(e.point))
                    .setHTML(feature.properties.noPeople + ' persons moved to ' + feature.properties.qname)
                    .addTo(map);
            } else {
                map.setFilter('flows-highlighted-layer', ['==', 'id', feature.properties.id]);
                popup.setLngLat(map.unproject(e.point))
                    .setHTML(feature.properties.noPeople + ' persons moved from ' + feature.properties.fromPlace + ' to ' + feature.properties.toPlace)
                    .addTo(map);
            }
            
        });
    });

}())