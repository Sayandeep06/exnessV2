export interface TradingViewWidget {
  new(config: WidgetConfig): TradingViewWidget;
  onChartReady(callback: () => void): void;
  chart(): IChartWidgetApi;
  remove(): void;
}

export interface WidgetConfig {
  symbol: string;
  datafeed: IDatafeedChartApi;
  interval: string;
  container: string | HTMLElement;
  library_path: string;
  locale: string;
  disabled_features: string[];
  enabled_features: string[];
  charts_storage_url?: string;
  charts_storage_api_version?: string;
  client_id?: string;
  user_id?: string;
  fullscreen: boolean;
  autosize: boolean;
  studies_overrides: Record<string, any>;
  theme: 'light' | 'dark';
  custom_css_url?: string;
  toolbar_bg?: string;
  loading_screen?: { backgroundColor?: string; foregroundColor?: string };
}

export interface IDatafeedChartApi {
  onReady(callback: (configurationData: any) => void): void;
  searchSymbols(userInput: string, exchange: string, symbolType: string, onResult: (symbols: any[]) => void): void;
  resolveSymbol(symbolName: string, onResolve: (symbolInfo: any) => void, onError: (reason: string) => void): void;
  getBars(symbolInfo: any, resolution: string, periodParams: any, onResult: (bars: any[], meta: any) => void, onError: (reason: string) => void): void;
  subscribeBars(symbolInfo: any, resolution: string, onTick: (bar: any) => void, listenerGuid: string, onResetCacheNeededCallback: () => void): void;
  unsubscribeBars(listenerGuid: string): void;
}

export interface IChartWidgetApi {
  setSymbol(symbol: string, interval?: string, callback?: () => void): void;
  getVisibleRange(): { from: number; to: number };
  setVisibleRange(range: { from: number; to: number }, options?: { applyDefaultRightMargin?: boolean }): void;
  createStudy(name: string, forceOverlay?: boolean, lock?: boolean, inputs?: any[], callback?: (studyId: string) => void): void;
  removeStudy(studyId: string): void;
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SymbolInfo {
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  exchange: string;
  listed_exchange: string;
  timezone: string;
  format: string;
  pricescale: number;
  minmov: number;
  fractional: boolean;
  minmove2: number;
  currency_code: string;
  original_currency_code: string;
  unit_id: string;
  original_unit_id: string;
  unit_conversion_types: string[];
  supported_resolutions: string[];
  intraday_multipliers: string[];
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  has_empty_bars: boolean;
  volume_precision: number;
}

declare global {
  interface Window {
    TradingView: {
      widget: typeof TradingViewWidget;
    };
  }
}