import 'leaflet'

declare module 'leaflet' {
  namespace Control {
    class Draw extends Control {
      constructor(options?: DrawOptions)
    }
  }

  namespace Draw {
    const Event: {
      CREATED: string
      EDITED: string
      DELETED: string
      DRAWSTART: string
      DRAWSTOP: string
      DRAWVERTEX: string
      EDITSTART: string
      EDITMOVE: string
      EDITRESIZE: string
      EDITVERTEX: string
      EDITSTOP: string
      DELETESTART: string
      DELETESTOP: string
    }
  }

  interface DrawOptions {
    position?: ControlPosition
    draw?: {
      polyline?: PolylineOptions | boolean
      polygon?: PolygonOptions | boolean
      rectangle?: PolylineOptions | boolean
      circle?: CircleOptions | boolean
      marker?: MarkerOptions | boolean
      circlemarker?: CircleOptions | boolean
    }
    edit?: {
      featureGroup: FeatureGroup
      edit?: object
      remove?: object
    }
  }
}
