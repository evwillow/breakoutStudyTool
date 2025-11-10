#!/usr/bin/env python3
"""
Quality Breakouts Data Processing Script

This script identifies and processes quality stock breakout patterns from daily stock data.
It generates datasets with daily (D.json) and hourly (H.json) data for each breakout pattern.

Key Features:
- Identifies breakout patterns based on technical analysis criteria
- Generates hourly data (H.json) for the same date range as daily data (D.json)
- Optimized data loading with caching and parallel processing
- Comprehensive logging and error handling
"""

import argparse
import calendar
import concurrent.futures
import gc
import json
import logging
import os
import random
import shutil
import time
import warnings
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd
import yfinance as yf
from tqdm.auto import tqdm

# Get script directory for relative path resolution
SCRIPT_DIR = Path(__file__).parent.resolve()

# Hourly data cache to avoid redundant API calls
_hourly_data_cache = {}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Generate quality breakout patterns dataset')
    parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('-q', '--quiet', action='store_true', help='Minimize logging (errors only)')
    parser.add_argument('-d', '--dataset', type=str, default='quality_breakouts', help='Dataset name')
    parser.add_argument('-w', '--workers', type=int, default=4, help='Number of worker threads')
    parser.add_argument('--verbosity', type=int, choices=[0, 1, 2], default=1,
                        help='Verbosity level: 0=minimal, 1=normal, 2=verbose')
    return parser.parse_args()


CONFIG = {
    'dataset_name': 'quality_breakouts',
    'max_workers': 4,
    'batch_size': 20,
    'min_daily_range_pct': 3.5,
    'spacing_days': 30,
    'min_days_from_high': 10,
    'min_uptrend_days': 25,
    'min_daily_uptrend_pct': 1.3,
    'max_consolidation_drop': 0.25,
    'exception_threshold': 0.3,
    'max_exception_days': 3,
    'min_pullback_pct': 0.05,
    'min_pullback_days': 2,
    'max_pullback_days': 10,
    'max_lookback_days': 250,
    'log_level': logging.ERROR,
    'detailed_logging': False,
    'verbosity': 0
}

logger = logging.getLogger(__name__)
STATS = {'ticker_count': 0, 'success_count': 0, 'failed_count': 0}
_data_cache = {}
_hourly_data_cache = {}

def read_stock_data(ticker: str) -> Optional[pd.DataFrame]:
    """
    Load and preprocess daily stock data with efficient caching.
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        DataFrame with daily OHLCV data and technical indicators, or None if invalid
    """
    if ticker in _data_cache:
        return _data_cache[ticker]
        
    path = SCRIPT_DIR / 'data' / f'{ticker}.json'
    if not path.exists():
        return None
        
    try:
        # Optimized JSON loading - read file once
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        
        # Quick column check on first record before creating DataFrame
        first_record = data[0]
        if first_record and not all(col in first_record for col in ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']):
            logger.debug(f"{ticker}: Missing required columns")
            return None
        
        # Use faster DataFrame construction
        df = pd.DataFrame(data, copy=False)
        required_cols = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
        if not all(col in df.columns for col in required_cols):
            logger.debug(f"{ticker}: Missing required columns")
            return None
        
        # Edge case: Empty dataframe
        if df.empty:
            logger.debug(f"{ticker}: Empty dataframe")
            return None
        
        # Edge case: Invalid date format
        try:
            df['Date'] = pd.to_datetime(df['Date'])
        except (ValueError, TypeError) as e:
            logger.debug(f"{ticker}: Invalid date format: {e}")
            return None
        
        df.set_index('Date', inplace=True)
        df.columns = df.columns.str.lower()
        
        # Edge case: Check for malformed data (invalid price relationships)
        invalid_rows = (
            (df['high'] < df['low']) |
            (df['high'] < df['close']) |
            (df['high'] < df['open']) |
            (df['low'] > df['close']) |
            (df['low'] > df['open']) |
            (df['volume'] < 0) |
            (df[['open', 'high', 'low', 'close']] <= 0).any(axis=1)
        )
        if invalid_rows.any():
            invalid_count = invalid_rows.sum()
            if invalid_count > len(df) * 0.05:  # More than 5% invalid rows
                logger.debug(f"{ticker}: Too many invalid rows ({invalid_count}/{len(df)})")
                return None
            # Remove invalid rows if less than 5%
            df = df[~invalid_rows]
        
        # Edge case: Check for suspicious data patterns
        green_candles = (df['close'] > df['open']).sum()
        if len(df) > 0 and (green_candles / len(df) > 0.9):
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker}: Problematic data pattern ({green_candles/len(df):.1%} green candles)")
            return None
        
        # Edge case: Check for missing/invalid dates (duplicates, gaps)
        if df.index.duplicated().any():
            logger.debug(f"{ticker}: Duplicate dates found")
            df = df[~df.index.duplicated(keep='first')]
        
        # Edge case: Insufficient data after cleaning
        if len(df) < 126:
            logger.debug(f"{ticker}: Insufficient data after cleaning ({len(df)} rows)")
            return None
        
        df['10sma'] = df['close'].rolling(10).mean()
        df['20sma'] = df['close'].rolling(20).mean()
        df['50sma'] = df['close'].rolling(50).mean()
        
        # Additional visual quality checks for suspicious patterns
        # Check for extreme price movements that would look bad
        price_changes = df['close'].pct_change().abs()
        if (price_changes > 0.5).any():  # More than 50% single-day move
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker}: Extreme price movements detected")
            return None
        
        # Check for flat/unchanged prices (suspicious data)
        unchanged_days = (df['close'] == df['close'].shift(1)).sum()
        if unchanged_days > len(df) * 0.1:  # More than 10% unchanged days
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker}: Too many unchanged price days ({unchanged_days})")
            return None
        
        # Check for unrealistic volume patterns
        if len(df) > 20:
            volume_std = df['volume'].std()
            volume_mean = df['volume'].mean()
            if volume_mean > 0 and volume_std / volume_mean > 10:  # Extreme volume variance
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker}: Unrealistic volume patterns")
                return None
        
        if check_data_quality(df):
            _data_cache[ticker] = df
            return df
        return None
    except Exception as e:
        logger.error(f"Error reading data for {ticker}: {e}")
        return None


def fetch_hourly_data(ticker: str, start_date: pd.Timestamp, end_date: pd.Timestamp) -> Optional[pd.DataFrame]:
    """
    Fetch hourly stock data for a specific date range using yfinance.
    Results are cached to avoid redundant API calls.
    
    Args:
        ticker: Stock ticker symbol
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        
    Returns:
        DataFrame with hourly OHLCV data and SMAs, or None if fetch fails
    """
    cache_key = f"{ticker}_{start_date.date()}_{end_date.date()}"
    if cache_key in _hourly_data_cache:
        return _hourly_data_cache[cache_key].copy()
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            stock = yf.Ticker(ticker)
            # Fetch with buffer to ensure we get all hours, then filter to exact range
            # Use period parameter for more reliable fetching
            period_days = (end_date - start_date).days + 3
            if period_days <= 60:
                df = stock.history(start=start_date - timedelta(days=1), 
                                  end=end_date + timedelta(days=2), 
                                  interval='1h',
                                  timeout=10)
            else:
                # For longer periods, fetch in chunks
                df_list = []
                current_start = start_date - timedelta(days=1)
                while current_start < end_date + timedelta(days=2):
                    current_end = min(current_start + timedelta(days=60), end_date + timedelta(days=2))
                    chunk = stock.history(start=current_start, end=current_end, interval='1h', timeout=10)
                    if not chunk.empty:
                        df_list.append(chunk)
                    current_start = current_end
                    time.sleep(0.1)  # Small delay between chunks
                
                if df_list:
                    df = pd.concat(df_list).sort_index()
                    df = df[~df.index.duplicated(keep='first')]
                else:
                    df = pd.DataFrame()
            
            if df.empty or len(df) < 1:
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                    continue
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"No hourly data for {ticker} from {start_date.date()} to {end_date.date()}")
                return None
            
            df.columns = df.columns.str.lower()
            required_cols = ['open', 'high', 'low', 'close', 'volume']
            if not all(col in df.columns for col in required_cols):
                logger.warning(f"Missing required columns in hourly data for {ticker}")
                return None
            
            df = df[required_cols].copy()
            df = df.dropna(subset=['open', 'close'])
            
            # Filter to exact date range (inclusive of end_date)
            df = df[(df.index >= start_date) & (df.index <= end_date + timedelta(days=1))]
            
            if len(df) < 10:
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"Insufficient hourly data for {ticker}: {len(df)} rows")
                return None
            
            # Additional validation: check for suspicious patterns
            price_changes = df['close'].pct_change().abs()
            if (price_changes > 0.3).any():  # More than 30% hourly move is suspicious
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"Suspicious hourly price movements for {ticker}")
                return None
            
            df['10sma'] = df['close'].rolling(10).mean()
            df['20sma'] = df['close'].rolling(20).mean()
            df['50sma'] = df['close'].rolling(50).mean()
            
            _hourly_data_cache[cache_key] = df.copy()
            return df
            
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(0.5 * (attempt + 1))
                continue
            logger.error(f"Error fetching hourly data for {ticker} (attempt {attempt + 1}/{max_retries}): {e}")
            return None
    
    return None

def check_data_quality(df):
    """Check if dataframe has minimum required data."""
    return df is not None and len(df) >= 126

