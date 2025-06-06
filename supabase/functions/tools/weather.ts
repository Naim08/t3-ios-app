// Weather tool for function calling

export interface WeatherRequest {
  location: string
  units?: 'celsius' | 'fahrenheit'
}

export interface WeatherResponse {
  location: string
  current: {
    temperature: number
    condition: string
    humidity: number
    wind_speed: number
  }
  forecast?: Array<{
    date: string
    high: number
    low: number
    condition: string
  }>
}

export async function getWeatherData(location: string, units: string = 'celsius'): Promise<{ success: boolean; data: WeatherResponse; message: string }> {
  const API_KEY = Deno.env.get('WEATHER_API_KEY');
  
  if (!API_KEY) {
    return {
      success: false,
      data: {} as WeatherResponse,
      message: 'Weather API key not configured'
    };
  }

  try {
    // Fetch current weather and 3-day forecast from WeatherAPI.com
    const response = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: {} as WeatherResponse,
        message: `Weather API error: ${(errorData as { error?: { message?: string } }).error?.message || 'Unable to fetch weather data'}`
      };
    }

    const data = await response.json();
    
    // Convert WeatherAPI response to our format
    const weatherData: WeatherResponse = {
      location: `${data.location.name}, ${data.location.country}`,
      current: {
        temperature: units === 'celsius' ? data.current.temp_c : data.current.temp_f,
        condition: data.current.condition.text,
        humidity: data.current.humidity,
        wind_speed: units === 'celsius' ? data.current.wind_kph : data.current.wind_mph
      },
      forecast: data.forecast.forecastday.map((day: { 
        date: string; 
        day: { 
          maxtemp_c: number; 
          maxtemp_f: number; 
          mintemp_c: number; 
          mintemp_f: number; 
          condition: { text: string } 
        } 
      }) => ({
        date: day.date,
        high: units === 'celsius' ? day.day.maxtemp_c : day.day.maxtemp_f,
        low: units === 'celsius' ? day.day.mintemp_c : day.day.mintemp_f,
        condition: day.day.condition.text
      }))
    };

    return {
      success: true,
      data: weatherData,
      message: `Weather information for ${weatherData.location}`
    };

  } catch (error) {
    console.error('Weather API error:', error);
    return {
      success: false,
      data: {} as WeatherResponse,
      message: `Failed to fetch weather data: ${(error as Error).message}`
    };
  }
}