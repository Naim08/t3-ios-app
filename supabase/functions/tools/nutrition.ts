// Nutrition tool using USDA FoodData Central API

export interface NutritionRequest {
  food_query: string
  serving_size?: string
}

export interface NutrientInfo {
  name: string
  amount: number
  unit: string
}

export interface NutritionResponse {
  food_name: string
  serving_size: string
  calories: number
  macronutrients: {
    protein: NutrientInfo
    carbohydrates: NutrientInfo
    fat: NutrientInfo
    fiber: NutrientInfo
    sugar: NutrientInfo
  }
  vitamins: NutrientInfo[]
  minerals: NutrientInfo[]
  source: string
}

export async function getNutritionData(
  food_query: string, 
  serving_size: string = "100g"
): Promise<{ success: boolean; data: NutritionResponse; message: string }> {
  const API_KEY = Deno.env.get('USDA_API_KEY')
  
  if (!API_KEY) {
    return {
      success: false,
      data: {} as NutritionResponse,
      message: 'USDA API key not configured'
    }
  }

  try {
    // Parse serving size to get amount in grams
    const servingAmount = parseServingSize(serving_size)
    
    // Search for the food item using POST request for better control
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}`
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: food_query,
        dataType: ["Foundation", "SR Legacy"],
        pageSize: 1,
        sortBy: "dataType.keyword",
        sortOrder: "asc"
      })
    })

    if (!searchResponse.ok) {
      throw new Error(`USDA API search error: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()
    
    if (!searchData.foods || searchData.foods.length === 0) {
      return {
        success: false,
        data: {} as NutritionResponse,
        message: `No nutrition data found for "${food_query}". Try a more specific food name.`
      }
    }

    const foodItem = searchData.foods[0]
    const fdcId = foodItem.fdcId

    // Get detailed nutrition information with specific nutrients
    const detailUrl = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${API_KEY}&format=full`
    
    const detailResponse = await fetch(detailUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!detailResponse.ok) {
      throw new Error(`USDA API detail error: ${detailResponse.statusText}`)
    }

    const detailData = await detailResponse.json()
    const nutrients = detailData.foodNutrients || []

    // Helper function to find nutrient by ID and adjust for serving size
    const findNutrient = (nutrientId: number): NutrientInfo | null => {
      const nutrient = nutrients.find((n: any) => n.nutrient.id === nutrientId)
      if (!nutrient || !nutrient.amount) return null
      
      const adjustedAmount = (nutrient.amount * servingAmount) / 100
      
      return {
        name: nutrient.nutrient.name,
        amount: Math.round(adjustedAmount * 100) / 100,
        unit: nutrient.nutrient.unitName
      }
    }

    // Extract key macronutrients using correct USDA nutrient IDs
    const protein = findNutrient(1003) || { name: 'Protein', amount: 0, unit: 'g' }
    const carbs = findNutrient(1005) || { name: 'Carbohydrate, by difference', amount: 0, unit: 'g' }
    const fat = findNutrient(1004) || { name: 'Total lipid (fat)', amount: 0, unit: 'g' }
    const fiber = findNutrient(1079) || { name: 'Fiber, total dietary', amount: 0, unit: 'g' }
    const sugar = findNutrient(2000) || { name: 'Sugars, total including NLEA', amount: 0, unit: 'g' }
    
    // Find calories (Energy - nutrient ID 1008)
    const energyNutrient = nutrients.find((n: any) => n.nutrient.id === 1008)
    const calories = energyNutrient ? Math.round((energyNutrient.amount * servingAmount) / 100) : 0

    // Common vitamin IDs (Vitamin C, A, D, E, K, B vitamins)
    const vitaminIds = [1162, 1106, 1114, 1109, 1185, 1166, 1167, 1175, 1177, 1178, 1180]
    // Common mineral IDs (Calcium, Iron, Magnesium, Phosphorus, Potassium, Sodium, Zinc)  
    const mineralIds = [1087, 1089, 1090, 1091, 1092, 1093, 1095]
    
    const vitamins: NutrientInfo[] = []
    const minerals: NutrientInfo[] = []

    for (const nutrient of nutrients) {
      const nutrientId = nutrient.nutrient.id
      const nutrientInfo = findNutrient(nutrientId)
      
      if (!nutrientInfo || [1003, 1004, 1005, 1008, 1079, 2000].includes(nutrientId)) {
        continue // Skip macros and calories we already handled
      }

      if (vitaminIds.includes(nutrientId) && nutrient.amount > 0) {
        vitamins.push(nutrientInfo)
      } else if (mineralIds.includes(nutrientId) && nutrient.amount > 0) {
        minerals.push(nutrientInfo)
      }
    }

    const nutritionData: NutritionResponse = {
      food_name: foodItem.description || food_query,
      serving_size: serving_size,
      calories,
      macronutrients: {
        protein,
        carbohydrates: carbs,
        fat,
        fiber,
        sugar
      },
      vitamins: vitamins.slice(0, 8), // Limit to top 8
      minerals: minerals.slice(0, 8), // Limit to top 8
      source: 'USDA FoodData Central'
    }

    return {
      success: true,
      data: nutritionData,
      message: `Nutrition information for ${serving_size} of ${nutritionData.food_name}`
    }

  } catch (error) {
    console.error('Nutrition API error:', error)
    return {
      success: false,
      data: {} as NutritionResponse,
      message: `Failed to fetch nutrition data: ${(error as Error).message}`
    }
  }
}

function parseServingSize(serving_size: string): number {
  // Default to 100g if not specified
  if (!serving_size || serving_size === "100g") {
    return 100
  }
  
  // Extract number from serving size string
  const match = serving_size.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return 100 // Default fallback
  }
  
  const amount = parseFloat(match[1])
  const unit = serving_size.toLowerCase()
  
  // Convert common units to grams (approximate conversions)
  if (unit.includes('cup')) {
    return amount * 240 // 1 cup ≈ 240g (varies by food)
  } else if (unit.includes('tbsp') || unit.includes('tablespoon')) {
    return amount * 15 // 1 tbsp ≈ 15g
  } else if (unit.includes('tsp') || unit.includes('teaspoon')) {
    return amount * 5 // 1 tsp ≈ 5g
  } else if (unit.includes('oz') || unit.includes('ounce')) {
    return amount * 28.35 // 1 oz = 28.35g
  } else if (unit.includes('lb') || unit.includes('pound')) {
    return amount * 453.592 // 1 lb = 453.592g
  } else if (unit.includes('kg')) {
    return amount * 1000 // 1 kg = 1000g
  } else if (unit.includes('g')) {
    return amount // Already in grams
  } else if (unit.includes('medium')) {
    return amount * 150 // Medium fruit/vegetable ≈ 150g
  } else if (unit.includes('large')) {
    return amount * 200 // Large fruit/vegetable ≈ 200g
  } else if (unit.includes('small')) {
    return amount * 100 // Small fruit/vegetable ≈ 100g
  }
  
  // Default: assume grams
  return amount
}