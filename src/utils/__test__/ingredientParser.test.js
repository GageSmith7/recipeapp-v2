import { 
  parseIngredient, 
  normalizeIngredientName, 
  areIngredientsSame, 
  aggregateIngredients 
} from '../ingredientParser';

describe('parseIngredient', () => {
  test('should parse "2 cups flour" correctly', () => {
    const result = parseIngredient('2 cups flour');
    expect(result).toEqual({
      quantity: '2',
      unit: 'cups',
      name: 'flour',
      original: '2 cups flour'
    });
  });

  test('should parse "1/2 teaspoon salt" correctly', () => {
    const result = parseIngredient('1/2 teaspoon salt');
    expect(result).toEqual({
      quantity: '1/2',
      unit: 'teaspoon',
      name: 'salt',
      original: '1/2 teaspoon salt'
    });
  });

  test('should parse "3 large eggs" correctly', () => {
    const result = parseIngredient('3 large eggs');
    expect(result).toEqual({
      quantity: '3',
      unit: '',
      name: 'large eggs',
      original: '3 large eggs'
    });
  });

  test('should handle "salt to taste"', () => {
    const result = parseIngredient('salt to taste');
    expect(result).toEqual({
      quantity: '',
      unit: '',
      name: 'salt to taste',
      original: 'salt to taste'
    });
  });

  test('should handle empty input', () => {
    const result = parseIngredient('');
    expect(result).toEqual({
      quantity: '',
      unit: '',
      name: '',
      original: ''
    });
  });
});

describe('normalizeIngredientName', () => {
  test('should normalize ingredient names', () => {
    expect(normalizeIngredientName('All Purpose Flour')).toBe('all purpose flour');
    expect(normalizeIngredientName('  Salt  ')).toBe('salt');
    expect(normalizeIngredientName('Olive Oil!')).toBe('olive oil');
  });
});

describe('areIngredientsSame', () => {
  test('should match identical ingredients', () => {
    const item1 = { name: 'flour', unit: 'cups' };
    const item2 = { name: 'flour', unit: 'cups' };
    expect(areIngredientsSame(item1, item2)).toBe(true);
  });

  test('should match variations of flour', () => {
    const item1 = { name: 'flour', unit: 'cups' };
    const item2 = { name: 'all purpose flour', unit: 'cups' };
    expect(areIngredientsSame(item1, item2)).toBe(true);
  });

  test('should not match different ingredients', () => {
    const item1 = { name: 'flour', unit: 'cups' };
    const item2 = { name: 'sugar', unit: 'cups' };
    expect(areIngredientsSame(item1, item2)).toBe(false);
  });
});

describe('aggregateIngredients', () => {
  test('should combine same ingredients from different recipes', () => {
    const recipes = [
      {
        id: 'recipe1',
        title: 'Pasta Recipe',
        ingredients: ['2 cups flour', '1 cup sugar']
      },
      {
        id: 'recipe2',
        title: 'Cake Recipe',
        ingredients: ['1 cup flour', '1/2 cup sugar']
      }
    ];

    const result = aggregateIngredients(recipes);
    
    // Should have 2 items (flour and sugar combined)
    expect(result).toHaveLength(2);
    
    // Find flour item
    const flourItem = result.find(item => item.name === 'flour');
    expect(flourItem).toBeDefined();
    expect(flourItem.quantity).toBe('3'); // 2 + 1
    expect(flourItem.sourceRecipeNames).toContain('Pasta Recipe');
    expect(flourItem.sourceRecipeNames).toContain('Cake Recipe');
    
    // Find sugar item
    const sugarItem = result.find(item => item.name === 'sugar');
    expect(sugarItem).toBeDefined();
    expect(sugarItem.quantity).toBe('1 1/2'); // 1 + 1/2
  });

  test('should handle empty recipes array', () => {
    const result = aggregateIngredients([]);
    expect(result).toEqual([]);
  });
});
