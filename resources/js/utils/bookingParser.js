import { addDays, format, nextDay, parse } from 'date-fns';

/**
 * Parses natural language strings for advanced equipment booking
 * Supports both standard keywords and hashtags:
 * #items [Names/Commas] #quote [QT#] #project [Title] #dates [DD/MM/YYYY]
 */
export const parseBookingString = (input, equipmentList, fuse) => {
  if (!input || input.length < 3) return null;

  const result = {
    equipments: [],
    quotationNumber: '',
    projectTitle: '',
    dates: [],
    raw: input,
    isValid: false,
    errors: []
  };

  const lowerInput = input.toLowerCase();

  // 1. Parse Equipment / #items - Supporting separate items via commas
  let equipmentPart = '';
  const hashItemsMatch = lowerInput.match(/#items\s(.*?)(?=#|$)/i);
  if (hashItemsMatch) {
    equipmentPart = hashItemsMatch[1];
  } else {
    // Legacy fallback
    const keywords = [' for ', ' quote ', ' qt ', ' on ', ' #'];
    let firstKeywordPos = Infinity;
    keywords.forEach(k => {
      const pos = lowerInput.indexOf(k);
      if (pos !== -1 && pos < firstKeywordPos) firstKeywordPos = pos;
    });
    equipmentPart = firstKeywordPos === Infinity ? input : input.substring(0, firstKeywordPos);
  }

  // Split by comma or "and" for multi-item selection
  const equipParts = equipmentPart.split(/,|\sand\s/i).map(p => p.trim()).filter(p => p.length > 0);
  if (equipParts.length > 0 && fuse) {
    equipParts.forEach(part => {
      const searchResults = fuse.search(part);
      if (searchResults.length > 0) {
        // Find best match that isn't already added
        searchResults.forEach(res => {
          if (!result.equipments.find(e => e.id === res.item.id)) {
            result.equipments.push(res.item);
          }
        });
      }
    });
  }

  // 2. Parse Project / #project
  const projectMatch = lowerInput.match(/(?:#project| for )\s*(.*?)(?=\s*(?:#| quote| qt| on|$))/i);
  if (projectMatch) result.projectTitle = projectMatch[1].trim();

  // 3. Parse Quote / #quote
  const quoteMatch = lowerInput.match(/(?:#quote| quote| qt)\s*(.*?)(?=\s*(?:#| project| for| on|$))/i);
  if (quoteMatch) result.quotationNumber = (quoteMatch[2] || quoteMatch[1] || '').trim().toUpperCase();

  // 4. Parse Dates / #dates - Updated for DD/MM/YYYY
  const dateStrMatch = lowerInput.match(/(?:#dates| on )\s*(.*?)(?=\s*(?:#| project| quote| for|$))/i);
  if (dateStrMatch) {
    const dateParts = dateStrMatch[1].split(/,|\sand\s/i).map(p => p.trim()).filter(p => p.length > 0);
    const today = new Date();
    
    dateParts.forEach(d => {
      let parsedDate = null;
      const lowerD = d.toLowerCase();
      
      if (lowerD === 'today') parsedDate = today;
      else if (lowerD === 'tomorrow') parsedDate = addDays(today, 1);
      else if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(lowerD)) {
        const daysMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        parsedDate = nextDay(today, daysMap[lowerD]);
      } else {
        // Format priority: DD/MM/YYYY, then others
        const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'MMM d', 'MMMM d'];
        for (let fmt of formats) {
          try {
            const p = parse(d, fmt, new Date());
            if (!isNaN(p.getTime())) { parsedDate = p; break; }
          } catch (e) { continue; }
        }
      }
      if (parsedDate) result.dates.push(format(parsedDate, 'dd/MM/yyyy'));
    });
    result.dates = [...new Set(result.dates)].sort();
  }

  // Validation
  if (result.equipments.length > 0 && result.projectTitle && result.dates.length > 0 && result.quotationNumber) {
    result.isValid = true;
  } else {
    if (result.equipments.length === 0) result.errors.push('Identify items');
    if (!result.projectTitle) result.errors.push('Missing Project');
    if (result.dates.length === 0) result.errors.push('Missing Dates');
    if (!result.quotationNumber) result.errors.push('Missing Quote #');
  }

  return result;
};