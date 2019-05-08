import {Component, NgZone, OnInit} from '@angular/core';
import {LoadingController, Platform} from '@ionic/angular';

import {GoogleMapsService} from '../services/google-maps/google-maps.service';

/* using google maps JS library specified in index.html */
declare const google: any;


import {
  GoogleMaps,
  GoogleMap,
  GoogleMapOptions,
  CameraPosition,
  Marker,
  ILatLng,
  GoogleMapsMapTypeId,
  Geocoder,
  GeocoderResult,
  GeocoderRequest,
  Polyline
} from '@ionic-native/google-maps';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  /* constants */
  SEARCH_MODE = {
    STARTING_POINT: 'starting_point',
    DESTINATION: 'destination'
  };


  map: GoogleMap;
  loading: any;

  searchMode: string;

  GoogleAutocomplete: any;
  autocompleteItems = [];

  autocompleteStartingPoint = { input: ''};
  autocompleteDestination = { input: ''};

  startingPointMarker: Marker;
  destinationMarker: Marker;

  constructor(
      private platform: Platform,
      private zone: NgZone,
      public loadingCtrl: LoadingController,
      public googleMapsService: GoogleMapsService
  ) { }

  async ngOnInit() {
    /* Since ngOnInit() is executed before `deviceready` event, */
    /* you have to wait the event. */
    await this.platform.ready();
    await this.loadMap();

    /* initialize google location autocomplete */
    this.GoogleAutocomplete = await new google.maps.places.AutocompleteService();
  }


  /**
   * create map with Drexel location
   *
   */
  loadMap() {
    const mapOptions: GoogleMapOptions = {
      mapType: GoogleMapsMapTypeId.NORMAL,
      gestures: {
        scroll: true,
        tilt: true,
        zoom: true,
        rotate: true
      },
      preferences: {
        building: true
      }
    };

    this.map = GoogleMaps.create('map_canvas', mapOptions);

    const cameraPosition: CameraPosition<ILatLng> = {
      target: {
        lat: 39.9566,
        lng: -75.1899
      },
      zoom: 15,
      tilt: 30
    };

    this.map.moveCamera(cameraPosition);
  }


  /**
   * Get locations predictions
   *
   * @param mode either starting point or destination mode
   */
  updateSearchResults(mode) {
    let searchInput;

    /* starting point search input */
    if (mode === this.SEARCH_MODE.STARTING_POINT) {

      if (this.autocompleteStartingPoint.input === '') {
        this.autocompleteItems = [];
        return;
      }

      searchInput = this.autocompleteStartingPoint.input;
      this.searchMode = this.SEARCH_MODE.STARTING_POINT;

    /* destination search input */
    } else if (mode === this.SEARCH_MODE.DESTINATION) {

      if (this.autocompleteDestination.input === '') {
        this.autocompleteItems = [];
        return;
      }

      searchInput = this.autocompleteDestination.input;
      this.searchMode = this.SEARCH_MODE.DESTINATION;
    }


    /* get place predictions */
    this.GoogleAutocomplete.getPlacePredictions({ input: searchInput },
        (predictions, status) => {
          this.autocompleteItems = [];

          this.zone.run(() => {
            predictions.forEach((prediction) => {
              this.autocompleteItems.push(prediction);
            });
          });
        });
  }


  /**
   * Get coordinate from search result
   *
   * @param item result from autocomplete location
   */
  async selectSearchResult(item) {
    this.autocompleteItems = [];

    this.loading = await this.loadingCtrl.create({
      message: 'Please wait...'
    });
    await this.loading.present();

    console.log('item', item);

    const request: GeocoderRequest = {
      address: item.description
    };

    Geocoder.geocode(request).then(
        (results: GeocoderResult[] ) => {
          console.log(this.searchMode, results);
          this.loading.dismiss();


          if (results.length > 0) {

            /* draw marker on map */
            const marker: Marker = this.map.addMarkerSync({
              position: results[0].position,
              title:  JSON.stringify(results[0].position)
            });

            this.map.animateCamera({
              target: marker.getPosition(),
              duration: 1000,
              zoom: 15
            });

            marker.showInfoWindow();

            /* remove previous marker and store that marker appropriately */
            if (this.searchMode === this.SEARCH_MODE.STARTING_POINT) {
              this.autocompleteStartingPoint.input = item.description;

              if (this.startingPointMarker !== undefined) {
                this.startingPointMarker.remove();
              }
              this.startingPointMarker = marker;

            } else if (this.searchMode === this.SEARCH_MODE.DESTINATION) {
              this.autocompleteDestination.input = item.description;

              if (this.destinationMarker !== undefined) {
                this.destinationMarker.remove();
              }
              this.destinationMarker = marker;
            }

          } else {
            alert('Not found');
          }
    });
  }


  /**
   * Get direction then
   * draw lines along with routes
   *
   */
  async getDirections() {

    this.loading = await this.loadingCtrl.create({
      message: 'Please wait...'
    });
    await this.loading.present();


    this.googleMapsService.retrieveDirection(
        this.autocompleteStartingPoint.input,
        this.autocompleteDestination.input
    ).then(
        (res) => {
          this.loading.dismiss();

          console.log('Directions Data', res);

          // @ts-ignore
          if (res.status === 'OK') {

            /* since the author of this wrapper forgot to merged the PR #194 to the release version */
            /* using Encoding.decodePath() will not work */
            // @ts-ignore
            const path = GoogleMaps.getPlugin().geometry.encoding.decodePath(res.routes[0].overview_polyline.points);
            console.log('path', path);

            /* draw routes on map */
            const polyline: Polyline = this.map.addPolylineSync({
              points: path
            });

          } else {
            // @ts-ignore
            alert(res.error_message);
          }

        },
        (err) => {
          console.error(err);
          alert(err.error);
        }
    );
  }

}
