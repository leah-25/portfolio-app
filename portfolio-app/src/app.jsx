import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * PortfolioApp — lightweight, client‑side asset tracker
 * - Add stocks/crypto lots (qty, buy price, currency)
 * - Auto‑fetch current prices (Crypto: CoinGecko / Stocks: Finnhub if API key, otherwise Yahoo best‑effort)
 * - Converts to base currency (KRW or USD) with live FX (exchangerate.host)
 * - Persists to LocalStorage; import/export JSON; manual price override
 *
 * Notes:
 * - For the most reliable real‑time stock prices, add a free Finnhub API key in Settings.
 * - Yahoo fallback may work via browser CORS but is not guaranteed.
 * - CoinGecko works without a key and supports KRW/USD.
 */

/*************************
 * Utilities & Hooks
 *************************/
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const CURRENCIES = ["KRW", "USD"];

function formatCurrency(n, ccy) {
  if (n == null || Number.isNaN(n)) return "-";
  try {
    // For KRW, no decimals commonly; for USD, 2 decimals
    const minFrac = ccy === "USD" ? 2 : 0;
    const maxFrac = ccy === "USD" ? 2 : 0;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${ccy}`;
  }
}

/*************************
 * Pricing Services
 *************************/
const CoinGecko = {
  _coinListCache: null,
  async getCoinList() {
    if (this._coinListCache) return this._coinListCache;
    const res = await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=false");
    if (!res.ok) throw new Error("CoinGecko coins list failed");
    const data = await res.json();
    this._coinListCache = data; // [{id, symbol, name}]
    return data;
  },
  async mapSymbolsToIds(symbols /* array of e.g., ["btc","eth"] */) {
    const list = await this.getCoinList();
    const map = {};
    const lower = new Set(symbols.map((s) => s.toLowerCase()));
    for (const c of list) {
      if (lower.has(c.symbol.toLowerCase())) {
        // Prefer exact symbol match; if multiple coins share a symbol, first match wins
        if (!map[c.symbol.toLowerCase()]) map[c.symbol.toLowerCase()] = c.id;
      }
    }
    return map; // { btc: 'bitcoin', eth: 'ethereum' }
  },
  async pricesByIds(ids, vs = ["krw", "usd"]) {
    if (!ids.length) return {};
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=${encodeURIComponent(vs.join(","))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("CoinGecko price failed");
    return await res.json(); // { bitcoin: { krw: 123, usd: 0.1 } }
  },
};

const FX = {
  _cache: {},
  async getRate(base, target) {
    if (base === target) return 1;
    const key = `${base}_${target}`;
    if (this._cache[key] && Date.now() - this._cache[key].t < 10 * 60 * 1000) {
      return this._cache[key].v;
    }
    // exchangerate.host supports CORS & no key
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("FX fetch failed");
    const data = await res.json();
    const v = data?.rates?.[target] ?? null;
    if (v) this._cache[key] = { v, t: Date.now() };
    return v;
  },
};

const Stocks = {
  async quoteYahoo(symbol) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Yahoo quote failed");
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) throw new Error("Ticker not found");
    return {
      price: q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null,
      currency: q.currency || null,
      name: q.longName || q.shortName || symbol,
    };
  },
  async quoteFinnhub(symbol, apiKey) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Finnhub quote failed");
    const data = await res.json();
    if (data && typeof data.c === "number" && data.c > 0) {
      return { price: data.c, currency: "USD", name: symbol };
    }
    throw new Error("Finnhub quote invalid");
  },
  async quote(symbol, pref /* {finnhubKey?, prefer:"finnhub"|"yahoo"} */) {
    const prefer = pref?.prefer || (pref?.finnhubKey ? "finnhub" : "yahoo");
    if (prefer === "finnhub" && pref?.finnhubKey) {
      try {
        return await Stocks.quoteFinnhub(symbol, pref.finnhubKey);
      } catch (e) {
        // fallback to Yahoo
        try { return await Stocks.quoteYahoo(symbol); } catch (e2) { throw e2; }
      }
    } else {
      try {
        return await Stocks.quoteYahoo(symbol);
      } catch (e) {
        if (pref?.finnhubKey) return await Stocks.quoteFinnhub(symbol, pref.finnhubKey);
        throw e;
      }
    }
  },
};

/*************************
 * Types
 *************************/
// type: 'stock' | 'crypto' | 'cash'
// buyCurrency: 'KRW' | 'USD'
// manualPrice?: { price:number, currency:string }

/*************************
 * UI Components
 *************************/
function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function RowButton({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

/*************************
 * Main App
 *************************/
export default function PortfolioApp() {
  const [items, setItems] = useLocalStorage("pf_items_v1", []);
  const [settings, setSettings] = useLocalStorage("pf_settings_v1", {
    baseCurrency: "KRW",
    finnhubKey: "",
    refreshMin: 5,
  });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [fx, setFx] = useState({ USDKRW: 1350 });
  const refreshTimer = useRef(null);

  // Draft new item
  const [draft, setDraft] = useState({
    type: "stock",
    symbol: "",
    name: "",
    quantity: "",
    buyPrice: "",
    buyCurrency: "KRW",
    date: new Date().toISOString().slice(0, 10),
    manualPriceOn: false,
    manualPrice: "",
    manualCurrency: "KRW",
    notes: "",
  });

  // Derived: price map {id: {price, currency, name}}
  const [priceMap, setPriceMap] = useState({});

  const base = settings.baseCurrency || "KRW";

  function baseConvert(amount, fromCcy) {
    if (fromCcy === base) return amount;
    if (fromCcy === "USD" && base === "KRW") return amount * (fx.USDKRW || 0);
    if (fromCcy === "KRW" && base === "USD") return amount / (fx.USDKRW || 1);
    return amount; // fallback
  }

  async function fetchFx() {
    try {
      const rate = await FX.getRate("USD", "KRW");
      if (rate) setFx({ USDKRW: rate });
    } catch {}
  }

  async function fetchPrices() {
    setLoading(true);
    try {
      await fetchFx();

      // Separate assets
      const stocks = items.filter((x) => x.type === "stock");
      const cryptos = items.filter((x) => x.type === "crypto");

      const newMap = {};

      // Crypto via CoinGecko
      if (cryptos.length) {
        const symbols = [...new Set(cryptos.map((x) => x.symbol.trim().toLowerCase()))];
        try {
          const symToId = await CoinGecko.mapSymbolsToIds(symbols);
          const ids = Object.values(symToId);
          const prices = await CoinGecko.pricesByIds(ids, ["krw", "usd"]);
          for (const it of cryptos) {
            const id = symToId[it.symbol.trim().toLowerCase()];
            if (id && prices[id]) {
              const pKRW = prices[id].krw;
              const pUSD = prices[id].usd;
              newMap[it.id] = {
                price: base === "KRW" ? pKRW : pUSD,
                currency: base,
                name: it.name || it.symbol.toUpperCase(),
                source: "CoinGecko",
              };
            }
          }
        } catch (e) {
          console.warn("Crypto pricing failed", e);
        }
      }

      // Stocks via Finnhub or Yahoo per item
      for (const it of stocks) {
        try {
          const q = await Stocks.quote(it.symbol.trim(), {
            finnhubKey: settings.finnhubKey?.trim() || "",
            prefer: settings.finnhubKey ? "finnhub" : "yahoo",
          });
          let p = q.price;
          let ccy = q.currency || "USD";
          const name = q.name || it.name || it.symbol.toUpperCase();
          // Convert to base
          const pBase = baseConvert(p, ccy);
          newMap[it.id] = { price: pBase, currency: base, name, source: settings.finnhubKey ? "Finnhub" : "Yahoo" };
        } catch (e) {
          console.warn("Stock quote failed", it.symbol, e);
        }
      }

      setPriceMap((prev) => ({ ...prev, ...newMap }));
      setLastRefresh(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }

  // Auto refresh
  useEffect(() => {
    fetchPrices();
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    const ms = Math.max(1, Number(settings.refreshMin) || 5) * 60 * 1000;
    refreshTimer.current = setInterval(fetchPrices, ms);
    return () => clearInterval(refreshTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, settings.baseCurrency, settings.finnhubKey, settings.refreshMin]);

  function addItem() {
    const qty = Number(draft.quantity);
    const bp = Number(draft.buyPrice);
    if (!draft.symbol || !qty || !bp) return alert("심볼/수량/매수가를 입력하세요.");
    const it = {
      id: uuid(),
      type: draft.type,
      symbol: draft.symbol.trim(),
      name: draft.name.trim(),
      quantity: qty,
      buyPrice: bp,
      buyCurrency: draft.buyCurrency,
      date: draft.date,
      notes: draft.notes.trim(),
      manualPrice: draft.manualPriceOn && draft.manualPrice ? Number(draft.manualPrice) : null,
      manualCurrency: draft.manualPriceOn ? draft.manualCurrency : null,
    };
    setItems((xs) => [...xs, it]);
    setDraft({ ...draft, symbol: "", name: "", quantity: "", buyPrice: "", manualPrice: "", notes: "" });
  }

  function removeItem(id) {
    if (!confirm("삭제할까요?")) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    setPriceMap((m) => {
      const c = { ...m }; delete c[id]; return c;
    });
  }

  function updateItem(id, patch) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ items, settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.items)) setItems(data.items);
        if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
        alert("가져오기가 완료되었습니다.");
      } catch {
        alert("유효한 JSON 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Aggregations
  const rows = useMemo(() => {
    return items.map((it) => {
      // Current price
      let curPriceBase = null;
      let priceSource = null;
      if (it.manualPrice) {
        curPriceBase = baseConvert(Number(it.manualPrice), it.manualCurrency || base);
        priceSource = "Manual";
      } else if (priceMap[it.id]?.price) {
        curPriceBase = priceMap[it.id].price;
        priceSource = priceMap[it.id].source || "Live";
      }
      const qty = Number(it.quantity);
      const buyBase = baseConvert(Number(it.buyPrice), it.buyCurrency);
      const invest = qty * buyBase;
      const value = curPriceBase != null ? qty * curPriceBase : null;
      const pnl = value != null ? value - invest : null;
      const roi = value != null ? (pnl / invest) : null;
      return { it, curPriceBase, priceSource, invest, value, pnl, roi };
    });
  }, [items, priceMap, base, fx]);

  const totals = useMemo(() => {
    const invest = rows.reduce((s, r) => s + (r.invest || 0), 0);
    const value = rows.reduce((s, r) => s + (r.value || 0), 0);
    const pnl = value - invest;
    const roi = invest ? pnl / invest : 0;
    return { invest, value, pnl, roi };
  }, [rows]);

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">자산관리 (Stocks & Crypto)</h1>
          <div className="mt-1 text-sm text-slate-600">로컬에 저장됩니다 • API 키 없이도 사용 가능 (주식은 수동가/야후 시도)</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPrices} className={classNames("rounded-xl px-3 py-2 text-sm border", loading ? "opacity-60 cursor-wait" : "hover:bg-slate-50 border-slate-200")}>🔄 가격 새로고침</button>
          <button onClick={exportJson} className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">📤 내보내기</button>
          <label className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
            📥 가져오기
            <input type="file" accept="application/json" onChange={onImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* Settings */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatBox label="총 투자원금" value={formatCurrency(totals.invest, base)} />
        <StatBox label="현재 평가금액" value={formatCurrency(totals.value, base)} />
        <StatBox label="손익 / 수익률" value={`${formatCurrency(totals.pnl, base)} · ${(totals.roi * 100).toFixed(2)}%`} sub={lastRefresh ? `업데이트: ${new Date(lastRefresh).toLocaleString()}` : ""} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Tag>기본통화</Tag>
          <select
            value={settings.baseCurrency}
            onChange={(e) => setSettings((s) => ({ ...s, baseCurrency: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <Tag>자동 새로고침(분)</Tag>
          <input
            type="number"
            min={1}
            value={settings.refreshMin}
            onChange={(e) => setSettings((s) => ({ ...s, refreshMin: Number(e.target.value) }))}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />

          <Tag>Finnhub API Key (선택)</Tag>
          <input
            type="password"
            placeholder="finnhub key"
            value={settings.finnhubKey}
            onChange={(e) => setSettings((s) => ({ ...s, finnhubKey: e.target.value }))}
            className="w-64 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />

          <div className="text-xs text-slate-500">* 키를 넣으면 주식 가격이 더 안정적으로 업데이트됩니다.</div>
        </div>
      </div>

      {/* Add item */}
      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <div className="mb-2 text-sm font-semibold">보유자산 추가</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <select className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-2" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="stock">Stock/ETF</option>
            <option value="crypto">Crypto</option>
          </select>
          <input className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-2" placeholder="심볼 (AAPL, TSLA, BTC, ETH 등)" value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} />
          <input className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-2" placeholder="이름(선택)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="sm:col-span-1 rounded-lg border border-slate-300 px-2 py-2" placeholder="수량" type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />

          <div className="sm:col-span-2 flex gap-2">
            <input className="w-full rounded-lg border border-slate-300 px-2 py-2" placeholder="매수가" type="number" value={draft.buyPrice} onChange={(e) => setDraft({ ...draft, buyPrice: e.target.value })} />
            <select className="rounded-lg border border-slate-300 px-2" value={draft.buyCurrency} onChange={(e) => setDraft({ ...draft, buyCurrency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <input className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-2" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />

          <button onClick={addItem} className="sm:col-span-1 rounded-xl bg-slate-900 px-3 py-2 text-white hover:bg-slate-800">추가</button>
        </div>

        {/* Manual price toggle */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <label className="sm:col-span-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.manualPriceOn} onChange={(e) => setDraft({ ...draft, manualPriceOn: e.target.checked })} />
            이 자산은 수동 가격 사용
          </label>
          {draft.manualPriceOn && (
            <>
              <input className="sm:col-span-3 rounded-lg border border-slate-300 px-2 py-2" placeholder="수동 현재가" type="number" value={draft.manualPrice} onChange={(e) => setDraft({ ...draft, manualPrice: e.target.value })} />
              <select className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-2" value={draft.manualCurrency} onChange={(e) => setDraft({ ...draft, manualCurrency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="sm:col-span-4 rounded-lg border border-slate-300 px-2 py-2" placeholder="메모(선택)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">자산</th>
              <th className="px-3 py-2">유형</th>
              <th className="px-3 py-2">수량</th>
              <th className="px-3 py-2">매수가(통화)</th>
              <th className="px-3 py-2">현재가({base})</th>
              <th className="px-3 py-2">평가금액({base})</th>
              <th className="px-3 py-2">원금({base})</th>
              <th className="px-3 py-2">손익({base})</th>
              <th className="px-3 py-2">수익률</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.it.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.it.name || r.it.symbol.toUpperCase()}</div>
                  <div className="text-xs text-slate-500">{r.it.symbol.toUpperCase()} · {r.priceSource || "-"}</div>
                </td>
                <td className="px-3 py-2">{r.it.type}</td>
                <td className="px-3 py-2">{r.it.quantity}</td>
                <td className="px-3 py-2">{formatCurrency(r.it.buyPrice, r.it.buyCurrency)}</td>
                <td className="px-3 py-2">{r.curPriceBase != null ? formatCurrency(r.curPriceBase, base) : <span className="text-slate-400">가격없음</span>}</td>
                <td className="px-3 py-2">{r.value != null ? formatCurrency(r.value, base) : "-"}</td>
                <td className="px-3 py-2">{formatCurrency(r.invest, base)}</td>
                <td className={classNames("px-3 py-2", r.pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(r.pnl, base)}</td>
                <td className={classNames("px-3 py-2", r.roi >= 0 ? "text-emerald-600" : "text-rose-600")}>{r.value != null ? (r.roi * 100).toFixed(2) + "%" : "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <RowButton onClick={() => {
                      const nv = prompt("수동 현재가 입력 (공백=해제)", r.it.manualPrice ?? "");
                      if (nv === null) return;
                      const n = nv.trim();
                      if (!n) updateItem(r.it.id, { manualPrice: null, manualCurrency: null });
                      else updateItem(r.it.id, { manualPrice: Number(n), manualCurrency: base });
                    }}>수동가</RowButton>
                    <RowButton onClick={() => removeItem(r.it.id)} title="삭제">삭제</RowButton>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-10 text-center text-slate-500" colSpan={10}>
                  아직 자산이 없습니다. 위의 폼에서 보유 종목을 추가하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-slate-500">
        팁: 코인은 <b>BTC, ETH</b> 등 심볼만으로 인식됩니다. 주식은 거래소 접미사(예: <code>005930.KS</code>, <code>AAPL</code>, <code>TSLA</code>)를 권장합니다. 야후 가격이 막히는 경우 Settings에 Finnhub 키를 입력하거나 수동가를 사용하세요.
      </div>
    </div>
  );
}
