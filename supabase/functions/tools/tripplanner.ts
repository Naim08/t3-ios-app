// supabase/functions/tools/tripplanner.ts
// Trip Planner tool using Google Gemini and Maps APIs

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.7.0"

export interface TripPlannerRequest {
  destination?: string
  destinations?: string[]  // Array of destinations from the tool call
  trip_type?: 'day_trip' | 'weekend' | 'week' | 'custom'
  interests?: string[]
  start_date?: string
  end_date?: string
  budget?: 'budget' | 'moderate' | 'luxury'
  group_type?: 'solo' | 'couple' | 'family' | 'friends'
  travelers?: {
    adults?: number
    children?: number
  }
  // New fields for trip modification/replanning
  modification_type?: 'new_trip' | 'replace_activity' | 'replace_day' | 'add_activity' | 'modify_timing' | 'change_destination'
  existing_trip?: TripPlannerResponse  // Previous trip data for modifications
  modification_request?: string  // Specific modification instructions
  activity_to_replace?: string  // Name of activity to replace
  new_activity_preference?: string  // What to replace it with
  day_to_modify?: number  // Which day to modify (1-based)
}

// Use the interfaces from the frontend to ensure compatibility
export interface Location {
  name: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  description?: string;
  // Additional fields for the service
  time?: string;
  duration?: string;
  sequence?: number;
  category?: string;
}

export interface Activity {
  name: string;
  type: 'sightseeing' | 'adventure' | 'cultural' | 'entertainment' | 'dining' | 'shopping' | 'relaxation';
  duration: string;
  description: string;
  location: string;
  estimated_cost?: {
    amount: number;
    currency: string;
  };
  opening_hours?: string;
  rating?: number;
  booking_required?: boolean;
}

export interface WeatherInfo {
  date: string;
  temperature: {
    high: number;
    low: number;
    unit: string;
  };
  condition: string;
  humidity: number;
  precipitation_chance: number;
  wind_speed: number;
  uv_index?: number;
}

export interface Accommodation {
  name: string;
  type: 'hotel' | 'hostel' | 'apartment' | 'resort' | 'guesthouse';
  rating: number;
  price_per_night: {
    amount: number;
    currency: string;
  };
  amenities: string[];
  location: string;
  description: string;
  booking_url?: string;
  image_url?: string;
}

export interface Route {
  origin: Location;
  destination: Location;
  distance: string;
  estimated_travel_time: string;
  transportation_modes: Array<{
    mode: 'flight' | 'train' | 'bus' | 'car' | 'walking' | 'public_transit';
    duration: string;
    cost?: {
      amount: number;
      currency: string;
    };
    description: string;
  }>;
}

export interface DaySchedule {
  day: number;
  date: string;
  location: string;
  weather: WeatherInfo;
  activities: Activity[];
  meals: {
    breakfast?: Activity;
    lunch?: Activity;
    dinner?: Activity;
  };
  accommodation: Accommodation;
  notes?: string;
  estimated_daily_cost: {
    amount: number;
    currency: string;
  };
}

export interface FlightOption {
  airline: string;
  flight_number: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  stops: number;
  booking_url?: string;
}

export interface TripPlannerResponse {
  destinations: Location[];
  trip_summary: {
    duration_days: number;
    total_estimated_cost: {
      amount: number;
      currency: string;
      breakdown: {
        flights?: number;
        accommodations?: number;
        activities?: number;
        meals?: number;
        transportation?: number;
      };
    };
    best_time_to_visit: string;
    recommended_duration: string;
  };
  flights?: {
    outbound: FlightOption[];
    return?: FlightOption[];
    internal?: FlightOption[];
  };
  weather_forecast?: WeatherInfo[];
  accommodations?: Accommodation[];
  routes?: Route[];
  daily_itinerary?: DaySchedule[];
  travel_tips: string[];
  packing_suggestions: string[];
  local_customs?: string[];
  emergency_info?: {
    emergency_number: string;
    embassy_info?: string;
    travel_advisories?: string[];
  };
}

// Function declaration for extracting location data using Google AI.
const locationFunctionDeclaration = {
  name: 'location',
  parameters: {
    type: 'object',
    description: 'Geographic coordinates of a location for a day plan.',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the location.',
      },
      description: {
        type: 'string',
        description:
          'Description of the location: why is it relevant, details to know for the visit.',
      },
      lat: {
        type: 'string',
        description: 'Latitude of the location.',
      },
      lng: {
        type: 'string',
        description: 'Longitude of the location.',
      },
      time: {
        type: 'string',
        description:
          'Time of day to visit this location (e.g., "09:00", "14:30").',
      },
      duration: {
        type: 'string',
        description:
          'Suggested duration of stay at this location (e.g., "1 hour", "45 minutes").',
      },
      sequence: {
        type: 'number',
        description: 'Order in the day itinerary (1 = first stop of the day).',
      },
    },
    required: ['name', 'description', 'lat', 'lng', 'time', 'duration', 'sequence'],
  },
};

