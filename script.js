// Theme handling
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
body.dataset.theme = savedTheme;

themeToggle.addEventListener('click', () => {
  const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
  body.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
});

// Calculator functionality
const calculatorForm = document.getElementById('calculatorForm');
const resultsDiv = document.getElementById('results');

function calculateTradeSize(portfolioSize, riskPercent, entryPrice, stopPrice) {
  const riskAmount = (portfolioSize * riskPercent) / 100;
  const percentChange = Math.abs((stopPrice - entryPrice) / entryPrice);
  return riskAmount / percentChange;
}

function calculatePotentialLoss(coinAmount, entryPrice, stopPrice) {
  return coinAmount * (stopPrice - entryPrice);
}

function calculatePotentialProfit(coinAmount, entryPrice, targetPrice) {
  return coinAmount * (targetPrice - entryPrice);
}

function formatCurrency(value, decimals = 4) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

calculatorForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const portfolioSize = parseFloat(document.getElementById('portfolioSize').value);
  const entryRiskPercent = parseFloat(document.getElementById('riskPercent').value);
  const dcaRiskPercent = document.getElementById('dcaRiskPercent').value ? parseFloat(document.getElementById('dcaRiskPercent').value) : 0;
  const entryPrice = parseFloat(document.getElementById('entryPrice').value);
  const stopPrice = parseFloat(document.getElementById('stopPrice').value);
  
  // Get DCA prices (filter out empty inputs)
  const dcaPrices = Array.from(document.querySelectorAll('.dca-price'))
    .map(input => input.value ? parseFloat(input.value) : null)
    .filter(price => price !== null && !isNaN(price));
  
  // Calculate position sizes
  let positions = [];
  let totalCoins = 0;
  let totalAmount = 0;
  
  // Calculate main entry position
  const mainTradeAmount = calculateTradeSize(portfolioSize, entryRiskPercent, entryPrice, stopPrice);
  const mainCoinAmount = mainTradeAmount / entryPrice;
  
  positions.push({
    type: 'Entry',
    price: entryPrice,
    amount: mainTradeAmount,
    coins: mainCoinAmount
  });
  
  totalCoins += mainCoinAmount;
  totalAmount += mainTradeAmount;
  
  // Calculate DCA positions if DCA risk percent is provided
  if (dcaRiskPercent > 0 && dcaPrices.length > 0) {
    const riskPerDCA = dcaRiskPercent / dcaPrices.length;
    
    for (const dcaPrice of dcaPrices) {
      const dcaTradeAmount = calculateTradeSize(portfolioSize, riskPerDCA, dcaPrice, stopPrice);
      const dcaCoinAmount = dcaTradeAmount / dcaPrice;
      
      positions.push({
        type: 'DCA',
        price: dcaPrice,
        amount: dcaTradeAmount,
        coins: dcaCoinAmount
      });
      
      totalCoins += dcaCoinAmount;
      totalAmount += dcaTradeAmount;
    }
  }
  
  // Get take profit targets (filter out empty inputs)
  const takeProfitPrices = Array.from(document.querySelectorAll('.tp-price'))
    .map(input => input.value ? parseFloat(input.value) : null)
    .filter(price => price !== null && !isNaN(price))
    .sort((a, b) => a - b);
  
  // Calculate total potential profit from all TPs
  let totalPotentialProfit = 0;
  let highestRiskRewardRatio = 0;
  const totalRiskAmount = (portfolioSize * (entryRiskPercent + dcaRiskPercent)) / 100;
  
  if (takeProfitPrices.length > 0) {
    takeProfitPrices.forEach(tp => {
      const profit = calculatePotentialProfit(totalCoins, entryPrice, tp);
      totalPotentialProfit += profit;
      const rr = Math.abs(profit / totalRiskAmount);
      if (rr > highestRiskRewardRatio) highestRiskRewardRatio = rr;
    });
  }
  
  // Generate results HTML
  let resultsHTML = `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-slate-100 mb-6">Trade Details</h2>
      
      <div class="result-section">
        <h3 class="text-lg font-semibold text-slate-300 mb-3">Position Breakdown</h3>
        ${positions.map(pos => `
          <div class="mb-6">
            <div class="text-blue-400">${pos.type} @ ${formatCurrency(pos.price)}</div>
            <div class="text-green-400">Amount: ${formatCurrency(pos.amount, 0)}</div>
            <div class="text-yellow-400">${Math.round(pos.coins)} coins</div>
          </div>
        `).join('')}
      </div>
      
      ${takeProfitPrices.length > 0 ? `
        <div class="result-section">
          <h3 class="text-lg font-semibold text-slate-300 mb-3">Take Profit Targets</h3>
          ${takeProfitPrices.map((tp, index) => {
            const profit = calculatePotentialProfit(totalCoins, entryPrice, tp);
            const riskRewardRatio = Math.abs(profit / totalRiskAmount);
            
            return `
              <div class="mb-6">
                <div class="text-yellow-400">TP ${index + 1} @ ${formatCurrency(tp)}</div>
                <div class="text-green-400">Profit: ${formatCurrency(profit, 0)}</div>
                <div class="text-purple-400">R/R: 1:${riskRewardRatio.toFixed(2)}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
      
      <div class="result-section">
        <h3 class="text-lg font-semibold text-slate-300 mb-3">Position Size</h3>
        <div class="text-2xl font-bold">
          <div>Amount: <span class="text-blue-400">${formatCurrency(totalAmount, 0)}</span></div>
          <div>Coins: <span class="text-blue-400">${Math.round(totalCoins)}</span></div>
        </div>
      </div>
      
      <div class="result-section">
        <h3 class="text-lg font-semibold text-slate-300 mb-3">Potential Loss</h3>
        <div class="text-2xl font-bold text-red-500">${formatCurrency(totalRiskAmount, 0)}</div>
        <div class="risk-bar">
          <div class="risk-bar-fill" style="width: ${entryRiskPercent + dcaRiskPercent}%"></div>
        </div>
        <p class="text-sm text-slate-400">${(entryRiskPercent + dcaRiskPercent).toFixed(2)}% of portfolio</p>
      </div>
      
      ${takeProfitPrices.length > 0 ? `
        <div class="result-section">
          <h3 class="text-lg font-semibold text-slate-300 mb-3">Potential Profit</h3>
          <div class="text-2xl font-bold text-green-500">${formatCurrency(totalPotentialProfit, 0)}</div>
          <p class="text-sm text-slate-400">Max Risk/Reward: 1:${highestRiskRewardRatio.toFixed(2)}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  resultsDiv.innerHTML = resultsHTML;
});

// Copy functionality
function copyTradeDetails() {
  const positions = Array.from(document.querySelectorAll('.result-section'));
  let details = '';
  
  positions.forEach(section => {
    const title = section.querySelector('h3').textContent;
    details += `${title}\n\n`;
    
    const entries = Array.from(section.querySelectorAll('.mb-6'));
    entries.forEach(entry => {
      const lines = Array.from(entry.children).map(div => div.textContent);
      details += lines.join('\n') + '\n\n';
    });
  });
  
  navigator.clipboard.writeText(details.trim());
  
  const copyButton = document.querySelector('.copy-button');
  copyButton.classList.add('copied');
  setTimeout(() => copyButton.classList.remove('copied'), 2000);
}

// DCA and Take Profit functionality
const dcaEntriesList = document.getElementById('dcaEntriesList');
const takeProfitList = document.getElementById('takeProfitList');
const addDCAButton = document.getElementById('addDCA');
const addTPButton = document.getElementById('addTP');

function createDCAEntry() {
  const div = document.createElement('div');
  div.className = 'dca-entry';
  div.innerHTML = `
    <input type="number" class="dca-price" min="0.00000001" step="any" placeholder="DCA Price">
    <button type="button" class="remove-dca">×</button>
  `;
  
  div.querySelector('.remove-dca').addEventListener('click', () => {
    div.remove();
  });
  
  return div;
}

function createTPEntry() {
  const div = document.createElement('div');
  div.className = 'tp-entry';
  div.innerHTML = `
    <input type="number" class="tp-price" min="0.00000001" step="any" placeholder="Target Price">
    <button type="button" class="remove-tp">×</button>
  `;
  
  div.querySelector('.remove-tp').addEventListener('click', () => {
    div.remove();
  });
  
  return div;
}

addDCAButton.addEventListener('click', () => {
  dcaEntriesList.appendChild(createDCAEntry());
});

addTPButton.addEventListener('click', () => {
  takeProfitList.appendChild(createTPEntry());
});

// Solana address copy functionality
const copyAddress = document.getElementById('copyAddress');
const solAddress = document.getElementById('solAddress');

copyAddress.addEventListener('click', () => {
  navigator.clipboard.writeText(solAddress.textContent);
  copyAddress.classList.add('copied');
  setTimeout(() => copyAddress.classList.remove('copied'), 2000);
});
