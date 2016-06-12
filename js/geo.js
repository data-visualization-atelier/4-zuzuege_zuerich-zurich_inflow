module.exports = {
    getOrigin: function(geojson) {
        var origin = {
            "type": "FeatureCollection",
            "features": []
        };

        for (var i in geojson.features) {
            var feature = geojson.features[i];
            origin.features.push(
                {
                "type": "Feature",
                "properties": feature.properties,
                "geometry": {
                    "type": "Point",
                    "coordinates": feature.geometry.coordinates[0]
                }
            })
        }
        return origin;

    },

    changeDestinationPoint: function(original, arrayOfDestinations) {
       for (var i = 0; i< original.features.length; i++) {
            original.features[i].geometry.coordinates[1] = arrayOfDestinations[i];
        }
        return original;

    }
}
