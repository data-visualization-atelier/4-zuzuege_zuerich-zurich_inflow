## Processing data using d3 and node

(based on http://learnjsdata.com/node.html)

### Setting up the project

- create a package.json file using ```npm init```. You will be prompted for the name of the project, version, description etc.
- after the package was created, add the dependencies - in our case d3:
```javascript
    "dependencies": {
        "d3": "3.5.17",
        "turf": "2.0.0" // for all things geo
    }
````
- to install the dependencies just run ```npm install```. After the install you will see that a node_modules folder showed up with the d3 library.

### The processing part

- in your index.js file you can use d3 by requiring it as a node module. You will also need the [file system module](https://nodejs.org/api/fs.html) to read the data as the XMLHttpRequest doesn't work in the node environment.
```javascript
var d3 = require("d3"),
    fs = require("fs")
```

- from this point on you can load in data and transform it using d3.

- to dump a file after a certain process you can just export it using node file system:
```javascript
fs.writeFile("processed_data/data.json", JSON.stringify(filteredData));
```


Data sources:
https://opendata.swiss/en/dataset/swissboundaries3d-bezirksgrenzen1
https://data.stadt-zuerich.ch/dataset/statistisches-quartier
https://data.stadt-zuerich.ch/dataset/bev-zuz-jahr-quartier-v2