/* ════════════════════════════════════════════════════════════════════════════
   classroom/l2-dossiers.js — the Signal Room case pool (Market Maker Level 2).

   Content lives here, engine lives in market-maker-l2.html, so adding a case
   never means touching game logic.

   A DOSSIER is a short real-world brief plus three linked steps. The steps are
   ordered: each one assumes you have understood the one before it. A run draws
   four dossiers from this pool.

   Step shapes:
     type "mcq"    o[] options, a = index of the correct one
     type "num"    a = the number, tol = absolute tolerance, pre = units shown
     type "sign"   a = {p:"up"|"down"|"amb", q:"up"|"down"|"amb"}
                   the player commits to BOTH at once on a 3x3 grid
     type "audit"  arg[] = the steps of somebody's argument,
                   a = index of the FIRST step that goes wrong
   Every step carries:
     cat   category key (see L2_CATS) — drives the diagnostics
     secs  seconds on the clock for this step
     why   the teaching line shown after answering. This is the payload.
   ═══════════════════════════════════════════════════════════════════════════ */

window.L2_CATS = {
  shift: "Shift vs. movement",
  amb:   "Signing an ambiguous case",
  rev:   "Elasticity & revenue",
  det:   "What determines elasticity",
  cross: "Cross-price & income",
  surp:  "Surplus & who captures it",
  short: "Shortage & the clearing price",
  inc:   "Incidence: price or quantity"
};

