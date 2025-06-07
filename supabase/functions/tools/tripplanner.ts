// Trip Planner tool for comprehensive travel planning
// Provides destination search, flight information, weather data, accommodations, and detailed itineraries

// ===== INTERFACES =====

export interface Location {
  name: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  description?: string;
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

export interface TripPlannerRequest {
  destinations: string[]; // Array of destination names
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
  departure_location?: string; // Origin city for flights
  budget?: {
    amount: number;
    currency: string;
    category: 'budget' | 'mid-range' | 'luxury';
  };
  travelers: {
    adults: number;
    children?: number;
  };
  preferences?: {
    accommodation_type?: 'hotel' | 'hostel' | 'apartment' | 'resort' | 'any';
    activity_types?: string[]; // e.g., ['cultural', 'adventure', 'relaxation']
    dietary_restrictions?: string[];
    accessibility_needs?: string[];
    interests?: string[]; // e.g., ['history', 'art', 'nature', 'nightlife']
  };
  trip_type?: 'leisure' | 'business' | 'adventure' | 'cultural' | 'romantic' | 'family';
  include_flights?: boolean;
  include_weather?: boolean;
  include_accommodations?: boolean;
  include_activities?: boolean;
  include_detailed_itinerary?: boolean;
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
    internal?: FlightOption[]; // For multi-destination trips
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

// ===== UTILITY FUNCTIONS =====

function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ===== DATA SOURCES =====

// Sample destination data (in a real implementation, this would come from APIs)
const DESTINATION_DATABASE = {
  "paris": {
    name: "Paris",
    country: "France",
    coordinates: { latitude: 48.8566, longitude: 2.3522 },
    timezone: "Europe/Paris",
    description: "The City of Light, famous for its art, fashion, gastronomy, and culture."
  },
  "tokyo": {
    name: "Tokyo",
    country: "Japan",
    coordinates: { latitude: 35.6762, longitude: 139.6503 },
    timezone: "Asia/Tokyo",
    description: "A vibrant metropolis blending traditional and modern culture."
  },
  "new york": {
    name: "New York",
    country: "United States",
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    timezone: "America/New_York",
    description: "The Big Apple, a global hub for business, arts, and culture."
  },
  "london": {
    name: "London",
    country: "United Kingdom",
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
    timezone: "Europe/London",
    description: "Historic capital with world-class museums, theaters, and royal palaces."
  },
  "bali": {
    name: "Bali",
    country: "Indonesia",
    coordinates: { latitude: -8.3405, longitude: 115.0920 },
    timezone: "Asia/Makassar",
    description: "Tropical paradise known for beaches, temples, and spiritual culture."
  },
  "barcelona": {
    name: "Barcelona",
    country: "Spain",
    coordinates: { latitude: 41.3851, longitude: 2.1734 },
    timezone: "Europe/Madrid",
    description: "Artistic city famous for Gaudí's architecture and Mediterranean lifestyle."
  },
  "rome": {
    name: "Rome",
    country: "Italy",
    coordinates: { latitude: 41.9028, longitude: 12.4964 },
    timezone: "Europe/Rome",
    description: "The Eternal City, rich in ancient history and Italian culture."
  },
  "sydney": {
    name: "Sydney",
    country: "Australia",
    coordinates: { latitude: -33.8688, longitude: 151.2093 },
    timezone: "Australia/Sydney",
    description: "Harbor city known for its Opera House, beaches, and laid-back lifestyle."
  }
};

const SAMPLE_ACCOMMODATIONS = {
  budget: [
    {
      name: "Cozy Downtown Hostel",
      type: "hostel" as const,
      rating: 4.2,
      price_per_night: { amount: 35, currency: "USD" },
      amenities: ["Free WiFi", "Shared Kitchen", "Laundry", "24/7 Reception"],
      location: "City Center",
      description: "Clean and safe hostel in the heart of the city with friendly staff."
    },
    {
      name: "Budget Inn Express",
      type: "hotel" as const,
      rating: 3.8,
      price_per_night: { amount: 65, currency: "USD" },
      amenities: ["Free WiFi", "Continental Breakfast", "Parking"],
      location: "Near Public Transport",
      description: "Comfortable budget hotel with basic amenities and good location."
    }
  ],
  "mid-range": [
    {
      name: "Grand City Hotel",
      type: "hotel" as const,
      rating: 4.5,
      price_per_night: { amount: 150, currency: "USD" },
      amenities: ["Free WiFi", "Fitness Center", "Restaurant", "Room Service", "Concierge"],
      location: "Downtown",
      description: "Modern hotel with excellent service and prime location."
    },
    {
      name: "Boutique Suites",
      type: "apartment" as const,
      rating: 4.6,
      price_per_night: { amount: 120, currency: "USD" },
      amenities: ["Full Kitchen", "Free WiFi", "Washer/Dryer", "Balcony"],
      location: "Trendy Neighborhood",
      description: "Stylish apartment suites with home-like comfort."
    }
  ],
  luxury: [
    {
      name: "Royal Palace Hotel",
      type: "hotel" as const,
      rating: 4.9,
      price_per_night: { amount: 400, currency: "USD" },
      amenities: ["Spa", "Fine Dining", "Butler Service", "Pool", "Valet Parking", "Gym"],
      location: "Premium District",
      description: "Luxury hotel offering exceptional service and world-class amenities."
    },
    {
      name: "Executive Resort & Spa",
      type: "resort" as const,
      rating: 4.8,
      price_per_night: { amount: 350, currency: "USD" },
      amenities: ["Multiple Pools", "Spa", "Golf Course", "Multiple Restaurants", "Private Beach"],
      location: "Exclusive Area",
      description: "Luxury resort with comprehensive facilities and premium location."
    }
  ]
};

const SAMPLE_ACTIVITIES = {
  sightseeing: [
    {
      name: "Historic City Walking Tour",
      type: "sightseeing" as const,
      duration: "3 hours",
      description: "Guided tour of the city's most important historical landmarks and monuments.",
      location: "City Center",
      estimated_cost: { amount: 25, currency: "USD" },
      rating: 4.7
    },
    {
      name: "Famous Museum Visit",
      type: "cultural" as const,
      duration: "2-3 hours",
      description: "Explore world-renowned art and cultural artifacts.",
      location: "Museum District",
      estimated_cost: { amount: 18, currency: "USD" },
      opening_hours: "9:00 AM - 6:00 PM"
    }
  ],
  adventure: [
    {
      name: "Mountain Hiking Adventure",
      type: "adventure" as const,
      duration: "6 hours",
      description: "Challenging hike with spectacular views and nature photography opportunities.",
      location: "Mountain Region",
      estimated_cost: { amount: 45, currency: "USD" },
      rating: 4.8
    },
    {
      name: "Water Sports Experience",
      type: "adventure" as const,
      duration: "4 hours",
      description: "Kayaking, snorkeling, or surfing depending on location.",
      location: "Coastal Area",
      estimated_cost: { amount: 75, currency: "USD" }
    }
  ],
  cultural: [
    {
      name: "Traditional Cooking Class",
      type: "cultural" as const,
      duration: "4 hours",
      description: "Learn to prepare authentic local dishes with a professional chef.",
      location: "Culinary School",
      estimated_cost: { amount: 80, currency: "USD" },
      booking_required: true
    },
    {
      name: "Local Market Tour",
      type: "cultural" as const,
      duration: "2 hours",
      description: "Explore bustling local markets and taste regional specialties.",
      location: "Market District",
      estimated_cost: { amount: 15, currency: "USD" }
    }
  ],
  dining: [
    {
      name: "Fine Dining Experience",
      type: "dining" as const,
      duration: "2 hours",
      description: "Michelin-starred restaurant featuring innovative local cuisine.",
      location: "Upscale District",
      estimated_cost: { amount: 120, currency: "USD" },
      booking_required: true
    },
    {
      name: "Street Food Tour",
      type: "dining" as const,
      duration: "3 hours",
      description: "Sample the best local street food from various vendors.",
      location: "Food District",
      estimated_cost: { amount: 30, currency: "USD" }
    }
  ]
};

// ===== MOCK DATA GENERATORS =====

function generateMockFlights(origin: string, destination: string, date: string): FlightOption[] {
  const airlines = ["Delta", "United", "American", "Lufthansa", "Emirates", "British Airways"];
  const airports = {
    "New York": "JFK",
    "Paris": "CDG",
    "London": "LHR",
    "Tokyo": "NRT",
    "Rome": "FCO",
    "Barcelona": "BCN",
    "Sydney": "SYD",
    "Bali": "DPS"
  };

  return [
    {
      airline: getRandomElements(airlines, 1)[0],
      flight_number: `${getRandomElements(["AA", "DL", "UA", "LH", "EK"], 1)[0]}${Math.floor(Math.random() * 9999)}`,
      departure: {
        airport: airports[origin as keyof typeof airports] || "XXX",
        time: "10:30 AM",
        date: date
      },
      arrival: {
        airport: airports[destination as keyof typeof airports] || "YYY",
        time: "2:45 PM",
        date: date
      },
      duration: "8h 15m",
      price: { amount: 450 + Math.floor(Math.random() * 800), currency: "USD" },
      stops: Math.floor(Math.random() * 2)
    },
    {
      airline: getRandomElements(airlines, 1)[0],
      flight_number: `${getRandomElements(["AA", "DL", "UA", "LH", "EK"], 1)[0]}${Math.floor(Math.random() * 9999)}`,
      departure: {
        airport: airports[origin as keyof typeof airports] || "XXX",
        time: "6:15 PM",
        date: date
      },
      arrival: {
        airport: airports[destination as keyof typeof airports] || "YYY",
        time: "11:30 AM",
        date: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      duration: "12h 15m",
      price: { amount: 380 + Math.floor(Math.random() * 600), currency: "USD" },
      stops: 1
    }
  ];
}

function generateMockWeather(startDate: string, endDate: string): WeatherInfo[] {
  const days = calculateDaysBetween(startDate, endDate);
  const weather: WeatherInfo[] = [];
  const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear"];

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    weather.push({
      date: date.toISOString().split('T')[0],
      temperature: {
        high: 18 + Math.floor(Math.random() * 15),
        low: 8 + Math.floor(Math.random() * 10),
        unit: "°C"
      },
      condition: getRandomElements(conditions, 1)[0],
      humidity: 40 + Math.floor(Math.random() * 40),
      precipitation_chance: Math.floor(Math.random() * 30),
      wind_speed: 5 + Math.floor(Math.random() * 15),
      uv_index: 3 + Math.floor(Math.random() * 8)
    });
  }

  return weather;
}

function generateRoute(origin: string, destination: string): Route {
  const originData = DESTINATION_DATABASE[origin.toLowerCase() as keyof typeof DESTINATION_DATABASE];
  const destData = DESTINATION_DATABASE[destination.toLowerCase() as keyof typeof DESTINATION_DATABASE];

  if (!originData || !destData) {
    throw new Error(`Unable to find location data for ${origin} or ${destination}`);
  }

  return {
    origin: originData,
    destination: destData,
    distance: "2,850 km",
    estimated_travel_time: "8-12 hours",
    transportation_modes: [
      {
        mode: "flight",
        duration: "8h 30m",
        cost: { amount: 650, currency: "USD" },
        description: "Direct flight or with 1 connection"
      },
      {
        mode: "train",
        duration: "12-15 hours",
        cost: { amount: 180, currency: "USD" },
        description: "High-speed rail where available"
      },
      {
        mode: "bus",
        duration: "18-24 hours",
        cost: { amount: 85, currency: "USD" },
        description: "Budget option with multiple stops"
      }
    ]
  };
}

// ===== MAIN FUNCTION =====

export async function planTrip(request: TripPlannerRequest): Promise<{ success: boolean; data: TripPlannerResponse; message: string }> {
  try {
    console.log('🧳 TRIP PLANNER: Processing request:', JSON.stringify(request, null, 2));

    // Validate required fields
    if (!request.destinations || request.destinations.length === 0) {
      throw new Error("At least one destination is required");
    }

    if (!request.start_date || !request.end_date) {
      throw new Error("Start date and end date are required");
    }

    // Parse and validate dates
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    
    if (startDate >= endDate) {
      throw new Error("End date must be after start date");
    }

    if (startDate < new Date()) {
      throw new Error("Start date cannot be in the past");
    }

    const tripDays = calculateDaysBetween(request.start_date, request.end_date);

    // Process destinations
    const destinations: Location[] = [];
    for (const destName of request.destinations) {
      const destData = DESTINATION_DATABASE[destName.toLowerCase() as keyof typeof DESTINATION_DATABASE];
      if (destData) {
        destinations.push(destData);
      } else {
        // For unknown destinations, create a basic entry
        destinations.push({
          name: destName,
          country: "Unknown",
          coordinates: { latitude: 0, longitude: 0 },
          description: `Information about ${destName} will be provided upon booking.`
        });
      }
    }

    // Determine budget category
    const budgetCategory = request.budget?.category || 'mid-range';
    const dailyBudget = request.budget?.amount ? request.budget.amount / tripDays : 150;

    // Generate flight options if requested
    let flights: TripPlannerResponse['flights'] | undefined;
    if (request.include_flights && request.departure_location) {
      flights = {
        outbound: generateMockFlights(request.departure_location, destinations[0].name, request.start_date)
      };
      
      if (destinations.length === 1) {
        flights.return = generateMockFlights(destinations[0].name, request.departure_location, request.end_date);
      } else {
        flights.internal = [];
        for (let i = 0; i < destinations.length - 1; i++) {
          const segmentDate = new Date(startDate);
          segmentDate.setDate(segmentDate.getDate() + (i + 1) * Math.floor(tripDays / destinations.length));
          flights.internal.push(...generateMockFlights(
            destinations[i].name, 
            destinations[i + 1].name, 
            segmentDate.toISOString().split('T')[0]
          ));
        }
        flights.return = generateMockFlights(
          destinations[destinations.length - 1].name, 
          request.departure_location, 
          request.end_date
        );
      }
    }

    // Generate weather forecast if requested
    let weatherForecast: WeatherInfo[] | undefined;
    if (request.include_weather) {
      weatherForecast = generateMockWeather(request.start_date, request.end_date);
    }

    // Generate accommodations if requested
    let accommodations: Accommodation[] | undefined;
    if (request.include_accommodations) {
      const accommodationType = budgetCategory;
      accommodations = getRandomElements(SAMPLE_ACCOMMODATIONS[accommodationType], 3);
    }

    // Generate routes between destinations
    let routes: Route[] | undefined;
    if (destinations.length > 1) {
      routes = [];
      for (let i = 0; i < destinations.length - 1; i++) {
        try {
          routes.push(generateRoute(destinations[i].name, destinations[i + 1].name));
        } catch (error) {
          console.warn(`Could not generate route between ${destinations[i].name} and ${destinations[i + 1].name}`);
        }
      }
    }

    // Generate detailed itinerary if requested
    let dailyItinerary: DaySchedule[] | undefined;
    if (request.include_detailed_itinerary) {
      dailyItinerary = [];
      const daysPerDestination = Math.ceil(tripDays / destinations.length);
      
      for (let day = 0; day < tripDays; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);
        
        const destinationIndex = Math.floor(day / daysPerDestination);
        const currentDestination = destinations[Math.min(destinationIndex, destinations.length - 1)];
        
        // Select activities based on preferences
        const activityTypes = request.preferences?.activity_types || ['sightseeing', 'cultural', 'dining'];
        const dayActivities: Activity[] = [];
        
        for (const actType of activityTypes.slice(0, 3)) {
          const availableActivities = SAMPLE_ACTIVITIES[actType as keyof typeof SAMPLE_ACTIVITIES];
          if (availableActivities) {
            dayActivities.push(...getRandomElements(availableActivities, 1));
          }
        }

        const dayWeather = weatherForecast?.find(w => w.date === currentDate.toISOString().split('T')[0]) || {
          date: currentDate.toISOString().split('T')[0],
          temperature: { high: 22, low: 15, unit: "°C" },
          condition: "Pleasant",
          humidity: 60,
          precipitation_chance: 10,
          wind_speed: 8
        };

        const dayAccommodation = accommodations?.[0] || SAMPLE_ACCOMMODATIONS[budgetCategory][0];

        dailyItinerary.push({
          day: day + 1,
          date: currentDate.toISOString().split('T')[0],
          location: currentDestination.name,
          weather: dayWeather,
          activities: dayActivities,
          meals: {
            breakfast: getRandomElements(SAMPLE_ACTIVITIES.dining, 1)[0],
            lunch: getRandomElements(SAMPLE_ACTIVITIES.dining, 1)[0],
            dinner: getRandomElements(SAMPLE_ACTIVITIES.dining, 1)[0]
          },
          accommodation: dayAccommodation,
          estimated_daily_cost: {
            amount: dailyBudget,
            currency: request.budget?.currency || "USD"
          }
        });
      }
    }

    // Calculate total estimated cost
    const costBreakdown = {
      flights: flights ? (flights.outbound[0]?.price.amount || 0) + (flights.return?.[0]?.price.amount || 0) : 0,
      accommodations: accommodations ? accommodations[0].price_per_night.amount * tripDays : 0,
      activities: dailyItinerary ? 
        dailyItinerary.reduce((sum, day) => 
          sum + day.activities.reduce((actSum, act) => actSum + (act.estimated_cost?.amount || 0), 0), 0
        ) : 0,
      meals: tripDays * 60, // Estimated $60 per day for meals
      transportation: routes ? routes.length * 50 : 0 // Local transportation
    };

    const totalCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);