// Function declaration for extracting route/line data using Google AI.
const lineFunctionDeclaration = {
  name: 'line',
  parameters: {
    type: 'object',
    description: 'Connection between a start location and an end location for a day plan.',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the route or connection (e.g., "Travel to [Next Location]").',
      },
      start: {
        type: 'object',
        description: 'Start location of the route',
        properties: {
          lat: {
            type: 'string',
            description: 'Latitude of the start location.',
          },
          lng: {
            type: 'string',
            description: 'Longitude of the start location.',
          },
        },
         required: ['lat', 'lng'],
      },
      end: {
        type: 'object',
        description: 'End location of the route',
        properties: {
          lat: {
            type: 'string',
            description: 'Latitude of the end location.',
          },
          lng: {
            type: 'string',
            description: 'Longitude of the end location.',
          },
        },
        required: ['lat', 'lng'],
      },
      transport: {
        type: 'string',
        description:
          'Mode of transportation between locations (e.g., "walking", "driving", "public transit").',
      },
      travelTime: {
        type: 'string',
        description:
          'Estimated travel time between locations (e.g., "15 minutes", "1 hour").',
      },
    },
    required: ['name', 'start', 'end', 'transport', 'travelTime'],
  },
};

const SYSTEM_PROMPT = `You are an expert travel planner that creates comprehensive, detailed trip itineraries. Your goal is to provide COMPLETE, ready-to-execute travel plans that require NO follow-up questions or additional information.

**CORE PRINCIPLES:**
1. NEVER ask for clarification or additional information
2. ALWAYS create a complete, actionable itinerary using available information
3. Make reasonable assumptions when details are missing
4. Provide specific times, locations, and activities for every part of the trip
5. Support both new trip planning and modification of existing plans

**TRIP PLANNING CAPABILITIES:**

**New Trip Creation:**
- Create detailed itineraries with specific times and realistic durations
- Start days between 8:00-9:00 AM and end by 9:00-10:00 PM
- Include meal breaks (breakfast, lunch, dinner) with specific restaurant recommendations
- Account for realistic travel times between all locations
- Provide accurate GPS coordinates for every location
- Consider user interests, budget, and group type in all recommendations
- Trip duration guidelines:
  * Day trips: 4-6 major stops with 3 meal breaks
  * Weekend trips: 6-8 stops per day with proper pacing
  * Week-long trips: 5-7 stops per day with rest periods

**Trip Modification & Replanning:**
- Recognize when user wants to modify an existing trip plan
- Replace specific activities, locations, or entire days as requested
- Maintain overall trip structure while implementing changes
- Adjust timing and logistics when modifications are made
- Keep unchanged elements intact when only partial updates are requested

**MANDATORY OUTPUT REQUIREMENTS:**

You MUST use the "location" and "line" functions for EVERY itinerary:

**Location Function Usage:**
- Call "location" function for EVERY stop in the itinerary
- Include ALL required properties: name, description, lat, lng, time, duration, sequence
- Provide 2-3 sentence descriptions that explain why each location is worth visiting
- Use precise coordinates (not approximations)
- Specify exact visit times in 24h format (e.g., "09:00", "14:30")
- Give realistic durations (e.g., "1.5 hours", "45 minutes")
- Number locations sequentially throughout the entire trip

**Line Function Usage:**
- Call "line" function to connect ALL sequential stops
- Include ALL required properties: name, start, end, transport, travelTime
- Specify appropriate transportation (walking, driving, public transit, taxi)
- Provide realistic travel times between locations
- Create logical routes that minimize backtracking

**DECISION-MAKING FRAMEWORK:**

When information is missing, make intelligent defaults:
- No destination specified: Choose a popular city relevant to user's context
- Vague interests ("fun", "explore"): Select diverse activities including culture, food, sightseeing
- No budget specified: Assume moderate budget with mix of free and paid activities
- No dates: Plan for optimal weather season for the destination
- No group type: Assume solo traveler but include options suitable for various group sizes

**CRITICAL REQUIREMENTS:**
- Generate a COMPLETE itinerary in every response
- Use function calls for ALL locations and routes
- Never request additional information
- Make the plan immediately actionable
- Include practical details (opening hours, booking requirements, costs)
- Ensure geographical and temporal logic in the sequence

Your response should be a fully-formed travel plan that someone could follow immediately without any additional planning required.`

