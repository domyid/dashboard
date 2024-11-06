import Map from 'https://cdn.skypack.dev/ol/Map.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import OSM from 'https://cdn.skypack.dev/ol/source/OSM.js';
import {fromLonLat} from 'https://cdn.skypack.dev/ol/proj.js';


import {id} from '../../url/config.js';
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";


const attributions = '<a href="https://petapedia.github.io/" target="_blank">&copy; PetaPedia Indonesia</a> ';
const place = [107.13563336552649,-6.8165156551551505];
const basemap = new TileLayer({
    source: new OSM({attributions: attributions,}),
  });
  
const defaultstartmap = new View({
center: fromLonLat(place),
zoom: 9,
});

let map;

export async function main(){
    await addCSSIn("assets/css/ol.css",id.content);
    map = new Map({
        target: 'map',
        layers: [
            basemap
        ],
        view: defaultstartmap,
      });
}