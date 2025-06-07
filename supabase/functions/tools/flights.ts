// Flights tool using OpenSky Network API for real-time flight tracking

export interface FlightsRequest {
  // Real-time flight tracking parameters
  area?: {
    min_latitude: number
    max_latitude: number
    min_longitude: number
    max_longitude: number
  }
  aircraft_icao24?: string
  time?: number
  airport_icao?: string
  query_type: 'states' | 'flights' | 'arrivals' | 'departures'
  time_begin?: number
  time_end?: number
}

export interface FlightState {
  icao24: string
  callsign: string | null
  origin_country: string
  time_position: number | null
  last_contact: number
  longitude: number | null
  latitude: number | null
  baro_altitude: number | null
  on_ground: boolean
  velocity: number | null
  true_track: number | null
  vertical_rate: number | null
  geo_altitude: number | null
  squawk: string | null
  spi: boolean
  position_source: number
}

export interface FlightInfo {
  icao24: string
  first_seen: number
  est_departure_airport: string | null
  last_seen: number
  est_arrival_airport: string | null
  callsign: string | null
  est_departure_airport_horiz_distance: number | null
  est_departure_airport_vert_distance: number | null
  est_arrival_airport_horiz_distance: number | null
  est_arrival_airport_vert_distance: number | null
  departure_airport_candidates_count: number | null
  arrival_airport_candidates_count: number | null
}

export interface FlightsResponse {
  query_type: string
  time_queried: number
  states?: FlightState[]
  flights?: FlightInfo[]
  total_results: number
  credits_used: number
}

export async function searchFlights(
  requestData: FlightsRequest
): Promise<{ success: boolean; data: FlightsResponse; message: string }> {
  // OpenSky API credentials (optional - can work without auth but with lower rate limits)
  const OPENSKY_USERNAME = Deno.env.get('OPENSKY_CLIENT_ID')
  const OPENSKY_PASSWORD = Deno.env.get('OPENSKY_CLIENT_SECRET')

  try {
    const {
      query_type,
      area,
      aircraft_icao24,
      time,
      airport_icao,
      time_begin,
      time_end
    } = requestData

    let url = 'https://opensky-network.org/api'
    let endpoint = ''
    const params = new URLSearchParams()

    // Build endpoint based on query type
    switch (query_type) {
      case 'states':
        endpoint = '/states/all'
        if (time) params.append('time', time.toString())
        if (aircraft_icao24) params.append('icao24', aircraft_icao24)
        if (area) {
          params.append('lamin', area.min_latitude.toString())
          params.append('lomin', area.min_longitude.toString())
          params.append('lamax', area.max_latitude.toString())
          params.append('lomax', area.max_longitude.toString())
        }
        break

      case 'flights':
        endpoint = '/flights/all'
        if (time_begin) params.append('begin', time_begin.toString())
        if (time_end) params.append('end', time_end.toString())
        break

      case 'arrivals':
        if (!airport_icao) {
          throw new Error('Airport ICAO code required for arrivals query')
        }
        endpoint = `/flights/arrival`
        params.append('airport', airport_icao)
        if (time_begin) params.append('begin', time_begin.toString())
        if (time_end) params.append('end', time_end.toString())
        break

      case 'departures':
        if (!airport_icao) {
          throw new Error('Airport ICAO code required for departures query')
        }
        endpoint = `/flights/departure`
        params.append('airport', airport_icao)
        if (time_begin) params.append('begin', time_begin.toString())
        if (time_end) params.append('end', time_end.toString())
        break

      default:
        throw new Error(`Invalid query type: ${query_type}`)
    }

    // Construct full URL
    const fullUrl = `${url}${endpoint}${params.toString() ? '?' + params.toString() : ''}`

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add authentication if credentials are provided
    if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
      headers['Authorization'] = `Basic ${btoa(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`)}`
    }

    console.log(`🛩️ Calling OpenSky API: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenSky API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    
    // Process response based on query type
    let processedData: FlightsResponse
    
    if (query_type === 'states') {
      // States endpoint returns { time, states: [[...], [...]] }
      const states: FlightState[] = (data.states || []).map((stateArray: any[]) => ({
        icao24: stateArray[0],
        callsign: stateArray[1]?.trim() || null,
        origin_country: stateArray[2],
        time_position: stateArray[3],
        last_contact: stateArray[4],
        longitude: stateArray[5],
        latitude: stateArray[6],
        baro_altitude: stateArray[7],
        on_ground: stateArray[8],
        velocity: stateArray[9],
        true_track: stateArray[10],
        vertical_rate: stateArray[11],
        geo_altitude: stateArray[13],
        squawk: stateArray[14],
        spi: stateArray[15],
        position_source: stateArray[16]
      }))

      processedData = {
        query_type: query_type,
        time_queried: data.time || Math.floor(Date.now() / 1000),
        states: states,
        total_results: states.length,
        credits_used: 1 // States endpoint uses 1 credit
      }
    } else {
      // Flights endpoints return array of flight objects
      const flights: FlightInfo[] = data || []

      processedData = {
        query_type: query_type,
        time_queried: Math.floor(Date.now() / 1000),
        flights: flights,
        total_results: flights.length,
        credits_used: 0 // Flight endpoints don't use credits
      }
    }

    let message = ''
    switch (query_type) {
      case 'states':
        message = `Found ${processedData.total_results} aircraft states`
        if (area) {
          message += ` in area (${area.min_latitude}, ${area.min_longitude}) to (${area.max_latitude}, ${area.max_longitude})`
        }
        break
      case 'flights':
        message = `Found ${processedData.total_results} flights in time range`
        break
      case 'arrivals':
        message = `Found ${processedData.total_results} arrivals at ${airport_icao}`
        break
      case 'departures':
        message = `Found ${processedData.total_results} departures from ${airport_icao}`
        break
    }

    return {
      success: true,
      data: processedData,
      message: message
    }

  } catch (error) {
    console.error('OpenSky API error:', error)
    return {
      success: false,
      data: {} as FlightsResponse,
      message: `Failed to fetch flight data: ${(error as Error).message}`
    }
  }
}