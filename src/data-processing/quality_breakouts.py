#!/usr/bin/env python3
"""
Quality Breakouts Data Processing Script

This script identifies and processes quality stock breakout patterns from daily stock data.
Optimized for speed and selectivity following Qullamaggie's breakout criteria.

Key Features:
- Identifies breakout patterns based on technical analysis criteria
- Optimized data loading with caching
- Minimal logging for maximum performance
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
import tempfile
import time
import warnings
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from tqdm.auto import tqdm

# Get script directory for relative path resolution
SCRIPT_DIR = Path(__file__).parent.resolve()

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
    'min_daily_range_pct': 3.0,  # Stricter: require 3% daily range
    'spacing_days': 20,
    'min_days_from_high': 14,  # Minimum 2 weeks consolidation
    'max_days_from_high': 60,  # Maximum 2 months consolidation
    'min_uptrend_days': 15,
    'min_daily_uptrend_pct': 0.7,  # Stricter: require 0.7% avg daily gain
    'max_consolidation_drop': 0.30,  # Stricter: max 30% drop (was 35%)
    'exception_threshold': 0.35,
    'max_exception_days': 2,  # Stricter: max 2 exception days
    'min_pullback_pct': 0.04,  # Stricter: require 4% pullback
    'min_pullback_days': 1,
    'max_pullback_days': 15,
    'max_lookback_days': 90,
    'min_big_move_pct': 35.0,  # Stricter: require 35% big move (was 30%)
    'max_big_move_pct': 100.0,
    'min_date': pd.Timestamp('1990-01-01'),
    'verbosity': 0  # Minimal logging for speed
}

logger = logging.getLogger(__name__)
STATS = {'ticker_count': 0, 'success_count': 0, 'failed_count': 0}
_data_cache = {}


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
        
        # Filter out data before 1990 (Qullamaggie's strategy is for modern markets)
        min_date = CONFIG.get('min_date', pd.Timestamp('1990-01-01'))
        if df.index.max() < min_date:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker}: All data before {min_date.date()}")
            return None
        df = df[df.index >= min_date].copy()
        if len(df) < 126:
            if CONFIG.get('verbosity', 0) > 1:
                logger.debug(f"{ticker}: Insufficient data after 1990 filter ({len(df)} rows)")
            return None
        
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
            try:
                df.name = ticker
            except Exception:
                pass
            _data_cache[ticker] = df
            return df
        return None
    except Exception as e:
        logger.error(f"Error reading data for {ticker}: {e}")
        return None


# Removed: fetch_hourly_data and verify_h_json_integrity - H.json functionality no longer needed

def check_data_quality(df):
    """Check if dataframe has minimum required data."""
    return df is not None and len(df) >= 126

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

def log_file_operation(*args, **kwargs):
    """No-op stub for removed logging functionality - optimized for speed."""
    pass

def write_json(path, df):
    """Write data to JSON file - optimized for speed."""
    try:
        path_obj = Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        if path.endswith("points.json"):
            data_to_write = [{"points": indicator} for indicator in df] if isinstance(df, list) else [{"points": str(df)}]
        else:
            if hasattr(df, 'columns'):
                df_copy = df.reset_index() if isinstance(df.index, pd.DatetimeIndex) else df.copy()
                df_copy.columns = df_copy.columns.str.lower()
                required_cols = ['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']
                if 'date' in df_copy.columns:
                    required_cols = ['date'] + required_cols
                
                if not all(col in df_copy.columns for col in required_cols):
                    return False
                
                df_subset = df_copy[required_cols].copy()
                df_subset = df_subset.where(pd.notnull(df_subset), None)
                
                if len(df_subset) == 0:
                    return False
                
                records = df_subset.to_dict('records')
                data_to_write = []
                for r in records:
                    record = {}
                    if 'date' in r:
                        date_val = r['date']
                        record["Date"] = date_val.strftime('%Y-%m-%d') if isinstance(date_val, pd.Timestamp) else (str(date_val) if date_val is not None else None)
                    record.update({
                        "Open": float(r['open']) if r['open'] is not None and not pd.isna(r['open']) else None,
                        "High": float(r['high']) if r['high'] is not None and not pd.isna(r['high']) else None,
                        "Low": float(r['low']) if r['low'] is not None and not pd.isna(r['low']) else None,
                        "Close": float(r['close']) if r['close'] is not None and not pd.isna(r['close']) else None,
                        "Volume": float(r['volume']) if r['volume'] is not None and not pd.isna(r['volume']) else None,
                        "10sma": float(r['10sma']) if r['10sma'] is not None and not pd.isna(r['10sma']) else None,
                        "20sma": float(r['20sma']) if r['20sma'] is not None and not pd.isna(r['20sma']) else None,
                        "50sma": float(r['50sma']) if r['50sma'] is not None and not pd.isna(r['50sma']) else None
                    })
                    data_to_write.append(record)
            else:
                data_to_write = df
        
        # Simplified write - single attempt, no verification overhead
        with tempfile.NamedTemporaryFile(mode='w', delete=False, dir=str(path_obj.parent),
                                        prefix=f".{path_obj.stem}_", suffix=path_obj.suffix,
                                        encoding='utf-8') as tmp_file:
            json.dump(data_to_write, tmp_file, indent=4, allow_nan=False)
            tmp_file.flush()
            tmp_path = Path(tmp_file.name)
        
        try:
            os.replace(tmp_path, path_obj)
        except OSError:
            if path_obj.exists():
                path_obj.unlink()
                os.replace(tmp_path, path_obj)
            else:
                tmp_path.rename(path_obj)
        
        return True
    except Exception as e:
        logger.error(f"Error writing {path}: {e}")
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
    
    # Higher Lows Pattern (increased priority - key consolidation pattern)
    if breakout_idx > 5:
        pre_breakout = data.iloc[max(0, breakout_idx-20):breakout_idx]
        if len(pre_breakout) >= 10:
            recent_low = pre_breakout.iloc[-5:]['low'].min()
            earlier_low = pre_breakout.iloc[-10:-5]['low'].min()
            earliest_low = pre_breakout.iloc[:-10]['low'].min() if len(pre_breakout) > 10 else float('inf')
            if recent_low > earlier_low * 1.01 and (len(pre_breakout) <= 10 or earlier_low > earliest_low * 1.005):
                score = 90 + min(20, (recent_low / earlier_low - 1) * 1500)  # Increased from 85+15
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
    
    # Volume Surge (reduced priority - consolidation patterns are more important)
    if breakout_idx > 20 and breakout_idx < len(data):
        short_term_avg = data.iloc[max(0, breakout_idx-10):breakout_idx]['volume'].mean()
        longer_term_avg = data.iloc[max(0, breakout_idx-30):breakout_idx]['volume'].mean()
        breakout_volume = data.iloc[breakout_idx]['volume']
        if short_term_avg > 0 and longer_term_avg > 0:
            volume_ratio = min(breakout_volume / short_term_avg, breakout_volume / longer_term_avg)
            if breakout_volume > short_term_avg * 1.8 and breakout_volume > longer_term_avg * 1.5:
                score = 50 + min(15, (volume_ratio - 1.5) * 30)  # Reduced from 75+25
                indicator_scores["Volume Surge"] = score
    
    # Volume Contraction (reduced priority)
    if breakout_idx > 15:
        early_vol = data.iloc[max(0, breakout_idx-15):max(0, breakout_idx-8)]['volume'].mean()
        late_vol = data.iloc[max(0, breakout_idx-7):breakout_idx]['volume'].mean()
        if early_vol > 0 and late_vol < early_vol * 0.85 and not pd.isna(early_vol) and not pd.isna(late_vol):
            vol_data = data.iloc[max(0, breakout_idx-15):breakout_idx]['volume']
            if len(vol_data) >= 7:
                days = np.arange(len(vol_data))
                volume_slope = np.polyfit(days, vol_data, 1)[0]
                if volume_slope < 0:
                    score = 45 + abs(volume_slope) * 50  # Reduced from 65+100
                    indicator_scores["Volume Contraction"] = score
    
    # Tight Consolidation (increased priority - key consolidation pattern)
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
                    score = 88 + (0.12 - range_pct) * 800  # Increased from 70+500
                    indicator_scores["Tight Consolidation"] = score
    
    # MA Support (increased priority - key consolidation pattern)
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
            score = 82 + (lows_near_ma / total_checks) * 40  # Increased from 68+30
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
        # Removed volume-based distribution check - focus on consolidation patterns
    
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
    """Create all necessary files for a breakout pattern."""
    dir_path = Path(directory)
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        return False
    
    category = determine_performance_category(data, breakout_idx, cross_idx)
    applied_indicators = generate_indicators(data, breakout_idx, category)
    
    points_path = dir_path / "points.json"
    return write_json(str(points_path), applied_indicators)

def create_files_with_category(directory: str, data: pd.DataFrame, breakout_idx: int, cross_idx: int, 
                               forced_category: int, ticker: str, d_data: pd.DataFrame) -> bool:
    """Create files with a forced category."""
    dir_path = Path(directory)
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        return False
    
    applied_indicators = generate_indicators(data, breakout_idx, forced_category)
    points_path = dir_path / "points.json"
    return write_json(str(points_path), applied_indicators)

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
        
        if CONFIG.get('verbosity', 0) >= 2:
            logger.debug(
                f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: Initial setup | "
                f"end_idx={end_idx} | start_idx={start_idx} | max_lookback={max_lookback} | "
                f"window_size={len(window)} | min_days={min_days} | min_daily_pct={min_daily_pct}"
            )
        
        # If not enough data, return False
        if len(window) < min_days:
            if CONFIG.get('verbosity', 0) >= 1:
                logger.debug(
                    f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: Not enough data - "
                    f"{len(window)} days, need {min_days}"
                )
            return False, None, None, 0
        
        # Find the high before the breakout
        high_price = window['high'].max()
        high_date = window['high'].idxmax()
        high_loc = window.index.get_loc(high_date)
        
        if CONFIG.get('verbosity', 0) >= 2:
            logger.debug(
                f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: Initial high found | "
                f"high_date={high_date.date()} | high_price={high_price:.2f} | high_loc={high_loc}"
            )
        
        # If high is at the end of the window (at the breakout date), find the previous high
        if high_loc >= len(window) - 3:
            # Use the window excluding the last 3 days
            prev_window = window.iloc[:-3]
            if not prev_window.empty:
                high_price = prev_window['high'].max()
                high_date = prev_window['high'].idxmax()
                high_loc = window.index.get_loc(high_date)
                if CONFIG.get('verbosity', 0) >= 2:
                    logger.debug(
                        f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: High at end, using previous | "
                        f"high_date={high_date.date()} | high_price={high_price:.2f} | high_loc={high_loc}"
                    )
        
        # If high is at the beginning of the window, use a more relaxed check (only 3 days instead of 5)
        if high_loc <= 3:
            if CONFIG.get('verbosity', 0) >= 1:
                logger.debug(
                    f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: High point too early "
                    f"(position {high_loc} <= 3) | window_size={len(window)} | "
                    f"high_date={high_date.date()} | end_date={end_date.date()}"
                )
            return False, None, None, 0
        
        # FIX: check_indices should be relative to window start (0-based), not absolute indices
        # high_loc is already relative to window start, so we iterate from 0 to high_loc
        check_indices = list(range(0, high_loc))
        
        if len(check_indices) == 0:
            if CONFIG.get('verbosity', 0) >= 1:
                logger.debug(
                    f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: No check_indices (high_loc={high_loc} <= 0) | "
                    f"window_size={len(window)} | high_date={high_date.date()}"
                )
            return False, None, None, 0
        
        if CONFIG.get('verbosity', 0) >= 2:
            logger.debug(
                f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: check_indices range | "
                f"start_idx={start_idx} (absolute) | high_loc={high_loc} (relative) | "
                f"check_indices_count={len(check_indices)} | "
                f"check_indices={check_indices[:10]}..." if len(check_indices) > 10 else f"check_indices={check_indices}"
            )
        
        # Try different starting points, looking for the earliest valid uptrend
        first_valid_idx = None
        valid_total_pct = 0
        
        # Enforce total gain within desired range (30% - 100% per Qullamaggie)
        min_total_gain = CONFIG.get('min_big_move_pct', 30.0)
        max_total_gain = CONFIG.get('max_big_move_pct', 100.0)
        
        # Track best candidate for logging
        best_candidate = None
        best_score = -1
        
        log_details = {
            'ticker': ticker or 'unknown',
            'end_date': str(end_date.date()),
            'high_date': str(high_date.date()),
            'high_price': high_price,
            'high_loc': high_loc,
            'window_size': len(window),
            'check_indices_count': len(check_indices),
            'min_total_gain': min_total_gain,
            'max_total_gain': max_total_gain,
            'min_daily_pct': min_daily_pct,
            'min_daily_pct_threshold': min_daily_pct * 0.8,
            'min_days': min_days
        }
        
        if CONFIG.get('verbosity', 0) >= 2:
            logger.debug(f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: Starting evaluation | {log_details}")
        
        for i in check_indices:
            segment = window.iloc[i:high_loc+1]
            if len(segment) < min_days:
                continue
            
            # Get start and end prices - use CLOSE price for start and HIGH for end
            start_price = segment.iloc[0]['close']
            end_price = segment.iloc[-1]['high']
            start_date_seg = segment.index[0]
            
            # Calculate total percentage gain
            total_pct = (end_price - start_price) / start_price * 100
            
            # Calculate days and average daily percentage
            days = max(1, (segment.index[-1] - segment.index[0]).days)
            simple_avg_daily_pct = total_pct / days if days > 0 else 0
            
            # Basic quality checks
            price_increases = (segment['close'] > segment['close'].shift(1)).sum()
            price_increase_ratio = price_increases / (len(segment) - 1) if len(segment) > 1 else 0
            
            # Check for single-day spikes
            max_single_day_gain = segment['high'].pct_change().max() * 100 if len(segment) > 1 else 0
            max_day_contribution = max_single_day_gain / total_pct if total_pct > 0 else 1.0
            
            # Volume check
            avg_volume = segment['volume'].mean()
            high_volume_days = (segment['volume'] > avg_volume * 1.2).sum()
            high_volume_ratio = high_volume_days / len(segment) if len(segment) > 0 else 0
            
            # Quality metrics - slightly relaxed to find more patterns
            consistent_uptrend = price_increase_ratio >= 0.4  # Changed from 0.5
            not_just_spike = max_day_contribution <= 0.6  # Changed from 0.5
            decent_volume = high_volume_ratio >= 0.25  # Changed from 0.3
            
            # Check each validation criterion
            # Qullamaggie: Big move should be 30-100%+ and last a few days to a few weeks
            # Limit to max 3 months (90 days) for the big move itself
            total_gain_ok = min_total_gain <= total_pct <= max_total_gain
            avg_daily_ok = simple_avg_daily_pct >= min_daily_pct * 0.8
            days_ok = min_days <= days <= 90  # Big move should be a few days to a few weeks (max ~3 months)
            quality_ok = (consistent_uptrend + not_just_spike + decent_volume >= 1)
            
            # Simplified validation criteria - must meet total gain within range and average daily move
            valid_segment = (
                total_gain_ok and
                avg_daily_ok and 
                days_ok and
                quality_ok
            )
            
            # Track best candidate (highest total_pct that meets some criteria)
            candidate_score = total_pct if total_pct > 0 else -1
            if candidate_score > best_score:
                best_score = candidate_score
                best_candidate = {
                    'start_date': str(start_date_seg.date()),
                    'start_price': start_price,
                    'end_price': end_price,
                    'total_pct': total_pct,
                    'days': days,
                    'simple_avg_daily_pct': simple_avg_daily_pct,
                    'price_increase_ratio': price_increase_ratio,
                    'max_day_contribution': max_day_contribution,
                    'high_volume_ratio': high_volume_ratio,
                    'total_gain_ok': total_gain_ok,
                    'avg_daily_ok': avg_daily_ok,
                    'days_ok': days_ok,
                    'quality_ok': quality_ok,
                    'consistent_uptrend': consistent_uptrend,
                    'not_just_spike': not_just_spike,
                    'decent_volume': decent_volume,
                    'valid': valid_segment
                }
            
            # Log detailed info for each segment if verbose
            if CONFIG.get('verbosity', 0) >= 2:
                logger.debug(
                    f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: Segment {i}->{high_loc} "
                    f"| start={start_date_seg.date()} | total_pct={total_pct:.2f}% | "
                    f"avg_daily={simple_avg_daily_pct:.3f}% | days={days} | "
                    f"gain_ok={total_gain_ok} | daily_ok={avg_daily_ok} | days_ok={days_ok} | "
                    f"quality_ok={quality_ok} | valid={valid_segment}"
                )
            
            if valid_segment:
                first_valid_idx = i
                valid_total_pct = total_pct
                if CONFIG.get('verbosity', 0) >= 2:
                    logger.debug(
                        f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: VALID SEGMENT FOUND! "
                        f"start_idx={i} | total_pct={total_pct:.2f}% | days={days}"
                    )
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
        
        # Log summary of evaluation
        segments_evaluated = sum(1 for i in check_indices if len(window.iloc[i:high_loc+1]) >= min_days)
        if CONFIG.get('verbosity', 0) >= 2:
            logger.debug(
                f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: Evaluation complete | "
                f"segments_evaluated={segments_evaluated} | check_indices_count={len(check_indices)} | "
                f"valid_found={first_valid_idx is not None}"
            )
        
        # Log failure with best candidate details
        if first_valid_idx is None:
            failure_reasons = []
            if best_candidate:
                if not best_candidate['total_gain_ok']:
                    if best_candidate['total_pct'] < min_total_gain:
                        failure_reasons.append(f"total_pct too low ({best_candidate['total_pct']:.2f}% < {min_total_gain}%)")
                    elif best_candidate['total_pct'] > max_total_gain:
                        failure_reasons.append(f"total_pct too high ({best_candidate['total_pct']:.2f}% > {max_total_gain}%)")
                
                if not best_candidate['avg_daily_ok']:
                    failure_reasons.append(
                        f"avg_daily too low ({best_candidate['simple_avg_daily_pct']:.3f}% < {min_daily_pct * 0.8:.3f}%)"
                    )
                
                if not best_candidate['days_ok']:
                    if best_candidate['days'] < min_days:
                        failure_reasons.append(f"days too few ({best_candidate['days']} < {min_days})")
                    elif best_candidate['days'] > 90:
                        failure_reasons.append(f"days too many ({best_candidate['days']} > 90)")
                
                if not best_candidate['quality_ok']:
                    quality_failures = []
                    if not best_candidate['consistent_uptrend']:
                        quality_failures.append(f"uptrend_ratio={best_candidate['price_increase_ratio']:.2f} < 0.4")
                    if not best_candidate['not_just_spike']:
                        quality_failures.append(f"spike_contribution={best_candidate['max_day_contribution']:.2f} > 0.6")
                    if not best_candidate['decent_volume']:
                        quality_failures.append(f"volume_ratio={best_candidate['high_volume_ratio']:.2f} < 0.25")
                    failure_reasons.append(f"quality failed ({', '.join(quality_failures)})")
                
                best_candidate_str = (
                    f"Best candidate: start={best_candidate['start_date']} | "
                    f"total_pct={best_candidate['total_pct']:.2f}% | "
                    f"avg_daily={best_candidate['simple_avg_daily_pct']:.3f}% | "
                    f"days={best_candidate['days']} | "
                    f"failures=[{', '.join(failure_reasons)}]"
                )
                
                if CONFIG.get('verbosity', 0) >= 2:
                    logger.debug(f"[BIG_MOVE] {ticker or 'unknown'} {end_date.date()}: {best_candidate_str}")
                elif CONFIG.get('verbosity', 0) == 1:
                    logger.info(
                        f"{ticker} {end_date.date()}: No valid big move found | "
                        f"best: {best_candidate['total_pct']:.2f}% over {best_candidate['days']} days "
                        f"(avg {best_candidate['simple_avg_daily_pct']:.3f}%/day) | "
                        f"reasons: {', '.join(failure_reasons[:2])}"  # Show first 2 reasons
                    )
            else:
                if CONFIG.get('verbosity', 0) >= 1:
                    logger.info(
                        f"{ticker} {end_date.date()}: No valid big move found "
                        f"(no candidates evaluated - window too small or high too early)"
                    )
        
        return False, None, None, 0
    
    except Exception as e:
        logger.error(f"Error in find_big_move: {e}")
        return False, None, None, 0

def check_pattern_quality(df, start_idx, end_idx):
    """Check if pattern has enough data points."""
    return end_idx - start_idx >= 4

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


def evaluate_candidate(
    df: pd.DataFrame,
    idx: int,
    existing_breakouts: List[dict],
    ticker: str,
    stats: dict,
    debug_enabled: bool
) -> Optional[dict]:
    """Evaluate a breakout candidate using all filters at once."""
    focus_date = df.index[idx]
    date_str = focus_date.strftime('%Y-%m-%d')
    
    def log_debug(message: str):
        if debug_enabled or CONFIG.get('verbosity', 0) > 1:
            logger.debug(message)
    
    def fail(reason_key: Optional[str], message: str):
        if reason_key and reason_key in stats:
            stats[reason_key] += 1
        log_debug(f"{ticker} {date_str}: {message}")
        return None
    
    # Recent candle distribution
    window_start = max(0, idx - 20)
    recent_window = df.iloc[window_start:idx+1]
    green_ratio = (recent_window['close'] > recent_window['open']).sum() / len(recent_window)
    if green_ratio > 0.85:
        return fail('green_candle_filter', f"Rejected - green candle ratio {green_ratio:.2f} > 0.85")
    
    # Breakout day must be meaningfully above prior high
    if idx > 0:
        prev_high = df.iloc[idx-1]['high']
        current_high = df.iloc[idx]['high']
        if prev_high and current_high <= prev_high * 1.005:
            return fail('initial_filter', f"Rejected - breakout high only {(current_high/prev_high-1)*100:.2f}% above previous")
    
    # Ensure recent trend has positive slope
    if idx >= 10:
        recent_10 = df.iloc[idx-9:idx+1]
        price_trend = (recent_10['close'].iloc[-1] - recent_10['close'].iloc[0]) / recent_10['close'].iloc[0]
        if price_trend < 0.03:
            return fail('initial_filter', f"Rejected - 10 day trend {price_trend*100:.2f}% < 3%")
    
    # Confirm big move (step 1)
    found_move, move_start_date, high_date, move_pct = find_big_move(
        df,
        focus_date,
        min_days=CONFIG['min_uptrend_days'],
        min_daily_pct=CONFIG['min_daily_uptrend_pct']
    )
    if not found_move or move_start_date is None or high_date is None:
        return fail('big_move_filter', f"Rejected - no qualifying big move (move_pct={move_pct:.2f}%)")
    
    move_start_idx = df.index.get_loc(move_start_date)
    segment = df.iloc[move_start_idx:idx+1]
    high_point_idx = df.index.get_loc(high_date)
    
    # Time since high (ensure orderly consolidation)
    # Qullamaggie: Consolidation phase is usually 2 weeks to 2 months
    days_from_high = (focus_date - df.index[high_point_idx]).days
    min_consolidation_days = CONFIG.get('min_days_from_high', 14)
    max_consolidation_days = CONFIG.get('max_days_from_high', 60)
    if days_from_high < min_consolidation_days:
        return fail('time_filter', f"Rejected - only {days_from_high} days since high (need >= {min_consolidation_days})")
    if days_from_high > max_consolidation_days:
        return fail('time_filter', f"Rejected - {days_from_high} days since high (need <= {max_consolidation_days})")
    
    # Consolidation tightness
    within_range = check_price_within_range(df, df.index[high_point_idx], focus_date)
    if not within_range:
        within_range = check_price_within_range_relaxed(
            df,
            df.index[high_point_idx],
            focus_date,
            max_drop=min(CONFIG['max_consolidation_drop'] + 0.05, 0.5)
        )
    if not within_range:
        return fail('price_range_filter', "Rejected - consolidation drop exceeded threshold")
    
    # Pattern length (higher lows, tightening range)
    if not check_pattern_quality(df, high_point_idx, idx):
        return fail('pattern_quality_filter', "Rejected - consolidation too short")
    
    # Pullback quality (step 2)
    pullback_result, low_date, pullback_pct = check_orderly_pullback(df, df.index[high_point_idx])
    if not pullback_result or low_date is None:
        return fail('pullback_filter', f"Rejected - pullback insufficient ({pullback_pct*100:.2f}%)")
    
    # Qullamaggie: Price should "surf" the rising 10-, 20-, and sometimes 50-day moving averages during consolidation
    # Check that moving averages are rising and price stays near/above them
    if idx >= 50 and '10sma' in df.columns and '20sma' in df.columns and '50sma' in df.columns:
        # Check consolidation period (from high to breakout)
        cons_start_idx = high_point_idx
        cons_end_idx = idx
        
        if cons_end_idx > cons_start_idx:
            # Get moving averages at start and end of consolidation
            sma10_start = df.iloc[cons_start_idx]['10sma'] if not pd.isna(df.iloc[cons_start_idx]['10sma']) else None
            sma20_start = df.iloc[cons_start_idx]['20sma'] if not pd.isna(df.iloc[cons_start_idx]['20sma']) else None
            sma50_start = df.iloc[cons_start_idx]['50sma'] if not pd.isna(df.iloc[cons_start_idx]['50sma']) else None
            sma10_end = df.iloc[cons_end_idx]['10sma'] if not pd.isna(df.iloc[cons_end_idx]['10sma']) else None
            sma20_end = df.iloc[cons_end_idx]['20sma'] if not pd.isna(df.iloc[cons_end_idx]['20sma']) else None
            sma50_end = df.iloc[cons_end_idx]['50sma'] if not pd.isna(df.iloc[cons_end_idx]['50sma']) else None
            
            # Check that moving averages are rising (at least 10SMA and 20SMA should be rising)
            mas_rising = True
            if sma10_start and sma10_end and sma10_end <= sma10_start * 0.98:  # Allow small tolerance
                mas_rising = False
            if sma20_start and sma20_end and sma20_end <= sma20_start * 0.98:
                mas_rising = False
            
            # Check that price stays near/above moving averages during consolidation
            # Price should touch or stay above at least one MA for most of the consolidation
            consolidation_segment = df.iloc[cons_start_idx:cons_end_idx+1]
            price_surfing = False
            if len(consolidation_segment) >= 5:
                touches_ma = 0
                for i in range(len(consolidation_segment)):
                    row = consolidation_segment.iloc[i]
                    low_price = row['low']
                    close_price = row['close']
                    sma10 = row['10sma'] if not pd.isna(row['10sma']) else None
                    sma20 = row['20sma'] if not pd.isna(row['20sma']) else None
                    sma50 = row['50sma'] if not pd.isna(row['50sma']) else None
                    
                    # Check if price touches or stays above at least one MA
                    if (sma10 and (low_price <= sma10 * 1.02 and close_price >= sma10 * 0.98)) or \
                       (sma20 and (low_price <= sma20 * 1.02 and close_price >= sma20 * 0.98)) or \
                       (sma50 and (low_price <= sma50 * 1.02 and close_price >= sma50 * 0.98)):
                        touches_ma += 1
                
                # Price should "surf" MAs for at least 40% of consolidation period
                if touches_ma / len(consolidation_segment) >= 0.4:
                    price_surfing = True
            
            if not mas_rising or not price_surfing:
                return fail('pattern_quality_filter', f"Rejected - price not surfing rising MAs (mas_rising={mas_rising}, price_surfing={price_surfing})")
    
    # Duplicate spacing
    min_spacing_days = max(3, CONFIG.get('spacing_days', 20) // 2)
    duplicate = any(
        abs((valid_breakout['breakout_date'] - focus_date).days) < min_spacing_days
        for valid_breakout in existing_breakouts
    )
    if duplicate:
        return fail('duplicate_filter', f"Rejected - another breakout within {min_spacing_days} days")
    
    # Range expansion / breakout (step 3)
    cross_idx = find_first_cross_below_sma(df, idx)
    category = determine_performance_category(df, idx, cross_idx)
    
    log_debug(
        f"{ticker} {date_str}: Candidate approved (Category {category}) "
        f"move_pct={move_pct:.2f}% pullback={pullback_pct*100:.2f}% days_from_high={days_from_high}"
    )
    
    return {
        'focus_date': focus_date,
        'move_start_date': move_start_date,
        'high_date': df.index[high_point_idx],
        'low_date': low_date,
        'category': category,
        'cross_idx': cross_idx
    }

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

def check_candle_distribution(df, max_green_pct=0.9):
    """Check if candle distribution is reasonable."""
    if 'open' not in df.columns or 'close' not in df.columns or len(df) == 0:
        return True
    green_pct = (df['close'] > df['open']).sum() / len(df)
    return green_pct <= max_green_pct

def process_breakout(ticker: str, data: pd.DataFrame, focus_date: pd.Timestamp, 
                    low_date: pd.Timestamp, cons_start: pd.Timestamp, 
                    forced_category: Optional[int] = None) -> Optional[dict]:
    """
    Process a single breakout pattern and create all necessary files.
    
    Args:
        ticker: Stock ticker symbol
        data: Full daily dataframe
        focus_date: Breakout date
        low_date: Start of uptrend date
        cons_start: High date before consolidation
        forced_category: Optional category override (1-4)
        
    Returns:
        Breakout data dictionary or None if processing fails
    """
    try:
        if CONFIG.get('verbosity', 0) > 0:
            logger.info(f"Processing breakout: {ticker} on {focus_date.date()}")
        
        # Get indices for slicing data FIRST (before creating directory)
        all_dates = data.index
        focus_idx = all_dates.get_loc(focus_date)
        
        # Get start of upward movement index
        low_idx = all_dates.get_loc(low_date)
        
        # Find where price crosses below 20SMA
        cross_idx = find_first_cross_below_sma(data, focus_idx, sma_period=20)
        # End 3 days after it closes below the 20sma
        end_idx = min(len(data) - 1, cross_idx + 3)
        
        # Create D.json with data from beginning of upward movement to breakout
        # Ensure Date index is preserved
        d_data = data.iloc[low_idx:focus_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']].copy()
        # Ensure index name is set for proper JSON serialization
        if d_data.index.name is None:
            d_data.index.name = 'Date'
        
        # Handle null values in D.json data
        if d_data.isnull().any().any():
            d_data = d_data.dropna()
            if d_data.empty:
                return None
            
        # Check if there are too many green candles in the data
        if not check_candle_distribution(d_data):
            return None
        
        # Visual quality check: Ensure breakout shows clear upward movement
        if len(d_data) >= 10:
            start_price = d_data.iloc[0]['close']
            end_price = d_data.iloc[-1]['close']
            total_gain = (end_price - start_price) / start_price
            if total_gain < 0.07:
                return None
        
        # Visual quality check: Ensure breakout day is clearly above recent highs
        if len(d_data) >= 6:
            recent_highs = d_data.iloc[-6:-1]['high'].max()
            breakout_high = d_data.iloc[-1]['high']
            if breakout_high <= recent_highs * 1.01:
                return None
        elif len(d_data) >= 2:
            recent_highs = d_data.iloc[:-1]['high'].max()
            breakout_high = d_data.iloc[-1]['high']
            if breakout_high <= recent_highs * 1.01:
                return None
            
        # Create after.json with data starting from the day after the breakout (not the beginning of uptrend)
        # Ensure it includes at least 25 days of data regardless of when price crosses below 20SMA
        after_start_idx = focus_idx + 1  # Start the day after the breakout
        min_after_days = 15  # Minimum days to include in after.json
        after_end_idx = max(min(len(data) - 1, after_start_idx + min_after_days), end_idx)
        
        # Ensure we have enough data
        if after_end_idx - after_start_idx < min_after_days:
            # If we don't have enough data after the breakout, use what we have
            after_end_idx = min(len(data) - 1, after_start_idx + min_after_days)
        
        # Get the after data
        after_data = data.iloc[after_start_idx:after_end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']].copy()
        # Ensure index name is set for proper JSON serialization
        if after_data.index.name is None:
            after_data.index.name = 'Date'
        
        # Handle null values in after.json data
        if after_data.isnull().any().any():
            after_data = after_data.dropna()
            if after_data.empty:
                return None
            
        # Check if there are too many green candles in the after data
        if not check_candle_distribution(after_data):
            return None
        
        # Determine category based on performance
        category = forced_category if forced_category is not None else determine_performance_category(data, focus_idx, cross_idx)
        
        # Create directory and write files
        date_str = format_date(focus_date)
        directory = SCRIPT_DIR / 'ds' / CONFIG['dataset_name'] / f"{ticker}_{date_str}"
        
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except Exception:
            return None
        
        # Write files
        if forced_category is not None:
            create_files_with_category(str(directory), data, focus_idx, cross_idx, forced_category, ticker, d_data)
        else:
            create_files(str(directory), data, focus_idx, cross_idx, ticker, d_data)
        
        # Write D.json and after.json
        if not write_json(str(directory / "D.json"), d_data):
            return None
        if not write_json(str(directory / "after.json"), after_data):
            return None
        
        # Quality check: Volume surge on breakout day
        if focus_idx > 0 and focus_idx < len(data):
            breakout_volume = data.iloc[focus_idx]['volume']
            avg_volume_10d = data.iloc[max(0, focus_idx-10):focus_idx]['volume'].mean()
            avg_volume_30d = data.iloc[max(0, focus_idx-30):focus_idx]['volume'].mean()
            volume_surge_10d = breakout_volume / avg_volume_10d if avg_volume_10d > 0 else 0
            volume_surge_30d = breakout_volume / avg_volume_30d if avg_volume_30d > 0 else 0
            if volume_surge_10d < 2.0 and volume_surge_30d < 2.0:
                return None
        
        # Quality check: Strong close on breakout day
        if focus_idx < len(data):
            breakout_row = data.iloc[focus_idx]
            close_to_high_pct = (breakout_row['high'] - breakout_row['close']) / breakout_row['high'] * 100
            if close_to_high_pct > 2.0:
                return None
        
        # Quality check: Price above key moving averages
        if focus_idx < len(data) and '10sma' in data.columns and '20sma' in data.columns:
            breakout_row = data.iloc[focus_idx]
            breakout_close = breakout_row['close']
            sma10 = breakout_row['10sma'] if not pd.isna(breakout_row['10sma']) else None
            sma20 = breakout_row['20sma'] if not pd.isna(breakout_row['20sma']) else None
            if sma10 and breakout_close <= sma10 * 1.01:
                if sma20 and breakout_close <= sma20 * 1.01:
                    return None
        
        # Check if this was a successful breakout (30% rise before crossing below 20SMA)
        is_successful, peak_date = check_successful_breakout(data, focus_idx, cross_idx)
        if is_successful and peak_date is not None:
            # Create successful breakout file
            success_date_str = format_date(peak_date)
            success_data = data.iloc[focus_idx:end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']].copy()
            # Ensure index name is set for proper JSON serialization
            if success_data.index.name is None:
                success_data.index.name = 'Date'
            
            # Check for null values in success data and candle distribution
            if not success_data.isnull().any().any() and check_candle_distribution(success_data):
                if not write_json(str(directory / f"{success_date_str}.json"), success_data):
                    logger.warning(f"Failed to write {success_date_str}.json for {ticker}")
        
        # Get pullback percentage for scoring
        _, _, pullback_pct = check_orderly_pullback(data, cons_start)
        
        # Create and return breakout data dictionary
        return {
            'ticker': ticker,
            'breakout_date': focus_date,
            'low_date': low_date,
            'high_date': cons_start,
            'category': category,
            'cross_idx': cross_idx,
            'pullback_pct': pullback_pct,
            'output_path': str(directory)
        }
    except Exception as e:
        logger.error(f"Error processing {ticker}: {e}")
        return None

def identify_quality_breakouts(df: pd.DataFrame, ticker: str) -> Tuple[list, dict, dict]:
    """
    Efficiently identify quality breakouts in the given ticker data.
    
    Args:
        df: Daily stock price dataframe with technical indicators
        ticker: Stock ticker symbol for logging
        
    Returns:
        List of valid breakout dictionaries with all required metadata
    """
    debug_enabled = CONFIG.get('verbosity', 0) >= 2
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
        'green_candle_filter': 0,
        'integrity_fail': 0
    }
    initial_filter_counts = {
        'not_higher_high': 0,
        'close_not_above_prev_high': 0,
        'insufficient_volume': 0,
        'insufficient_daily_range': 0
    }
    # Early validation
    if df is None or len(df) < 252:
        if CONFIG.get('verbosity', 0) > 0:
            logger.debug(f"{ticker}: Insufficient data - need 252 days, got {0 if df is None else len(df)}")
        if debug_enabled:
            logger.debug(f"{ticker}: Early exit because dataset length < 252")
        return [], stats, initial_filter_counts
    
    green_candles = (df['close'] > df['open']).sum()
    total_candles = len(df)
    if total_candles > 0 and (green_candles / total_candles > 0.85):
        if CONFIG.get('verbosity', 0) > 0:
            logger.debug(f"{ticker}: Problematic data pattern - {green_candles/total_candles:.1%} green candles")
        if debug_enabled:
            logger.debug(f"{ticker}: Early exit because green candle ratio {green_candles/total_candles:.2f} exceeded 0.85")
        return [], stats, initial_filter_counts
    
    # Initialize tracking variables
    all_valid_breakouts = []
    setups = []
    
    # Pre-calculate commonly used signals to avoid redundant calculations
    # Calculate price change rates for faster comparison
    df['daily_range_pct'] = (df['high'] - df['low']) / df['open'] * 100
    df['close_change'] = df['close'].pct_change() * 100
    df['volume_ratio'] = df['volume'] / df['volume'].rolling(10).mean()
    
    # Only examine dates within the valid range efficiently
    valid_range = slice(252, max(252, len(df) - 63))  # At least 1 year prior, 3 months after
    valid_indices = range(valid_range.start, valid_range.stop)
    
    # Record total dates examined
    stats['total_dates'] = len(valid_indices)
    if debug_enabled:
        logger.debug(f"{ticker}: Total candidate dates to evaluate: {stats['total_dates']}")
    
    # Use vectorized operations where possible
    # Pre-filter potential breakout candidates to reduce processing
    breakout_candidates = []
    for i in valid_indices:
        focus_date = df.index[i]
        if (i > 0 and i < len(df) - 1):  # Ensure we have surrounding data
            # Check each criterion separately for counting
            higher_high = df.iloc[i]['high'] > df.iloc[i-1]['high']
            close_above_prev_high = df.iloc[i]['close'] > df.iloc[i-1]['high']
            # Stricter volume requirement: must be at least 2.0x previous volume AND above 20-day average
            prev_volume = df.iloc[i-1]['volume']
            avg_volume_20 = df.iloc[max(0, i-20):i]['volume'].mean()
            volume_increase = (df.iloc[i]['volume'] > prev_volume * 2.0) and (df.iloc[i]['volume'] > avg_volume_20 * 1.5)
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
    elif debug_enabled:
        logger.debug(
            f"{ticker}: No candidates passed initial filter "
            f"(higher_high_fail={initial_filter_counts['not_higher_high']}, "
            f"close_fail={initial_filter_counts['close_not_above_prev_high']}, "
            f"volume_fail={initial_filter_counts['insufficient_volume']}, "
            f"range_fail={initial_filter_counts['insufficient_daily_range']})"
        )
    
    # Process the filtered candidates using unified evaluation
    for i in breakout_candidates:
        details = evaluate_candidate(df, i, all_valid_breakouts, ticker, stats, debug_enabled)
        if details is None:
            continue
        
        try:
            breakout_data = process_breakout(
                ticker,
                df,
                details['focus_date'],
                details['move_start_date'],
                details['high_date']
            )
            if breakout_data is not None:
                category_key = f"category{details['category']}_found"
                if category_key in stats:
                    stats[category_key] += 1
                all_valid_breakouts.append(breakout_data)
            else:
                stats['integrity_fail'] += 1
                message = (
                    f"{ticker} {details['focus_date'].date()}: "
                    "Breakout failed during final integrity checks"
                )
                if debug_enabled:
                    logger.debug(message)
                else:
                    logger.info(message)
        except Exception as e:
            stats['integrity_fail'] += 1
            logger.error(f"Error processing {ticker} at {details['focus_date'].date()}: {e}", exc_info=True)
            if CONFIG.get('verbosity', 0) > 0:
                logger.warning(f"{ticker} {details['focus_date'].date()}: Exception during processing")
    
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
    
    # Return all valid breakouts, not just the selected ones
    for setup in setups:
        # Ensure each selected setup is in all_valid_breakouts
        if not any(b['breakout_date'] == setup['breakout_date'] for b in all_valid_breakouts):
            all_valid_breakouts.append(setup)
    
    return all_valid_breakouts, stats, initial_filter_counts

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

def process_ticker(ticker: str) -> Tuple[bool, List[str]]:
    """
    Process a single ticker to find breakout patterns.
    Loads data, finds breakouts, and writes files immediately.
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        Tuple containing:
            - True if breakouts were found, False otherwise
            - List of directories where files were written
    """
    created_dirs: List[str] = []
    debug_enabled = CONFIG.get('verbosity', 0) >= 2
    try:
        # Load data for this ticker only
        df = read_stock_data(ticker)
        if debug_enabled:
            logger.debug(f"{ticker}: Starting processing with data length {0 if df is None else len(df)}")
        if df is None or not check_data_quality(df):
            if debug_enabled:
                logger.debug(f"{ticker}: Data failed quality checks")
            return False, created_dirs
        
        # Find and process breakouts (files are written during processing)
        all_valid_breakouts, stats, initial_counts = identify_quality_breakouts(df, ticker)
        if debug_enabled:
            logger.debug(f"{ticker}: identify_quality_breakouts returned {len(all_valid_breakouts) if all_valid_breakouts else 0} breakouts")
        
        if all_valid_breakouts:
            created_dirs = sorted({str(b.get('output_path')) for b in all_valid_breakouts if b.get('output_path')})
            if created_dirs:
                # Provide immediate feedback on where files were written
                for path in created_dirs:
                    if path:
                        tqdm.write(f"[breakout] {ticker}: wrote files to {path}")
        elif debug_enabled:
            logger.debug(f"{ticker}: No breakouts produced output directories")
        
        if not created_dirs and stats is not None:
            summary = (
                f"{ticker}: candidates={stats.get('total_dates', 0)}, "
                f"initial_fail={stats.get('initial_filter', 0)}, "
                f"big_move_fail={stats.get('big_move_filter', 0)}, "
                f"time_fail={stats.get('time_filter', 0)}, "
                f"price_fail={stats.get('price_range_filter', 0)}, "
                f"pattern_fail={stats.get('pattern_quality_filter', 0)}, "
                f"pullback_fail={stats.get('pullback_filter', 0)}, "
                f"duplicate_fail={stats.get('duplicate_filter', 0)}"
            )
            if initial_counts is not None:
                summary += (
                    f"; initial_reasons: high={initial_counts.get('not_higher_high', 0)}, "
                    f"close={initial_counts.get('close_not_above_prev_high', 0)}, "
                    f"volume={initial_counts.get('insufficient_volume', 0)}, "
                    f"range={initial_counts.get('insufficient_daily_range', 0)}"
                )
            tqdm.write(f"[summary] {summary}")
        success = len(created_dirs) > 0
        if debug_enabled:
            if success:
                logger.debug(f"{ticker}: Completed with {len(created_dirs)} output directories")
            else:
                logger.debug(f"{ticker}: Completed with no output directories created")
        return success, created_dirs
    except Exception as e:
        logger.error(f"Error processing ticker {ticker}: {e}", exc_info=True)
        return False, created_dirs
    finally:
        # Clear cache for this ticker to free memory
        if ticker in _data_cache:
            del _data_cache[ticker]

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
    Process all tickers iteratively: load -> find breakouts -> write files -> next.
    This ensures files are written immediately and memory usage is minimized.
    
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
    
    # Ensure dataset output directory exists
    # Check for root data/ directory first (new standard), then fallback to ds/
    root_data_dir = Path(SCRIPT_DIR.parent.parent) / 'data' / CONFIG['dataset_name']
    legacy_ds_dir = SCRIPT_DIR / 'ds' / CONFIG['dataset_name']
    
    # Use root data/ if it exists or can be created, otherwise use legacy location
    if root_data_dir.parent.exists() or root_data_dir.parent.parent.exists():
        dataset_root = root_data_dir
    else:
        dataset_root = legacy_ds_dir
    
    dataset_root.mkdir(parents=True, exist_ok=True)
    
    # Pre-check which files exist to avoid unnecessary processing
    data_dir = SCRIPT_DIR / 'data'
    existing_tickers = {f.stem for f in data_dir.glob('*.json') if f.name != 'A.json'}
    tickers_to_process = [t for t in tickers if t in existing_tickers]
    if len(tickers_to_process) < total:
        logger.info(f"Found {len(tickers_to_process)}/{total} tickers with data files")
    
    success = 0
    valid_count = 0
    created_directories: List[str] = []
    if CONFIG.get('verbosity', 0) >= 2:
        logger.debug(f"Processing {len(tickers_to_process)} tickers (after filtering existing data files)")
    
    # Process iteratively: load -> process -> write -> next
    with tqdm(total=len(tickers_to_process), desc="Processing Tickers", disable=CONFIG.get('verbosity', 0) == 0) as pbar:
        for ticker in tickers_to_process:
            try:
                # Load, process, and write files for this ticker
                success_flag, created_dirs = process_ticker(ticker)
                if success_flag:
                    success += 1
                    valid_count += 1
                    STATS['success_count'] += 1
                    created_directories.extend(created_dirs)
                else:
                    STATS['failed_count'] += 1
                    if CONFIG.get('verbosity', 0) >= 2:
                        logger.debug(f"{ticker}: No output created during processing loop")
            except Exception as e:
                logger.error(f"Error processing {ticker}: {e}", exc_info=True)
                STATS['failed_count'] += 1
            finally:
                pbar.update(1)
                # Periodic garbage collection to free memory
                if pbar.n % 50 == 0:
                    gc.collect()
    
    unique_dirs = sorted(set(created_directories))
    if unique_dirs:
        tqdm.write("Created breakout directories:")
        for path in unique_dirs:
            tqdm.write(f" - {path}")
    else:
        tqdm.write("No breakout directories were created.")
    
    print_summary(total, valid_count, success)
    return success

def process_ticker_wrapper(ticker):
    """Wrapper function for process_ticker to handle exceptions"""
    try:
        return process_ticker(ticker)
    except Exception as e:
        logger.error(f"Error processing ticker {ticker}: {e}")
        return False, []

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
    global _data_cache, STATS
    _data_cache.clear()
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
        
        # Use root data/ directory if available, otherwise use legacy ds/ location
        root_data_dir = Path(SCRIPT_DIR.parent.parent) / 'data' / CONFIG['dataset_name']
        legacy_ds_dir = SCRIPT_DIR / 'ds' / CONFIG['dataset_name']
        
        # Prefer root data/ directory
        if root_data_dir.parent.exists() or root_data_dir.parent.parent.exists():
            ds_dir = root_data_dir
        else:
            ds_dir = legacy_ds_dir
        
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
    
    if CONFIG['verbosity'] <= 0:
        CONFIG['log_level'] = logging.ERROR
    elif CONFIG['verbosity'] == 1:
        CONFIG['log_level'] = logging.INFO
    else:
        CONFIG['log_level'] = logging.DEBUG
    
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
