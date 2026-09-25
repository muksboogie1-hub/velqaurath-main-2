var __defProp=Object.defineProperty;var __name=(target,value)=>__defProp(target,"name",{value,configurable:true});import{VelqoarathApiService}from"../src/api/service";import{globalStore}from"../src/data/store";import{MARKET_SESSIONS,getSessionInstantStatus,getActiveSessionOverview}from"../src/data/sessions";import{getPairSessionRelevance,calculateWatchWindow}from"../src/engines/session/sessionEngine";import{evaluateCurrencyState}from"../src/engines/currency/currencyEngine";import{evaluatePairIntelligence}from"../src/engines/pair/pairEngine";import{INITIAL_CURRENCIES}from"../src/data/currencies";import{INITIAL_PAIRS}from"../src/data/pairs";import{INITIAL_CENTRAL_BANKS}from"../src/data/centralBanks";import{VERIFIED_OBSERVATIONS}from"../src/data/benchmarkDataset";import{TwelveDataProvider}from"../src/marketData/providers/TwelveDataProvider";import{MarketDataCache}from"../src/marketData/cache/MarketDataCache";import{calculatePairContribution,calculateCurrencyMarketStrengths}from"../src/marketData/engine/marketStrengthEngine";let passedTests=0;let totalTests=0;function assert(condition,testName,detail){totalTests++;if(!condition){console.error(`\u274C FAIL: ${testName}${detail?` (${detail})`:""}`);process.exitCode=1}else{passedTests++;console.log(`\u2705 PASS: ${testName}`)}}__name(assert,"assert");console.log("================================================================");console.log("RUNNING VELQOARATH MARKET DATA & INTELLIGENCE ENGINE TESTS");console.log("================================================================\n");{const provider=new TwelveDataProvider({apiKey:"test_key_dummy"});const mockApiResponse={"EUR/USD":{symbol:"EUR/USD",name:"Euro / US Dollar",currency_base:"EUR",currency_quote:"USD",datetime:"2026-09-23",timestamp:1727078400,open:"1.0820",high:"1.0890",low:"1.0810",close:"1.0875",percent_change:"0.5083",change:"0.0055"}};const normalized=provider.normalizeResponse(mockApiResponse,["EUR/USD"]);assert(normalized.length===1,"Test 1: Provider normalized 1 quote");const q=normalized[0];assert(q.symbol==="EUR/USD","Test 1: Symbol correctly standardized");assert(q.baseCurrency==="EUR","Test 1: Base currency is EUR");assert(q.quoteCurrency==="USD","Test 1: Quote currency is USD");assert(q.open===1.082,"Test 1: Open parsed as float");assert(q.close===1.0875,"Test 1: Close parsed as float");assert(q.changePercent===.5083,"Test 1: Percent change parsed accurately");assert(q.interval==="1day","Test 1: Interval is 1day");assert(q.source==="Twelve Data","Test 1: Source provenance is Twelve Data")}{const quote={symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.085,open:1.08,high:1.086,low:1.079,close:1.085,change:.005,changePercent:.46,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:new Date().toISOString()};const eurContrib=calculatePairContribution("EUR",quote);const usdContrib=calculatePairContribution("USD",quote);assert(eurContrib!==null&&eurContrib.role==="BASE","Test 2: EUR is recognized as BASE role");assert(eurContrib?.signedContribution===.46,"Test 2: EUR gets positive contribution (+0.46%) from rising EUR/USD");assert(usdContrib!==null&&usdContrib.role==="QUOTE","Test 2: USD is recognized as QUOTE role");assert(usdContrib?.signedContribution===-.46,"Test 2: USD gets negative contribution (-0.46%) from rising EUR/USD")}{const quote={symbol:"USD/JPY",baseCurrency:"USD",quoteCurrency:"JPY",price:152.4,open:151.2,high:152.6,low:151.1,close:152.4,change:1.2,changePercent:.79,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:new Date().toISOString()};const usdContrib=calculatePairContribution("USD",quote);const jpyContrib=calculatePairContribution("JPY",quote);assert(usdContrib?.role==="BASE"&&usdContrib.signedContribution===.79,"Test 3: USD receives +0.79% contribution from rising USD/JPY");assert(jpyContrib?.role==="QUOTE"&&jpyContrib.signedContribution===-.79,"Test 3: JPY receives -0.79% contribution from rising USD/JPY")}{const risingQuote={symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.09,open:1.08,high:1.091,low:1.079,close:1.09,change:.01,changePercent:.9259,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:new Date().toISOString()};const eur=calculatePairContribution("EUR",risingQuote);const usd=calculatePairContribution("USD",risingQuote);assert((eur?.signedContribution??0)>0,"Test 4: EUR contribution is strictly positive when EUR/USD rises");assert((usd?.signedContribution??0)<0,"Test 4: USD contribution is strictly negative when EUR/USD rises")}{const fallingQuote={symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.07,open:1.08,high:1.081,low:1.069,close:1.07,change:-.01,changePercent:-.9259,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:new Date().toISOString()};const eur=calculatePairContribution("EUR",fallingQuote);const usd=calculatePairContribution("USD",fallingQuote);assert((eur?.signedContribution??0)<0,"Test 5: EUR contribution is strictly negative when EUR/USD falls");assert((usd?.signedContribution??0)>0,"Test 5: USD contribution is strictly positive when EUR/USD falls")}{const risingUsdJpy={symbol:"USD/JPY",baseCurrency:"USD",quoteCurrency:"JPY",price:155,open:153,high:155.2,low:152.9,close:155,change:2,changePercent:1.307,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:new Date().toISOString()};const usd=calculatePairContribution("USD",risingUsdJpy);const jpy=calculatePairContribution("JPY",risingUsdJpy);assert((usd?.signedContribution??0)>0,"Test 6: USD contribution is strictly positive when USD/JPY rises");assert((jpy?.signedContribution??0)<0,"Test 6: JPY contribution is strictly negative when USD/JPY rises")}{const fallingUsdJpy={symbol:"USD/JPY",baseCurrency:"USD",quoteCurrency:"JPY",price:150,open:152,high:152.1,low:149.8,close:150,change:-2,changePercent:-1.315,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:new Date().toISOString()};const usd=calculatePairContribution("USD",fallingUsdJpy);const jpy=calculatePairContribution("JPY",fallingUsdJpy);assert((usd?.signedContribution??0)<0,"Test 7: USD contribution is strictly negative when USD/JPY falls");assert((jpy?.signedContribution??0)>0,"Test 7: JPY contribution is strictly positive when USD/JPY falls")}{const testQuotes=[{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.07,high:1.09,low:1.07,close:1.08,change:.01,changePercent:.93,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"GBP/USD",baseCurrency:"GBP",quoteCurrency:"USD",price:1.3,open:1.29,high:1.31,low:1.29,close:1.3,change:.01,changePercent:.77,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"USD/JPY",baseCurrency:"USD",quoteCurrency:"JPY",price:150,open:151,high:151.2,low:149.8,close:150,change:-1,changePercent:-.66,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];const results=calculateCurrencyMarketStrengths(testQuotes,{strongThreshold:.1,weakThreshold:-.1});const usd=results.get("USD");assert(usd.contributors.length===3,"Test 8: USD has exactly 3 contributing pairs");assert(Math.abs((usd.avgReturn??0)- -.787)<.01,"Test 8: USD avgReturn matches arithmetic mean of signed contributions")}{const partialQuotes=[{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.08,high:1.08,low:1.08,close:1.08,change:0,changePercent:.4,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"USD/JPY",baseCurrency:"USD",quoteCurrency:"JPY",price:150,open:150,high:150,low:150,close:150,change:0,changePercent:-.4,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];const results=calculateCurrencyMarketStrengths(partialQuotes,{strongThreshold:.1,weakThreshold:-.1});const cad=results.get("CAD");assert(cad.marketStrength===null,"Test 9: Currency with 0 pairs (CAD) returns marketStrength: null");assert(cad.classification==="DATA_UNAVAILABLE","Test 9: Currency with 0 pairs classified as DATA_UNAVAILABLE");assert(cad.coverage.available===0,"Test 9: Coverage available is 0")}{const quotes=[{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.08,high:1.08,low:1.08,close:1.08,change:0,changePercent:.2,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"EUR/GBP",baseCurrency:"EUR",quoteCurrency:"GBP",price:.85,open:.85,high:.85,low:.85,close:.85,change:0,changePercent:.15,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];const results=calculateCurrencyMarketStrengths(quotes,{strongThreshold:.1,weakThreshold:-.1});const eur=results.get("EUR");assert(eur.coverage.available===2,"Test 10: EUR has 2 pairs available");assert(eur.coverage.percent>0&&eur.coverage.percent<100,"Test 10: Partial coverage accurately calculated as percentage")}{const strongQuotes=[{symbol:"AUD/USD",baseCurrency:"AUD",quoteCurrency:"USD",price:.68,open:.67,high:.68,low:.67,close:.68,change:.01,changePercent:1.2,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"AUD/JPY",baseCurrency:"AUD",quoteCurrency:"JPY",price:102,open:100.5,high:102.1,low:100.4,close:102,change:1.5,changePercent:1.49,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.08,high:1.08,low:1.08,close:1.08,change:0,changePercent:0,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];const results=calculateCurrencyMarketStrengths(strongQuotes,{strongThreshold:.1,weakThreshold:-.1});const aud=results.get("AUD");assert(aud.marketStrength!==null&&aud.marketStrength>=.1,"Test 11: AUD marketStrength satisfies >= +0.10");assert(aud.classification==="STRONG","Test 11: AUD correctly classified as STRONG")}{const weakQuotes=[{symbol:"NZD/USD",baseCurrency:"NZD",quoteCurrency:"USD",price:.6,open:.61,high:.61,low:.59,close:.6,change:-.01,changePercent:-1.4,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"NZD/JPY",baseCurrency:"NZD",quoteCurrency:"JPY",price:90,open:91.5,high:91.6,low:89.9,close:90,change:-1.5,changePercent:-1.6,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.08,high:1.08,low:1.08,close:1.08,change:0,changePercent:0,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];const results=calculateCurrencyMarketStrengths(weakQuotes,{strongThreshold:.1,weakThreshold:-.1});const nzd=results.get("NZD");assert(nzd.marketStrength!==null&&nzd.marketStrength<=-.1,"Test 12: NZD marketStrength satisfies <= -0.10");assert(nzd.classification==="WEAK","Test 12: NZD correctly classified as WEAK")}{const flatQuotes=[{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.08,high:1.08,low:1.08,close:1.08,change:0,changePercent:0,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""},{symbol:"USD/JPY",baseCurrency:"USD",quoteCurrency:"JPY",price:150,open:150,high:150,low:150,close:150,change:0,changePercent:0,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];const results=calculateCurrencyMarketStrengths(flatQuotes,{strongThreshold:.1,weakThreshold:-.1});const eur=results.get("EUR");assert(eur.marketStrength===0,"Test 13: Flat returns produce score of exactly 0.00");assert(eur.classification==="NEUTRAL","Test 13: 0.00 is classified as NEUTRAL")}{const unconfiguredProvider=new TwelveDataProvider({apiKey:""});const status=unconfiguredProvider.getStatus();assert(status.health==="NOT_CONFIGURED","Test 14: Provider status is NOT_CONFIGURED when key is empty");assert(status.isConfigured===false,"Test 14: isConfigured is false");const emptyQuotes=await unconfiguredProvider.fetchDailyQuotes();assert(emptyQuotes.length===0,"Test 14: fetchDailyQuotes returns empty array without throwing")}{const failingFetch=__name(async()=>{throw new Error("Network timeout connecting to Twelve Data endpoint")},"failingFetch");const failingProvider=new TwelveDataProvider({apiKey:"sample_secret_key_12345",fetchFn:failingFetch});const quotes=await failingProvider.fetchDailyQuotes(["EUR/USD"]);const status=failingProvider.getStatus();assert(status.health==="ERROR","Test 15: Provider health becomes ERROR on fetch exception");assert(quotes.length===0,"Test 15: No fabricated quotes returned on error")}{const cache=new MarketDataCache(5e3);const testData=[{symbol:"EUR/USD",baseCurrency:"EUR",quoteCurrency:"USD",price:1.08,open:1.08,high:1.08,low:1.08,close:1.08,change:0,changePercent:.2,timestamp:Date.now(),interval:"1day",source:"Twelve Data",sourceStatus:"CONNECTED",fetchedAt:""}];assert(cache.getQuotes()===null,"Test 16: Empty cache returns null");cache.setQuotes(testData);assert(cache.getQuotes()!==null,"Test 16: Populated cache returns cached quotes");assert(cache.getQuotes()[0].symbol==="EUR/USD","Test 16: Cached item matches");assert(!cache.isExpired(),"Test 16: Cache is not expired immediately after set");cache.clear();assert(cache.getQuotes()===null,"Test 16: Cache returns null after clear")}{const secretKey="my_super_secret_twelve_data_token_999";const failingWithSecretInUrl=__name(async()=>{throw new Error(`Connection failed to https://api.twelvedata.com/quote?apikey=${secretKey}`)},"failingWithSecretInUrl");const provider=new TwelveDataProvider({apiKey:secretKey,fetchFn:failingWithSecretInUrl});await provider.fetchDailyQuotes(["EUR/USD"]);const status=provider.getStatus();assert(!status.message.includes(secretKey),"Test 17: Sanitized error message strictly masks secret key");assert(status.message.includes("[REDACTED]"),"Test 17: Secret replaced with [REDACTED]")}{const usd=INITIAL_CURRENCIES.find(c=>c.code==="USD");const fed=INITIAL_CENTRAL_BANKS.find(c=>c.associatedCurrency==="USD");const thresholds={strongThreshold:.1,weakThreshold:-.1};const unaugmentedState=evaluateCurrencyState(usd,VERIFIED_OBSERVATIONS,fed,thresholds,true,null);assert(unaugmentedState.marketStrength===null,"Test 18: Market strength is null when no real market feed result is provided");assert(unaugmentedState.marketState==="DATA_UNAVAILABLE","Test 18: Market state is DATA_UNAVAILABLE without hardcoded -0.04");assert(unaugmentedState.relativeStrengthBreakdown.explanation.includes("MARKET DATA UNAVAILABLE"),"Test 18: Explanation honestly discloses unavailable data feed")}{const pairUsdJpy=INITIAL_PAIRS.find(p=>p.symbol==="USD/JPY");const pairEurUsd=INITIAL_PAIRS.find(p=>p.symbol==="EUR/USD");const usd=INITIAL_CURRENCIES.find(c=>c.code==="USD");const jpy=INITIAL_CURRENCIES.find(c=>c.code==="JPY");const eur=INITIAL_CURRENCIES.find(c=>c.code==="EUR");const fed=INITIAL_CENTRAL_BANKS.find(c=>c.associatedCurrency==="USD");const boj=INITIAL_CENTRAL_BANKS.find(c=>c.associatedCurrency==="JPY");const ecb=INITIAL_CENTRAL_BANKS.find(c=>c.associatedCurrency==="EUR");const thresholds={strongThreshold:.1,weakThreshold:-.1};const jpyStrengthResult={currency:"JPY",marketStrength:.18,classification:"STRONG",rawRelativeReturn:.72,avgReturn:.72,momentum:.07,coverage:{available:7,required:7,percent:100},contributors:[{pairSymbol:"USD/JPY",pairReturnPercent:-.72,role:"QUOTE",signedContribution:.72,timestamp:Date.now()}],explanation:"STRONG relative performance across cross basket.",calculatedAt:new Date().toISOString(),providerStatus:"CONNECTED",source:"Twelve Data"};const usdStrengthResult={currency:"USD",marketStrength:-.04,classification:"NEUTRAL",rawRelativeReturn:-.16,avgReturn:-.16,momentum:-.02,coverage:{available:7,required:7,percent:100},contributors:[{pairSymbol:"USD/JPY",pairReturnPercent:-.72,role:"BASE",signedContribution:-.72,timestamp:Date.now()}],explanation:"Subdued performance against Asian crosses.",calculatedAt:new Date().toISOString(),providerStatus:"CONNECTED",source:"Twelve Data"};const usdState=evaluateCurrencyState(usd,VERIFIED_OBSERVATIONS,fed,thresholds,true,usdStrengthResult);const jpyState=evaluateCurrencyState(jpy,VERIFIED_OBSERVATIONS,boj,thresholds,true,jpyStrengthResult);const usdjpyIntel=evaluatePairIntelligence(pairUsdJpy,usdState,jpyState,[],new Date,true);assert(usdjpyIntel.relativeStrengthDelta===-.22,"Test 19: USD/JPY delta is -0.22");assert(usdjpyIntel.orientationDirection==="BEARISH_BASE","Test 19: USD/JPY correctly evaluated as BEARISH_BASE")}{const london=MARKET_SESSIONS.find(s=>s.id==="sess-london");const newYork=MARKET_SESSIONS.find(s=>s.id==="sess-newyork");const winterDate=new Date("2026-01-15T14:00:00Z");const londonWinter=getSessionInstantStatus(london,winterDate);const nyWinter=getSessionInstantStatus(newYork,winterDate);assert(londonWinter.utcOffsetHours===0,"Test 20: London UTC offset is 0 in winter (GMT)");assert(nyWinter.utcOffsetHours===-5,"Test 20: New York UTC offset is -5 in winter (EST)");const overlapTime=new Date("2026-07-15T14:30:00Z");const overview=getActiveSessionOverview(overlapTime);assert(overview.activeOverlaps.some(o=>o.includes("London / New York")),"Test 20: London / New York overlap detected at 14:30 UTC");const usdjpyRel=getPairSessionRelevance("USD/JPY");assert(usdjpyRel.primarySession.includes("Tokyo"),"Test 20: USD/JPY maps to Tokyo")}{const pair=INITIAL_PAIRS.find(p=>p.symbol==="EUR/USD");const simulatedTime=new Date("2026-09-23T16:00:00Z");const testEvent={id:"evt-test-cpi",name:"US Consumer Price Index (CPI)",currency:"USD",importance:"HIGH",scheduledTime:"2026-09-23T18:00:00Z",previous:3,forecast:2.9,actual:null,unit:"%",source:"BLS",status:"UPCOMING"};const watchWindow=calculateWatchWindow(pair,[testEvent],simulatedTime,true);assert(watchWindow.watchState==="EVENT-SENSITIVE","Test 21: Upcoming high-impact event triggers EVENT-SENSITIVE");globalStore.toggleDataFeedConnection(false);const dash=VelqoarathApiService.getDashboard();assert(dash.dataStatus==="NOT_CONNECTED","Test 21: Dashboard reflects NOT_CONNECTED when disconnected");globalStore.toggleDataFeedConnection(true)}{
  // Helper to generate quotes for all 15 required pairs
  const basePairs = [
    { symbol: "EUR/USD", b: "EUR", q: "USD", ret: 0.5 },
    { symbol: "GBP/USD", b: "GBP", q: "USD", ret: 0.4 },
    { symbol: "USD/JPY", b: "USD", q: "JPY", ret: -0.6 },
    { symbol: "USD/CHF", b: "USD", q: "CHF", ret: -0.3 },
    { symbol: "AUD/USD", b: "AUD", q: "USD", ret: 0.8 },
    { symbol: "NZD/USD", b: "NZD", q: "USD", ret: -0.7 },
    { symbol: "USD/CAD", b: "USD", q: "CAD", ret: 0.2 },
    { symbol: "EUR/GBP", b: "EUR", q: "GBP", ret: 0.1 },
    { symbol: "EUR/JPY", b: "EUR", q: "JPY", ret: -0.1 },
    { symbol: "GBP/JPY", b: "GBP", q: "JPY", ret: -0.2 },
    { symbol: "EUR/CHF", b: "EUR", q: "CHF", ret: 0.2 },
    { symbol: "GBP/CHF", b: "GBP", q: "CHF", ret: 0.1 },
    { symbol: "AUD/JPY", b: "AUD", q: "JPY", ret: 0.2 },
    { symbol: "NZD/JPY", b: "NZD", q: "JPY", ret: -1.3 },
    { symbol: "CAD/JPY", b: "CAD", q: "JPY", ret: -0.8 }
  ];

  const makeQuotes = (staleSymbols: string[] = []) =>
    basePairs.map((p) => ({
      symbol: p.symbol,
      baseCurrency: p.b,
      quoteCurrency: p.q,
      price: 1.0,
      open: 1.0,
      high: 1.0,
      low: 1.0,
      close: 1.0,
      change: 0.01,
      changePercent: p.ret,
      dailyReturnPercent: p.ret,
      timestamp: Date.now(),
      interval: "1day",
      source: "Biquote",
      sourceStatus: "CONNECTED",
      fetchedAt: new Date().toISOString(),
      stale: staleSymbols.includes(p.symbol)
    }));

  // Scenario 1: CONNECTED + 15/15 fresh -> market strength displays
  {
    const quotes = makeQuotes([]);
    const res = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "CONNECTED"
    });
    const aud = res.get("AUD");
    const nzd = res.get("NZD");
    assert(aud?.marketStrength !== null, "Test 22: CONNECTED + 15/15 fresh -> AUD market strength displays");
    assert(aud?.classification === "STRONG", "Test 22: AUD classified as STRONG");
    assert(nzd?.marketStrength !== null && nzd.marketStrength <= -0.1, "Test 22: NZD market strength displays and is weak");
    assert(aud?.coverage.available === 2 && aud.coverage.status === "COMPLETE", "Test 22: 15/15 coverage is COMPLETE");
  }

  // Scenario 2: CONNECTED + 14/15 fresh + 1 stale -> market strength still displays
  {
    const quotes = makeQuotes(["CAD/JPY"]);
    const res = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "CONNECTED"
    });
    const aud = res.get("AUD");
    const cad = res.get("CAD");
    assert(aud?.marketStrength !== null, "Test 23: CONNECTED + 14/15 fresh + 1 stale -> AUD market strength displays");
    assert(cad?.marketStrength !== null, "Test 23: CAD market strength displays using valid fresh USD/CAD contributor");
    assert(cad?.coverage.available === 1, "Test 23: CAD available contributors count is 1 (excluding stale CAD/JPY)");
    assert(cad?.coverage.status === "PARTIAL", "Test 23: CAD coverage is marked PARTIAL");
  }

  // Scenario 3: DEGRADED + usable data -> market strength still displays
  {
    const quotes = makeQuotes(["CAD/JPY"]);
    const res = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "DEGRADED"
    });
    const aud = res.get("AUD");
    const nzd = res.get("NZD");
    assert(aud?.marketStrength !== null, "Test 24: DEGRADED + usable data -> AUD market strength displays");
    assert(aud?.classification === "STRONG", "Test 24: DEGRADED + usable data -> AUD classification is STRONG (not UNAVAILABLE)");
    assert(nzd?.marketStrength !== null, "Test 24: DEGRADED + usable data -> NZD market strength displays");
    assert(nzd?.classification === "WEAK", "Test 24: DEGRADED + usable data -> NZD classification is WEAK");
  }

  // Scenario 4: DEGRADED + zero usable data -> DATA_UNAVAILABLE
  {
    const allStaleSymbols = basePairs.map((p) => p.symbol);
    const quotes = makeQuotes(allStaleSymbols);
    const res = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "DEGRADED"
    });
    const aud = res.get("AUD");
    const usd = res.get("USD");
    assert(aud?.marketStrength === null, "Test 25: DEGRADED + zero usable data -> AUD marketStrength is null");
    assert(aud?.classification === "DATA_UNAVAILABLE", "Test 25: DEGRADED + zero usable data -> AUD classification is DATA_UNAVAILABLE");
    assert(usd?.marketStrength === null, "Test 25: DEGRADED + zero usable data -> USD marketStrength is null");
    assert(usd?.classification === "DATA_UNAVAILABLE", "Test 25: DEGRADED + zero usable data -> USD classification is DATA_UNAVAILABLE");
  }

  // Scenario 5: Insufficient coverage for one currency does not make all currencies unavailable
  {
    // Make both CAD pairs stale: USD/CAD and CAD/JPY
    const quotes = makeQuotes(["USD/CAD", "CAD/JPY"]);
    const res = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "DEGRADED"
    });
    const cad = res.get("CAD");
    const aud = res.get("AUD");
    const eur = res.get("EUR");
    assert(cad?.marketStrength === null, "Test 26: CAD has 0 fresh pairs and marketStrength is null");
    assert(cad?.classification === "DATA_UNAVAILABLE", "Test 26: CAD is marked DATA_UNAVAILABLE");
    assert(aud?.marketStrength !== null, "Test 26: AUD still has usable data and marketStrength displays");
    assert(aud?.classification === "STRONG", "Test 26: AUD remains STRONG despite CAD being unavailable");
    assert(eur?.marketStrength !== null, "Test 26: EUR still has usable data and marketStrength displays");
  }

  // Scenario 6: Stale pair is reported correctly
  {
    const quotes = makeQuotes(["CAD/JPY"]);
    const res = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "DEGRADED"
    });
    const cad = res.get("CAD");
    const jpy = res.get("JPY");
    const eur = res.get("EUR");
    assert(cad?.coverage.stalePairs?.includes("CAD/JPY") === true, "Test 27: Stale pair CAD/JPY reported under CAD coverage");
    assert(jpy?.coverage.stalePairs?.includes("CAD/JPY") === true, "Test 27: Stale pair CAD/JPY reported under JPY coverage");
    assert(!eur?.coverage.stalePairs?.includes("CAD/JPY"), "Test 27: Stale pair CAD/JPY not wrongly reported under EUR coverage");
    assert(cad?.explanation.includes("CAD/JPY"), "Test 27: Stale pair mentioned in CAD explanation");
  }

  // Scenario 7: Top pair uses valid available data
  {
    const quotes = makeQuotes(["CAD/JPY"]);
    const strengths = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.1, weakThreshold: -0.1 }, {
      providerStatus: "DEGRADED"
    });

    // Populate store with these DEGRADED-but-usable strengths
    globalStore.setMarketData(
      quotes,
      strengths,
      {
        providerName: "Biquote",
        isConfigured: true,
        health: "DEGRADED",
        streamState: "CONNECTED",
        quotesCount: 15,
        stalePairs: ["CAD/JPY"],
        missingPairs: [],
        message: "FX: Biquote (DEGRADED — 14/15 fresh, 1 stale)"
      }
    );

    const dash = VelqoarathApiService.getDashboard();
    assert(dash.topPair !== null, "Test 28: Top pair to watch is calculated and not null during DEGRADED status");
    assert(dash.topPair?.relativeStrengthDelta !== null, "Test 28: Top pair has valid relative strength delta");
    assert(dash.topPair?.pair.symbol !== undefined, "Test 28: Top pair uses real symbol from valid available data");
    assert(dash.allCurrencies.some(c => c.marketStrength !== null), "Test 28: Dashboard currencies have non-null market strengths");
  }

  // Scenario 8: Regression Tests: Exact Thresholds & Quote Return Fallbacks
  {
    const thresholds = { strongThreshold: 0.10, weakThreshold: -0.10 };

    const testThresholdValues = [
      { ret: 0.21, expected: "STRONG", label: "+0.21%" },
      { ret: 0.10, expected: "STRONG", label: "+0.10%" },
      { ret: 0.09, expected: "NEUTRAL", label: "+0.09%" },
      { ret: 0.00, expected: "NEUTRAL", label: "0.00%" },
      { ret: -0.09, expected: "NEUTRAL", label: "-0.09%" },
      { ret: -0.10, expected: "WEAK", label: "-0.10%" },
      { ret: -0.18, expected: "WEAK", label: "-0.18%" }
    ];

    for (const item of testThresholdValues) {
      const isolatedQuotes = [
        {
          symbol: "EUR/USD",
          baseCurrency: "EUR",
          quoteCurrency: "USD",
          price: 1.08,
          changePercent: item.ret,
          dailyReturnPercent: item.ret,
          timestamp: Date.now(),
          interval: "1day",
          source: "Biquote",
          sourceStatus: "CONNECTED",
          fetchedAt: ""
        }
      ];
      const res = calculateCurrencyMarketStrengths(isolatedQuotes, thresholds, {
        currencies: ["EUR", "USD"],
        requiredPairs: ["EUR/USD"],
        providerStatus: "CONNECTED"
      });
      const eur = res.get("EUR");
      assert(eur?.marketStrength === Math.round(item.ret * 100) / 100, `Threshold Test: EUR marketStrength for ${item.label} matches expected (${item.ret})`);
      assert(eur?.classification === item.expected, `Threshold Test: EUR for ${item.label} correctly classified as ${item.expected}`);
    }

    // 1. dailyReturnPercent present + changePercent missing (null)
    {
      const quote = {
        symbol: "EUR/USD",
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        price: 1.08,
        changePercent: null as any,
        dailyReturnPercent: 0.25,
        timestamp: Date.now(),
        interval: "1day",
        source: "Biquote",
        sourceStatus: "CONNECTED",
        fetchedAt: ""
      };
      const res = calculateCurrencyMarketStrengths([quote], thresholds, {
        currencies: ["EUR", "USD"],
        requiredPairs: ["EUR/USD"],
        providerStatus: "CONNECTED"
      });
      const eur = res.get("EUR");
      assert(eur?.marketStrength !== null && eur?.marketStrength === 0.25, "Quote Return Test: dailyReturnPercent used when changePercent is null");
      assert(eur?.classification === "STRONG", "Quote Return Test: EUR classified as STRONG with dailyReturnPercent=0.25%");
    }

    // 2. changePercent present + dailyReturnPercent missing (null or undefined)
    {
      const quote = {
        symbol: "EUR/USD",
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        price: 1.08,
        changePercent: -0.15,
        dailyReturnPercent: null as any,
        timestamp: Date.now(),
        interval: "1day",
        source: "Biquote",
        sourceStatus: "CONNECTED",
        fetchedAt: ""
      };
      const res = calculateCurrencyMarketStrengths([quote], thresholds, {
        currencies: ["EUR", "USD"],
        requiredPairs: ["EUR/USD"],
        providerStatus: "CONNECTED"
      });
      const eur = res.get("EUR");
      assert(eur?.marketStrength !== null && eur?.marketStrength === -0.15, "Quote Return Test: changePercent used when dailyReturnPercent is null");
      assert(eur?.classification === "WEAK", "Quote Return Test: EUR classified as WEAK with changePercent=-0.15%");
    }

    // 3. Both missing (both null/undefined)
    {
      const quote = {
        symbol: "EUR/USD",
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        price: 1.08,
        changePercent: null as any,
        dailyReturnPercent: null as any,
        timestamp: Date.now(),
        interval: "1day",
        source: "Biquote",
        sourceStatus: "CONNECTED",
        fetchedAt: ""
      };
      const res = calculateCurrencyMarketStrengths([quote], thresholds, {
        currencies: ["EUR", "USD"],
        requiredPairs: ["EUR/USD"],
        providerStatus: "CONNECTED"
      });
      const eur = res.get("EUR");
      assert(eur?.marketStrength === null, "Quote Return Test: Both returns missing -> marketStrength is null (missing data is NOT zero)");
      assert(eur?.classification === "DATA_UNAVAILABLE", "Quote Return Test: Both returns missing -> DATA_UNAVAILABLE");
    }

    // 4. Stale quote
    {
      const quote = {
        symbol: "EUR/USD",
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        price: 1.08,
        changePercent: 0.35,
        dailyReturnPercent: 0.35,
        timestamp: Date.now() - 3600000,
        stale: true,
        interval: "1day",
        source: "Biquote",
        sourceStatus: "CONNECTED",
        fetchedAt: ""
      };
      const res = calculateCurrencyMarketStrengths([quote], thresholds, {
        currencies: ["EUR", "USD"],
        requiredPairs: ["EUR/USD"],
        providerStatus: "CONNECTED"
      });
      const eur = res.get("EUR");
      assert(eur?.marketStrength === null, "Quote Return Test: Stale quote without valid snapshot does not silently become fresh");
      assert(eur?.coverage.stalePairs?.includes("EUR/USD") === true, "Quote Return Test: Stale quote tracked in stalePairs");
    }

    // 5. Partial basket (only 1 out of 2 required pairs present)
    {
      const quote = {
        symbol: "EUR/USD",
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        price: 1.08,
        changePercent: 0.20,
        dailyReturnPercent: 0.20,
        timestamp: Date.now(),
        stale: false,
        interval: "1day",
        source: "Biquote",
        sourceStatus: "CONNECTED",
        fetchedAt: ""
      };
      const res = calculateCurrencyMarketStrengths([quote], thresholds, {
        currencies: ["EUR", "GBP", "USD"],
        requiredPairs: ["EUR/USD", "EUR/GBP"],
        providerStatus: "CONNECTED"
      });
      const eur = res.get("EUR");
      assert(eur?.coverage.status === "PARTIAL", "Partial Basket Test: EUR coverage status is PARTIAL");
      assert(eur?.coverage.available === 1 && eur?.coverage.required === 2, "Partial Basket Test: 1 of 2 pairs available");
      assert(eur?.coverage.missingPairs.includes("EUR/GBP"), "Partial Basket Test: EUR/GBP reported in missingPairs");
    }
  }
}

console.log(`\n================================================================`);
console.log(`ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log(`================================================================\n`);
if (passedTests !== totalTests) {
  process.exit(1);
}
