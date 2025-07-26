/**
 * Parse a plain text ingredient into structured format
 * @param {string} ingredientText - Raw ingredient text (e.g., "2 cups flour")
 * @returns {object} Parsed ingredient with quantity, unit, and name
 */
export const parseIngredient = (ingredientText) => {
  if (!ingredientText || typeof ingredientText !== 'string') {
    return { quantity: '', unit: '', name: ingredientText || '', original: ingredientText };
  }

  const text = ingredientText.trim();
  
  // Common patterns for ingredient parsing
  const patterns = [
    // "2 cups flour" -> quantity: "2", unit: "cups", name: "flour"
    /^(\d+(?:\/\d+)?(?:\s*-\s*\d+(?:\/\d+)?)?)\s+(\w+)\s+(.+)$/i,
    
    // "1/2 teaspoon salt" -> quantity: "1/2", unit: "teaspoon", name: "salt"
    /^(\d+\/\d+)\s+(\w+)\s+(.+)$/i,
    
    // "3 large eggs" -> quantity: "3", unit: "", name: "large eggs"
    /^(\d+)\s+(.+)$/i,
    
    // "salt to taste" -> quantity: "", unit: "", name: "salt to taste"
    /^(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Pattern 1 or 2: quantity + unit + name
        return {
          quantity: match[1].trim(),
          unit: match[2].trim().toLowerCase(),
          name: match[3].trim(),
          original: text
        };
      } else if (match.length === 3) {
        // Pattern 3: quantity + name (no unit)
        return {
          quantity: match[1].trim(),
          unit: '',
          name: match[2].trim(),
          original: text
        };
      } else {
        // Pattern 4: just name
        return {
          quantity: '',
          unit: '',
          name: match[1].trim(),
          original: text
        };
      }
    }
  }

  // Fallback
  return {
    quantity: '',
    unit: '',
    name: text,
    original: text
  };
};

/**
 * Normalize ingredient name for better matching
 * @param {string} name - Ingredient name
 * @returns {string} Normalized name
 */
export const normalizeIngredientName = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Check if two ingredients are the same (for aggregation)
 * @param {object} item1 - First ingredient
 * @param {object} item2 - Second ingredient
 * @returns {boolean} True if ingredients are the same
 */
export const areIngredientsSame = (item1, item2) => {
  const name1 = normalizeIngredientName(item1.name);
  const name2 = normalizeIngredientName(item2.name);
  
  // Check if names are similar (allowing for minor variations)
  if (name1 === name2) return true;
  
  // Handle common variations
  const variations = {
    'flour': ['all purpose flour', 'plain flour', 'wheat flour'],
    'sugar': ['granulated sugar', 'white sugar'],
    'salt': ['table salt', 'kosher salt'],
    'pepper': ['black pepper', 'ground pepper'],
    'oil': ['olive oil', 'vegetable oil', 'cooking oil'],
    'butter': ['unsalted butter', 'salted butter'],
    'milk': ['whole milk', 'skim milk', '2% milk'],
    'eggs': ['egg', 'large eggs', 'medium eggs'],
    'onion': ['yellow onion', 'white onion', 'red onion'],
    'garlic': ['garlic cloves', 'minced garlic'],
    'tomato': ['tomatoes', 'tomato sauce', 'tomato paste'],
    'cheese': ['cheddar cheese', 'parmesan cheese', 'mozzarella cheese']
  };

  // Check for variations
  for (const [base, variants] of Object.entries(variations)) {
    if ((name1 === base || variants.includes(name1)) && 
        (name2 === base || variants.includes(name2))) {
      return true;
    }
  }

  return false;
};

/**
 * Aggregate ingredients from multiple recipes
 * @param {Array} recipes - Array of recipe objects with ingredients
 * @returns {Array} Aggregated shopping list items
 */
export const aggregateIngredients = (recipes) => {
  const allItems = [];
  
  // Parse all ingredients from all recipes
  recipes.forEach(recipe => {
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach(ingredientText => {
        const parsed = parseIngredient(ingredientText);
        allItems.push({
          ...parsed,
          sourceRecipeId: recipe.id,
          sourceRecipeName: recipe.title
        });
      });
    }
  });

  // Group similar ingredients
  const groupedItems = [];
  
  allItems.forEach(item => {
    const existingItem = groupedItems.find(existing => 
      areIngredientsSame(existing, item) && 
      existing.unit === item.unit
    );

    if (existingItem) {
      // Try to combine quantities
      const combined = combineQuantities(existingItem.quantity, item.quantity);
      if (combined) {
        existingItem.quantity = combined;
        existingItem.sourceRecipeIds = existingItem.sourceRecipeIds || [existingItem.sourceRecipeId];
        existingItem.sourceRecipeIds.push(item.sourceRecipeId);
        existingItem.sourceRecipeNames = existingItem.sourceRecipeNames || [existingItem.sourceRecipeName];
        existingItem.sourceRecipeNames.push(item.sourceRecipeName);
      } else {
        // Can't combine, add as separate item
        groupedItems.push({
          ...item,
          sourceRecipeIds: [item.sourceRecipeId],
          sourceRecipeNames: [item.sourceRecipeName]
        });
      }
    } else {
      // New item
      groupedItems.push({
        ...item,
        sourceRecipeIds: [item.sourceRecipeId],
        sourceRecipeNames: [item.sourceRecipeName]
      });
    }
  });

  return groupedItems;
};

/**
 * Try to combine two quantities (simple implementation)
 * @param {string} qty1 - First quantity
 * @param {string} qty2 - Second quantity
 * @returns {string|null} Combined quantity or null if can't combine
 */
const combineQuantities = (qty1, qty2) => {
  if (!qty1 || !qty2) return null;
  
  // Handle fractions
  const parseFraction = (str) => {
    if (str.includes('/')) {
      const [num, denom] = str.split('/');
      return parseInt(num) / parseInt(denom);
    }
    return parseFloat(str) || 0;
  };

  const val1 = parseFraction(qty1);
  const val2 = parseFraction(qty2);
  
  if (isNaN(val1) || isNaN(val2)) return null;
  
  const total = val1 + val2;
  
  // Convert back to string (simple implementation)
  if (total === Math.floor(total)) {
    return total.toString();
  } else {
    // Handle common fractions
    const fractions = {
      0.25: '1/4',
      0.5: '1/2',
      0.75: '3/4',
      0.33: '1/3',
      0.67: '2/3'
    };
    
    const decimal = Math.round((total % 1) * 100) / 100;
    const whole = Math.floor(total);
    
    if (fractions[decimal]) {
      return whole > 0 ? `${whole} ${fractions[decimal]}` : fractions[decimal];
    }
    
    return total.toFixed(1);
  }
}; 