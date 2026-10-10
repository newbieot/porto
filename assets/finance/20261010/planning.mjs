import {shiftMonth,position,sum} from './engine.mjs';
export function project(startValue,asOf,p,annualReturn){
  if(!Number.isFinite(startValue))return {available:false,points:[],final:null};
  const effective=annualReturn-Math.max(0,annualReturn)*p.returnTaxRate-p.feeRate;
  const monthly=Math.pow(1+effective,1/12)-1,monthlyInflation=Math.pow(1+p.inflation,1/12)-1;
  let value=startValue,contributed=0,months=0;const points=[{date:asOf,value:Math.round(value),real:Math.round(value),contributed:0}];
  for(let m=shiftMonth(asOf.slice(0,7)+'-01',1);m.slice(0,7)<=p.retirementMonth;m=shiftMonth(m,1)){
    months++;const year=+m.slice(0,4),band=p.contributions.find(x=>year>=x.from&&year<=x.to),deposit=band?.monthly||0;
    value*=1+monthly;
    if(!p.reinvestDividends)value-=Math.max(0,value)*p.dividendYield/12;
    if(p.drawdownMonth===m.slice(0,7))value*=1-p.drawdownRate;
    value+=deposit-(p.monthlyWithdrawal||0);contributed+=deposit;
    for(const flow of p.cashSchedules||[])if(m.slice(0,7)>=flow.start&&(!flow.end||m.slice(0,7)<=flow.end))value-=flow.amount;
    if(p.oneOffMonth===m.slice(0,7))value-=p.oneOffWithdrawal||0;
    value=Math.max(0,value);
    points.push({date:m,value:Math.round(value),real:Math.round(value/Math.pow(1+monthlyInflation,months)),contributed});
  }
  const final=points.at(-1),years=months/12,futureExpense=Math.round(p.todayExpense*Math.pow(1+p.inflation,years)),dividendMonthly=Math.round(final.value*p.dividendYield*(1-p.dividendTaxRate)/12);
  return {available:true,points,final:final.value,real:final.real,contributed,months,monthlyRate:monthly,futureExpense,dividendMonthly,coverage:futureExpense?dividendMonthly/futureExpense:null,gap:p.target-final.value};
}
export function carScenario(c,market,options={}) {
  const x={...c.car,...options},p=position(c,market),price=x.price,loan=x.financing?Math.max(0,price-x.downPayment):0;
  const m=x.apr/12,payment=loan?Math.round(m?loan*m/(1-Math.pow(1+m,-x.loanMonths)):loan/x.loanMonths):0;
  const cashPaid=x.financing?price-loan:price;
  const monthlyCash=x.operatingMonthly+Math.round((x.annualInsurance+x.annualTax+x.annualMaintenance)/12);
  const fresh=sum(c.household.employment,x=>x.amount),cashHousehold=c.household.monthlyBudget-c.household.batamMonthlyAccrual;
  const investmentRoom=fresh-cashHousehold-monthlyCash-payment;
  const afterNL=p.nl-cashPaid-loan; // A new liability never makes an illiquid car more affordable.
  const afterFinancial=p.financialAssetsMarket===null?null:p.financialAssetsMarket-cashPaid;
  const checks=[{name:'Mutasi dari Batam terkonfirmasi',ok:x.mutationConfirmed},{name:'Aset finansial minimum',ok:p.financialAssetsMarket!==null&&p.financialAssetsMarket>=x.minAssets},{name:'Net Liquidity setelah pembelian',ok:afterNL>=x.minLiquidity},{name:'Investasi bulanan tetap berjalan',ok:investmentRoom>=x.minInvestment}];
  const depreciation=Math.round(price*x.depreciationRate),interestTotal=Math.max(0,payment*x.loanMonths-loan),fiveYearTCO=monthlyCash*60+Math.round(price*(1-Math.pow(1-x.depreciationRate,5)))+interestTotal;
  return {checks,eligible:checks.every(x=>x.ok),price,loan,cashPaid,payment,monthlyCash,investmentRoom,afterNL,afterFinancial,depreciation,interestTotal,fiveYearTCO,assetRatio:p.financialAssetsMarket?price/p.financialAssetsMarket:null};
}
