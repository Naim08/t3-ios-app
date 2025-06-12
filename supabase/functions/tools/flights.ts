// Flights tool for flight search and booking

export interface FlightsRequest {
  // Flight search parameters
  origin: string // Origin city/airport (e.g., "NYC", "New York", "JFK")
  destination: string // Destination city/airport (e.g., "London", "LHR")
  departure_date: string // Departure date in YYYY-MM-DD format
  return_date?: string // Optional return date for round trip
  passengers?: number // Number of passengers (default: 1)
  class?: 'economy' | 'business' | 'first' // Travel class (default: economy)
}

export interface FlightOption {
  airline: string
  flight_number: string
  departure_time: string
  arrival_time: string
  duration: string
  price: number
  currency: string
  stops: number
  aircraft: string
  departure_airport: string
  arrival_airport: string
}

export interface FlightsResponse {
  origin: string
  destination: string
  departure_date: string
  return_date?: string
  flights: FlightOption[]
  total_results: number
  search_timestamp: number
}

export async function searchFlights(
  requestData: FlightsRequest
): Promise<{ success: boolean; data: FlightsResponse; message: string }> {
  try {
    const {
      origin,
      destination,
      departure_date,
      return_date,
      passengers = 1,
      class: travelClass = 'economy'
    } = requestData

    // Check for flight search API credentials
    const AMADEUS_CLIENT_ID = Deno.env.get('AMADEUS_CLIENT_ID')
    const AMADEUS_CLIENT_SECRET = Deno.env.get('AMADEUS_CLIENT_SECRET')

    if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) {
      return {
        success: false,
        data: {} as FlightsResponse,
        message: "Flight search API credentials not configured. Please contact administrator to set up Amadeus API access."
      }
    }

    console.log(`🛩️ Searching flights from ${origin} to ${destination} on ${departure_date}`)

    // Get Amadeus access token
    const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_CLIENT_ID,
        client_secret: AMADEUS_CLIENT_SECRET
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Amadeus access token: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Search for flights using Amadeus API
    const searchParams = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departure_date,
      adults: passengers.toString(),
      travelClass: travelClass.toUpperCase(),
      max: '10'
    })

    if (return_date) {
      searchParams.append('returnDate', return_date)
    }

    const flightResponse = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!flightResponse.ok) {
      throw new Error(`Amadeus API error: ${flightResponse.status}`)
    }

    const flightData = await flightResponse.json()

    // Process Amadeus response into our format
    const flights: FlightOption[] = (flightData.data || []).map((offer: any) => {
      const itinerary = offer.itineraries[0]
      const segment = itinerary.segments[0]

      return {
        airline: segment.carrierCode,
        flight_number: `${segment.carrierCode}${segment.number}`,
        departure_time: new Date(segment.departure.at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        }),
        arrival_time: new Date(segment.arrival.at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        }),
        duration: itinerary.duration.replace('PT', '').toLowerCase(),
        price: parseFloat(offer.price.total),
        currency: offer.price.currency,
        stops: itinerary.segments.length - 1,
        aircraft: segment.aircraft?.code || 'Unknown',
        departure_airport: segment.departure.iataCode,
        arrival_airport: segment.arrival.iataCode
      }
    })

    const responseData: FlightsResponse = {
      origin,
      destination,
      departure_date,
      return_date,
      flights,
      total_results: flights.length,
      search_timestamp: Math.floor(Date.now() / 1000)
    }

    return {
      success: true,
      data: responseData,
      message: `Found ${flights.length} flights from ${origin} to ${destination} on ${departure_date}`
    }

  } catch (error) {
    console.error('🛩️ Flight search error:', error)
    return {
      success: false,
      data: {} as FlightsResponse,
      message: `Failed to search flights: ${(error as Error).message}`
    }
  }
}