// Tiny expression engine using Shunting-Yard (no eval)
// Supports + - × ÷ % and decimals. % is treated as x/100 (unary postfix).

const exprEl = document.getElementById('expr');
const valueEl = document.getElementById('value');
const keysEl = document.getElementById('keys');

let expr = '';
let display = '0';

const isOp = c => '＋−×÷'.includes(c);
const toJsOp = c => ({ '＋': '+', '−': '-', '×': '*', '÷': '/' }[c] || c);

// Tokenize expression into numbers and operators (also handles % postfix)
function tokenize(s) {
  const tokens = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/[0-9.]/.test(ch)) {
      buf += ch;
    } else if (isOp(ch) || ch === '%') {
      if (buf) {
        tokens.push(buf);
        buf = '';
      }
      tokens.push(ch);
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

// Convert infix to RPN (Shunting-Yard)
function toRPN(tokens) {
  const out = [],
    op = [];
  const prec = { '＋': 1, '−': 1, '×': 2, '÷': 2, '%': 3 };
  const rightAssoc = { '%': true }; // postfix behaves like high precedence

  for (let t of tokens) {
    if (!isNaN(t)) {
      out.push(Number(t));
      continue;
    }

    if (t === '%') {
      // postfix: apply to previous number/result
      while (op.length && prec[op.at(-1)] > prec[t]) out.push(op.pop());
      op.push(t);
      continue;
    }

    // operators
    while (op.length && !rightAssoc[t] && prec[op.at(-1)] >= prec[t]) {
      out.push(op.pop());
    }
    op.push(t);
  }
  while (op.length) out.push(op.pop());
  return out;
}

// Evaluate RPN
function evalRPN(rpn) {
  const st = [];
  for (let t of rpn) {
    if (typeof t === 'number') {
      st.push(t);
      continue;
    }
    if (t === '%') {
      const a = st.pop();
      st.push(a / 100);
      continue;
    }
    const b = st.pop(),
      a = st.pop();
    if (a === undefined || b === undefined) return NaN;
    switch (t) {
      case '＋':
        st.push(a + b);
        break;
      case '−':
        st.push(a - b);
        break;
      case '×':
        st.push(a * b);
        break;
      case '÷':
        st.push(b === 0 ? NaN : a / b);
        break;
      default:
        return NaN;
    }
  }
  return st.length ? st[0] : NaN;
}

function compute(s) {
  if (!s) return 0;
  const tokens = tokenize(s);
  const rpn = toRPN(tokens);
  let res = evalRPN(rpn);
  if (!isFinite(res)) return 'Err';
  // normalize floats (avoid 0.30000000000004)
  res = Math.round((res + Number.EPSILON) * 1e12) / 1e12;
  return String(res);
}

function updateUI() {
  exprEl.textContent = expr;
  valueEl.textContent = display;
}

function press(k) {
  if (k === 'C') {
    expr = '';
    display = '0';
    updateUI();
    return;
  }
  if (k === 'DEL') {
    if (expr.length) expr = expr.slice(0, -1);
    display = expr ? tailDisplay(expr) : '0';
    updateUI();
    return;
  }
  if (k === '=') {
    const result = compute(expr || display);
    display = result;
    expr = result === 'Err' ? '' : result;
    updateUI();
    return;
  }
  if (k === '.') {
    // avoid multiple dots in current number
    const tail = getCurrentNumber(expr);
    if (tail.includes('.')) return;
    expr += expr && /[0-9]$/.test(expr) ? '.' : '0.';
    display = tailDisplay(expr);
    updateUI();
    return;
  }
  if (k === '%') {
    // apply only if last token is a number
    if (/[0-9]$/.test(expr)) {
      expr += '%';
      display = tailDisplay(expr);
      updateUI();
    }
    return;
  }
  if (isOp(k)) {
    if (!expr) {
      // allow starting with minus as negative? keep it simple: require number first
      if (k === '−') {
        expr = '0−';
        display = '−';
        updateUI();
      }
      return;
    }
    // replace trailing operator with new one
    if (isOp(expr.at(-1))) expr = expr.slice(0, -1);
    // strip trailing dot
    if (expr.at(-1) === '.') expr = expr.slice(0, -1);
    expr += k;
    display = k;
    updateUI();
    return;
  }
  // number
  if (k >= '0' && k <= '9') {
    // avoid leading zeros like 00
    if (
      expr.endsWith('0') &&
      (expr.length === 1 || isOp(expr.at(-2))) &&
      k !== '0'
    ) {
      expr = expr.slice(0, -1) + k;
    } else {
      expr += k;
    }
    display = tailDisplay(expr);
    updateUI();
    return;
  }
}

function getCurrentNumber(s) {
  const m = s.match(/([0-9]*\.?[0-9]*)$/);
  return m ? m[1] : '';
}

function tailDisplay(s) {
  // For UI, show last number or operator if just pressed
  const last = s.at(-1);
  if (isOp(last) || last === '%') return last;
  const m = s.match(/([0-9]*\.?[0-9]*%?)$/);
  return m && m[1] ? m[1] : s;
}

// Clicks
keysEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  press(btn.dataset.key);
});

// Keyboard support
const mapKey = ev => {
  const k = ev.key;
  if (k >= '0' && k <= '9') return k;
  if (k === '.') return '.';
  if (k === 'Enter' || k === '=') return '=';
  if (k === 'Backspace') return 'DEL';
  if (k === 'Escape') return 'C';
  if (k === '+') return '＋';
  if (k === '-') return '−';
  if (k === '*') return '×';
  if (k === '/') return '÷';
  if (k === '%') return '%';
  return null;
};

window.addEventListener('keydown', ev => {
  const key = mapKey(ev);
  if (!key) return;
  ev.preventDefault();
  press(key);
});

// Init
updateUI();