export async function createTripPlan(request: TripPlannerRequest): Promise<{ success: boolean; data: TripPlannerResponse; message: string }> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      data: {} as TripPlannerResponse,
      message: 'Gemini API key not configured'
    }
  }

  try {
    // Validate required parameters
    if (!request.destination || request.destination.trim() === '') {
      // If no destination provided, default to a popular city based on the request
      if (request.destinations && request.destinations.length > 0) {
        request.destination = request.destinations[0]
      } else {
        return {
          success: false,
          data: {} as TripPlannerResponse,
          message: 'Destination is required for trip planning'
        }
      }
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" })

    // Build the prompt based on modification type
    const interests = request.interests?.join(', ') || 'general sightseeing'
    
    // Detect if this is a modification request
    const isModification = request.modification_type && request.modification_type !== 'new_trip'
    const hasExistingTrip = request.existing_trip && request.existing_trip.destinations?.length > 0
    
    // Calculate trip duration
    let tripDuration = 'custom duration'
    if (request.start_date && request.end_date) {
      const start = new Date(request.start_date)
      const end = new Date(request.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      tripDuration = days === 1 ? '1 day' : `${days} days`
      request.trip_type = days === 1 ? 'day_trip' : days <= 3 ? 'weekend' : 'week'
    } else if (request.trip_type) {
      tripDuration = request.trip_type === 'day_trip' ? '1 day' : 
                      request.trip_type === 'weekend' ? '2-3 days' :
                      request.trip_type === 'week' ? '7 days' : 'custom duration'
    }
    
    let prompt: string
    
    if (isModification && hasExistingTrip) {
      // Handle trip modifications
      prompt = `MODIFY an existing ${tripDuration} trip itinerary for ${request.destination}.

**MODIFICATION REQUEST:** ${request.modification_request || 'Update the trip as requested'}

**EXISTING TRIP DETAILS:**
${request.existing_trip.destinations.map(dest => `- ${dest.name}: ${dest.description}`).join('\n')}

**MODIFICATION TYPE:** ${request.modification_type}
${request.activity_to_replace ? `**ACTIVITY TO REPLACE:** ${request.activity_to_replace}` : ''}
${request.new_activity_preference ? `**NEW ACTIVITY PREFERENCE:** ${request.new_activity_preference}` : ''}
${request.day_to_modify ? `**DAY TO MODIFY:** Day ${request.day_to_modify}` : ''}

**USER REQUIREMENTS:**
- Interests: ${interests}
- Budget: ${request.budget || 'moderate'} 
- Travel group: ${request.group_type || 'solo'}${request.travelers ? `\n- Travelers: ${request.travelers.adults || 1} adults${request.travelers.children ? `, ${request.travelers.children} children` : ''}` : ''}

**MODIFICATION INSTRUCTIONS:**

1. **KEEP UNCHANGED**: Preserve all parts of the original itinerary that are NOT being modified
2. **IMPLEMENT CHANGES**: Make the specific requested modifications while maintaining trip flow
3. **ADJUST LOGISTICS**: Update timing and transportation as needed due to changes
4. **MAINTAIN QUALITY**: Ensure modifications enhance rather than compromise the trip

**REQUIRED OUTPUT:**
- Provide the COMPLETE modified itinerary using function calls
- Include both changed and unchanged elements in the output
- Ensure all timing and logistics work with the modifications
- Maintain the overall trip structure and flow`
    } else {
      // Handle new trip creation
      prompt = `Create a COMPLETE, ready-to-execute ${tripDuration} trip itinerary for ${request.destination}.

**USER REQUIREMENTS:**
- Destination: ${request.destination}
- Interests: ${interests}
- Budget: ${request.budget || 'moderate'} 
- Travel group: ${request.group_type || 'solo'}${request.travelers ? `\n- Travelers: ${request.travelers.adults || 1} adults${request.travelers.children ? `, ${request.travelers.children} children` : ''}` : ''}
${request.start_date ? `- Start date: ${request.start_date}` : '- Start date: Use optimal season for destination'}${request.end_date ? `\n- End date: ${request.end_date}` : ''}

**MANDATORY DELIVERABLES:**

1. **COMPLETE ITINERARY**: Create a full day-by-day plan with NO gaps or missing information
2. **SPECIFIC TIMING**: Exact times for every activity, meal, and transition
3. **PRACTICAL DETAILS**: Include opening hours, estimated costs, booking requirements
4. **LOGICAL FLOW**: Ensure activities are geographically and temporally sensible
5. **COMPREHENSIVE COVERAGE**: Include sightseeing, dining, cultural experiences, and rest periods`
    }
    
    // Common requirements for both new trips and modifications
    prompt += `

**CRITICAL INSTRUCTIONS:**

✅ DO: Create a complete, actionable plan using function calls
✅ DO: Make reasonable assumptions for any missing information  
✅ DO: Include specific restaurants, attractions, and activities with exact coordinates
✅ DO: Plan realistic travel times and transportation between all locations
✅ DO: Provide meal recommendations integrated into the daily schedule

❌ DON'T: Ask for clarification or additional information
❌ DON'T: Leave any time periods unplanned
❌ DON'T: Provide vague or incomplete location information

**FUNCTION CALL REQUIREMENTS:**

You MUST make multiple function calls:
- Call "location" function for EVERY single stop (attractions, restaurants, hotels)
- Call "line" function for EVERY route between consecutive locations
- Ensure all function parameters are complete and accurate
- Number locations sequentially across the entire trip (1, 2, 3... not restarting each day)

This should be a publication-quality itinerary that requires no additional planning or research.`

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + prompt }] }
      ],
      tools: [
        {
          functionDeclarations: [locationFunctionDeclaration, lineFunctionDeclaration]
        }
      ],
      generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })

    const response = await result.response
    
    // Extract function calls from the response
    const functionCalls = response.functionCalls()
     console.log('🔍 TRIPPLANNER DEBUG: Function calls received:',
  JSON.stringify(functionCalls, null, 2))
  console.log('🔍 TRIPPLANNER DEBUG: Function calls length:', functionCalls?.length ||
  0)

    // Process function calls to extract locations and lines
    const locations: Location[] = []
    const routes: Route[] = []
    
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === 'location') {
          const args = call.args
          locations.push({
            name: args.name,
            country: request.destination.includes(',') ? request.destination.split(',').pop()?.trim() || 'Unknown' : 
                     request.destination.toLowerCase().includes('central park') ? 'USA' :
                     request.destination.toLowerCase().includes('nyc') || request.destination.toLowerCase().includes('new york') ? 'USA' :
                     'Unknown',
            coordinates: {
              latitude: parseFloat(args.lat),
              longitude: parseFloat(args.lng),
            },
            description: args.description,
            time: args.time,
            duration: args.duration,
            sequence: args.sequence,
            category: 'attraction',
          })
        } else if (call.name === 'line') {
          const args = call.args
          // Find corresponding locations for start and end
          const startLoc = locations.find(loc => 
            Math.abs(loc.coordinates.latitude - parseFloat(args.start.lat)) < 0.001 &&
            Math.abs(loc.coordinates.longitude - parseFloat(args.start.lng)) < 0.001
          )
          const endLoc = locations.find(loc => 
            Math.abs(loc.coordinates.latitude - parseFloat(args.end.lat)) < 0.001 &&
            Math.abs(loc.coordinates.longitude - parseFloat(args.end.lng)) < 0.001
          )
          
          if (startLoc && endLoc) {
            routes.push({
              origin: startLoc,
              destination: endLoc,
              distance: '1 km', // Default distance
              estimated_travel_time: args.travelTime,
              transportation_modes: [{
                mode: args.transport as any,
                duration: args.travelTime,
                description: args.name,
              }],
            })
          }
        }
      }
    }
    
    // Sort locations by sequence
    locations.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    
    // If no function calls were made, fall back to text parsing
    if (locations.length === 0) {
      const text = response.text()
        console.log('🔍 TRIPPLANNER DEBUG: No function calls, raw text response:',
  text.substring(0, 500))
      
      // Try to parse as JSON if possible
      let aiData
      try {
        aiData = JSON.parse(text)
        // Process the old format if available
        if (aiData.locations) {
          aiData.locations.forEach((loc: any) => {
            locations.push({
              name: loc.name,
              country: loc.country || 'Unknown',
              coordinates: {
                latitude: loc.coordinates?.latitude || loc.lat || 0,
                longitude: loc.coordinates?.longitude || loc.lng || 0,
              },
              description: loc.description,
              time: loc.time,
              duration: loc.duration,
              sequence: loc.sequence,
              category: loc.category,
            })
          })
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', text)
        throw new Error('Invalid response format from AI')
      }
    }
    
    // If no routes provided, create basic routes between consecutive locations
    if (routes.length === 0 && locations.length > 1) {
      for (let i = 0; i < locations.length - 1; i++) {
        routes.push({
          origin: locations[i],
          destination: locations[i + 1],
          distance: '1 km', // Default distance
          estimated_travel_time: '10 minutes', // Default time
          transportation_modes: [{
            mode: 'walking',
            duration: '10 minutes',
            description: 'Walk between locations',
          }],
        });
      }
    }
    
    // Group locations by day for multi-day trips
    const dailyItinerary: DaySchedule[] = []
    
    if (request.trip_type === 'day_trip') {
      // For day trips, create activities from locations
      const activities: Activity[] = locations.map(loc => ({
        name: loc.name,
        type: (loc.category as Activity['type']) || 'sightseeing',
        duration: loc.duration || '1 hour',
        description: loc.description || '',
        location: loc.name,
      }));

      dailyItinerary.push({
        day: 1,
        date: request.start_date || new Date().toISOString().split('T')[0],
        location: request.destination,
        weather: {
          date: request.start_date || new Date().toISOString().split('T')[0],
          temperature: { high: 22, low: 15, unit: 'C' },
          condition: 'Partly cloudy',
          humidity: 60,
          precipitation_chance: 20,
          wind_speed: 10,
        },
        activities,
        meals: {},
        accommodation: {
          name: 'Local Accommodation',
          type: 'hotel',
          rating: 4,
          price_per_night: { amount: 100, currency: 'USD' },
          amenities: [],
          location: request.destination,
          description: 'Comfortable accommodation',
        },
        estimated_daily_cost: { amount: 150, currency: 'USD' },
      })
    } else {
      // Group locations by day based on sequence or time
      const locationsByDay = new Map<number, Location[]>()
      
      locations.forEach(loc => {
        const day = Math.ceil((loc.sequence || 1) / 6) // Assume ~6 stops per day
        if (!locationsByDay.has(day)) {
          locationsByDay.set(day, [])
        }
        locationsByDay.get(day)!.push(loc)
      })
      
      locationsByDay.forEach((locs, day) => {
        const activities: Activity[] = locs.map(loc => ({
          name: loc.name,
          type: (loc.category as Activity['type']) || 'sightseeing',
          duration: loc.duration || '1 hour',
          description: loc.description || '',
          location: loc.name,
        }));

        dailyItinerary.push({
          day,
          date: request.start_date ? addDays(request.start_date, day - 1) : new Date().toISOString().split('T')[0],
          location: request.destination,
          weather: {
            date: request.start_date ? addDays(request.start_date, day - 1) : new Date().toISOString().split('T')[0],
            temperature: { high: 22, low: 15, unit: 'C' },
            condition: 'Partly cloudy',
            humidity: 60,
            precipitation_chance: 20,
            wind_speed: 10,
          },
          activities,
          meals: {},
          accommodation: {
            name: `Day ${day} Accommodation`,
            type: 'hotel',
            rating: 4,
            price_per_night: { amount: 100, currency: 'USD' },
            amenities: [],
            location: request.destination,
            description: 'Comfortable accommodation',
          },
          estimated_daily_cost: { amount: 150, currency: 'USD' },
        })
      })
    }
    
    const tripPlan: TripPlannerResponse = {
      destinations: locations,
      trip_summary: {
        duration_days: dailyItinerary.length,
        total_estimated_cost: {
          amount: dailyItinerary.length * 150,
          currency: 'USD',
          breakdown: {
            accommodations: dailyItinerary.length * 100,
            meals: dailyItinerary.length * 50,
          },
        },
        best_time_to_visit: 'Year-round',
        recommended_duration: `${dailyItinerary.length} days`,
      },
      routes,
      daily_itinerary: dailyItinerary,
      travel_tips: ['Stay hydrated', 'Keep local currency handy', 'Respect local customs'],
      packing_suggestions: ['Comfortable walking shoes', 'Weather-appropriate clothing', 'Travel adapter'],
    }
     console.log('🔍 TRIPPLANNER DEBUG: Final locations count:', locations.length)
  console.log('🔍 TRIPPLANNER DEBUG: Final routes count:', routes.length)

    return {
      success: true,
      data: tripPlan,
      message: `Created ${tripDuration} itinerary for ${request.destination} with ${locations.length} locations`
    }

  } catch (error) {
    console.error('Trip planner error:', error)
    return {
      success: false,
      data: {} as TripPlannerResponse,
      message: `Failed to create trip plan: ${error.message}`
    }
  }
}

// Helper function to add days to a date
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}