def verify_h_json_integrity(h_data: pd.DataFrame, d_data: pd.DataFrame, ticker: str) -> Tuple[bool, str]:
    """
    Verify H.json integrity and content accuracy.
    
    Args:
        h_data: Hourly data DataFrame
        d_data: Daily data DataFrame (for date range comparison)
        ticker: Stock ticker symbol for logging
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if h_data is None or len(h_data) == 0:
        return False, "H.json is empty or None"
    
    # Check required columns
    required_cols = ['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']
    missing_cols = [col for col in required_cols if col not in h_data.columns]
    if missing_cols:
        return False, f"Missing required columns: {missing_cols}"
    
    # Check for null values in critical columns
    critical_cols = ['open', 'high', 'low', 'close']
    null_counts = h_data[critical_cols].isnull().sum()
    if null_counts.any():
        return False, f"Null values found in critical columns: {null_counts[null_counts > 0].to_dict()}"
    
    # Verify date range covers D.json range
    if len(d_data) > 0:
        d_start = d_data.index[0]
        d_end = d_data.index[-1]
        h_start = h_data.index[0]
        h_end = h_data.index[-1]
        
        # H.json should start before or at D.json start, end after or at D.json end
        if h_start > d_start:
            return False, f"H.json starts after D.json: {h_start.date()} > {d_start.date()}"
        if h_end < d_end:
            return False, f"H.json ends before D.json: {h_end.date()} < {d_end.date()}"
        
        # Check approximate ratio (hourly should be ~7x daily, accounting for market hours)
        expected_hours = len(d_data) * 6.5  # ~6.5 trading hours per day
        actual_hours = len(h_data)
        ratio = actual_hours / len(d_data) if len(d_data) > 0 else 0
        
        if ratio < 4.0:  # Minimum reasonable ratio
            return False, f"H.json has insufficient data: {actual_hours} hours for {len(d_data)} days (ratio: {ratio:.2f})"
    
    # Check data consistency (high >= low, high >= close, low <= close, etc.)
    invalid_rows = (
        (h_data['high'] < h_data['low']) |
        (h_data['high'] < h_data['close']) |
        (h_data['high'] < h_data['open']) |
        (h_data['low'] > h_data['close']) |
        (h_data['low'] > h_data['open']) |
        (h_data['volume'] < 0)
    )
    if invalid_rows.any():
        return False, f"Data consistency errors: {invalid_rows.sum()} invalid rows found"
    
    # Check for reasonable price values (no zeros or negatives)
    if (h_data[['open', 'high', 'low', 'close']] <= 0).any().any():
        return False, "Invalid price values (zero or negative) found"
    
    return True, "H.json integrity verified"

def check_average_daily_range(df, breakout_idx, min_range_pct=None):
    """Check if daily range on breakout day meets minimum requirement."""
    if breakout_idx >= len(df):
        return False
        
    if min_range_pct is None:
        min_range_pct = CONFIG['min_daily_range_pct']
    
    row = df.iloc[breakout_idx]
    daily_range_pct = (row['high'] - row['low']) / row['open'] * 100
    return daily_range_pct >= min_range_pct

def format_date(ts):
    ts = pd.to_datetime(ts)
    return f"{calendar.month_abbr[ts.month]}_{ts.day}_{ts.year}"

def write_json(path, df):
    """Write data to JSON file with optimized formatting and immediate flush."""
    try:
        path_obj = Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        if path.endswith("points.json"):
            data_to_write = [{"points": indicator} for indicator in df] if isinstance(df, list) else [{"points": str(df)}]
        else:
            if hasattr(df, 'columns'):
                df.columns = df.columns.str.lower()
                # Ensure we have the required columns
                required_cols = ['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    logger.error(f"Missing columns in data for {path}: {missing_cols}")
                    return False
                
                df_subset = df[required_cols].copy()
                
                # Replace NaN values with None (which becomes null in JSON)
                df_subset = df_subset.where(pd.notnull(df_subset), None)
                
                # Ensure we have data to write
                if len(df_subset) == 0:
                    logger.error(f"Empty dataframe for {path}")
                    return False
                
                records = df_subset.to_dict('records')
                data_to_write = []
                for r in records:
                    try:
                        data_to_write.append({
                            "Open": float(r['open']) if r['open'] is not None and not pd.isna(r['open']) else None,
                            "High": float(r['high']) if r['high'] is not None and not pd.isna(r['high']) else None,
                            "Low": float(r['low']) if r['low'] is not None and not pd.isna(r['low']) else None,
                            "Close": float(r['close']) if r['close'] is not None and not pd.isna(r['close']) else None,
                            "Volume": float(r['volume']) if r['volume'] is not None and not pd.isna(r['volume']) else None,
                            "10sma": float(r['10sma']) if r['10sma'] is not None and not pd.isna(r['10sma']) else None,
                            "20sma": float(r['20sma']) if r['20sma'] is not None and not pd.isna(r['20sma']) else None,
                            "50sma": float(r['50sma']) if r['50sma'] is not None and not pd.isna(r['50sma']) else None
                        })
                    except (ValueError, TypeError) as e:
                        logger.error(f"Error converting data for {path}: {e}")
                        return False
            else:
                data_to_write = df
                
        # Write and immediately flush to disk
        try:
            with open(path_obj, 'w', encoding='utf-8') as f:
                json.dump(data_to_write, f, indent=4, allow_nan=False)
                f.flush()  # Force immediate write to disk
                try:
                    os.fsync(f.fileno())  # Ensure OS writes to disk (may fail on some systems)
                except (OSError, AttributeError):
                    pass  # fsync not available on all systems, flush is usually sufficient
        except Exception as e:
            logger.error(f"Exception during file write for {path}: {e}", exc_info=True)
            return False
        
        # Verify file was written and has content
        if not path_obj.exists():
            logger.error(f"File was not created: {path_obj}")
            return False
        
        # Verify file has content (at least 10 bytes for a minimal JSON file)
        if path_obj.stat().st_size < 10:
            logger.error(f"File is too small (likely empty): {path_obj}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error writing {path}: {e}", exc_info=True)
        return False

def determine_performance_category(df, breakout_idx, cross_idx):
    """Determine performance category based on price movement."""
    if cross_idx >= len(df):
        cross_idx = len(df) - 1
    
    breakout_price = df.iloc[breakout_idx]['open']
    cross_close_price = df.iloc[cross_idx]['close']
    performance_pct = (cross_close_price - breakout_price) / breakout_price * 100
    
    if performance_pct <= -2.5:
        return 1
    elif performance_pct <= 10:
        return 2
    elif performance_pct <= 35:
        return 3
    return 4

def generate_indicators(data, breakout_idx, category):
    """
    Generate and score technical indicators for a breakout pattern.
    Returns only the 3 best-fitting indicators based on a comprehensive scoring metric.
    """
    indicator_scores = {}
    
    # Higher Lows Pattern
    if breakout_idx > 5:
        pre_breakout = data.iloc[max(0, breakout_idx-20):breakout_idx]
        if len(pre_breakout) >= 10:
            recent_low = pre_breakout.iloc[-5:]['low'].min()
            earlier_low = pre_breakout.iloc[-10:-5]['low'].min()
            earliest_low = pre_breakout.iloc[:-10]['low'].min() if len(pre_breakout) > 10 else float('inf')
            if recent_low > earlier_low * 1.01 and (len(pre_breakout) <= 10 or earlier_low > earliest_low * 1.005):
                score = 85 + min(15, (recent_low / earlier_low - 1) * 1000)
                indicator_scores["Higher Lows"] = score
    
    # Cup and Handle Pattern
    if breakout_idx > 30:
        window = data.iloc[max(0, breakout_idx-50):breakout_idx]
        if len(window) >= 30:
            potential_cup = window.iloc[:-10]
            potential_handle = window.iloc[-10:]
            if len(potential_cup) >= 20:
                cup_left = potential_cup.iloc[:len(potential_cup)//2]['high'].max()
                cup_right = potential_cup.iloc[len(potential_cup)//2:]['high'].max()
                cup_bottom = potential_cup['low'].min()
                handle_low = potential_handle['low'].min()
                handle_high = potential_handle['high'].max()
                cup_symmetry = 0.8 <= cup_left/cup_right <= 1.25
                cup_depth = (min(cup_left, cup_right) - cup_bottom) / min(cup_left, cup_right) >= 0.1
                handle_shallowness = handle_low > cup_bottom * 1.03
                handle_retrace = (handle_high - handle_low) / handle_high <= 0.15
                if cup_symmetry and cup_depth and handle_shallowness and handle_retrace:
                    score = 95 + (cup_depth * 500) + (cup_symmetry * 5)
                    indicator_scores["Cup and Handle"] = score
    
    # Uptrending Moving Averages
    if breakout_idx > 20 and '20sma' in data.columns and '50sma' in data.columns:
        sma20 = data['20sma'].iloc[breakout_idx]
        sma20_10days_ago = data['20sma'].iloc[breakout_idx-10]
        sma50 = data['50sma'].iloc[breakout_idx] if not pd.isna(data['50sma'].iloc[breakout_idx]) else 0
        sma50_20days_ago = data['50sma'].iloc[breakout_idx-20] if breakout_idx >= 20 and not pd.isna(data['50sma'].iloc[breakout_idx-20]) else 0
        if sma20 > sma20_10days_ago * 1.01 and (sma50 == 0 or sma50 > sma50_20days_ago * 1.005):
            score = 70 + ((sma20 / sma20_10days_ago - 1) * 500)
            indicator_scores["Uptrending MAs"] = score
    
    # Resistance Break
    if breakout_idx > 20:
        lookback_window = data.iloc[max(0, breakout_idx-30):breakout_idx]
        if len(lookback_window) >= 15:
            swing_highs = []
            for i in range(1, len(lookback_window)-1):
                if (lookback_window.iloc[i]['high'] > lookback_window.iloc[i-1]['high'] and
                    lookback_window.iloc[i]['high'] > lookback_window.iloc[i+1]['high']):
                    swing_highs.append(lookback_window.iloc[i]['high'])
            
            resistance_levels = []
            if swing_highs:
                current_cluster = [swing_highs[0]]
                for high in swing_highs[1:]:
                    if abs(high - current_cluster[0]) / current_cluster[0] <= 0.02:
                        current_cluster.append(high)
                    else:
                        if len(current_cluster) >= 2:
                            resistance_levels.append(sum(current_cluster) / len(current_cluster))
                        current_cluster = [high]
                if len(current_cluster) >= 2:
                    resistance_levels.append(sum(current_cluster) / len(current_cluster))
            
            if resistance_levels and breakout_idx < len(data):
                breakout_close = data.iloc[breakout_idx]['close']
                for level in resistance_levels:
                    if breakout_close > level * 1.01:
                        score = 80 + min(20, (breakout_close / level - 1) * 1000)
                        indicator_scores["Resistance Break"] = score
                        break
    
    # Volume Surge
    if breakout_idx > 20 and breakout_idx < len(data):
        short_term_avg = data.iloc[max(0, breakout_idx-10):breakout_idx]['volume'].mean()
        longer_term_avg = data.iloc[max(0, breakout_idx-30):breakout_idx]['volume'].mean()
        breakout_volume = data.iloc[breakout_idx]['volume']
        if short_term_avg > 0 and longer_term_avg > 0:
            volume_ratio = min(breakout_volume / short_term_avg, breakout_volume / longer_term_avg)
            if breakout_volume > short_term_avg * 1.8 and breakout_volume > longer_term_avg * 1.5:
                score = 75 + min(25, (volume_ratio - 1.5) * 50)
                indicator_scores["Volume Surge"] = score
    
    # Volume Contraction
    if breakout_idx > 15:
        early_vol = data.iloc[max(0, breakout_idx-15):max(0, breakout_idx-8)]['volume'].mean()
        late_vol = data.iloc[max(0, breakout_idx-7):breakout_idx]['volume'].mean()
        if early_vol > 0 and late_vol < early_vol * 0.85 and not pd.isna(early_vol) and not pd.isna(late_vol):
            vol_data = data.iloc[max(0, breakout_idx-15):breakout_idx]['volume']
            if len(vol_data) >= 7:
                days = np.arange(len(vol_data))
                volume_slope = np.polyfit(days, vol_data, 1)[0]
                if volume_slope < 0:
                    score = 65 + abs(volume_slope) * 100
                    indicator_scores["Volume Contraction"] = score
    
    # Tight Consolidation
    if breakout_idx > 10:
        pre_breakout = data.iloc[max(0, breakout_idx-15):breakout_idx]
        if len(pre_breakout) >= 7:
            high = pre_breakout['high'].max()
            low = pre_breakout['low'].min()
            close_vals = pre_breakout['close'].values
            if low > 0:
                range_pct = (high - low) / low
                if len(close_vals) >= 10:
                    early_std = np.std(close_vals[:len(close_vals)//2])
                    late_std = np.std(close_vals[len(close_vals)//2:])
                    volatility_reduction = early_std > late_std
                else:
                    volatility_reduction = True
                if range_pct < 0.12 and volatility_reduction:
                    score = 70 + (0.12 - range_pct) * 500
                    indicator_scores["Tight Consolidation"] = score
    
    # MA Support
    if breakout_idx > 20 and '20sma' in data.columns:
        lows_near_ma = 0
        total_checks = 0
        for i in range(max(0, breakout_idx-15), breakout_idx):
            if i < len(data) and not pd.isna(data.iloc[i]['low']) and not pd.isna(data.iloc[i]['20sma']):
                total_checks += 1
                ma_value = data.iloc[i]['20sma']
                low_value = data.iloc[i]['low']
                if low_value >= ma_value * 0.97 and data.iloc[i]['close'] >= ma_value:
                    lows_near_ma += 1
        if lows_near_ma >= 3 and total_checks > 0 and lows_near_ma / total_checks >= 0.4:
            score = 68 + (lows_near_ma / total_checks) * 30
            indicator_scores["MA Support"] = score
    
    # Above Key MAs
    if breakout_idx > 50 and '20sma' in data.columns and '50sma' in data.columns and breakout_idx < len(data):
        sma20 = data['20sma'].iloc[breakout_idx] if not pd.isna(data['20sma'].iloc[breakout_idx]) else 0
        sma50 = data['50sma'].iloc[breakout_idx] if not pd.isna(data['50sma'].iloc[breakout_idx]) else 0
        close_price = data['close'].iloc[breakout_idx]
        if sma20 > 0 and sma50 > 0 and close_price > sma20 * 1.02 and close_price > sma50 * 1.02 and sma20 > sma50:
            score = 72 + ((close_price / sma20 - 1) * 200)
            indicator_scores["Above Key MAs"] = score
    
    # Low Volatility (using price range instead of ATR)
    if breakout_idx > 28:
        recent_period = data.iloc[max(0, breakout_idx-14):breakout_idx]
        earlier_period = data.iloc[max(0, breakout_idx-28):max(0, breakout_idx-14)]
        if len(recent_period) >= 10 and len(earlier_period) >= 10:
            recent_range = (recent_period['high'] - recent_period['low']).mean()
            earlier_range = (earlier_period['high'] - earlier_period['low']).mean()
            if earlier_range > 0 and recent_range < earlier_range * 0.82:
                score = 63 + ((earlier_range - recent_range) / earlier_range) * 100
                indicator_scores["Low Volatility"] = score
    
    # Strong Close
    if breakout_idx < len(data):
        row = data.iloc[breakout_idx]
        if row['open'] > 0:
            candle_body_pct = (row['close'] - row['open']) / row['open'] * 100
            close_to_high_pct = (row['high'] - row['close']) / row['high'] * 100
            if candle_body_pct >= 2.0 and close_to_high_pct <= 0.5:
                score = 78 + min(22, candle_body_pct * 2)
                indicator_scores["Strong Close"] = score
    
    # Category-specific adjustments
    if category >= 3:
        if "Above Key MAs" in indicator_scores or "Strong Close" in indicator_scores:
            indicator_scores["Sector Leader"] = 60
        else:
            indicator_scores["Market Leader"] = 55
    
    if category == 1:
        for ind in ["Volume Surge", "Uptrending MAs", "Strong Close", "Sector Leader", "Market Leader"]:
            indicator_scores.pop(ind, None)
        indicator_scores["Weak RS"] = 40
        if breakout_idx > 10 and breakout_idx < len(data):
            avg_volume = data.iloc[max(0, breakout_idx-10):breakout_idx]['volume'].mean()
            breakout_volume = data.iloc[breakout_idx]['volume']
            if avg_volume > 0 and breakout_volume > avg_volume * 2.2:
                indicator_scores["Distribution"] = 35
    
    # Fallback indicators if we have fewer than 3
    if len(indicator_scores) < 3:
        fallback_indicators = {
            "Support Level": 50,
            "Consolidation": 45,
            "Base Building": 40,
            "Buy Volume": 55,
            "Breakout Pattern": 48
        }
        for ind, score in fallback_indicators.items():
            if ind not in indicator_scores:
                indicator_scores[ind] = score
                if len(indicator_scores) >= 3:
                    break
    
    # Sort by score and return top 3
    sorted_indicators = sorted(indicator_scores.items(), key=lambda x: x[1], reverse=True)
    return [ind for ind, score in sorted_indicators[:3]]

def create_files(directory: str, data: pd.DataFrame, breakout_idx: int, cross_idx: int, 
                 ticker: str, d_data: pd.DataFrame) -> bool:
    """
    Create all necessary files for a breakout pattern.
    
    Args:
        directory: Output directory path
        data: Full daily dataframe
        breakout_idx: Index of breakout date
        cross_idx: Index where price crosses below 20SMA
        ticker: Stock ticker symbol
        d_data: Daily data for D.json (used to determine H.json date range)
        
    Returns:
        True if successful, False otherwise
    """
    dir_path = Path(directory)
    dir_path.mkdir(parents=True, exist_ok=True)
    category = determine_performance_category(data, breakout_idx, cross_idx)
    applied_indicators = generate_indicators(data, breakout_idx, category)
    if not write_json(str(dir_path / "points.json"), applied_indicators):
        logger.error(f"Failed to write points.json for {ticker}")
        return False
    
    # Generate H.json with hourly data for the same date range as D.json
    if len(d_data) > 0:
        start_date = d_data.index[0]
        end_date = d_data.index[-1]
        h_data = fetch_hourly_data(ticker, start_date, end_date)
        
        if h_data is not None and len(h_data) > 0:
            h_data_subset = h_data[['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']].copy()
            
            # Verify integrity before writing
            is_valid, error_msg = verify_h_json_integrity(h_data_subset, d_data, ticker)
            if is_valid and check_candle_distribution(h_data_subset):
                if not write_json(str(dir_path / "H.json"), h_data_subset):
                    logger.warning(f"Failed to write H.json for {ticker}")
                logger.debug(f"H.json created and verified for {ticker}")
            else:
                logger.warning(f"Skipping H.json for {ticker}: {error_msg if not is_valid else 'Poor candle distribution'}")
        else:
            logger.warning(f"Could not fetch hourly data for {ticker} from {start_date.date()} to {end_date.date()}")
    
    return True

def create_files_with_category(directory: str, data: pd.DataFrame, breakout_idx: int, cross_idx: int, 
                               forced_category: int, ticker: str, d_data: pd.DataFrame) -> bool:
    """
    Create files with a forced category.
    
    Args:
        directory: Output directory path
        data: Full daily dataframe
        breakout_idx: Index of breakout date
        cross_idx: Index where price crosses below 20SMA
        forced_category: Category to use (1-4)
        ticker: Stock ticker symbol
        d_data: Daily data for D.json (used to determine H.json date range)
        
    Returns:
        True if successful, False otherwise
    """
    dir_path = Path(directory)
    dir_path.mkdir(parents=True, exist_ok=True)
    applied_indicators = generate_indicators(data, breakout_idx, forced_category)
    if not write_json(str(dir_path / "points.json"), applied_indicators):
        logger.error(f"Failed to write points.json for {ticker}")
        return False
    
    # Generate H.json with hourly data for the same date range as D.json
    if len(d_data) > 0:
        start_date = d_data.index[0]
        end_date = d_data.index[-1]
        h_data = fetch_hourly_data(ticker, start_date, end_date)
        
        if h_data is not None and len(h_data) > 0:
            h_data_subset = h_data[['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']].copy()
            
            # Verify integrity before writing
            is_valid, error_msg = verify_h_json_integrity(h_data_subset, d_data, ticker)
            if is_valid and check_candle_distribution(h_data_subset):
                if not write_json(str(dir_path / "H.json"), h_data_subset):
                    logger.warning(f"Failed to write H.json for {ticker}")
                logger.debug(f"H.json created and verified for {ticker}")
            else:
                logger.warning(f"Skipping H.json for {ticker}: {error_msg if not is_valid else 'Poor candle distribution'}")
        else:
            logger.warning(f"Could not fetch hourly data for {ticker} from {start_date.date()} to {end_date.date()}")
    
    return True

def find_first_cross_below_sma(df, focus_idx, sma_period=20):
    """Find the first index where price closes below the specified SMA."""
    sma_col = f'{sma_period}sma'
    if focus_idx + 1 >= len(df):
        return len(df) - 1
    cross = (df['close'].iloc[focus_idx + 1:] < df[sma_col].iloc[focus_idx + 1:])
    if cross.any():
        return df.index.get_loc(cross[cross].index[0])
    return len(df) - 1

def check_successful_breakout(df, breakout_idx, cross_idx):
    """Check if price rose 30% from breakout open before closing below 20SMA."""
    if breakout_idx >= len(df) or breakout_idx < 0:
        return False, None
        
    breakout_open = df.iloc[breakout_idx]['open']
    breakout_date = df.index[breakout_idx]
    
    if cross_idx >= len(df):
        cross_idx = len(df) - 1
    
    max_days = 70
    dates_after = [d for d in df.index if d > breakout_date and (d - breakout_date).days <= max_days]
    if not dates_after:
        return False, None
    
    last_day = dates_after[-1]
    max_idx = df.index.get_loc(last_day)
    end_idx = min(cross_idx, max_idx)
    
    segment = df.iloc[breakout_idx:end_idx+1]
    if segment.empty:
        return False, None
    
    highest_price = segment['high'].max()
    highest_date = segment['high'].idxmax()
    gain_pct = (highest_price - breakout_open) / breakout_open
    
    return gain_pct >= 0.30, highest_date

def find_big_move(df, end_date, min_days=30, min_daily_pct=1.5):
    """Find upward price movement averaging at least min_daily_pct per day over min_days."""
    try:
        ticker = None
        try:
            # Try to extract ticker from dataframe if available for logging
            if hasattr(df, 'name'):
                ticker = df.name
        except:
            pass
            
        end_idx = df.index.get_loc(end_date)
        
        # Look back at most max_lookback_days days to find the start of the uptrend (from CONFIG)
        max_lookback = CONFIG['max_lookback_days']
        start_idx = max(0, end_idx - max_lookback)
        
        window = df.iloc[start_idx:end_idx + 1]
        
        # If not enough data, return False
        if len(window) < min_days:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {end_date.date()}: Not enough data - {len(window)} days, need {min_days}")
            return False, None, None, 0
        
        # Find the high before the breakout
        high_price = window['high'].max()
        high_date = window['high'].idxmax()
        high_loc = window.index.get_loc(high_date)
        
        # If high is at the end of the window (at the breakout date), find the previous high
        if high_loc >= len(window) - 3:
            # Use the window excluding the last 3 days
            prev_window = window.iloc[:-3]
            if not prev_window.empty:
                high_price = prev_window['high'].max()
                high_date = prev_window['high'].idxmax()
                high_loc = window.index.get_loc(high_date)
        
        # If high is at the beginning of the window, use a more relaxed check (only 3 days instead of 5)
        if high_loc <= 3:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {end_date.date()}: High point too early (position {high_loc})")
            return False, None, None, 0
        
        check_indices = list(range(start_idx, high_loc))
        
        # Try different starting points, looking for the earliest valid uptrend
        first_valid_idx = None
        valid_total_pct = 0
        
        for i in check_indices:
            segment = window.iloc[i:high_loc+1]
            if len(segment) < min_days:
                continue
            
            # Get start and end prices - use CLOSE price for start and HIGH for end
            start_price = segment.iloc[0]['close']
            end_price = segment.iloc[-1]['high']
            
            # Calculate total percentage gain
            total_pct = (end_price - start_price) / start_price * 100
            
            # Minimum total gain requirement slightly reduced to allow more patterns
            min_total_gain = 25.0  # 25% minimum total gain
            
            # Calculate days and average daily percentage
            days = max(1, (segment.index[-1] - segment.index[0]).days)
            simple_avg_daily_pct = total_pct / days
            
            # Basic quality checks
            price_increases = (segment['close'] > segment['close'].shift(1)).sum()
            price_increase_ratio = price_increases / (len(segment) - 1)  # -1 because first day has no prior day
            
            # Check for single-day spikes
            max_single_day_gain = segment['high'].pct_change().max() * 100
            max_day_contribution = max_single_day_gain / total_pct if total_pct > 0 else 1.0
            
            # Volume check
            avg_volume = segment['volume'].mean()
            high_volume_days = (segment['volume'] > avg_volume * 1.2).sum()
            high_volume_ratio = high_volume_days / len(segment)
            
            # Quality metrics - slightly relaxed to find more patterns
            consistent_uptrend = price_increase_ratio >= 0.4  # Changed from 0.5
            not_just_spike = max_day_contribution <= 0.6  # Changed from 0.5
            decent_volume = high_volume_ratio >= 0.25  # Changed from 0.3
            
            # Simplified validation criteria - prioritize meeting the min_daily_pct requirement
            valid_segment = (total_pct >= min_total_gain) or (
                simple_avg_daily_pct >= min_daily_pct and 
                days >= min_days and
                # Relaxed quality requirements - only need 2 out of 3 to pass
                (consistent_uptrend + not_just_spike + decent_volume >= 2)
            )
            
            if valid_segment:
                first_valid_idx = i
                valid_total_pct = total_pct
                break
        
        # If we found a valid starting point, look for the local minimum after it
        if first_valid_idx is not None:
            # Look for local minimum in the next 20 days after the first valid point
            # This gives us a cleaner starting point for the chart
            search_end = min(first_valid_idx + 20, high_loc - min_days)  # Ensure we still have enough days for uptrend
            
            # Find the lowest low in the period after the first valid point
            if search_end > first_valid_idx:
                search_segment = window.iloc[first_valid_idx:search_end+1]
                if not search_segment.empty:
                    min_idx = search_segment['low'].idxmin()
                    min_loc = window.index.get_loc(min_idx)
                    
                    # Use this minimum as our starting point if it creates a valid segment
                    if min_loc < high_loc - min_days:  # Ensure enough days left for uptrend
                        min_to_high_segment = window.iloc[min_loc:high_loc+1]
                        days_in_segment = max(1, (min_to_high_segment.index[-1] - min_to_high_segment.index[0]).days)
                        
                        if days_in_segment >= min_days:
                            # We've found our local minimum after the first valid point
                            start_date = window.index[min_loc]
                            days_in_uptrend = max(1, (high_date - start_date).days)
                            if CONFIG.get('verbosity', 0) > 1:
                                logger.debug(f"{ticker} {end_date.date()}: Found local minimum after valid point")
                            return True, start_date, high_date, valid_total_pct
            
            # If we couldn't find a suitable local minimum, use the original first valid point
            start_date = window.index[first_valid_idx]
            days_in_uptrend = max(1, (high_date - start_date).days)
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {end_date.date()}: Valid uptrend - {valid_total_pct:.2f}% over {days_in_uptrend} days")
            return True, start_date, high_date, valid_total_pct
        
        if CONFIG.get('verbosity', 0) > 1:
            logger.debug(f"{ticker} {end_date.date()}: No valid uptrend found")
        
        return False, None, None, 0
    
    except Exception as e:
        logger.error(f"Error in find_big_move: {e}")
        return False, None, None, 0

def check_pattern_quality(df, start_idx, end_idx):
    """Check if pattern has enough data points."""
    return end_idx - start_idx >= 5

def check_price_within_range(df, high_date, breakout_date):
    """Check if price stays within allowed range from high to breakout."""
    high_idx = df.index.get_loc(high_date)
    breakout_idx = df.index.get_loc(breakout_date)
    if high_idx >= breakout_idx:
        return False
    
    high_price = df.iloc[high_idx]['high']
    cons_low = df.iloc[high_idx:breakout_idx+1]['low'].min()
    drop_pct = (high_price - cons_low) / high_price
    return drop_pct <= CONFIG['max_consolidation_drop']

def check_price_within_range_relaxed(df, high_date, breakout_date, max_drop=0.30):
    """Check if price stays within specified range from high to breakout"""
    try:
        high_idx = df.index.get_loc(high_date)
        breakout_idx = df.index.get_loc(breakout_date)
        
        if high_idx >= breakout_idx:
            return False
        
        high_price = df.iloc[high_idx]['high']
        # Find lowest price between high and breakout
        cons_low = df.iloc[high_idx:breakout_idx+1]['low'].min()
        
        # Calculate the drop from high to consolidation low
        drop_pct = (high_price - cons_low) / high_price
        
        # Check if the price stayed within the specified range
        return drop_pct <= max_drop
    except Exception as e:
        logger.error(f"Error in check_price_within_range_relaxed: {e}")
        return False

def check_consolidation_tightness(df, high_date, breakout_date, max_drop=None, exception_threshold=None, max_exception_days=None):
    """
    Check if price stays within specified range during consolidation, allowing for brief exceptions.
    
    Args:
        df: Price dataframe
        high_date: Date of the high before consolidation
        breakout_date: Date of the breakout
        max_drop: Maximum allowed drop from high (default: from CONFIG)
        exception_threshold: Threshold for brief exceptions (default: from CONFIG)
        max_exception_days: Maximum days allowed for brief exceptions (default: from CONFIG)
        
    Returns:
        Tuple of (is_tight_enough, max_drop_pct, exception_days)
    """
    try:
        # Use defaults from CONFIG if parameters not specified
        max_drop = max_drop if max_drop is not None else CONFIG['max_consolidation_drop']
        exception_threshold = exception_threshold if exception_threshold is not None else CONFIG['exception_threshold']
        max_exception_days = max_exception_days if max_exception_days is not None else CONFIG['max_exception_days']
        
        high_idx = df.index.get_loc(high_date)
        breakout_idx = df.index.get_loc(breakout_date)
        
        if high_idx >= breakout_idx:
            return False, 0, 0
        
        # Get consolidation segment
        consolidation = df.iloc[high_idx:breakout_idx+1]
        if len(consolidation) < 3:  # Too short to analyze properly
            return False, 0, 0
            
        high_price = consolidation.iloc[0]['high']
        
        # Calculate daily drops from the high for each day
        daily_drops = []
        for i in range(len(consolidation)):
            day_low = consolidation.iloc[i]['low']
            drop_pct = (high_price - day_low) / high_price
            daily_drops.append(drop_pct)
        
        # Find the maximum drop during consolidation
        max_drop_pct = max(daily_drops)
        
        # Check if the maximum drop exceeds our threshold
        if max_drop_pct <= max_drop:
            # Within regular threshold - no exceptions needed
            return True, max_drop_pct, 0
        
        # Count days that exceed the regular threshold but are below exception threshold
        exception_days = sum(1 for drop in daily_drops if max_drop < drop <= exception_threshold)
        
        # Count days that exceed even the exception threshold
        severe_violation_days = sum(1 for drop in daily_drops if drop > exception_threshold)
        
        # Allow pattern if:
        # 1. Exception days are within allowed limit
        # 2. No severe violations
        is_tight_enough = (exception_days <= max_exception_days) and (severe_violation_days == 0)
        
        return is_tight_enough, max_drop_pct, exception_days
        
    except Exception as e:
        logger.error(f"Error in check_consolidation_tightness: {e}")
        return False, 0, 0

def check_orderly_pullback(df, high_date, min_pullback_pct=None, min_days=None, max_days=None):
    """Check if there's an orderly pullback after the high point."""
    try:
        # Use config values as defaults
        min_pullback_pct = min_pullback_pct if min_pullback_pct is not None else CONFIG['min_pullback_pct']
        min_days = min_days if min_days is not None else CONFIG['min_pullback_days']
        max_days = max_days if max_days is not None else CONFIG['max_pullback_days']
        
        # Get high point index
        high_idx = df.index.get_loc(high_date)
        ticker = None
        try:
            # Try to extract ticker from dataframe if available for logging
            if hasattr(df, 'name'):
                ticker = df.name
        except:
            pass
        
        # Define pullback window efficiently
        end_idx = min(high_idx + max_days + 1, len(df))
        if high_idx + min_days >= end_idx:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {high_date.date()}: Pullback window too small - need {min_days} days")
            return False, None, 0
        
        # Get pullback window efficiently
        pullback_window = df.iloc[high_idx + min_days : end_idx]
        if pullback_window.empty:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {high_date.date()}: Empty pullback window")
            return False, None, 0
        
        # Get high price once
        high_price = df.iloc[high_idx]['high']
        
        # Find lowest point in pullback window
        low_price = pullback_window['low'].min()
        low_date = pullback_window['low'].idxmin()
        
        # Calculate pullback percentage
        pullback_pct = (high_price - low_price) / high_price
        
        # Check if pullback meets minimum requirement
        result = pullback_pct >= min_pullback_pct
        
        if not result and CONFIG.get('verbosity', 0) > 1:
            logger.debug(f"{ticker} {high_date.date()}: Insufficient pullback - {pullback_pct*100:.2f}% vs {min_pullback_pct*100}%")
        
        return result, low_date, pullback_pct
    
    except Exception as e:
        logger.error(f"Error in check_orderly_pullback: {e}")
        return False, None, 0

