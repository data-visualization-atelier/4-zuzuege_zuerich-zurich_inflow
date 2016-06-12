var d3 = require("d3"),
    fs = require("fs"),
    turf = require("turf");

fs.readFile("raw_data/test.csv", "utf8", function(error, data) {
    var d = d3.csv.parse(data, function(e){
        return {
            Jahr: +e.Jahr,
            ZuzOrtSort: +e.ZuzOrtSort,
            ZuzOrtLang: e.ZuzOrtLang,
            QuarSort: +e.QuarSort,
            QuarLang: e.QuarLang,
            KreisSort: +e.KreisSort,
            AnzZuzuWir: + e.AnzZuzuWir
        }
    });

    //reduce the amount of data by keeping only the last 10 years and by and not considering the foreign inflows 
    var filteredAttributes = d.filter(function(e){return ((e.Jahr) === 2015 && e.ZuzOrtSort !== 9999)});

    //geospatial data

    //steps done in console using gdal/ogr: convert shapefile to geojson, selecting specific columns and reprojecting data to wgs84
    /* ogr2ogr processed_data/municipalities.json raw_data/swissBOUNDARIES3D_1_3_TLM_HOHEITSGEBIET.shp -sql "SELECT BFS_NUMMER AS bfs, NAME AS name, GEM_TEIL AS teil FROM swissBOUNDARIES3D_1_3_TLM_HOHEITSGEBIET" -f "GeoJSON" -t_srs "EPSG:4326" 
    run ogrinfo --formats to see the formats you can convert from and into
    */

    fs.readFile("processed_data/municipalities.json", "utf8", function(error, municipalities){

        //filter municipalities with multiple geometry
        var filteredMunc = JSON.parse(municipalities).features.filter(function(e){
            return e.properties.teil < 2;
        });

        //calculate centroids of municipalities using turf.js
        var centroidMunc = filteredMunc.map(function(e){
            return {
                bfs: e.properties.bfs,
                name: e.properties.name,
                coordinates: turf.centroid(e).geometry.coordinates
            }
        });

        //convert it to an object of type: {2148: {name: 'Riaz', coordinates: [7,47]}}, where 2148 is the bfs number. Helpful in doing matching with attribute data
        var centroidMuncObject = {};
        for (var i in centroidMunc) {
            centroidMuncObject[centroidMunc[i].bfs] = {
                name: centroidMunc[i].name,
                coordinates: centroidMunc[i].coordinates
            }
        }

        //match each element in filtered data to a starting point (municipality)
        var matchedStartingPoint = filteredAttributes.map(function(e){
            if (centroidMuncObject[e.ZuzOrtSort]) {
                e.startingPoint = centroidMuncObject[e.ZuzOrtSort].coordinates;
                return e;    
                //different spelling for Obersaxen-Mundaun and C'za Capriasca/Lugano          
            } else {
                //console.log("not found: " + e.ZuzOrtSort);
                //municipalities that were not found have the bfs number: 7999 and 8995
            }
        }).filter(function(e){return e != undefined})
        //console.log(matchedStartingPoint.length);

        fs.readFile("raw_data/quartiereZuerich.json", "utf8", function(error, neighbourhood){
            //calculate centroids of municipalities using turf.js
            var centroidNeigh = JSON.parse(neighbourhood).features.map(function(e){
                return {
                    qnr: +e.properties.QNr, //quartiernummer
                    qname: e.properties.Qname, //quartiername
                    coordinates: turf.centroid(e).geometry.coordinates
                }
            });
            //console.log(centroidNeigh.length);

            //convert it to an object similarly as for the municipalities
            var centroidNeighObject = {};
            for (var i in centroidNeigh) {
                centroidNeighObject[centroidNeigh[i].qnr] = {
                    qname: centroidNeigh[i].qname,
                    coordinates: centroidNeigh[i].coordinates
                }
            };

            //map it to the attributes data as destination point

            var matchedStartingEndingPoint = matchedStartingPoint.map(function(e){
                e.destinationPoint = centroidNeighObject[e.QuarSort].coordinates;
                return e;
            })

            //convert data to geojson 
            var inflow = {
                "type": "FeatureCollection",
                "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },                                                  
                "features": []
            }
            var pers = 0;
            for (var i = 0; i < matchedStartingEndingPoint.length; i++) {
                var f = matchedStartingEndingPoint[i];
                pers += f.AnzZuzuWir;
                if (f.AnzZuzuWir > 0) {
                    inflow.features.push({
                        "type": "Feature", 
                        "properties": {
                            "id": i,
                            "year": f.Jahr,
                            "fromId": f.ZuzOrtSort,
                            "fromPlace": f.ZuzOrtLang,
                            "toId": f.QuarSort,
                            "toPlace": f.QuarLang,
                            "noPeople": f.AnzZuzuWir
                        }, "geometry": { "type": "LineString", "coordinates": [ f.startingPoint, f.destinationPoint ] }
                    })
                }
            };
            console.log(pers);
            //dump data at this step as json file
            //fs.writeFile("final_data/inflow.json", JSON.stringify(inflow));

            //assign to the neighbourhoods as centroids the total number of people moving to that neighbourhood
            for (var i = 0; i < centroidNeigh.length; i++) {
                var neigh = centroidNeigh[i];
                neigh.noPeople = 0;
                for (var j = 0; j < inflow.features.length; j++) {
                    if (neigh.qnr === inflow.features[j].properties.toId) {
                        neigh.noPeople += inflow.features[j].properties.noPeople;
                    }
                }
            }
            console.log(centroidNeigh);
            //convert data to geojson 
            var quartiere = {
                "type": "FeatureCollection",
                "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },                                                  
                "features": []
            }
            for (var i = 0; i < centroidNeigh.length; i++) {
                var f = centroidNeigh[i];
                quartiere.features.push({
                    "type": "Feature", 
                    "properties": {
                        "id": f.qnr,
                        "qname": f.qname,
                        "noPeople": f.noPeople
                    }, 
                    "geometry": { "type": "Point", "coordinates": f.coordinates }
                })
            }
            //fs.writeFile("final_data/neighbourhoodCentroids.json", JSON.stringify(quartiere));
            console.log(quartiere.features.reduce(function(a,b) {return {"properties": {"noPeople": a.properties.noPeople+b.properties.noPeople}}}))
        })
    });



})


 