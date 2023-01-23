import React, { useRef, useEffect, useState, Suspense } from "react";
import maplibregl from "maplibre-gl";
import terminator from "../utils/terminator";
import "maplibre-gl/dist/maplibre-gl.css";
import 'react-clock/dist/Clock.css';
import "../styles/Map";

const API_KEY_TEXT = (window as any).apiKey;

const Clock = React.lazy(() => import('react-clock'));

function padTo2Digits(num) {
    return String(num).padStart(2, '0');
}

function clockString(date: Date) {
    return padTo2Digits(date.getHours()) + ':' + padTo2Digits(date.getMinutes())
}

function KClock(props: any) {
    const [time, setTime] = useState(
        new Date(new Date().toLocaleString('en', {timeZone: props.timezone }))
    );
    useEffect(() => {
        const interval = setInterval(
            () => setTime(new Date(new Date().toLocaleString('en', {timeZone: props.timezone}))), 1000
        );
        return () => {
            clearInterval(interval);
        };
    }, [])
    return (
        <div className="clock-item-container">
            <Suspense>
                <div>
                    <Clock value={time} size={80} locale={'id'}/>
                    <div className="clock-text">
                        <div className="country">
                            { props.flag }
                        </div>
                        <div className="time">
                            { clockString(time) }
                        </div>
                    </div>
                </div>
            </Suspense>
        </div>
    )
}

const markers = {};
const popups = {};

export default function Map() {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [lng] = useState(25);
    const [lat] = useState(25);
    const [zoom] = useState(1.8);
    const [API_KEY] = useState(API_KEY_TEXT);
    const clocks: any = (window as any).clocks || [];

    const renderProfile = (active: boolean, properties: any) => {
        return (
            (active ? `<div class="user-active">Online</div>` : `<div class="user-inactive">Offline</div>`) +
            `<div class="user-name">${properties.first_name} ${properties.last_name}</div>` + 
            `<div class="user-task">${properties.task ? properties.task : '-'}</div>`
        )
    }

    useEffect(() => {
        if (map.current) return; //stops map from intializing more than once

        const geojson = terminator({ resolution: 2 });

        (map.current as any) = new maplibregl.Map({
            container: mapContainer.current as any,
            style: `https://api.maptiler.com/maps/basic-v2-light/style.json?key=${API_KEY}`,
            center: [lng, lat],
            zoom: zoom,
        });

        const _map = map.current as any;
        const kartozaPresenceUrl =
            "/api/user-activities/";

        _map.on("load", function() {

            _map.addSource('watercolor', {
                type: 'raster',
                tiles: ['https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg'],
                tileSize: 150
            })

            _map.addLayer({
                id: 'watercolor',
                type: 'raster',
                source: 'watercolor'
            })
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
            request.open('GET', kartozaPresenceUrl, true);
            request.onload = function () {
                if (this.status < 200 || this.status >= 400) {
                    return false
                }
                let geojson: any = JSON.parse(this.response);
                geojson.features.forEach(function (marker) {
                    let el = document.createElement('div');
                    let markerId = '' + marker.id;
                    el.className = 'marker';
                    el.style.backgroundImage = 'url(' + marker.properties.avatar + ')';
                    el.style.width = '40px';
                    el.style.height = '40px';
                    el.style.backgroundSize = 'contain';
                    el.style.borderRadius = '40px';
                    if (marker.properties.is_active) {
                        el.style.filter = 'unset';
                    } else {
                        el.style.filter = 'grayscale(100%)';
                    }
                    el.style.border = '2px solid rgba(0, 188, 79, 1)';
                    popups[markerId] = new maplibregl.Popup()
                        .setLngLat(marker.geometry.coordinates)
                        .setHTML(renderProfile(marker.properties.is_active, marker.properties))
                    // add marker to map
                    markers[markerId] = new maplibregl.Marker(el)
                        .setLngLat(marker.geometry.coordinates)
                        .setPopup(popups[markerId])
                        .addTo(_map);
                        
                })
            }
            request.send()
            window.setInterval(function () {
                // make a GET request to parse the GeoJSON at the url
                request.open('GET', kartozaPresenceUrl, true);
                request.onload = function () {
                    if (this.status >= 200 && this.status < 400) {
                        var geojson = JSON.parse(this.response);
                        geojson.features.forEach(function (marker) { 
                            const markerId = '' + marker.id;
                            if (markers[markerId]) {
                                const elm = markers[markerId].getElement();
                                if (marker.properties.is_active) {
                                    elm.style.filter = 'unset';
                                } else {
                                    elm.style.filter = 'grayscale(100%)';
                                }
                                popups[markerId].setHTML(
                                    renderProfile(marker.properties.is_active, marker.properties)
                                );
                            }
                        })
                    }
                };
                request.send();
            }, 5000);
        });
    }, []);

    return (
        <div className="map-wrap">
            <div className="clock-container">
                {
                    clocks.map((clock, index) => {
                        return <KClock timezone={clock.timezone} flag={clock.flag} />
                    })
                }
            </div>
            <div ref={mapContainer} className="map" />
        </div>
    );
}