def check_candle_distribution(df, max_green_pct=0.75):
    """Check if candle distribution is reasonable."""
    if 'open' not in df.columns or 'close' not in df.columns or len(df) == 0:
        return True
    green_pct = (df['close'] > df['open']).sum() / len(df)
    return green_pct <= max_green_pct

def process_breakout(ticker: str, data: pd.DataFrame, focus_date: pd.Timestamp, 
                    low_date: pd.Timestamp, cons_start: pd.Timestamp, 
                    valid_breakouts: Optional[list] = None, forced_category: Optional[int] = None) -> Optional[dict]:
    """
    Process a single breakout pattern and create all necessary files.
    
    Args:
        ticker: Stock ticker symbol
        data: Full daily dataframe
        focus_date: Breakout date
        low_date: Start of uptrend date
        cons_start: High date before consolidation
        valid_breakouts: List of previously validated breakouts
        forced_category: Optional category override (1-4)
        
    Returns:
        Breakout data dictionary or None if processing fails
    """
    try:
        if CONFIG.get('verbosity', 0) > 0:
            logger.info(f"Processing breakout: {ticker} on {focus_date.date()}")
        
        # Create directory FIRST so we can see it's being processed
        date_str = format_date(focus_date)
        directory = SCRIPT_DIR / 'ds' / CONFIG['dataset_name'] / f"{ticker}_{date_str}"
        directory.mkdir(parents=True, exist_ok=True)
        
        # Create a marker file immediately to verify process_breakout was called
        try:
            marker_file = directory / ".processing"
            marker_file.write_text(f"Processing {ticker} breakout on {focus_date.date()}")
        except:
            pass  # Ignore marker file errors
        
        # Get indices for slicing data
        all_dates = data.index
        focus_idx = all_dates.get_loc(focus_date)
        
        # Get start of upward movement index
        low_idx = all_dates.get_loc(low_date)
        
        # Find where price crosses below 20SMA
        cross_idx = find_first_cross_below_sma(data, focus_idx, sma_period=20)
        # End 3 days after it closes below the 20sma
        end_idx = min(len(data) - 1, cross_idx + 3)
        
        # Create D.json with data from beginning of upward movement to breakout
        d_data = data.iloc[low_idx:focus_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
        
        # Check for null values in D.json data
        if d_data.isnull().any().any():
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {focus_date.date()}: Disqualified - null values in D.json")
            return None
            
        # Check if there are too many green candles in the data
        if not check_candle_distribution(d_data):
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {focus_date.date()}: Disqualified - too many green candles")
            return None
        
        # Visual quality check: Ensure breakout shows clear upward movement
        if len(d_data) >= 10:
            start_price = d_data.iloc[0]['close']
            end_price = d_data.iloc[-1]['close']
            total_gain = (end_price - start_price) / start_price
            if total_gain < 0.15:  # Less than 15% gain in uptrend is not a clear breakout
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {focus_date.date()}: Disqualified - insufficient uptrend ({total_gain*100:.1f}%)")
                return None
        
        # Visual quality check: Ensure breakout day is clearly above recent highs
        if len(d_data) >= 5:
            recent_highs = d_data.iloc[-5:]['high'].max()
            breakout_high = d_data.iloc[-1]['high']
            if breakout_high <= recent_highs * 1.02:  # Less than 2% above recent highs
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {focus_date.date()}: Disqualified - breakout not clear enough")
                return None
            
        # Create after.json with data starting from the day after the breakout (not the beginning of uptrend)
        # Ensure it includes at least 25 days of data regardless of when price crosses below 20SMA
        after_start_idx = focus_idx + 1  # Start the day after the breakout
        min_after_days = 25  # Minimum days to include in after.json
        after_end_idx = max(min(len(data) - 1, after_start_idx + min_after_days), end_idx)
        
        # Ensure we have enough data
        if after_end_idx - after_start_idx < min_after_days:
            # If we don't have enough data after the breakout, use what we have
            after_end_idx = min(len(data) - 1, after_start_idx + min_after_days)
        
        # Get the after data
        after_data = data.iloc[after_start_idx:after_end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
        
        # Check for null values in after.json data
        if after_data.isnull().any().any():
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {focus_date.date()}: Disqualified - null values in after.json")
            return None
            
        # Check if there are too many green candles in the after data
        if not check_candle_distribution(after_data):
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {focus_date.date()}: Disqualified - too many green candles in after data")
            return None
        
        # Determine category based on performance
        category = None
        if forced_category is not None:
            category = forced_category
        else:
            category = determine_performance_category(data, focus_idx, cross_idx)
        
        # Create the data files (points.json and H.json)
        if forced_category is not None:
            create_files_with_category(str(directory), data, focus_idx, cross_idx, forced_category, ticker, d_data)
        else:
            create_files(str(directory), data, focus_idx, cross_idx, ticker, d_data)
        
        # Write the data files after validation - write immediately and verify
        d_json_path = directory / "D.json"
        try:
            if not write_json(str(d_json_path), d_data):
                logger.error(f"Failed to write D.json for {ticker} at {d_json_path}")
                return None
            
            # Verify D.json was written immediately
            if not d_json_path.exists():
                logger.error(f"D.json file not found after write: {d_json_path}")
                return None
        except Exception as e:
            logger.error(f"Exception writing D.json for {ticker}: {e}", exc_info=True)
            return None
        
        after_json_path = directory / "after.json"
        try:
            if not write_json(str(after_json_path), after_data):
                logger.error(f"Failed to write after.json for {ticker} at {after_json_path}")
                return None
            
            # Verify after.json was written immediately
            if not after_json_path.exists():
                logger.error(f"after.json file not found after write: {after_json_path}")
                return None
        except Exception as e:
            logger.error(f"Exception writing after.json for {ticker}: {e}", exc_info=True)
            return None
        
        # Check if this was a successful breakout (30% rise before crossing below 20SMA)
        is_successful, peak_date = check_successful_breakout(data, focus_idx, cross_idx)
        if is_successful and peak_date is not None:
            # Create successful breakout file
            success_date_str = format_date(peak_date)
            success_data = data.iloc[focus_idx:end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
            
            # Check for null values in success data and candle distribution
            if not success_data.isnull().any().any() and check_candle_distribution(success_data):
                if not write_json(str(directory / f"{success_date_str}.json"), success_data):
                    logger.warning(f"Failed to write {success_date_str}.json for {ticker}")
        
        # Add previous valid breakouts - only if we have valid breakouts to add
        prev_count = 0
        if valid_breakouts and len(valid_breakouts) > 0:
            # Make sure to pass the current breakout data, not try to access local variables
            prev_count = add_previous_breakouts(ticker, data, directory, focus_date, low_date, valid_breakouts)
        
        # Get pullback percentage for scoring
        _, _, pullback_pct = check_orderly_pullback(data, cons_start)
        
        # Create and return breakout data dictionary
        breakout_data = {
            'ticker': ticker,
            'breakout_date': focus_date,
            'low_date': low_date,  # This is the actual uptrend start date from find_big_move
            'high_date': cons_start,
            'category': category,
            'cross_idx': cross_idx,
            'pullback_pct': pullback_pct
        }
        
        # Remove marker file after successful processing
        try:
            marker_file = directory / ".processing"
            if marker_file.exists():
                marker_file.unlink()
        except:
            pass  # Ignore marker file errors
        
        if CONFIG.get('verbosity', 0) > 0:
            logger.info(f"Successfully processed {ticker} {focus_date.date()} (Category {category})")
        return breakout_data
    except Exception as e:
        logger.error(f"Error processing {ticker} at {focus_date.date()}: {e}")
        return None

def add_previous_breakouts(ticker, data, directory, current_breakout_date, current_low_date, valid_breakouts):
    """Add previous breakout examples to the current breakout's directory"""
    # Filter breakouts that occurred before current pattern started
    prev_breakouts = []
    already_selected = set()  # Track already selected breakouts to avoid duplicates
    
    # Get minimum spacing required between breakouts from config
    min_spacing_days = CONFIG.get('spacing_days', 30)  # Default to 30 days if not specified
    
    for breakout in valid_breakouts:
        # Skip if it's not a proper dict or missing required keys
        if not isinstance(breakout, dict) or not all(k in breakout for k in ['breakout_date', 'low_date', 'high_date']):
            continue
            
        prev_breakout_date = breakout['breakout_date']
        prev_low_date = breakout['low_date']
        prev_high_date = breakout['high_date']
    
        # Only include breakouts that occurred BEFORE the current breakout date
        # This ensures we only get true "previous" breakouts
        if (prev_breakout_date < current_breakout_date and 
            prev_breakout_date != current_breakout_date):
            
            # Get the index of the previous breakout
            try:
                prev_breakout_idx = data.index.get_loc(prev_breakout_date)
            except KeyError:
                # Skip if date not found in data
                continue
            
            # First check if this breakout is too close to the current breakout
            days_to_current = (current_breakout_date - prev_breakout_date).days
            if days_to_current < min_spacing_days:
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {prev_breakout_date.date()}: Too close to current ({days_to_current} days, need {min_spacing_days})")
                continue
                
            # Check for duplicates - avoid breakouts that are too close to already selected ones
            duplicate = False
            for selected_date in already_selected:
                days_between = abs((prev_breakout_date - selected_date).days)
                if days_between < min_spacing_days:
                    duplicate = True
                    if CONFIG.get('verbosity', 0) > 1:
                        logger.debug(f"{ticker} {prev_breakout_date.date()}: Too close to selected ({days_between} days, need {min_spacing_days})")
                    break
            
            if duplicate:
                continue
            
            # Apply all the same filters as the main breakout identification process
            
            # 1. Check daily range requirement
            if not check_average_daily_range(data, prev_breakout_idx):
                continue
                
            # 2. Find any big moves leading up to this point
            found_move, start_date, high_date, move_pct = find_big_move(data, prev_breakout_date, 
                                                                      min_days=CONFIG['min_uptrend_days'], 
                                                                      min_daily_pct=CONFIG['min_daily_uptrend_pct'])
            if not found_move:
                continue
            
            # Update the low_date to use the actual uptrend start date from find_big_move
            # Create a copy of the breakout dict to avoid modifying the original
            prev_breakout_data = breakout.copy()
            prev_breakout_data['low_date'] = start_date
                
            # 3. Verify proper time window between high and breakout
            days_since_high = (prev_breakout_date - prev_high_date).days
            if days_since_high < CONFIG['min_days_from_high']:
                continue
                
            # 4. Verify price stayed within range during consolidation
            if not check_price_within_range(data, prev_high_date, prev_breakout_date):
                continue
                
            # 5. Check pattern quality
            try:
                prev_high_idx = data.index.get_loc(prev_high_date)
            except KeyError:
                # Skip if high date not found in data
                continue
                
            if not check_pattern_quality(data, prev_high_idx, prev_breakout_idx):
                continue
                
            # 6. Verify there was a pullback after the high
            if not check_orderly_pullback(data, prev_high_date):
                continue
                
            # If all filters pass, include this breakout
            prev_breakouts.append(prev_breakout_data)
            already_selected.add(prev_breakout_date)
    
    # Sort by score (preferring category 3-4 over 1-2) then by recency
    # Score 1 for category 1, 2 for category 2, etc., add 0.1 * days_from_current for tiebreakers
    def score_breakout(b):
        cat = b.get('category', 2)  # Default to 2 if missing
        days_from_current = (current_breakout_date - b['breakout_date']).days
        days_score = 0.1 * (1 - min(days_from_current, 365) / 365)  # Slight preference for more recent breakouts
        return cat + days_score
    
    # Sort based on score in descending order
    prev_breakouts.sort(key=score_breakout, reverse=True)
    
    # Now select breakouts with proper spacing, prioritizing higher scores
    selected_prev_breakouts = []
    selected_dates = set()  # For tracking dates to ensure spacing
    
    # Add current breakout date to the selected dates to prevent choosing nearby breakouts
    selected_dates.add(current_breakout_date)
    
    # Consider all breakouts in order of score
    for breakout in prev_breakouts:
        date = breakout['breakout_date']
        
        # Check if this breakout date is too close to any already selected date
        too_close = False
        for selected_date in selected_dates:
            days_apart = abs((date - selected_date).days)
            if days_apart < min_spacing_days:
                too_close = True
                break
        
        if not too_close:
            selected_prev_breakouts.append(breakout)
            selected_dates.add(date)
            if len(selected_prev_breakouts) >= 5:  # Limit to 5 previous examples
                break
    
    # Process selected previous breakouts
    processed_count = 0
    for prev_breakout_data in selected_prev_breakouts:
        try:
            prev_breakout_date = prev_breakout_data['breakout_date']
            prev_low_date = prev_breakout_data['low_date']
            prev_high_date = prev_breakout_data['high_date']
            
            # Get indices for data slicing
            try:
                prev_breakout_idx = data.index.get_loc(prev_breakout_date)
            except KeyError:
                # Skip if date not found in data
                continue
                
            prev_cross_idx = find_first_cross_below_sma(data, prev_breakout_idx, sma_period=20)
            
            # Validate cross index
            if prev_cross_idx >= len(data):
                prev_cross_idx = min(prev_breakout_idx + 20, len(data) - 1)
            
            # Ensure all data strictly ends before the current breakout - don't just adjust the cross_idx
            # Find the index for the current breakout date (strictly before)
            try:
                current_breakout_idx = data.index.get_loc(current_breakout_date)
            except KeyError:
                # Skip if current breakout date not found in data
                continue
            
            # Use the day before the current breakout as a hard limit
            max_end_idx = current_breakout_idx - 1
            
            # If we don't have enough space between previous breakout and current breakout
            if max_end_idx <= prev_breakout_idx:
                continue  # Not enough space between patterns
                
            # Calculate end of after.json: max(cross_idx + 3, breakout_idx + 25) but before current breakout
            min_after_days = 25
            after_end_candidate = max(prev_cross_idx + 3, prev_breakout_idx + min_after_days)
            prev_end_idx = min(min(len(data) - 1, after_end_candidate), max_end_idx)
            
            # Ensure we have enough data
            if prev_end_idx <= prev_breakout_idx:
                continue  # Not enough space for after.json
            
            # Ensure previous breakout data ends BEFORE current d.json starts
            # Get current d.json start date to ensure no overlap
            try:
                current_low_idx = data.index.get_loc(current_low_date)
                # Previous breakout must end at least 1 day before current d.json starts
                max_prev_end_idx = min(prev_end_idx, current_low_idx - 1)
                if max_prev_end_idx <= prev_breakout_idx:
                    continue  # Not enough space
                prev_end_idx = max_prev_end_idx
            except KeyError:
                pass  # If we can't find current_low_date, use original prev_end_idx
            
            # Start from beginning of chart (index 0) to get complete breakout range
            # This ensures we capture the full pattern from start to end of after.json
            try:
                prev_low_idx = data.index.get_loc(prev_low_date)
            except KeyError:
                # Skip if low date not found in data
                continue
            
            # Start from beginning of available data (index 0) to capture complete range
            # This ensures previous breakouts show the full chart from start to end of after.json
            # Requirement #7: "from the start of the breakout chart to the end of after.json"
            chart_start_idx = 0
            
            # Create combined data: d.json (chart start to breakout) + after.json (day after breakout to end)
            # This matches requirement #9: previous breakouts consist of d.json + after.json combined
            # IMPORTANT: This must end before current d.json starts
            prev_combined_data = data.iloc[chart_start_idx:prev_end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
            
            # Validate combined data quality and edge cases
            if len(prev_combined_data) < 25:  # Minimum: 5 days for d.json + 20 days for after.json
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {prev_breakout_date.date()}: Insufficient combined data ({len(prev_combined_data)} bars)")
                continue
            
            # Check for null values
            if prev_combined_data.isnull().any().any():
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {prev_breakout_date.date()}: Null values in combined data")
                continue
            
            # Check for data consistency (malformed data)
            invalid_data = (
                (prev_combined_data['high'] < prev_combined_data['low']) |
                (prev_combined_data['high'] < prev_combined_data['close']) |
                (prev_combined_data['high'] < prev_combined_data['open']) |
                (prev_combined_data['low'] > prev_combined_data['close']) |
                (prev_combined_data['low'] > prev_combined_data['open']) |
                (prev_combined_data['volume'] < 0) |
                (prev_combined_data[['open', 'high', 'low', 'close']] <= 0).any(axis=1)
            )
            if invalid_data.any():
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {prev_breakout_date.date()}: Invalid/malformed data in combined data")
                continue
            
            # Check candle distribution
            if not check_candle_distribution(prev_combined_data):
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {prev_breakout_date.date()}: Too many green candles in combined data")
                continue
            
            # Verify date range doesn't overlap with current breakout
            prev_data_dates = set(prev_combined_data.index)
            current_d_data_dates = set()
            try:
                current_low_idx = data.index.get_loc(current_low_date)
                current_breakout_idx_check = data.index.get_loc(current_breakout_date)
                current_d_data = data.iloc[current_low_idx:current_breakout_idx_check+1]
                current_d_data_dates = set(current_d_data.index)
                
                # Check for overlap
                if prev_data_dates & current_d_data_dates:
                    if CONFIG.get('verbosity', 0) > 1:
                        logger.debug(f"{ticker} {prev_breakout_date.date()}: Date range overlaps with current breakout")
                    continue
            except (KeyError, ValueError) as e:
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {prev_breakout_date.date()}: Error checking overlap: {e}")
                # Continue anyway if we can't check overlap
                
            # Create date-stamped file for previous breakout using breakout_date (not peak_date)
            # This file contains combined d.json + after.json data (requirement #9)
            prev_date_str = format_date(prev_breakout_date)  # Use breakout_date, not peak_date
            prev_file_path = Path(directory) / f"{prev_date_str}.json"
            if not write_json(str(prev_file_path), prev_combined_data):
                logger.warning(f"Failed to write previous breakout file {prev_file_path}")
                continue
            
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error adding previous breakout {prev_breakout_date}: {e}")
            # Continue processing other breakouts even if one fails
            continue
    
    return processed_count

def identify_quality_breakouts(df: pd.DataFrame, ticker: str) -> list:
    """
    Efficiently identify quality breakouts in the given ticker data.
    
    Args:
        df: Daily stock price dataframe with technical indicators
        ticker: Stock ticker symbol for logging
        
    Returns:
        List of valid breakout dictionaries with all required metadata
    """
    # Early validation
    if df is None or len(df) < 252:
        if CONFIG.get('verbosity', 0) > 0:
            logger.debug(f"{ticker}: Insufficient data - need 252 days, got {0 if df is None else len(df)}")
        return []
    
    green_candles = (df['close'] > df['open']).sum()
    total_candles = len(df)
    if total_candles > 0 and (green_candles / total_candles > 0.85):
        if CONFIG.get('verbosity', 0) > 0:
            logger.debug(f"{ticker}: Problematic data pattern - {green_candles/total_candles:.1%} green candles")
        return []
    
    # Initialize tracking variables
    all_valid_breakouts = []
    setups = []
    
    # Pre-calculate commonly used signals to avoid redundant calculations
    # Calculate price change rates for faster comparison
    df['daily_range_pct'] = (df['high'] - df['low']) / df['open'] * 100
    df['close_change'] = df['close'].pct_change() * 100
    df['volume_ratio'] = df['volume'] / df['volume'].rolling(10).mean()
    
    # Track stats for filtering decisions
    stats = {
        'total_dates': 0,
        'initial_filter': 0,
        'daily_range_filter': 0,
        'big_move_filter': 0,
        'time_filter': 0,
        'price_range_filter': 0,
        'pattern_quality_filter': 0,
        'pullback_filter': 0,
        'duplicate_filter': 0,
        'category_adjustments': 0,
        'exception_allowed': 0,
        'category1_found': 0,
        'category2_found': 0,
        'category3_found': 0,
        'category4_found': 0,
        'green_candle_filter': 0
    }
    
    # Only examine dates within the valid range efficiently
    valid_range = slice(252, max(252, len(df) - 63))  # At least 1 year prior, 3 months after
    valid_indices = range(valid_range.start, valid_range.stop)
    
    # Record total dates examined
    stats['total_dates'] = len(valid_indices)
    
    # Use vectorized operations where possible
    # Pre-filter potential breakout candidates to reduce processing
    breakout_candidates = []
    initial_filter_counts = {
        'not_higher_high': 0,
        'close_not_above_prev_high': 0,
        'insufficient_volume': 0,
        'insufficient_daily_range': 0
    }
    
    for i in valid_indices:
        focus_date = df.index[i]
        if (i > 0 and i < len(df) - 1):  # Ensure we have surrounding data
            # Check each criterion separately for counting
            higher_high = df.iloc[i]['high'] > df.iloc[i-1]['high']
            close_above_prev_high = df.iloc[i]['close'] > df.iloc[i-1]['high']
            # Stricter volume requirement: must be at least 1.5x previous volume AND above 20-day average
            prev_volume = df.iloc[i-1]['volume']
            avg_volume_20 = df.iloc[max(0, i-20):i]['volume'].mean()
            volume_increase = (df.iloc[i]['volume'] > prev_volume * 1.5) and (df.iloc[i]['volume'] > avg_volume_20 * 1.3)
            daily_range_sufficient = df.iloc[i]['daily_range_pct'] >= CONFIG['min_daily_range_pct']
            
            # Additional quality filter: price should be above key moving averages
            price_above_mas = True
            if '20sma' in df.columns and '50sma' in df.columns:
                close_price = df.iloc[i]['close']
                sma20 = df.iloc[i]['20sma'] if not pd.isna(df.iloc[i]['20sma']) else 0
                sma50 = df.iloc[i]['50sma'] if not pd.isna(df.iloc[i]['50sma']) else 0
                price_above_mas = (sma20 > 0 and close_price > sma20 * 1.01) or (sma50 > 0 and close_price > sma50 * 1.01)
            
            # Only log detailed reasons if in verbose mode
            if CONFIG.get('verbosity', 0) > 1:
                date_str = focus_date.strftime('%Y-%m-%d')
                if not higher_high:
                    logger.debug(f"{ticker} {date_str}: Not a higher high")
                elif not close_above_prev_high:
                    logger.debug(f"{ticker} {date_str}: Close not above previous high")
                elif not volume_increase:
                    logger.debug(f"{ticker} {date_str}: Insufficient volume increase")
                elif not daily_range_sufficient:
                    logger.debug(f"{ticker} {date_str}: Insufficient daily range")
            
            # Count reasons why candidates fail the initial filter
            if not higher_high:
                initial_filter_counts['not_higher_high'] += 1
            elif not close_above_prev_high:
                initial_filter_counts['close_not_above_prev_high'] += 1
            elif not volume_increase:
                initial_filter_counts['insufficient_volume'] += 1
            elif not daily_range_sufficient:
                initial_filter_counts['insufficient_daily_range'] += 1
            
            if (higher_high and close_above_prev_high and volume_increase and daily_range_sufficient and price_above_mas):
                breakout_candidates.append(i)
            else:
                stats['initial_filter'] += 1
    
    if len(breakout_candidates) > 0 and CONFIG.get('verbosity', 0) > 0:
        logger.info(f"{ticker}: {len(breakout_candidates)} candidates passed initial filter (examined {stats['total_dates']} dates)")
        
        if CONFIG.get('verbosity', 0) > 1:
            logger.debug(f"  Filter counts: higher_high={initial_filter_counts['not_higher_high']}, "
                        f"close_above={initial_filter_counts['close_not_above_prev_high']}, "
                        f"volume={initial_filter_counts['insufficient_volume']}, "
                        f"range={initial_filter_counts['insufficient_daily_range']}")
    
    # Process the filtered candidates
    big_move_found = 0
    for i in breakout_candidates:
        focus_date = df.index[i]
        date_str = focus_date.strftime('%Y-%m-%d')
        
        # Check for problematic candle pattern in the recent data window
        window_start = max(0, i - 20)
        recent_window = df.iloc[window_start:i+1]
        green_candles_recent = (recent_window['close'] > recent_window['open']).sum()
        if green_candles_recent / len(recent_window) > 0.75:  # Stricter: was 0.8, now 0.75
            stats['green_candle_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {date_str}: Failed green candle filter - {green_candles_recent/len(recent_window):.1%} green candles")
            continue
        
        # Additional visual quality check: ensure breakout looks like a breakout
        # Price should be making a clear higher high, not just barely above
        if i > 0:
            prev_high = df.iloc[i-1]['high']
            current_high = df.iloc[i]['high']
            if current_high <= prev_high * 1.01:  # Less than 1% higher is not a clear breakout
                stats['initial_filter'] += 1
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {date_str}: Not a clear breakout (high only {((current_high/prev_high-1)*100):.2f}% above previous)")
                continue
        
        # Additional quality filter: Check for consistent uptrend strength
        if i >= 10:
            recent_10_days = df.iloc[i-9:i+1]
            price_trend = (recent_10_days['close'].iloc[-1] - recent_10_days['close'].iloc[0]) / recent_10_days['close'].iloc[0]
            if price_trend < 0.05:  # Must have at least 5% gain in last 10 days
                stats['initial_filter'] += 1
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {date_str}: Failed trend strength filter - {price_trend*100:.2f}% gain")
                continue
        
        # Find any big moves leading up to this point - fast check
        found_move, move_start_date, high_date, move_pct = find_big_move(df, focus_date, 
                                                                        min_days=CONFIG['min_uptrend_days'], 
                                                                        min_daily_pct=CONFIG['min_daily_uptrend_pct'])
        if found_move:
            big_move_found += 1
        
        if not found_move:
            stats['big_move_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {date_str}: Failed big move filter")
            continue
            
        if move_start_date is None:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {date_str}: Failed move start date")
            continue
            
        move_start_idx = df.index.get_loc(move_start_date)
        segment = df.iloc[move_start_idx:i+1]
        high_idx = segment['high'].idxmax()
        high_point_idx = df.index.get_loc(high_idx)
        
        # Check time window constraint efficiently
        days_from_high = (focus_date - df.index[high_point_idx]).days
        if days_from_high < CONFIG['min_days_from_high']:
            stats['time_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {date_str}: Failed time filter - {days_from_high} days from high, need {CONFIG['min_days_from_high']}+")
            continue
            
        # Efficient batch checking of multiple criteria
        # 1. Check price range during consolidation
        if not check_price_within_range(df, df.index[high_point_idx], focus_date):
            stats['price_range_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                high_price = df.iloc[high_point_idx]['high']
                cons_low = df.iloc[high_point_idx:i+1]['low'].min()
                drop_pct = (high_price - cons_low) / high_price * 100
                logger.debug(f"{ticker} {date_str}: Failed price range filter - {drop_pct:.2f}% drop, max {CONFIG['max_consolidation_drop'] * 100}%")
            continue
            
        # 2. Check pattern quality
        if not check_pattern_quality(df, high_point_idx, i):
            stats['pattern_quality_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                pattern_length = i - high_point_idx
                logger.debug(f"{ticker} {date_str}: Failed pattern quality filter - {pattern_length} days insufficient")
            continue
            
        # 3. Check for pullback after high
        pullback_result, low_date, pullback_pct = check_orderly_pullback(df, df.index[high_point_idx])
        if not pullback_result:
            stats['pullback_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {date_str}: Failed pullback filter - {pullback_pct*100:.2f}% insufficient")
            continue
        
        # Get the low point efficiently
        low_point_idx = df.index.get_loc(low_date)
        
        # Check for duplicates efficiently
        duplicate = any(abs((valid_breakout['breakout_date'] - focus_date).days) < 5 
                       for valid_breakout in all_valid_breakouts)
        
        if duplicate:
            stats['duplicate_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker} {date_str}: Failed duplicate filter")
            continue
            
        # Find where price crosses below 20SMA after breakout
        cross_idx = find_first_cross_below_sma(df, i)
        
        # Determine category based on performance
        category = determine_performance_category(df, i, cross_idx)
        
        # Track category statistics
        category_key = f'category{category}_found'
        if category_key in stats:
            stats[category_key] += 1
            
        if CONFIG.get('verbosity', 0) > 0:
            logger.info(f"{ticker} {date_str}: Found valid breakout (Category {category})")
            
        # Process the breakout immediately - files will be written right away
        try:
            # Use move_start_date (beginning of uptrend) for D.json rather than just the pullback low
            # This ensures D.json captures the full uptrend rather than just a small segment
            breakout_data = process_breakout(
                ticker, df, focus_date, move_start_date, 
                df.index[high_point_idx], all_valid_breakouts
            )
            
            if breakout_data is not None:
                all_valid_breakouts.append(breakout_data)
                # Files have been written at this point - they should be visible on disk
            else:
                # process_breakout returned None - files were not written
                if CONFIG.get('verbosity', 0) > 1:
                    logger.debug(f"{ticker} {date_str}: Failed to process breakout data (returned None)")
        except Exception as e:
            logger.error(f"Error processing {ticker} at {focus_date.date()}: {e}")
            if CONFIG.get('verbosity', 0) > 0:
                logger.warning(f"{ticker} {date_str}: Exception during processing")
    
    if len(breakout_candidates) > 0 and CONFIG.get('verbosity', 0) > 0:
        logger.info(f"{ticker}: {len(all_valid_breakouts)} valid breakouts found from {len(breakout_candidates)} candidates")
        
        if len(all_valid_breakouts) > 0 and CONFIG.get('verbosity', 0) > 1:
            logger.debug(f"  Category breakdown: Cat1={stats['category1_found']}, Cat2={stats['category2_found']}, "
                        f"Cat3={stats['category3_found']}, Cat4={stats['category4_found']}")
    
    # Select the best breakouts efficiently
    if all_valid_breakouts:
        # Score and select breakouts in one step
        scored_breakouts = score_breakouts(df, all_valid_breakouts)
        setups = select_with_spacing(scored_breakouts)
        
        if CONFIG.get('verbosity', 0) > 0:
            logger.info(f"{ticker}: Selected {len(setups)} breakouts")
            
            if len(setups) > 0 and CONFIG.get('verbosity', 0) > 1:
                for setup in setups:
                    logger.debug(f"  {setup['breakout_date'].date()} (Category {setup['category']})")
    
    # Return all valid breakouts, not just the selected ones, to ensure previous breakouts are preserved
    for setup in setups:
        # Ensure each selected setup is in all_valid_breakouts
        if not any(b['breakout_date'] == setup['breakout_date'] for b in all_valid_breakouts):
            all_valid_breakouts.append(setup)
    
    return all_valid_breakouts

def score_breakouts(df, valid_breakouts):
    """Score breakouts by quality and return sorted list"""
    scored_breakouts = []
    
    for breakout in valid_breakouts:
        try:
            breakout_date = breakout['breakout_date']
            low_date = breakout['low_date']
            high_date = breakout['high_date']
            category = breakout['category']
            cross_idx = breakout['cross_idx']
            max_drop_pct = breakout.get('max_drop_pct', 0.3)  # Default for backward compatibility
            exception_days = breakout.get('exception_days', 0)  # Default for backward compatibility
            pullback_pct = breakout.get('pullback_pct', 0.05)  # Default for backward compatibility
            
            # Get indices for calculation
            idx = df.index.get_loc(breakout_date)
            high_idx = df.index.get_loc(high_date)
            
            # Calculate quality metrics
            # 1. Consolidation tightness - now using the stored max_drop_pct
            # Scale from 0-1 where 0 is maximum allowed drop and 1 is no drop at all
            tightness_score = 1.0 - (max_drop_pct / CONFIG['max_consolidation_drop'])
            
            # Apply penalty for exceptions
            if exception_days > 0:
                # Small penalty for having exceptions (-10% per exception day)
                tightness_score = tightness_score * (1.0 - 0.1 * exception_days)
            
            # Ensure score is within 0-1 range
            tightness_score = max(0.0, min(1.0, tightness_score))
            
            # 2. Consolidation length
            cons_days = (breakout_date - high_date).days
            days_score = min(cons_days / 60.0, 1.0)
            
            # 3. Pullback quality
            # Scale from 0-1, where 0.05 (5%) is the minimum and anything above 0.15 (15%) is considered perfect
            pullback_score = min((pullback_pct - CONFIG['min_pullback_pct']) / 0.10, 1.0)
            pullback_score = max(0.0, pullback_score)
            
            # 4. Post-breakout gain (for higher categories)
            gain_score = 0
            if category in [3, 4] and cross_idx < len(df):
                breakout_price = df.iloc[idx]['close']
                segment = df.iloc[idx:cross_idx+1]
                if not segment.empty:
                    highest_price = segment['high'].max()
                    gain_pct = (highest_price - breakout_price) / breakout_price
                    gain_score = min(gain_pct, 1.0)
            
            # Overall quality score - adjust weights to include pullback
            quality_score = (
                tightness_score * 0.60 +   # Consolidation tightness (60%)
                pullback_score * 0.15 +    # Pullback quality (15%)
                days_score * 0.10 +        # Consolidation length (10%)
                gain_score * 0.15          # Post-breakout gain (15%)
            )
            
            # Add to scored breakouts
            scored_breakouts.append((breakout_date, low_date, high_date, quality_score, breakout, category))
            
        except Exception as e:
            # If scoring fails, add with a low score
            scored_breakouts.append((breakout['breakout_date'], breakout['low_date'], 
                                   breakout['high_date'], 0.0, breakout, breakout['category']))
    
    # Sort by quality score (highest first)
    scored_breakouts.sort(key=lambda x: x[3], reverse=True)
    return scored_breakouts

def select_with_spacing(scored_breakouts, min_spacing_days=30):
    """
    Select breakouts ensuring minimum spacing between them
    with optimized time complexity
    """
    if not scored_breakouts:
        return []
        
    # Sort breakouts by score (descending) for efficient processing
    sorted_breakouts = sorted(scored_breakouts, key=lambda x: x[5], reverse=True)
    
    # Initialize data structures for selection
    selected_breakouts = []
    date_spans = []  # Store (start_date, end_date) spans to avoid O(n²) comparison
    
    # Process breakouts in order of score
    for _, _, _, _, breakout_data, _ in sorted_breakouts:
        breakout_date = breakout_data['breakout_date']
        
        # Check if this breakout is too close to any selected breakout
        min_date = breakout_date - pd.Timedelta(days=min_spacing_days)
        max_date = breakout_date + pd.Timedelta(days=min_spacing_days)
        
        # Efficient range check
        is_valid = True
        for start, end in date_spans:
            if (min_date <= end and max_date >= start):  # Date ranges overlap
                is_valid = False
                break
                
        if is_valid:
            selected_breakouts.append(breakout_data)
            date_spans.append((min_date, max_date))
    
    # Return in chronological order for consistency
    return sorted(selected_breakouts, key=lambda x: x['breakout_date'])

def log_breakout_stats(ticker: str, stats: dict, total_valid: int):
    """
    Log statistics about the breakout identification process.
    
    Args:
        ticker: Stock ticker symbol
        stats: Statistics dictionary
        total_valid: Number of valid breakouts found
    """
    if CONFIG.get('verbosity', 0) == 0:
        return
        
    logger.info(f"{ticker}: {total_valid} valid breakouts from {stats['total_dates']} dates examined")
    
    if CONFIG.get('verbosity', 0) > 1:
        logger.debug(f"  Filters: initial={stats['initial_filter']}, big_move={stats['big_move_filter']}, "
                    f"other={stats['time_filter'] + stats['price_range_filter'] + stats['pattern_quality_filter'] + stats['duplicate_filter'] + stats['pullback_filter']}")
        
    if total_valid > 0:
        logger.debug(f"  Categories: Cat1={stats['category1_found']}, Cat2={stats['category2_found']}, "
                    f"Cat3={stats['category3_found']}, Cat4={stats['category4_found']}")

def process_ticker(ticker: str, all_data: dict) -> bool:
    """
    Process a single ticker to find breakout patterns.
    
    Args:
        ticker: Stock ticker symbol
        all_data: Dictionary of all loaded ticker data (may be modified)
        
    Returns:
        True if breakouts were found, False otherwise
    """
    try:
        df = all_data.get(ticker)
        if df is None:
            df = read_stock_data(ticker)
            if df is None or not check_data_quality(df):
                return False
            all_data[ticker] = df
        
        all_valid_breakouts = identify_quality_breakouts(df, ticker)
        
        seen_dates = set()
        setups = []
        for breakout in all_valid_breakouts:
            if breakout['breakout_date'] not in seen_dates:
                setups.append(breakout)
                seen_dates.add(breakout['breakout_date'])
        
        return len(setups) > 0
    except Exception as e:
        logger.error(f"Error processing ticker {ticker}: {e}")
        return False

def get_tickers_to_process() -> list:
    """
    Get list of tickers with available data files.
    
    Returns:
        List of ticker symbols
    """
    try:
        data_dir = SCRIPT_DIR / 'data'
        if not data_dir.exists():
            logger.error(f"Data directory not found: {data_dir}")
            return []
        files = [f for f in data_dir.iterdir() if f.suffix == '.json' and f.name != 'A.json']
        tickers = [f.stem for f in files]
        logger.info(f"Found {len(tickers)} tickers to process")
        return tickers
    except Exception as e:
        logger.error(f"Error reading data directory: {e}")
        return []

def process_tickers(tickers: list, dataset: str) -> int:
    """
    Process all tickers to find and create breakout patterns with optimized batch processing.
    
    Args:
        tickers: List of ticker symbols to process
        dataset: Dataset name (unused, kept for compatibility)
        
    Returns:
        Number of successful breakouts found
    """
    total = len(tickers)
    if total == 0:
        logger.warning("No tickers to process")
        return 0
        
    STATS['ticker_count'] = total
    max_workers = min(CONFIG['max_workers'], os.cpu_count() or 4)
    batch_size = CONFIG['batch_size']
    
    logger.info(f"Processing {total} tickers with {max_workers} workers")
    
    # Phase 1: Load data efficiently with parallel processing
    all_data = {}
    valid_count = 0
    
    # Pre-check which files exist to avoid unnecessary processing
    data_dir = SCRIPT_DIR / 'data'
    existing_tickers = {f.stem for f in data_dir.glob('*.json') if f.name != 'A.json'}
    tickers_to_process = [t for t in tickers if t in existing_tickers]
    
    with tqdm(total=len(tickers_to_process), desc="Loading Data", disable=CONFIG.get('verbosity', 0) == 0) as pbar:
        for i in range(0, len(tickers_to_process), batch_size):
            batch = tickers_to_process[i:i + batch_size]
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(read_stock_data, ticker): ticker for ticker in batch}
                
                for future in concurrent.futures.as_completed(futures):
                    ticker = futures[future]
                    try:
                        df = future.result()
                        if df is not None:
                            all_data[ticker] = df
                            valid_count += 1
                    except Exception as e:
                        logger.debug(f"Error loading {ticker}: {e}")
                    finally:
                        pbar.update(1)
    
    logger.info(f"Loaded {valid_count}/{total} valid tickers")
    gc.collect()
    
    # Phase 2: Find breakouts with parallel processing
    # Process tickers sequentially to ensure files are written progressively
    # This ensures files appear immediately as breakouts are found
    success = 0
    
    with tqdm(total=len(all_data), desc="Finding Breakouts", disable=CONFIG.get('verbosity', 0) == 0) as pbar:
        for ticker in all_data.keys():
            try:
                if process_ticker(ticker, all_data):
                    success += 1
                    STATS['success_count'] += 1
                else:
                    STATS['failed_count'] += 1
            except Exception as e:
                logger.error(f"Error processing {ticker}: {e}")
                STATS['failed_count'] += 1
            finally:
                pbar.update(1)
    
    print_summary(total, valid_count, success)
    return success

def process_ticker_wrapper(ticker, all_data):
    """Wrapper function for process_ticker to handle exceptions"""
    try:
        return process_ticker(ticker, all_data)
    except Exception as e:
        logger.error(f"Error processing ticker {ticker}: {e}")
        return False

def print_summary(total: int, valid_count: int, success: int):
    """
    Print summary of processing results.
    
    Args:
        total: Total number of tickers processed
        valid_count: Number of valid tickers loaded
        success: Number of successful breakouts found
    """
    logger.info("=" * 50)
    logger.info(f"Processing Summary:")
    logger.info(f"  Total tickers: {total}")
    logger.info(f"  Valid tickers: {valid_count}")
    logger.info(f"  Breakouts found: {success}")
    if valid_count > 0:
        logger.info(f"  Success rate: {success / valid_count * 100:.2f}%")
    logger.info("=" * 50)

def cleanup():
    """Clean up global state and resources."""
    global _data_cache, _hourly_data_cache, STATS
    _data_cache.clear()
    _hourly_data_cache.clear()
    STATS = {'ticker_count': 0, 'success_count': 0, 'failed_count': 0}

def main() -> int:
    """
    Main function to run the breakout analysis with optimized workflow.
    
    Returns:
        Exit code (0 for success, 1 for error)
    """
    start_time = time.time()
    
    try:
        args = parse_args()
        configure_runtime(args)
        
        ds_dir = SCRIPT_DIR / 'ds' / CONFIG['dataset_name']
        if ds_dir.exists():
            shutil.rmtree(ds_dir)
        ds_dir.mkdir(parents=True, exist_ok=True)
        
        verbosity = CONFIG.get('verbosity', 1)
        if verbosity == 0:
            logger.info("Minimal logging - showing only final results")
        elif verbosity == 1:
            logger.info("Normal logging - showing filter summaries and breakout results")
        elif verbosity == 2:
            logger.info("Verbose logging - showing all rejection details")
        
        tickers = get_tickers_to_process()
        if not tickers:
            logger.warning("No tickers found to process")
            return 0
            
        process_tickers(tickers, str(ds_dir))
        
    except Exception as e:
        logger.error(f"Error in main: {e}", exc_info=True)
        return 1
    finally:
        cleanup()
        elapsed = time.time() - start_time
        logger.info(f"Completed in {elapsed:.2f} seconds")
    
    return 0

def configure_runtime(args) -> dict:
    """
    Configure runtime environment based on command line arguments.
    
    Args:
        args: Parsed command line arguments
        
    Returns:
        Updated CONFIG dictionary
    """
    if args.verbose:
        CONFIG['log_level'] = logging.INFO
        CONFIG['verbosity'] = 2
    elif args.quiet:
        CONFIG['log_level'] = logging.ERROR
        CONFIG['verbosity'] = 0
    
    if hasattr(args, 'verbosity'):
        CONFIG['verbosity'] = args.verbosity
    
    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    logging.basicConfig(level=CONFIG['log_level'], format=log_format, force=True)
    logging.getLogger('pandas').setLevel(logging.WARNING)
    logging.getLogger('yfinance').setLevel(logging.WARNING)
    
    warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)
    warnings.filterwarnings('ignore', category=FutureWarning)
    warnings.filterwarnings('ignore', category=UserWarning, module='yfinance')
    
    if args.dataset:
        CONFIG['dataset_name'] = args.dataset
    if args.workers:
        CONFIG['max_workers'] = args.workers
    
    logger.info("Starting breakout analysis")
    return CONFIG

if __name__ == "__main__":
    main()