window.L2_DOSSIERS = [

/* ──────────────────────────────────────────────────────────────────────── */
{id:"tokens", tag:"AI · pricing", title:"Tokens Get Cheap",
 brief:"In eighteen months the price of a million output tokens from a frontier model fell by roughly 95 per cent. Over the same period, the total amount your start-up spends on inference went <em>up</em>.",
 steps:[

 {type:"mcq", cat:"shift", secs:50,
  q:"The fall in the token price, on its own and holding everything else constant, causes:",
  o:["The demand curve for tokens to shift right",
     "A movement down along the demand curve for tokens",
     "The supply curve for tokens to shift left",
     "No change at all until existing contracts are renegotiated"],
  a:1,
  why:"A change in a good's <b>own price</b> never shifts that good's own demand curve. Quantity demanded rises; demand does not. This is the single most common error in the subject, and it does not stop at the lecture hall: it turns up in board decks written by people who should know better."},

 {type:"mcq", cat:"rev", secs:50,
  q:"Your total inference spend <em>rose</em> even though the price per token fell by 95 per cent. Over this range, demand for tokens must be:",
  o:["Perfectly inelastic","Inelastic, |E| &lt; 1","Elastic, |E| &gt; 1","Unit elastic"],
  a:2,
  why:"Spending is P × Q. If P fell and P × Q still rose, then Q must have risen proportionately <b>more</b> than P fell, which is exactly what |E| &gt; 1 means. You do not need the elasticity number to know its class: the direction total expenditure moves when price changes tells you which side of one you are on."},

 {type:"audit", cat:"rev", secs:75,
  q:"An investor memo argues the following. Which step is the <b>first</b> to go wrong?",
  arg:["The price of a million tokens has collapsed by 95 per cent.",
       "So revenue per token has collapsed for every provider.",
       "So total revenue in the inference market has collapsed.",
       "So inference is a bad business to be in."],
  a:2,
  why:"Steps 1 and 2 are fine: revenue <em>per token</em> really did collapse. Step 3 does not follow, because total revenue is price × quantity and the quantity exploded. Step 4 inherits the error, but step 3 is where the reasoning first breaks. Falling unit prices and rising total revenue are perfectly compatible — they are what elastic demand looks like."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"embargo", tag:"Geopolitics · semiconductors", title:"The Export Control",
 brief:"A government restricts exports of its most advanced AI accelerators to a large foreign market. Buyers there cannot legally obtain the top-end part at any price. Demand for AI compute in that market is highly inelastic in the short run: the training runs are already budgeted and the deadlines are already announced.",
 steps:[

 {type:"sign", cat:"shift", secs:45,
  q:"In the restricted market for the top-end accelerator, sign the effect on equilibrium price and quantity.",
  a:{p:"up", q:"down"},
  why:"Supply shifts left; nothing has happened to buyers' willingness to pay, so demand stays put. When only <b>one</b> curve moves, both price and quantity are determined — here price up, quantity down. Ambiguity is never a property of a hard question; it is a symptom of <em>two</em> curves moving at once."},

 {type:"mcq", cat:"cross", secs:50,
  q:"What happens in the market for the <em>previous-generation</em> accelerator, which remains legal to sell?",
  o:["Demand shifts left","Demand shifts right","Supply shifts left","Nothing: it is a separate market"],
  a:1,
  why:"The two are substitutes, and the top-end part has become unobtainable, which is the limiting case of its price rising. Demand for the substitute shifts right. This is the cross-price channel, and it is how a shock in one market walks into the next one. A positive cross-price elasticity is the formal signature of it."},

 {type:"num", cat:"rev", secs:90, pre:"|E| ≈", tol:0.03,
  q:"In a third market, not covered by the restriction, the same disruption raises the price of the top-end part from $30,000 to $39,000, and quantity sold falls from 50,000 to 44,000 units. Compute the price elasticity of demand by the <b>midpoint method</b>. Report the absolute value to two decimals.",
  a:0.49,
  why:"%ΔQ = −6,000 / 47,000 = −12.77%. %ΔP = 9,000 / 34,500 = +26.09%. |E| = 12.77 / 26.09 = <b>0.49</b>, firmly inelastic. Now read what that implies: revenue went from $1,500m to $1,716m, so sellers in that market were made <em>better off</em> by a disruption that cut the quantity they shipped. That is the uncomfortable arithmetic of inelastic demand."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"reunion", tag:"Entertainment · live music", title:"The Reunion Tour",
 brief:"A band reunites after sixteen years. The stadium holds 60,000. Tickets go on sale at a face value of ₹8,000 and the entire allocation clears in eleven minutes. Within the hour the same seats are listed on resale platforms at ₹48,000.",
 steps:[

 {type:"mcq", cat:"short", secs:45,
  q:"Taken together, the eleven-minute sell-out and the six-fold resale premium are evidence that:",
  o:["The face value was above the market-clearing price",
     "The face value was below the market-clearing price",
     "The face value was at the market-clearing price",
     "Nothing can be inferred about the market-clearing price"],
  a:1,
  why:"A price set below equilibrium produces excess demand. The eleven-minute queue and the resale premium are the two visible symptoms of one underlying fact: at ₹8,000, far more than 60,000 people want a seat. Had the face value been at or above clearing, seats would still be on sale."},

 {type:"num", cat:"surp", secs:75, pre:"₹", tol:0.5,
  q:"A reseller buys at the ₹8,000 face value and sells at ₹48,000. If 9,000 seats are resold this way, how much surplus do resellers capture in total? Answer in ₹ crore.",
  a:36,
  why:"9,000 × (48,000 − 8,000) = ₹36 crore. Notice what this figure is and is not. It is not value created — no extra seat exists — it is surplus <b>transferred</b>, out of the pockets of whoever got a seat at face value and into the resellers'. Under-pricing a scarce good does not abolish the money; it decides who collects it."},

 {type:"audit", cat:"short", secs:75,
  q:"A newspaper column argues the following. Which step is the <b>first</b> to go wrong?",
  arg:["Sixty thousand seats sold out in eleven minutes.",
       "Resale platforms are now listing them at six times face value.",
       "So the resale platforms created this shortage.",
       "Ban resale and the shortage will disappear."],
  a:2,
  why:"The shortage was created the moment the promoter set a face value far below what 60,000 seats would clear at. Resale is a <em>consequence</em> of that gap, not its cause: step 3 reverses the causation. Banning resale removes the visible symptom, not the excess demand — the 60,000 seats still have to be rationed somehow, only now by refresh speed and luck instead of by willingness to pay."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"quickcom", tag:"Business · quick commerce", title:"Fifteen Minutes",
 brief:"A quick-commerce app delivers groceries in under fifteen minutes. It charges a ₹35 delivery fee, waived on baskets above ₹599. It also sells a ₹199-a-month membership that waives the fee entirely.",
 steps:[

 {type:"mcq", cat:"surp", secs:55,
  q:"The ₹599 waiver threshold and the paid membership are best understood as:",
  o:["Cost recovery, since large baskets are cheaper to deliver",
     "Devices that let different customers sort themselves into different effective prices",
     "A loss-leader with no particular pricing logic",
     "A way of raising the price to every customer equally"],
  a:1,
  why:"A large basket is not cheaper to deliver; if anything it is heavier. These are <b>sorting devices</b>. The price-sensitive shopper consolidates orders or buys the membership; the hurried, price-insensitive one pays ₹35 without thinking about it. The firm ends up charging different effective prices to buyers with different willingness to pay, without ever posting two prices for the same item on the shelf."},

 {type:"mcq", cat:"det", secs:50,
  q:"Which of these would make demand for this service <em>more</em> elastic?",
  o:["The nearest physical supermarket shuts down",
     "A rival app launches in the same neighbourhood with the same catalogue",
     "The service becomes the only one licensed to operate after 10 p.m.",
     "Customers come to treat fifteen-minute delivery as a daily necessity"],
  a:1,
  why:"Elasticity rises with the availability of close substitutes. Options (a) and (c) <em>remove</em> substitutes and (d) pushes the good from luxury towards necessity — all three make demand less elastic. Only a rival with the same catalogue in the same neighbourhood gives buyers somewhere to go the moment the price moves."},

 {type:"sign", cat:"amb", secs:55,
  q:"Two things happen in one neighbourhood at once: several new dark stores open, and a long monsoon spell makes people much less willing to step outside. Sign the effect on price and quantity.",
  a:{p:"amb", q:"up"},
  why:"Supply shifts right and demand shifts right. Both push quantity up, so <b>quantity is determined</b>. They push price in opposite directions, so price depends on which shift is bigger and cannot be signed from the information given. The rule worth memorising: when both curves move the <em>same</em> way, quantity is signed and price is not; when they move in <em>opposite</em> ways, price is signed and quantity is not."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"aftermarket", tag:"Tech · hardware", title:"The Aftermarket",
 brief:"A wave of capital-expenditure cuts leads several firms to liquidate data-centre hardware. Tens of thousands of two-year-old accelerators hit the second-hand market in a single quarter.",
 steps:[

 {type:"sign", cat:"shift", secs:45,
  q:"Sign the effect on price and quantity in the market for <em>used</em> accelerators.",
  a:{p:"down", q:"up"},
  why:"A large number of additional sellers arrives, so supply shifts right while demand is unchanged. One curve moved, so both are signed: price down, quantity up. Note that the buyers did not become more eager — more units trade because the price fell, which is a movement <em>along</em> the demand curve, not a shift of it."},

 {type:"mcq", cat:"cross", secs:50,
  q:"What is the effect on the market for <em>new</em> accelerators of the same class?",
  o:["Demand for new units shifts left",
     "Demand for new units shifts right",
     "Supply of new units shifts right",
     "No effect: they are different products"],
  a:0,
  why:"Used and new units are substitutes, and the substitute just got much cheaper, so demand for new units shifts left. Be precise about <em>which</em> curve moves: a change in the price of a related good moves the <b>demand</b> curve for this good. Nothing whatever has changed about the cost of fabricating a new accelerator, so supply stays exactly where it was."},

 {type:"audit", cat:"shift", secs:75,
  q:"An analyst note argues the following. Which step is the <b>first</b> to go wrong?",
  arg:["A flood of used units has pushed second-hand prices down sharply.",
       "Buyers are substituting used units for new ones.",
       "So the supply curve for new units has shifted left.",
       "So new-unit prices will rise."],
  a:2,
  why:"Steps 1 and 2 are correct observations. Step 3 misassigns the shift: substitution by buyers moves the <b>demand</b> curve for new units, never their supply curve. Supply moves only when something changes on the seller's side — input prices, technology, the number of sellers, or expectations. Step 4 then gets the direction wrong too, since a leftward demand shift lowers the price rather than raising it."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"vinyl", tag:"Culture · music", title:"Vinyl and Vibes",
 brief:"Vinyl records outsell CDs for the third year running. Buyers skew young, and sales are growing fastest in the highest-income segments. A colleague tells you vinyl must be an inferior good, “because it is old technology that people abandoned the moment something better arrived”.",
 steps:[

 {type:"mcq", cat:"cross", secs:50,
  q:"Your colleague’s use of the term “inferior good” is:",
  o:["Correct, since vinyl is technologically obsolete",
     "Incorrect: “inferior” is defined by a negative income elasticity, not by age or quality",
     "Correct, since CDs historically replaced vinyl",
     "Incorrect, because every good is normal in the long run"],
  a:1,
  why:"“Inferior” in economics is a claim about exactly one number: the income elasticity of demand. If quantity demanded <b>rises</b> when income rises, the good is normal, however antique it happens to be. That sales grow fastest among high-income buyers is direct evidence of a <em>positive</em> income elasticity. The everyday meaning of the word is a trap laid for the careless."},

 {type:"num", cat:"cross", secs:70, pre:"Eₘ =", tol:0.05,
  q:"A survey finds that when average buyer income rose 8 per cent, vinyl purchases rose 20 per cent, with prices held constant. Compute the income elasticity of demand, to two decimals.",
  a:2.50,
  why:"20 / 8 = <b>+2.50</b>. Positive, so the good is normal. Greater than one, so it is a <em>luxury</em> in the technical sense: demand rises more than proportionately with income. Again the technical word is doing narrow work — “luxury” here is a statement about a number, not about a price tag or a lifestyle."},

 {type:"mcq", cat:"cross", secs:50,
  q:"A study finds the cross-price elasticity of demand between a streaming subscription and vinyl records is −0.4. This implies they are:",
  o:["Substitutes","Complements","Unrelated goods","Evidence that vinyl is inferior"],
  a:1,
  why:"A <b>negative</b> cross-price elasticity means the two move together: when streaming gets dearer, people buy <em>fewer</em> records, not more. That is the signature of complements. It is a plausible finding here, because streaming is how most listeners discover the album they then decide to own."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"freetier", tag:"AI · business models", title:"The Free Tier",
 brief:"An AI writing tool has 4 million users on a free tier and 200,000 on a paid tier at ₹1,600 a month. The paid tier adds higher limits and a faster model. Internally the company describes the free tier as “the top of the funnel”.",
 steps:[

 {type:"mcq", cat:"surp", secs:55,
  q:"In surplus terms, the two-tier structure principally allows the firm to:",
  o:["Lower its production costs",
     "Convert part of consumer surplus into producer surplus, by letting high-value users reveal themselves",
     "Raise total surplus without affecting how it is divided",
     "Charge every user exactly their willingness to pay"],
  a:1,
  why:"With a single posted price the firm must pick one point on the demand curve and leave every rupee of surplus above it to buyers. Two tiers let the users who value the product most sort themselves into the paid tier and hand part of that surplus over. It is <em>not</em> perfect price discrimination: option (d) would require knowing each individual's valuation, which no firm can actually do."},

 {type:"num", cat:"surp", secs:70, pre:"₹", tol:0.3,
  q:"Among the 200,000 paying users, average willingness to pay is ₹2,400 a month against a price of ₹1,600. Compute the total monthly consumer surplus of the paying users, in ₹ crore.",
  a:16,
  why:"(2,400 − 1,600) × 200,000 = ₹16 crore a month. Even a firm that has successfully sorted its highest-value users into a paid tier still leaves a great deal of surplus on the table, because it charges all of them the same ₹1,600. Capturing the rest would need finer discrimination than the firm can observe."},

 {type:"audit", cat:"surp", secs:80,
  q:"A growth memo argues the following. Which step is the <b>first</b> to go wrong?",
  arg:["Free users cost us money and pay us nothing.",
       "So their consumer surplus is zero.",
       "So removing the free tier costs those users nothing.",
       "So we should remove it."],
  a:1,
  why:"Step 1 may be perfectly true as an accounting matter. Step 2 does not follow at all. Consumer surplus is willingness to pay <em>minus price paid</em>, and at a price of zero every free user with any positive valuation enjoys surplus equal to their entire valuation. Paying nothing is the condition under which per-user surplus is <b>largest</b>, not zero. Steps 3 and 4 simply inherit the mistake."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"minerals", tag:"Geopolitics · supply chains", title:"Critical Minerals",
 brief:"A country that refines most of the world’s supply of a critical battery mineral imposes export quotas. Prices quadruple within a month. Two years later, with new refineries running elsewhere, prices have fallen most of the way back.",
 steps:[

 {type:"mcq", cat:"inc", secs:50,
  q:"The very large <em>initial</em> price jump is best explained by:",
  o:["Demand being highly elastic in the short run",
     "Supply being highly inelastic in the short run",
     "Supply being highly elastic in the short run",
     "The quota directly raising the cost of refining"],
  a:1,
  why:"When supply cannot respond in quantity, a shock is absorbed almost entirely in <b>price</b>. Refining capacity takes years to build, so the short-run supply curve is close to vertical and any leftward shift travels a long way up the demand curve. The steeper the curve that cannot move, the more violent the price."},

 {type:"mcq", cat:"det", secs:50,
  q:"Why do prices fall back over the following two years?",
  o:["Demand becomes inelastic in the long run",
     "Supply becomes more elastic in the long run, as new capacity can be built",
     "Market forces automatically lift the quota",
     "Buyers’ willingness to pay falls to zero"],
  a:1,
  why:"<b>Time is a determinant of elasticity on both sides of the market.</b> Given long enough, producers elsewhere enter, existing plants expand, and buyers substitute or redesign around the input. The long-run supply curve is far flatter than the short-run one, so the identical shock produces a much smaller price effect once the clock has run."},

 {type:"sign", cat:"shift", secs:50,
  q:"Now consider the market for the <em>batteries</em> made from this mineral, during the first month only. Sign the effect on price and quantity.",
  a:{p:"up", q:"down"},
  why:"The mineral is an <b>input</b>, so a sharp rise in its price shifts the supply curve for batteries left. Nothing has happened to what buyers are willing to pay for a battery, so demand does not move. One curve, therefore both signed: price up, quantity down. Resist the pull towards “ambiguous” — a question feeling hard is not the same as a case being genuinely unsigned."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"streaming", tag:"Entertainment · streaming", title:"Price Up, Subscribers Up",
 brief:"A streaming service raises its monthly price by 18 per cent. Over the following quarter its subscriber count rises by 6 per cent. That same quarter saw the release of its most-watched original series ever. An executive concludes that the service’s demand curve slopes upward.",
 steps:[

 {type:"audit", cat:"shift", secs:75,
  q:"The executive reasons as follows. Which step is the <b>first</b> to go wrong?",
  arg:["We raised the price by 18 per cent.",
       "Subscribers then rose by 6 per cent.",
       "So price and quantity moved in the same direction.",
       "So our demand curve slopes upward."],
  a:3,
  why:"Steps 1 to 3 are simply the observed facts, and they are stated correctly. Step 4 is the error. The law of demand holds <em>other things equal</em>, and other things were emphatically not equal: a blockbuster release shifted the whole demand curve right. What the executive has is two points on <b>two different curves</b>, not one curve sloping the wrong way."},

 {type:"mcq", cat:"det", secs:55,
  q:"To estimate the actual price elasticity of demand from this episode, what does the analyst most need?",
  o:["A longer time series of prices alone",
     "Some way to separate the price change from the simultaneous change in content",
     "The firm’s cost data",
     "The subscriber counts of every rival"],
  a:1,
  why:"The difficulty is not a shortage of price data; it is that the price moved at the same moment as a demand shifter. Elasticity is <em>defined</em> holding other determinants constant, so the analyst needs some situation — another market, another period, a staggered rollout — where the price changed but the content did not. This is the whole problem of identification, arriving early and in disguise."},

 {type:"sign", cat:"shift", secs:45,
  q:"Now consider the blockbuster release entirely on its own, with nothing else changing and the price free to adjust. Sign the effect on price and quantity.",
  a:{p:"up", q:"up"},
  why:"A pure rightward shift in demand, with supply unchanged: price up and quantity up together, both determined. Look carefully at what you have just derived — it is precisely the pattern the executive observed. The same two facts are fully explained by an ordinary downward-sloping demand curve that <em>moved</em>, and that explanation costs you no exotic assumptions at all."}
]},

/* ──────────────────────────────────────────────────────────────────────── */
{id:"grid", tag:"AI · energy", title:"The Grid Bill",
 brief:"New AI data centres in a region contract for large blocks of electricity. Generation capacity is very costly to expand quickly. Households in the region find their tariffs rising.",
 steps:[

 {type:"mcq", cat:"det", secs:50,
  q:"The data centres’ demand for electricity is best described as:",
  o:["A final consumption demand",
     "A derived demand, arising from demand for the computation that the electricity makes possible",
     "A supply-side phenomenon",
     "Perfectly elastic"],
  a:1,
  why:"Nobody wants electricity for its own sake. Firms demand it because they demand what it produces, which is why this is called <b>derived demand</b>. It is the mechanism by which a surge in one market (inference) shows up as a shift in a quite different one (power), and it is the mirror image of the rule that a rise in an input price shifts the supply curve of the output."},

 {type:"sign", cat:"inc", secs:50,
  q:"In the regional electricity market in the short run, from the data-centre contracts alone, sign the effect on price and quantity.",
  a:{p:"up", q:"up"},
  why:"Demand shifts right against an unchanged and very steep supply curve, so both are signed: price up, quantity up. But notice the <em>proportions</em>. Because supply is highly inelastic, almost all of the adjustment lands on price and very little on quantity. Which side of a market absorbs a shock in price rather than in quantity is settled by which side is less elastic."},

 {type:"mcq", cat:"shift", secs:55,
  q:"From a household’s point of view, the rise in their tariff is:",
  o:["Evidence that the utility is overcharging them specifically",
     "The market price rising because a new group of buyers entered the same market",
     "A rightward shift in household demand for electricity",
     "A leftward shift in the supply of electricity"],
  a:1,
  why:"Nothing has changed about household demand or about generating capacity. A second group of buyers entered the same market, shifting <b>market</b> demand right and raising the equilibrium price everyone faces. Households then move up along their own unchanged demand curve. This is the shift-versus-movement distinction seen from a single buyer's seat — “the market moved” is not the same claim as “I moved”."}
]}
,
/* ──────────────────────────────────────────────────────────────────────── */
{id:"evwar", tag:"Business · electric vehicles", title:"Two Things At Once",
 brief:"Battery cell prices fall sharply as a wave of new cell capacity comes online. In the same quarter, a large economy withdraws the consumer purchase subsidy on electric cars.",
 steps:[

 {type:"sign", cat:"amb", secs:60,
  q:"Sign the effect on price and quantity in the market for new electric cars.",
  a:{p:"down", q:"amb"},
  why:"Cheaper cells shift supply right. A withdrawn subsidy shifts demand left. Both push price <b>down</b>, so price is determined. They push quantity in opposite directions, so quantity turns on which shift is larger — and nothing in the brief tells you that. “Ambiguous” here is not a hedge; it is the correct and complete answer."},

 {type:"sign", cat:"amb", secs:60,
  q:"Different quarter, different pair of events: battery cell prices fall again, and at the same time a fuel-price spike makes petrol cars much dearer to run. Sign the effect on price and quantity for electric cars.",
  a:{p:"amb", q:"up"},
  why:"Supply shifts right again, but now demand shifts <em>right</em> too, because a substitute has become more expensive to own. Both push quantity up, so quantity is determined. Their price effects offset, so price is ambiguous. Compare this with the previous step: the same supply shift, and yet it is the other variable that can be signed."},

 {type:"mcq", cat:"amb", secs:55,
  q:"Across those two cases, what decides which of price and quantity can be signed?",
  o:["Whichever curve happens to shift further",
     "Whether the two curves shift in the same direction or in opposite directions",
     "Whether demand is elastic or inelastic",
     "Whether the two events happen simultaneously or one after the other"],
  a:1,
  why:"When both curves move the <b>same</b> way, their quantity effects reinforce and their price effects offset, so quantity is signed and price is not. When they move in <b>opposite</b> ways, it is exactly reversed. Which shift is larger settles the magnitude, and the direction of the unsigned variable — but qualitative information can never tell you that, which is precisely why the honest answer is “ambiguous” rather than a guess."}
]}

];
