import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http/ngx';


@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {

  url = 'https://maps.googleapis.com/maps/api/directions/json?';

  constructor(
      private http: HTTP
  ) { }


  /**
   * Call Google API to retrieve directions.
   *
   * More options at https://developers.google.com/maps/documentation/directions/intro#DirectionsRequests
   *
   * @param originVal       address for origin
   * @param destinationVal  address for destination
   */
  retrieveDirection(originVal, destinationVal): Promise<{}> {
    return new Promise<{}>((resolve, reject) => {

      const parameters = {
        origin: originVal,
        destination: destinationVal,
        key: '(API key)'
      };

      this.http.get(this.url, parameters, {}).then(
          (res) => {
            resolve(JSON.parse(res.data));
          },
          (err) => {
            reject(err);
          }
      );

    });
  }
}
