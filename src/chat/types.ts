export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  isStreaming?: boolean;
  toolResponse?: {
    type: string;
    data: any;
  };
  toolCalls?: {
    [toolName: string]: {
      called_at: string;
      success: boolean;
      data?: any;
    };
  };
}

export interface StreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ===== TRIP PLANNER INTERFACES =====

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

// Temporary mock messages
export const mockMessages: Message[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Hi! Ask me anything about React Native.',
    createdAt: '2025-05-23T15:00:00Z'
  },
  {
    id: 'm2',
    role: 'user',
    text: 'How do I optimize Hermes startup time?',
    createdAt: '2025-05-23T15:00:05Z'
  },
  {
    id: 'm3',
    role: 'assistant',
    text: `Here are some ways to optimize Hermes startup time:

## 1. Enable Hermes bytecode precompilation
- Use \`--bytecode\` flag when building
- This reduces JS parsing time

## 2. Optimize bundle size
\`\`\`javascript
// Use Metro bundler optimizations
module.exports = {
  transformer: {
    minifierConfig: {
      mangle: { toplevel: true },
      compress: { drop_console: true }
    }
  }
};
\`\`\`

## 3. Lazy load modules
Only import what you need when you need it.`,
    createdAt: '2025-05-23T15:00:10Z'
  },
  {
    id: 'm4',
    role: 'user',
    text: 'What about reducing memory usage?',
    createdAt: '2025-05-23T15:00:15Z'
  }
] as const;