    // Generate travel tips based on destinations and preferences
    const travelTips = [
      "Pack comfortable walking shoes for city exploration",
      "Check visa requirements and ensure your passport is valid",
      "Notify your bank of international travel plans",
      "Download offline maps and translation apps",
      "Research local customs and tipping practices",
      "Keep digital and physical copies of important documents",
      "Check weather forecasts and pack accordingly"
    ];

    if (request.trip_type === 'adventure') {
      travelTips.push("Bring appropriate gear for outdoor activities", "Consider travel insurance for adventure sports");
    }

    if (request.travelers.children && request.travelers.children > 0) {
      travelTips.push("Pack entertainment for children during travel", "Research child-friendly activities and restaurants");
    }

    // Generate packing suggestions
    const packingSuggestions = [
      "Universal power adapter",
      "Portable charger and charging cables",
      "Basic first aid kit",
      "Comfortable walking shoes",
      "Weather-appropriate clothing",
      "Camera or smartphone for photos",
      "Sunscreen and sunglasses",
      "Reusable water bottle"
    ];

    if (weatherForecast?.some(w => w.condition.includes("Rain"))) {
      packingSuggestions.push("Umbrella or rain jacket");
    }

    // Build the response
    const response: TripPlannerResponse = {
      destinations,
      trip_summary: {
        duration_days: tripDays,
        total_estimated_cost: {
          amount: totalCost,
          currency: request.budget?.currency || "USD",
          breakdown: costBreakdown
        },
        best_time_to_visit: "Spring and Fall typically offer the best weather and fewer crowds",
        recommended_duration: `${Math.max(3, Math.min(tripDays, 14))} days would be ideal for this itinerary`
      },
      flights,
      weather_forecast: weatherForecast,
      accommodations,
      routes,
      daily_itinerary: dailyItinerary,
      travel_tips: getRandomElements(travelTips, 6),
      packing_suggestions: getRandomElements(packingSuggestions, 8),
      local_customs: [
        "Research local tipping customs and practices",
        "Learn basic phrases in the local language",
        "Respect dress codes at religious or cultural sites",
        "Be aware of local dining etiquette"
      ],
      emergency_info: {
        emergency_number: "Local emergency services: 112 (Europe) or 911 (North America)",
        travel_advisories: ["Check current travel advisories before departure"]
      }
    };

    return {
      success: true,
      data: response,
      message: `Complete trip plan generated for ${destinations.map(d => d.name).join(", ")} from ${request.start_date} to ${request.end_date}`
    };

  } catch (error) {
    console.error('Trip Planner error:', error);
    return {
      success: false,
      data: {} as TripPlannerResponse,
      message: `Failed to generate trip plan: ${(error as Error).message}`
    };
  }
}
