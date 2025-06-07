// Convert tool for currency and unit conversions

export interface ConvertRequest {
  amount: number
  from: string
  to: string
  type: 'currency' | 'unit'
}

export interface ConvertResponse {
  original_amount: number
  original_unit: string
  converted_amount: number
  converted_unit: string
  conversion_rate: number
  conversion_type: string
  timestamp?: string
}

export async function convertUnits(
  amount: number,
  from: string,
  to: string,
  type: string = 'currency'
): Promise<{ success: boolean; data: ConvertResponse; message: string }> {
  
  try {
    if (type === 'currency') {
      return await convertCurrency(amount, from, to)
    } else {
      return await convertUnitMeasurement(amount, from, to)
    }
  } catch (error) {
    console.error('Conversion error:', error)
    return {
      success: false,
      data: {} as ConvertResponse,
      message: `Failed to convert ${amount} ${from} to ${to}: ${(error as Error).message}`
    }
  }
}

async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{ success: boolean; data: ConvertResponse; message: string }> {
  try {
    // Use Frankfurter API (free, no API key required)
    const fromCurrency = from.toUpperCase()
    const toCurrency = to.toUpperCase()
    
    const url = `https://api.frankfurter.app/latest?base=${fromCurrency}&symbols=${toCurrency}`
    
    console.log(`💱 Calling Frankfurter API: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Frankfurter API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error(`Currency conversion not available for ${fromCurrency} to ${toCurrency}`)
    }

    const exchangeRate = data.rates[toCurrency]
    const convertedAmount = amount * exchangeRate

    const convertResponse: ConvertResponse = {
      original_amount: amount,
      original_unit: fromCurrency,
      converted_amount: Math.round(convertedAmount * 100) / 100,
      converted_unit: toCurrency,
      conversion_rate: Math.round(exchangeRate * 1000000) / 1000000,
      conversion_type: 'currency',
      timestamp: data.date
    }

    return {
      success: true,
      data: convertResponse,
      message: `${amount} ${fromCurrency} = ${convertResponse.converted_amount} ${toCurrency} (Rate: ${exchangeRate})`
    }

  } catch (error) {
    console.error('Currency conversion error:', error)
    return {
      success: false,
      data: {} as ConvertResponse,
      message: `Failed to convert currency: ${(error as Error).message}`
    }
  }
}

async function convertUnitMeasurement(
  amount: number,
  from: string,
  to: string
): Promise<{ success: boolean; data: ConvertResponse; message: string }> {
  
  const fromUnit = from.toLowerCase()
  const toUnit = to.toLowerCase()
  
  // Define conversion factors to base units
  const conversions: Record<string, Record<string, number>> = {
    // Length conversions (to meters)
    length: {
      'm': 1,
      'meter': 1,
      'meters': 1,
      'cm': 0.01,
      'centimeter': 0.01,
      'centimeters': 0.01,
      'mm': 0.001,
      'millimeter': 0.001,
      'millimeters': 0.001,
      'km': 1000,
      'kilometer': 1000,
      'kilometers': 1000,
      'in': 0.0254,
      'inch': 0.0254,
      'inches': 0.0254,
      'ft': 0.3048,
      'foot': 0.3048,
      'feet': 0.3048,
      'yd': 0.9144,
      'yard': 0.9144,
      'yards': 0.9144,
      'mi': 1609.344,
      'mile': 1609.344,
      'miles': 1609.344
    },
    // Weight conversions (to grams)
    weight: {
      'g': 1,
      'gram': 1,
      'grams': 1,
      'kg': 1000,
      'kilogram': 1000,
      'kilograms': 1000,
      'mg': 0.001,
      'milligram': 0.001,
      'milligrams': 0.001,
      'oz': 28.3495,
      'ounce': 28.3495,
      'ounces': 28.3495,
      'lb': 453.592,
      'pound': 453.592,
      'pounds': 453.592,
      'lbs': 453.592
    },
    // Temperature conversions (special case)
    temperature: {
      'celsius': 'celsius',
      'c': 'celsius',
      'fahrenheit': 'fahrenheit', 
      'f': 'fahrenheit',
      'kelvin': 'kelvin',
      'k': 'kelvin'
    },
    // Volume conversions (to liters)
    volume: {
      'l': 1,
      'liter': 1,
      'liters': 1,
      'ml': 0.001,
      'milliliter': 0.001,
      'milliliters': 0.001,
      'gal': 3.78541,
      'gallon': 3.78541,
      'gallons': 3.78541,
      'qt': 0.946353,
      'quart': 0.946353,
      'quarts': 0.946353,
      'pt': 0.473176,
      'pint': 0.473176,
      'pints': 0.473176,
      'cup': 0.236588,
      'cups': 0.236588,
      'floz': 0.0295735,
      'fl oz': 0.0295735,
      'fluid ounce': 0.0295735,
      'fluid ounces': 0.0295735
    }
  }

  // Determine conversion category
  let category = ''
  let fromFactor = 0
  let toFactor = 0

  for (const [cat, units] of Object.entries(conversions)) {
    if (cat === 'temperature') continue // Handle separately
    
    if (units[fromUnit] !== undefined && units[toUnit] !== undefined) {
      category = cat
      fromFactor = units[fromUnit]
      toFactor = units[toUnit]
      break
    }
  }

  if (category === '') {
    // Check for temperature conversions
    const tempFrom = conversions.temperature[fromUnit]
    const tempTo = conversions.temperature[toUnit]
    
    if (tempFrom && tempTo) {
      const convertedAmount = convertTemperature(amount, tempFrom, tempTo)
      
      const convertResponse: ConvertResponse = {
        original_amount: amount,
        original_unit: from,
        converted_amount: Math.round(convertedAmount * 100) / 100,
        converted_unit: to,
        conversion_rate: convertedAmount / amount,
        conversion_type: 'temperature'
      }

      return {
        success: true,
        data: convertResponse,
        message: `${amount}°${from.toUpperCase()} = ${convertResponse.converted_amount}°${to.toUpperCase()}`
      }
    }
    
    return {
      success: false,
      data: {} as ConvertResponse,
      message: `Unsupported unit conversion: ${from} to ${to}`
    }
  }

  // Convert using base unit
  const baseValue = amount * fromFactor
  const convertedAmount = baseValue / toFactor
  
  const convertResponse: ConvertResponse = {
    original_amount: amount,
    original_unit: from,
    converted_amount: Math.round(convertedAmount * 100000) / 100000,
    converted_unit: to,
    conversion_rate: fromFactor / toFactor,
    conversion_type: category
  }

  return {
    success: true,
    data: convertResponse,
    message: `${amount} ${from} = ${convertResponse.converted_amount} ${to}`
  }
}

function convertTemperature(amount: number, from: string, to: string): number {
  // Convert to Celsius first
  let celsius: number
  
  switch (from) {
    case 'celsius':
      celsius = amount
      break
    case 'fahrenheit':
      celsius = (amount - 32) * 5/9
      break
    case 'kelvin':
      celsius = amount - 273.15
      break
    default:
      throw new Error(`Unknown temperature unit: ${from}`)
  }
  
  // Convert from Celsius to target
  switch (to) {
    case 'celsius':
      return celsius
    case 'fahrenheit':
      return celsius * 9/5 + 32
    case 'kelvin':
      return celsius + 273.15
    default:
      throw new Error(`Unknown temperature unit: ${to}`)
  }
}