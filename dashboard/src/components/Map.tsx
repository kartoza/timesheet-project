import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import terminator from "../utils/terminator";
import "maplibre-gl/dist/maplibre-gl.css";
import "../styles/Map";

const API_KEY_TEXT = (window as any).apiKey;

export default function Map() {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [lng] = useState(25);
    const [lat] = useState(25);
    const [zoom] = useState(1.8);
    const [API_KEY] = useState(API_KEY_TEXT);

    const renderProfile = (active: boolean, properties: any) => {
        return (
            active ? `<div class="user-active">Online</div>` : `<div class="user-inactive">Offline</div>` +
            `<div class="user-name">${properties.first_name} ${properties.last_name}</div>` + 
            `<div class="user-task">${properties.task ? properties.task : '-'}</div>`
        )
    }

    useEffect(() => {
        if (map.current) return; //stops map from intializing more than once

        const geojson = terminator({ resolution: 2 });

        (map.current as any) = new maplibregl.Map({
            container: mapContainer.current as any,
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${API_KEY}`,
            center: [lng, lat],
            zoom: zoom,
        });

        const _map = map.current as any;
        const kartozaPresenceUrl =
            "/api/user-activities/";

        var size = 80;

        // implementation of CustomLayerInterface to draw a pulsing dot icon on the map
        // see https://maplibre.org/maplibre-gl-js-docs/api/properties/#customlayerinterface for more info
        let pulsingDot = {
            width: size,
            height: size,
            data: new Uint8Array(size * size * 4),
            context: null,

            // get rendering context for the map canvas when layer is added to the map
            onAdd: function() {
                var canvas = document.createElement("canvas");
                canvas.width = this.width;
                canvas.height = this.height;
                (this.context as any) = canvas.getContext("2d");
            },

            // called once before every frame where the icon will be used
            render: function() {
                var duration = 1000;
                var t = (performance.now() % duration) / duration;

                var radius = (size / 2) * 0.3;
                var outerRadius = (size / 2) * 0.7 * t + radius;
                var context = (this.context as any);

                // draw outer circle
                context.clearRect(0, 0, this.width, this.height);
                context.beginPath();
                context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
                context.fillStyle = "rgba(0, 188, 79," + (1 - t) + ")";
                context.fill();

                // draw inner circle
                context.beginPath();
                context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
                context.fillStyle = "rgba(0, 188, 79, 1)";
                context.strokeStyle = "white";
                context.lineWidth = 2 + 4 * (1 - t);
                context.fill();
                context.stroke();

                // update this image's data with data from the canvas
                this.data = context.getImageData(0, 0, this.width, this.height).data;

                // continuously repaint the map, resulting in the smooth animation of the dot
                _map.triggerRepaint();

                // return `true` to let the map know that the image was updated
                return true;
            },
        };

        let grayDot = {
            width: size,
            height: size,
            data: new Uint8Array(size * size * 4),
            context: null,
            onAdd: function() {
                var canvas = document.createElement("canvas");
                canvas.width = this.width;
                canvas.height = this.height;
                (this.context as any) = canvas.getContext("2d");
            },
            render: function() {
                var radius = (size / 2) * 0.3;
                var outerRadius = 0;
                var context = (this.context as any);

                // draw outer circle
                context.clearRect(0, 0, this.width, this.height);
                context.beginPath();
                context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
                context.fillStyle = "rgba(175, 174, 178, 1)";
                context.fill();

                // draw inner circle
                context.beginPath();
                context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
                context.fillStyle = "rgba(175, 174, 178, 1)";
                context.strokeStyle = "white";
                context.fill();
                context.stroke();

                // update this image's data with data from the canvas
                this.data = context.getImageData(0, 0, this.width, this.height).data;

                // return `true` to let the map know that the image was updated
                return true;
            },
        };

        _map.on("load", function() {
            _map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });
            _map.addImage('gray-dot', grayDot, { pixelRatio: 2 });
            
            window.setInterval(function () {
                _map.getSource('daynight').setData((terminator({ resolution: 2 }) as any)["features"][0]);
            }, 2000);

            _map.addSource("daynight", {
                type: "geojson",
                data: (geojson as any)["features"][0],
            });
            _map.addLayer({
                id: "daynight",
                type: "fill",
                source: "daynight",
                layout: {},
                paint: {
                    "fill-color": "#000",
                    "fill-opacity": 0.3,
                },
            });

            var request = new XMLHttpRequest();
            window.setInterval(function () {
                // make a GET request to parse the GeoJSON at the url
                request.open('GET', kartozaPresenceUrl, true);
                request.onload = function () {
                    if (this.status >= 200 && this.status < 400) {
                        var json = JSON.parse(this.response);
                        _map.getSource('presence').setData(json);
                    }
                };
                request.send();
            }, 2000);

            _map.addSource("presence", {
                type: "geojson",
                data: kartozaPresenceUrl,
            });

            _map.addLayer({
                id: "active",
                type: "symbol",
                source: "presence",
                layout: {
                    'icon-image': 'pulsing-dot',
                    'icon-allow-overlap': true
                },
                filter: ["==", "is_active", true],
            });
            _map.on("click", "active", function(e: any) {
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(renderProfile(true, e.features[0].properties))
                    .addTo(_map)
            })
            _map.addLayer({
                id: "inactive",
                type: "symbol",
                source: "presence",
                layout: {
                    'icon-image': 'gray-dot',
                    'icon-allow-overlap': true
                },
                filter: ["==", "is_active", false],
            });
            _map.on("click", "inactive", function(e: any) {
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(renderProfile(false, e.features[0].properties))
                    .addTo(_map)
            })
        });
    }, []);

    return (
        <div className="map-wrap">
            <div ref={mapContainer} className="map" />
        </div>
    );
}
