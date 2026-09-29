/**
 * VELQOARATH — FINANCE CALENDAR NORMALIZATION REGRESSION TESTS
 *
 * These tests protect the evidence boundary between raw Finance Calendar
 * narratives and normalized macroeconomic observations.
 *
 * Critical rule:
 * Raw narrative text must never be converted into an incorrect scalar
 * merely because the first number in the sentence happens to be numeric.
 */

import {
  parseMacroNumericValue,
  detectCurrencyFromEvent
} from '../src/fundamentals/providers/FinanceCalendarProvider';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;

  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    throw new Error(`Test failed: ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${testName}`);
  }
}

console.log('================================================================');
console.log('RUNNING VELQOARATH FINANCE CALENDAR NORMALIZATION TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. ORDINARY NUMERIC VALUES
// -------------------------------------------------------------
{
  const percentage = parseMacroNumericValue('3.0%');

  assert(
    percentage.num === 3,
    'Test 1.1: Ordinary percentage value parses correctly'
  );

  assert(
    percentage.unit === '%',
    'Test 1.2: Ordinary percentage preserves percent unit'
  );

  const number = parseMacroNumericValue(3.5);

  assert(
    number.num === 3.5,
    'Test 1.3: Numeric input parses correctly'
  );

  const thousands = parseMacroNumericValue('250K');

  assert(
    thousands.num === 250,
    'Test 1.4: Thousands value parses correctly'
  );

  assert(
    thousands.unit === 'k',
    'Test 1.5: Thousands value preserves k unit'
  );
}

// -------------------------------------------------------------
// 2. CENTRAL BANK NARRATIVE RATE PARSING
// -------------------------------------------------------------
{
  const rbnz = parseMacroNumericValue(
    'OCR raised 25bp to 2.75%, decision unanimously agreed'
  );
  assert(
    rbnz.num === 2.75,
    'Test 2.1: RBNZ narrative extracts resulting OCR rate, not 25bp'
  );
  assert(
    rbnz.unit === '%',
    'Test 2.2: RBNZ narrative uses percent unit'
  );

  const held = parseMacroNumericValue('Held at 2.25%');

  assert(
    held.num === 2.25,
    'Test 2.3: Held-rate narrative extracts policy rate'
  );

  const cut = parseMacroNumericValue('Cut 25bp to 4.00%');

  assert(
    cut.num === 4,
    'Test 2.4: Rate-cut narrative extracts resulting policy rate'
  );

  const raised = parseMacroNumericValue('Raised 25bp to 3.75%');

  assert(
    raised.num === 3.75,
    'Test 2.5: Rate-hike narrative extracts resulting policy rate'
  );
}

// -------------------------------------------------------------
// 3. AMBIGUOUS POLICY-RATE RANGES MUST NOT BE GUESSED
// -------------------------------------------------------------
{
  const fomc = parseMacroNumericValue(
    'Raised 25bp to 3.75%-4.00%'
  );

  assert(
    fomc.num === null,
    'Test 3.1: FOMC target range is not collapsed into a guessed scalar'
  );

  const ambiguous = parseMacroNumericValue(
    'Policy rate changed by 25bp from 3.50% to 3.75%'
  );

  assert(
    ambiguous.num === 3.75,
    'Test 3.2: Explicit "to" resulting rate is accepted when unambiguous'
  );
}

// -------------------------------------------------------------
// 4. BASIS-POINT NARRATIVE WITHOUT RESULTING RATE
// -------------------------------------------------------------
{
  const incomplete = parseMacroNumericValue(
    'Central bank raised rates by 25bp'
  );

  assert(
    incomplete.num === null,
    'Test 4.1: Basis-point move without resulting rate remains unavailable'
  );
}

// -------------------------------------------------------------
// 5. MULTIPLE UNSTRUCTURED NUMBERS MUST NOT USE FIRST-NUMBER GUESS
// -------------------------------------------------------------
{
  const ambiguous = parseMacroNumericValue(
    'Policy committee reviewed 3 indicators and 2 scenarios'
  );

  assert(
    ambiguous.num === null,
    'Test 5.1: Multiple unstructured numbers are rejected as ambiguous'
  );
}

// -------------------------------------------------------------
// 6. MISSING VALUES
// -------------------------------------------------------------
{
  assert(
    parseMacroNumericValue(null).num === null,
    'Test 6.1: Null value remains unavailable'
  );

  assert(
    parseMacroNumericValue(undefined).num === null,
    'Test 6.2: Undefined value remains unavailable'
  );

  assert(
    parseMacroNumericValue('pending').num === null,
    'Test 6.3: Pending value remains unavailable'
  );

  assert(
    parseMacroNumericValue('none').num === null,
    'Test 6.4: None value remains unavailable'
  );
}

// -------------------------------------------------------------
// 7. CURRENCY DETECTION — CORE CENTRAL BANK EVENTS
// -------------------------------------------------------------
{
  assert(
    detectCurrencyFromEvent({
      name: 'RBNZ Rate Decision',
      title: 'RBNZ Rate Decision September 2026',
      country: '',
      currency: ''
    }) === 'NZD',
    'Test 7.1: RBNZ event maps to NZD'
  );

  assert(
    detectCurrencyFromEvent({
      name: 'Bank of Canada Rate Decision',
      country: 'Canada',
      currency: ''
    }) === 'CAD',
    'Test 7.2: Bank of Canada event maps to CAD'
  );

  assert(
    detectCurrencyFromEvent({
      name: 'FOMC Rate Decision',
      country: '',
      currency: ''
    }) === 'USD',
    'Test 7.3: FOMC event maps to USD'
  );

  assert(
    detectCurrencyFromEvent({
      name: 'ECB Rate Decision',
      country: '',
      currency: ''
    }) === 'EUR',
    'Test 7.4: ECB event maps to EUR'
  );
}

// -------------------------------------------------------------
// 8. UNSUPPORTED PBoC / CNY MUST NOT BE ATTRIBUTED TO A CORE FX
// -------------------------------------------------------------
{
  const pboc = detectCurrencyFromEvent({
    name: 'PBoC Loan Prime Rate',
    title: 'PBoC Loan Prime Rate September 2026',
    country: '',
    currency: '',
    category: 'central-banks-monetary-policy'
  });

  assert(
    pboc === null,
    'Test 8.1: PBoC event with no supported currency remains unassigned'
  );
}

// -------------------------------------------------------------
// 9. EXPLICIT CURRENCY FIELD TAKES PRECEDENCE
// -------------------------------------------------------------
{
  const explicitCad = detectCurrencyFromEvent({
    name: 'Bank of Canada Rate Decision',
    country: '',
    currency: 'CAD'
  });

  assert(
    explicitCad === 'CAD',
    'Test 9.1: Explicit CAD currency is preserved'
  );

  const explicitNzd = detectCurrencyFromEvent({
    name: 'RBNZ Rate Decision',
    country: '',
    currency: 'NZD'
  });

  assert(
    explicitNzd === 'NZD',
    'Test 9.2: Explicit NZD currency is preserved'
  );
}

console.log('\n================================================================');
console.log(`FINANCE CALENDAR TESTS SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  throw new Error(`Finance Calendar tests failed: ${passedTests}/${totalTests} passed`);
}