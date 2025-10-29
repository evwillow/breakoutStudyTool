#!/usr/bin/env python3
import os, json, time, random, logging, shutil, calendar, warnings, concurrent.futures, argparse, gc
from datetime import datetime
import pandas as pd, numpy as np
from tqdm.auto import tqdm

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Generate quality breakout patterns dataset')
    parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('-q', '--quiet', action='store_true', help='Minimize logging (errors only)')
    parser.add_argument('-d', '--dataset', type=str, default='quality_breakouts', help='Dataset name')
    parser.add_argument('-w', '--workers', type=int, default=4, help='Number of worker threads')
    parser.add_argument('--verbosity', type=int, choices=[0, 1, 2], default=1, 
                        help='Verbosity level: 0=minimal, 1=normal, 2=verbose')
    return parser.parse_args()

# ---------------- Configuration & Logging ----------------
CONFIG = {
    'dataset_name': 'quality_breakouts',
    'max_workers': 4,
    'batch_size': 20,
    'min_delay': 1,
    'max_delay': 3,
    'min_daily_range_pct': 3.5,  # Reduced from 5.0% - this is often a primary filter
    'spacing_days': 30,  # Minimum days between selected breakouts
    'min_days_from_high': 10,  # Minimum days required between high point and breakout
    'min_uptrend_days': 25,  # Increased from 15 to ensure longer uptrends
    'min_daily_uptrend_pct': 1.3,  # Increased from 1.0% to 1.3% to require stronger uptrends
    'max_consolidation_drop': 0.25,  # Increased from 0.20 (20%) to allow slightly deeper pullbacks
    'exception_threshold': 0.3,  # Threshold for brief exceptions (30%)
    'max_exception_days': 3,  # Maximum days allowed for brief exceptions
    'min_pullback_pct': 0.05,  # Minimum required pullback percentage (5%)
    'min_pullback_days': 2,  # Minimum days after high to look for pullback
    'max_pullback_days': 10,  # Maximum days after high to look for pullback
    'max_lookback_days': 250,  # Maximum days to look back for finding the start of an uptrend
    'log_level': logging.ERROR,  # Minimal logging - errors only
    'detailed_logging': False,   # Disable detailed rejection logging
    'verbosity': 0              # 0=minimal, 1=normal, 2=verbose
}

# Initialize logger - will be properly configured in main()
logger = logging.getLogger(__name__)

# ---------------- Global State ----------------
STATS = {'ticker_count': 0, 'success_count': 0, 'failed_count': 0}
_data_cache = {}

# ---------------- Helper Functions ----------------
def get_realistic_delay():
    delay = random.uniform(CONFIG['min_delay'], CONFIG['max_delay'])
    if random.random() < 0.05:
        delay += random.uniform(10, 20)
    return delay

def read_stock_data(ticker):
    """Load and preprocess stock data with efficient caching and calculation"""
    # Return cached data if available
    if ticker in _data_cache:
        return _data_cache[ticker]
        
    # Check file existence before attempting to open
    path = os.path.join('data', f'{ticker}.json')
    if not os.path.exists(path):
        return None
        
    try:
        # Efficiently load and validate data
        with open(path, 'r') as f:
            data = json.load(f)
        
        if not data or not isinstance(data, list):
            return None
            
        # Create DataFrame and validate required columns
        df = pd.DataFrame(data)
        required_cols = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
        if not all(col in df.columns for col in required_cols):
            return None
        
        # Standardize data format    
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        df.columns = df.columns.str.lower()
        
        # Check for problematic data pattern (too many green candles)
        green_candles = (df['close'] > df['open']).sum()
        total_candles = len(df)
        
        if total_candles > 0 and (green_candles / total_candles > 0.9):
            # If more than 90% green candles, this is likely bad data
            if CONFIG.get('verbosity', 0) > 1:
                print(f"✗ Skipping {ticker}: Problematic data pattern detected ({green_candles/total_candles:.1%} green candles)")
            return None
        
        # Precompute all technical indicators in one pass
        # SMA calculations
        df['10sma'] = df['close'].rolling(window=10).mean()
        df['20sma'] = df['close'].rolling(window=20).mean()
        df['50sma'] = df['close'].rolling(window=50).mean()
        
        # ATR calculation - optimize by precomputing components 
        high_low = df['high'] - df['low']
        high_close = (df['high'] - df['close'].shift()).abs()
        low_close = (df['low'] - df['close'].shift()).abs()
        
        # Only use concat once with all components
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df['atr14'] = true_range.rolling(14).mean()
        
        # Cache only if quality standards are met
        if check_data_quality(df):
            _data_cache[ticker] = df
            return df
        return None
    except Exception as e:
        logger.error(f"Error reading data for {ticker}: {e}")
        return None

def check_data_quality(df):
    # Only check for minimum required days
    return df is not None and len(df) >= 126

def check_average_daily_range(df, breakout_idx, min_range_pct=None):
    """
    Check if the average daily range on the breakout day is at least min_range_pct.
    Daily range is calculated as (high - low) / open * 100.
    """
    if breakout_idx >= len(df):
        return False
        
    if min_range_pct is None:
        min_range_pct = CONFIG['min_daily_range_pct']
    
    breakout_open = df.iloc[breakout_idx]['open']
    breakout_high = df.iloc[breakout_idx]['high']
    breakout_low = df.iloc[breakout_idx]['low']
    
    # Calculate the daily range percentage
    daily_range_pct = (breakout_high - breakout_low) / breakout_open * 100
    
    # Return True if the daily range meets the minimum requirement
    return daily_range_pct >= min_range_pct

def format_date(ts):
    ts = pd.to_datetime(ts)
    return f"{calendar.month_abbr[ts.month]}_{ts.day}_{ts.year}"

def write_json(path, df):
    """Write data to JSON file with optimized formatting based on file type"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        
        # Process based on file type
        if path.endswith("points.json"):
            # For points.json - optimized formatting for indicators
            if isinstance(df, list):
                data_to_write = [{"points": indicator} for indicator in df]
            else:
                # Fallback for non-list data
                data_to_write = [{"points": str(df)}]
                
        elif path.endswith("thing.json"):
            # For thing.json - simplified handling
            data_to_write = [{"thing": df}] if not isinstance(df, list) else df
            
        else:
            # For chart data files - optimize record creation
            if hasattr(df, 'columns'):
                # Pre-standardize column names once
                df.columns = df.columns.str.lower()
                
                # Use DataFrame.to_dict() for efficient record conversion
                df_subset = df[['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
                records = df_subset.to_dict('records')
                
                # Convert to required format with capitalization
                data_to_write = []
                for record in records:
                    data_to_write.append({
                        "Open": record['open'],
                        "High": record['high'],
                        "Low": record['low'],
                        "Close": record['close'],
                        "Volume": record['volume'],
                        "10sma": record['10sma'],
                        "20sma": record['20sma'],
                        "50sma": record['50sma']
                    })
            else:
                # Direct write for non-DataFrame objects
                data_to_write = df
                
        # Single write operation with proper encoding
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data_to_write, f, indent=4)
            
    except Exception as e:
        logger.error(f"Error writing {path}: {e}")
        # Re-raise for critical files if needed
        # if "critical" in path:
        #     raise

def determine_performance_category(df, breakout_idx, cross_idx):
    """
    Determine performance category based on price movement from breakout open to first close below 20SMA:
    1: -2.5% or less (failed breakouts)
    2: -2.5% to 10% (weak performers)
    3: 10% to 35% (moderate performers)
    4: 35% or more (strong performers)
    """
    # Ensure cross_idx is valid
    if cross_idx >= len(df):
        cross_idx = len(df) - 1
    
    # Get the open price on the breakout day
    breakout_price = df.iloc[breakout_idx]['open']
    
    # Get the close price on the day the stock first closes below the 20SMA
    cross_close_price = df.iloc[cross_idx]['close']
    
    # Calculate percentage change from breakout open to cross close
    performance_pct = (cross_close_price - breakout_price) / breakout_price * 100
    
    # Determine category based on performance percentage
    if performance_pct <= -2.5:
        return 1
    elif performance_pct <= 10:
        return 2
    elif performance_pct <= 35:
        return 3
    else:
        return 4

def generate_indicators(data, breakout_idx, category):
    """
    Generate relevant technical indicators for a breakout pattern.
    Uses precise calculations to ensure high accuracy in pattern detection.
    """
    applied_indicators = []
    
    # STRUCTURE AND PATTERN INDICATORS
    
    # Check for higher lows pattern in the consolidation phase with improved precision
    if breakout_idx > 5:
        pre_breakout = data.iloc[max(0, breakout_idx-20):breakout_idx]
        if len(pre_breakout) >= 10:  # Ensure we have enough data for comparison
            # Get lows from most recent 5 days vs previous period
            recent_low = pre_breakout.iloc[-5:]['low'].min()
            earlier_low = pre_breakout.iloc[-10:-5]['low'].min()
            earliest_low = pre_breakout.iloc[:-10]['low'].min() if len(pre_breakout) > 10 else float('inf')
            
            # Confirm a series of progressively higher lows (more strict condition)
            if recent_low > earlier_low * 1.01 and (len(pre_breakout) <= 10 or earlier_low > earliest_low * 1.005):
                applied_indicators.append("Higher Lows")
    
    # Detect cup and handle pattern (a common bullish continuation pattern)
    if breakout_idx > 30:
        # Need sufficient data for cup and handle detection
        window = data.iloc[max(0, breakout_idx-50):breakout_idx]
        if len(window) >= 30:
            # Split window into potential cup and handle sections
            potential_cup = window.iloc[:-10]  # Earlier section for cup
            potential_handle = window.iloc[-10:]  # Last 10 days for handle
            
            if len(potential_cup) >= 20:
                cup_left = potential_cup.iloc[:len(potential_cup)//2]['high'].max()
                cup_right = potential_cup.iloc[len(potential_cup)//2:]['high'].max()
                cup_bottom = potential_cup['low'].min()
                handle_low = potential_handle['low'].min()
                handle_high = potential_handle['high'].max()
                
                # Cup criteria: symmetric U shape with similar heights on both sides
                cup_symmetry = 0.8 <= cup_left/cup_right <= 1.25
                cup_depth = (min(cup_left, cup_right) - cup_bottom) / min(cup_left, cup_right) >= 0.1
                
                # Handle criteria: shallow pullback forming the handle
                handle_shallowness = handle_low > cup_bottom * 1.03  # Handle higher than cup bottom
                handle_retrace = (handle_high - handle_low) / handle_high <= 0.15  # Limited handle depth
                
                if cup_symmetry and cup_depth and handle_shallowness and handle_retrace:
                    applied_indicators.append("Cup and Handle")
    
    # MOMENTUM AND TREND INDICATORS
    
    # Check if moving averages are rising (enhanced criteria)
    if breakout_idx > 20:
        # Ensure we have the required SMA data
        if '20sma' in data.columns and '50sma' in data.columns:
            # Check if both SMAs are rising
            sma20 = data['20sma'].iloc[breakout_idx]
            sma20_10days_ago = data['20sma'].iloc[breakout_idx-10]
            
            sma50 = data['50sma'].iloc[breakout_idx] if not pd.isna(data['50sma'].iloc[breakout_idx]) else 0
            sma50_20days_ago = data['50sma'].iloc[breakout_idx-20] if breakout_idx >= 20 and not pd.isna(data['50sma'].iloc[breakout_idx-20]) else 0
            
            # More stringent criteria: both 20 and 50 SMAs must be rising
            if sma20 > sma20_10days_ago * 1.01 and (sma50 == 0 or sma50 > sma50_20days_ago * 1.005):
                applied_indicators.append("Uptrending MAs")
    
    # Detect if price is breaking out of a well-defined resistance level
    if breakout_idx > 20:
        # Look back 30 days maximum to find resistance levels
        lookback_window = data.iloc[max(0, breakout_idx-30):breakout_idx]
        
        if len(lookback_window) >= 15:
            # Find previous swing highs (local maxima)
            swing_highs = []
            for i in range(1, len(lookback_window)-1):
                if lookback_window.iloc[i]['high'] > lookback_window.iloc[i-1]['high'] and \
                   lookback_window.iloc[i]['high'] > lookback_window.iloc[i+1]['high']:
                    swing_highs.append(lookback_window.iloc[i]['high'])
            
            # Find clusters of resistance (swing highs within 2% of each other)
            resistance_levels = []
            if swing_highs:
                current_cluster = [swing_highs[0]]
                for high in swing_highs[1:]:
                    if abs(high - current_cluster[0]) / current_cluster[0] <= 0.02:
                        current_cluster.append(high)
                    else:
                        if len(current_cluster) >= 2:  # At least 2 touches needed for a valid resistance
                            resistance_levels.append(sum(current_cluster) / len(current_cluster))
                        current_cluster = [high]
                
                # Add the last cluster if valid
                if len(current_cluster) >= 2:
                    resistance_levels.append(sum(current_cluster) / len(current_cluster))
            
            # Check if breakout candle breaks above any resistance level
            if resistance_levels and breakout_idx < len(data):
                breakout_close = data.iloc[breakout_idx]['close']
                for level in resistance_levels:
                    if breakout_close > level * 1.01:  # 1% above resistance is a valid breakout
                        applied_indicators.append("Resistance Break")
                        break
    
    # VOLUME INDICATORS
    
    # Enhanced volume surge detection with comparison to longer-term average
    if breakout_idx > 20 and breakout_idx < len(data):
        # Calculate short-term and longer-term volume averages
        short_term_avg = data.iloc[max(0, breakout_idx-10):breakout_idx]['volume'].mean()
        longer_term_avg = data.iloc[max(0, breakout_idx-30):breakout_idx]['volume'].mean()
        breakout_volume = data.iloc[breakout_idx]['volume']
        
        # Avoid division by zero and ensure significantly above both averages
        if short_term_avg > 0 and longer_term_avg > 0:
            if breakout_volume > short_term_avg * 1.8 and breakout_volume > longer_term_avg * 1.5:
                applied_indicators.append("Volume Surge")
    
    # Detect declining volume during consolidation (sign of diminishing selling pressure)
    if breakout_idx > 15:
        # Early consolidation volume (days -15 to -8)
        early_vol = data.iloc[max(0, breakout_idx-15):max(0, breakout_idx-8)]['volume'].mean()
        # Late consolidation volume (days -7 to breakout)
        late_vol = data.iloc[max(0, breakout_idx-7):breakout_idx]['volume'].mean()
        
        # Improved check: volume needs to consistently trend lower
        if early_vol > 0 and late_vol < early_vol * 0.85 and not pd.isna(early_vol) and not pd.isna(late_vol):
            # Calculate daily volume slope to confirm consistent decline
            vol_data = data.iloc[max(0, breakout_idx-15):breakout_idx]['volume']
            if len(vol_data) >= 7:  # Need enough data points
                # Calculate simple linear regression slope
                days = np.arange(len(vol_data))
                volume_slope = np.polyfit(days, vol_data, 1)[0]
                
                if volume_slope < 0:  # Negative slope confirms downtrend
                    applied_indicators.append("Volume Contraction")
    
    # PRICE ACTION INDICATORS
    
    # Improved tight consolidation detection
    if breakout_idx > 10:
        # Look at the last 15 days before breakout
        pre_breakout = data.iloc[max(0, breakout_idx-15):breakout_idx]
        if len(pre_breakout) >= 7:  # Ensure enough data points
            high = pre_breakout['high'].max()
            low = pre_breakout['low'].min()
            close_vals = pre_breakout['close'].values
            
            if low > 0:  # Avoid division by zero
                range_pct = (high - low) / low
                
                # Calculate volatility reduction - standard deviation of closing prices
                # should decrease toward the breakout
                if len(close_vals) >= 10:
                    early_std = np.std(close_vals[:len(close_vals)//2])
                    late_std = np.std(close_vals[len(close_vals)//2:])
                    volatility_reduction = early_std > late_std
                else:
                    volatility_reduction = True  # Default for short sequences
                
                # Stricter criteria for tight consolidation: narrower range and reduced volatility
                if range_pct < 0.12 and volatility_reduction:
                    applied_indicators.append("Tight Consolidation")
    
    # Detect if price is finding support at key moving averages
    if breakout_idx > 20:
        if '20sma' in data.columns:
            lows_near_ma = 0
            total_checks = 0
            for i in range(max(0, breakout_idx-15), breakout_idx):
                if i < len(data) and not pd.isna(data.iloc[i]['low']) and not pd.isna(data.iloc[i]['20sma']):
                    total_checks += 1
                    # Price finds support near MA (more sensitive detection)
                    ma_value = data.iloc[i]['20sma']
                    low_value = data.iloc[i]['low']
                    # Support is found if low is within 3% of MA and closes above MA
                    if low_value >= ma_value * 0.97 and data.iloc[i]['close'] >= ma_value:
                        lows_near_ma += 1
            
            # More stringent requirement: at least 3 instances and higher percentage
            if lows_near_ma >= 3 and total_checks > 0 and lows_near_ma / total_checks >= 0.4:
                applied_indicators.append("MA Support")
    
    # VOLATILITY AND RELATIVE STRENGTH INDICATORS
    
    # Check if price is above key moving averages with enhanced criteria
    if breakout_idx > 50:
        # Ensure all required data is available
        if ('20sma' in data.columns and '50sma' in data.columns and breakout_idx < len(data)):
            sma20 = data['20sma'].iloc[breakout_idx] if not pd.isna(data['20sma'].iloc[breakout_idx]) else 0
            sma50 = data['50sma'].iloc[breakout_idx] if not pd.isna(data['50sma'].iloc[breakout_idx]) else 0
            close_price = data['close'].iloc[breakout_idx]
            
            # Enhanced criteria: price significantly above both MAs and 20SMA above 50SMA (bullish alignment)
            if sma20 > 0 and sma50 > 0 and close_price > sma20 * 1.02 and close_price > sma50 * 1.02 and sma20 > sma50:
                applied_indicators.append("Above Key MAs")
    
    # Detect lower volatility before breakout - enhanced ATR calculation
    if breakout_idx > 28 and 'atr14' in data.columns:
        # Get ATR for two 14-day periods
        recent_period = data.iloc[max(0, breakout_idx-14):breakout_idx]
        earlier_period = data.iloc[max(0, breakout_idx-28):max(0, breakout_idx-14)]
        
        # Only proceed if we have valid ATR data in both periods
        if not recent_period['atr14'].isna().all() and not earlier_period['atr14'].isna().all():
            recent_atr = recent_period['atr14'].mean()
            earlier_atr = earlier_period['atr14'].mean()
            
            # Enhanced criteria: check if ATR has been consistently decreasing
            atr_values = data.iloc[max(0, breakout_idx-28):breakout_idx]['atr14'].dropna()
            if len(atr_values) >= 10:
                days = np.arange(len(atr_values))
                atr_slope = np.polyfit(days, atr_values, 1)[0]
                
                # ATR must have decreased significantly AND have a negative slope
                if earlier_atr > 0 and recent_atr < earlier_atr * 0.82 and atr_slope < 0:
                    applied_indicators.append("Low Volatility")
    
    # Breakout strength indicator - check if close is significantly higher than open on breakout day
    if breakout_idx < len(data):
        breakout_open = data.iloc[breakout_idx]['open']
        breakout_close = data.iloc[breakout_idx]['close']
        breakout_high = data.iloc[breakout_idx]['high']
        
        if breakout_open > 0:
            # Calculate breakout candle strength
            candle_body_pct = (breakout_close - breakout_open) / breakout_open * 100
            close_to_high_pct = (breakout_high - breakout_close) / breakout_high * 100
            
            # Strong breakout: large body and close near high
            if candle_body_pct >= 2.0 and close_to_high_pct <= 0.5:
                applied_indicators.append("Strong Close")
    
    # CATEGORY-SPECIFIC INDICATORS
    
    # For better performing breakouts (high categories)
    if category >= 3:  # 10%+ gain categories
        # Add stronger leadership indicators for high-performing breakouts
        if "Above Key MAs" in applied_indicators or "Strong Close" in applied_indicators:
            applied_indicators.append("Sector Leader")
        else:
            # Alternative indicator for category 3-4
            applied_indicators.append("Market Leader")
    
    # For failed breakouts (category 1)
    if category == 1:  # -2.5% or worse
        # Remove overly positive indicators that don't match the outcome
        indicators_to_remove = ["Volume Surge", "Uptrending MAs", "Strong Close", "Sector Leader", "Market Leader"]
        for indicator in indicators_to_remove:
            if indicator in applied_indicators:
                applied_indicators.remove(indicator)
        
        # Add appropriate indicators for failed breakouts
        applied_indicators.append("Weak RS")  # Relative strength indicator
        
        # Look for excessive volume (potential distribution)
        if breakout_idx > 10 and breakout_idx < len(data):
            avg_volume = data.iloc[max(0, breakout_idx-10):breakout_idx]['volume'].mean()
            breakout_volume = data.iloc[breakout_idx]['volume']
            
            # Unusually high volume on a failed breakout often indicates distribution
            if avg_volume > 0 and breakout_volume > avg_volume * 2.2:
                applied_indicators.append("Distribution")
    
    # FINAL ADJUSTMENTS
    
    # Always ensure we have 3-5 indicators by adding contextually appropriate ones
    if len(applied_indicators) < 3:
        # Create priority queue of potential indicators based on category and pattern
        potential_indicators = []
        
        # Better performing stocks (categories 3-4)
        if category >= 3:
            potential_indicators = ["Resistance Break", "Strong Close", "Buy Volume"]
        # Weaker performers (categories 1-2)
        elif category <= 2:
            potential_indicators = ["Support Level", "Consolidation", "Base Building"]
        
        # Add generic indicators that are most accurate for all patterns
        applied_indicators.extend(potential_indicators[:min(3 - len(applied_indicators), len(potential_indicators))])
    
    # Cap at 5 indicators maximum for cleaner display - prioritize the most accurate ones
    if len(applied_indicators) > 5:
        # Priority order (most important indicators first)
        priority_order = [
            "Cup and Handle", "Resistance Break", "Higher Lows", "Volume Surge", "Tight Consolidation",
            "MA Support", "Uptrending MAs", "Above Key MAs", "Strong Close", "Low Volatility",
            "Volume Contraction", "Sector Leader", "Market Leader", "Weak RS", "Distribution"
        ]
        
        # Sort indicators by their priority
        sorted_indicators = sorted(applied_indicators, 
                                   key=lambda x: priority_order.index(x) if x in priority_order else len(priority_order))
        
        # Take top 5
        applied_indicators = sorted_indicators[:5]
    
    return applied_indicators

def create_files(directory, data, breakout_idx, cross_idx):
    """Create all necessary files for a breakout pattern"""
    os.makedirs(directory, exist_ok=True)
    
    # Determine performance category
    category = determine_performance_category(data, breakout_idx, cross_idx)
    
    # Create thing.json with performance category
    write_json(os.path.join(directory, "thing.json"), category)
    
    # Get relevant breakout indicators
    applied_indicators = generate_indicators(data, breakout_idx, category)
    
    # Write points.json with the proper array of objects format
    write_json(os.path.join(directory, "points.json"), applied_indicators)
    
    # Create H.json with historical data if we have enough data
    if len(data) >= 20:
        num_bars = min(random.randint(20, 40), len(data))
        h_data = data.tail(num_bars)[['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
        
        # Check if there are too many green candles in the historical data
        if check_candle_distribution(h_data):
            write_json(os.path.join(directory, "H.json"), h_data)
        else:
            # Skip creating H.json if distribution is problematic
            logger.warning(f"Skipping H.json creation due to problematic candle distribution")
    
    return True

def create_files_with_category(directory, data, breakout_idx, cross_idx, forced_category):
    """Like create_files but with a forced category (1-4)"""
    os.makedirs(directory, exist_ok=True)
    
    # Use the forced category
    category = forced_category
    
    # Create thing.json with the forced category
    write_json(os.path.join(directory, "thing.json"), category)
    
    # Get relevant breakout indicators
    applied_indicators = generate_indicators(data, breakout_idx, category)
    
    # Write points.json with indicators
    write_json(os.path.join(directory, "points.json"), applied_indicators)
    
    # Create H.json with historical data
    if len(data) >= 20:
        num_bars = min(random.randint(20, 40), len(data))
        h_data = data.tail(num_bars)[['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
        
        # Check if there are too many green candles in the historical data
        if check_candle_distribution(h_data):
            write_json(os.path.join(directory, "H.json"), h_data)
        else:
            # Skip creating H.json if distribution is problematic
            logger.warning(f"Skipping H.json creation due to problematic candle distribution")
    
    return True

def find_first_cross_below_sma(df, focus_idx, sma_period=20):
    """Find the first index where price closes below the specified SMA"""
    sma_col = f'{sma_period}sma'
    cross = (df['close'].iloc[focus_idx + 1:] < df[sma_col].iloc[focus_idx + 1:])
    if cross.any():
        return df.index.get_loc(cross[cross].index[0])
    return len(df) - 1

def check_successful_breakout(df, breakout_idx, cross_idx):
    """Check if price rose 30% from breakout open before closing below 20SMA"""
    # Early returns for invalid inputs
    if breakout_idx >= len(df) or breakout_idx < 0:
        return False, None
        
    breakout_open = df.iloc[breakout_idx]['open']
    breakout_date = df.index[breakout_idx]
    
    # Define the window: either until cross below 20SMA or max 70 days
    if cross_idx >= len(df):
        cross_idx = len(df) - 1
    
    # Find dates within 70 days after breakout
    max_days = 70
    dates_after = [d for d in df.index if d > breakout_date and (d - breakout_date).days <= max_days]
    
    if not dates_after:
        return False, None
    
    # Use the earlier of: cross below 20SMA or 70 days
    last_day = dates_after[-1]
    max_idx = df.index.get_loc(last_day)
    end_idx = min(cross_idx, max_idx)
    
    segment = df.iloc[breakout_idx:end_idx+1]
    if segment.empty:
        return False, None
    
    # Find highest price within our window
    highest_price = segment['high'].max()
    highest_date = segment['high'].idxmax()
    
    # Calculate percentage gain from breakout open to highest high
    gain_pct = (highest_price - breakout_open) / breakout_open
    
    return gain_pct >= 0.30, highest_date

def find_big_move(df, end_date, min_days=30, min_daily_pct=1.5):
    """
    Find an upward price movement averaging at least min_daily_pct per day over min_days.
    Modified to prioritize finding the earliest day that meets the criteria,
    then using the local minimum that follows as the actual start point.
    
    Args:
        df: Price dataframe
        end_date: The date to look back from (typically the breakout date)
        min_days: Minimum number of days required for upward movement (default 30)
        min_daily_pct: Minimum average daily percentage gain required (default 1.5%)
        
    Returns:
        Tuple of (success_bool, start_date, high_date, total_move_pct)
    """
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
            if CONFIG.get('detailed_logging', False) and ticker:
                print(f"❌ {ticker} ({end_date.strftime('%Y-%m-%d')}): Not enough data for big move - only {len(window)} days available, need {min_days}")
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
            if CONFIG.get('detailed_logging', False) and ticker:
                print(f"❌ {ticker} ({end_date.strftime('%Y-%m-%d')}): High point too early in window (position {high_loc})")
            return False, None, None, 0
        
        # Initialize counters for debugging
        total_segments = 0
        failed_min_days = 0
        failed_daily_pct = 0
        
        # First, identify potential starting points by looking for local minimums
        local_mins = []
        for i in range(start_idx + 3, high_loc - 3):
            # Check if this point is a local minimum (lowest low in a 7-day window)
            current_low = window.iloc[i]['low']
            window_before = window.iloc[max(0, i-3):i]['low'].min()
            window_after = window.iloc[i+1:min(i+4, len(window))]['low'].min()
            
            if current_low <= window_before and current_low <= window_after:
                local_mins.append(i)
        
        # If no local minimums found, use all potential starting points
        if not local_mins:
            local_mins = list(range(start_idx, high_loc))
        
        # Create list of all indices to check - prioritize earlier dates
        check_indices = list(range(start_idx, high_loc))
        # Sort indices by position (ascending) to find the earliest valid point
        check_indices.sort()
        
        # Try different starting points, looking for the earliest valid uptrend
        first_valid_idx = None
        valid_total_pct = 0
        
        for i in check_indices:
            segment = window.iloc[i:high_loc+1]
            total_segments += 1
            
            # Skip if segment is too short
            if len(segment) < min_days:
                failed_min_days += 1
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
                # Found the first valid starting point that meets criteria
                first_valid_idx = i
                valid_total_pct = total_pct
                break
            else:
                failed_daily_pct += 1
                continue
        
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
                            if CONFIG.get('detailed_logging', False) and ticker:
                                print(f"✅ {ticker} ({end_date.strftime('%Y-%m-%d')}): Found local minimum after first valid point - using as start date")
                            return True, start_date, high_date, valid_total_pct
            
            # If we couldn't find a suitable local minimum, use the original first valid point
            start_date = window.index[first_valid_idx]
            days_in_uptrend = max(1, (high_date - start_date).days)
            if CONFIG.get('detailed_logging', False) and ticker:
                print(f"✅ {ticker} ({end_date.strftime('%Y-%m-%d')}): Found valid uptrend - {valid_total_pct:.2f}% over {days_in_uptrend} days")
            return True, start_date, high_date, valid_total_pct
        
        # If no valid uptrend was found
        if CONFIG.get('detailed_logging', False) and ticker:
            print(f"❌ {ticker} ({end_date.strftime('%Y-%m-%d')}): No valid uptrend found")
        
        return False, None, None, 0
    
    except Exception as e:
        logger.error(f"Error in find_big_move: {e}")
        return False, None, None, 0

def check_pattern_quality(df, start_idx, end_idx):
    # Simple check - ensure we have enough data points
    return end_idx - start_idx >= 5

def check_price_within_range(df, high_date, breakout_date):
    # Check if price stays within 20% range from high to breakout
    high_idx = df.index.get_loc(high_date)
    breakout_idx = df.index.get_loc(breakout_date)
    
    if high_idx >= breakout_idx:
        return False
    
    high_price = df.iloc[high_idx]['high']
    # Find lowest price between high and breakout
    cons_low = df.iloc[high_idx:breakout_idx+1]['low'].min()
    
    # Calculate the drop from high to consolidation low
    drop_pct = (high_price - cons_low) / high_price
    
    # Check if the price stayed within 20% range
    result = drop_pct <= CONFIG['max_consolidation_drop']
    
    # Add detailed logging if enabled
    if not result and CONFIG.get('verbosity', 0) > 1:
        ticker = None
        try:
            if hasattr(df, 'name'):
                ticker = df.name
        except:
            pass
        
        date_str = high_date.strftime('%Y-%m-%d')
        print(f"❌ {ticker or 'Unknown'} ({date_str}): Price dropped {drop_pct*100:.2f}% during consolidation, maximum allowed is {CONFIG['max_consolidation_drop']*100}%")
    
    return result

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
    """
    Efficiently check if there's an orderly pullback after the high point.
    
    Returns:
        Tuple of (success_flag, low_date, pullback_pct)
    """
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
            if CONFIG.get('verbosity', 0) > 1 and ticker:
                date_str = high_date.strftime('%Y-%m-%d')
                print(f"❌ {ticker} ({date_str}): Pullback window too small - need at least {min_days} days after high")
            return False, None, 0
        
        # Get pullback window efficiently
        pullback_window = df.iloc[high_idx + min_days : end_idx]
        if pullback_window.empty:
            if CONFIG.get('verbosity', 0) > 1 and ticker:
                date_str = high_date.strftime('%Y-%m-%d')
                print(f"❌ {ticker} ({date_str}): Empty pullback window")
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
        
        if not result and CONFIG.get('verbosity', 0) > 1 and ticker:
            date_str = high_date.strftime('%Y-%m-%d')
            print(f"❌ {ticker} ({date_str}): Insufficient pullback - {pullback_pct*100:.2f}% vs required {min_pullback_pct*100}%")
        
        return result, low_date, pullback_pct
    
    except Exception as e:
        logger.error(f"Error in check_orderly_pullback: {e}")
        return False, None, 0

def check_candle_distribution(df, max_green_pct=0.75):
    """
    Check if the candle distribution is reasonable (not too many green candles).
    Returns True if the distribution is acceptable, False if there are too many green candles.
    
    Args:
        df: Price dataframe with 'open' and 'close' columns
        max_green_pct: Maximum allowable percentage of green candles (default: 75%)
        
    Returns:
        bool: True if distribution is acceptable, False if too many green candles
    """
    if 'open' not in df.columns or 'close' not in df.columns:
        # Can't check without required columns
        return True
    
    # Count green candles (close > open)
    green_candles = (df['close'] > df['open']).sum()
    total_candles = len(df)
    
    if total_candles == 0:
        return True
    
    green_pct = green_candles / total_candles
    
    # Return True if the percentage of green candles is acceptable
    return green_pct <= max_green_pct

def process_breakout(ticker, data, focus_date, low_date, cons_start, valid_breakouts=None, forced_category=None):
    """Process a single breakout pattern and create all necessary files"""
    try:
        print(f"Processing potential breakout for {ticker} on {focus_date}")
        
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
            print(f"✗ Disqualified breakout for {ticker} on {focus_date}: Null values in D.json data")
            return None
            
        # Check if there are too many green candles in the data
        if not check_candle_distribution(d_data):
            print(f"✗ Disqualified breakout for {ticker} on {focus_date}: Too many green candles (potential data issue)")
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
            print(f"✗ Disqualified breakout for {ticker} on {focus_date}: Null values in after.json data")
            return None
            
        # Check if there are too many green candles in the after data
        if not check_candle_distribution(after_data):
            print(f"✗ Disqualified breakout for {ticker} on {focus_date}: Too many green candles in after data (potential data issue)")
            return None
        
        # Determine category based on performance
        category = None
        if forced_category is not None:
            category = forced_category
        else:
            category = determine_performance_category(data, focus_idx, cross_idx)
            
        # Only now create the directory AFTER all validations pass
        date_str = format_date(focus_date)
        directory = os.path.join('ds', CONFIG['dataset_name'], f"{ticker}_{date_str}")
        os.makedirs(directory, exist_ok=True)
            
        # Create the data files
        if forced_category is not None:
            create_files_with_category(directory, data, focus_idx, cross_idx, forced_category)
        else:
            create_files(directory, data, focus_idx, cross_idx)
        
        # Write the data files after validation
        write_json(os.path.join(directory, "D.json"), d_data)
        write_json(os.path.join(directory, "after.json"), after_data)
        
        # Check if this was a successful breakout (30% rise before crossing below 20SMA)
        is_successful, peak_date = check_successful_breakout(data, focus_idx, cross_idx)
        if is_successful and peak_date is not None:
            # Create successful breakout file
            success_date_str = format_date(peak_date)
            success_data = data.iloc[focus_idx:end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
            
            # Check for null values in success data and candle distribution
            if not success_data.isnull().any().any() and check_candle_distribution(success_data):
                write_json(os.path.join(directory, f"{success_date_str}.json"), success_data)
        
        # Add previous valid breakouts - only if we have valid breakouts to add
        prev_count = 0
        if valid_breakouts and len(valid_breakouts) > 0:
            # Make sure to pass the current breakout data, not try to access local variables
            prev_count = add_previous_breakouts(ticker, data, directory, focus_date, low_date, valid_breakouts)
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"Added {prev_count} previous breakouts for {ticker} on {focus_date.strftime('%Y-%m-%d')}")
        
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
        
        print(f"✓ Successfully processed breakout for {ticker} on {focus_date} (Category {category})")
        return breakout_data
    except Exception as e:
        logger.error(f"Error in process_breakout for {ticker} at {focus_date}: {e}")
        print(f"✗ Failed to process breakout for {ticker}: {e}")
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
                    print(f"✗ Skipping previous breakout for {ticker} on {prev_breakout_date}: Too close to current breakout ({days_to_current} days, need {min_spacing_days})")
                continue
                
            # Check for duplicates - avoid breakouts that are too close to already selected ones
            duplicate = False
            for selected_date in already_selected:
                days_between = abs((prev_breakout_date - selected_date).days)
                if days_between < min_spacing_days:
                    duplicate = True
                    if CONFIG.get('verbosity', 0) > 1:
                        print(f"✗ Skipping previous breakout for {ticker} on {prev_breakout_date}: Too close to already selected breakout ({days_between} days, need {min_spacing_days})")
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
                
            # Set end idx to be the earlier of: cross below 20SMA + 3 days OR day before current breakout
            prev_end_idx = min(min(len(data) - 1, prev_cross_idx + 3), max_end_idx)
            
            # Calculate peak date using data strictly before current breakout
            prev_segment = data.iloc[prev_breakout_idx:prev_end_idx+1]
            if prev_segment.empty:
                continue
                
            prev_peak_date = prev_segment['high'].idxmax()
            
            # Create the data, including full upward movement through post-breakout, but ending before current breakout
            try:
                prev_low_idx = data.index.get_loc(prev_low_date)
            except KeyError:
                # Skip if low date not found in data
                continue
            
            # Include the full upward movement by starting from the low date, but ending before current breakout
            # Use prev_low_date which now properly contains the start of uptrend from find_big_move
            prev_data = data.iloc[prev_low_idx:prev_end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
            
            # Check for null values in the data
            if prev_data.isnull().any().any():
                if CONFIG.get('verbosity', 0) > 1:
                    print(f"✗ Skipping previous breakout for {ticker} on {prev_breakout_date}: Null values in data")
                continue
            
            # Check if there are too many green candles in the data
            if not check_candle_distribution(prev_data):
                if CONFIG.get('verbosity', 0) > 1:
                    print(f"✗ Skipping previous breakout for {ticker} on {prev_breakout_date}: Too many green candles in expanded data")
                continue
            
            # Ensure minimum bars
            min_bars = 20
            if len(prev_data) < min_bars:
                # If needed, add more data before the low point, but still end before current breakout
                additional_bars = min_bars - len(prev_data)
                start_idx = max(0, prev_low_idx - additional_bars)
                prev_data = data.iloc[start_idx:prev_end_idx+1][['open', 'high', 'low', 'close', 'volume', '10sma', '20sma', '50sma']]
                
                # Check for null values in the expanded data
                if prev_data.isnull().any().any():
                    if CONFIG.get('verbosity', 0) > 1:
                        print(f"✗ Skipping previous breakout for {ticker} on {prev_breakout_date}: Null values in expanded data")
                    continue
                    
                # Re-check candle distribution
                if not check_candle_distribution(prev_data):
                    if CONFIG.get('verbosity', 0) > 1:
                        print(f"✗ Skipping previous breakout for {ticker} on {prev_breakout_date}: Too many green candles in expanded data")
                    continue
            
            # Skip if we still don't have enough data
            if len(prev_data) < min_bars:
                continue
                
            # Write the file
            prev_success_date_str = format_date(prev_peak_date)
            write_json(os.path.join(directory, f"{prev_success_date_str}.json"), prev_data)
            
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error adding previous breakout {prev_breakout_date}: {e}")
            # Continue processing other breakouts even if one fails
            continue
    
    return processed_count

def identify_quality_breakouts(df, ticker):
    """
    Efficiently identify quality breakouts in the given ticker data
    Returns a list of valid breakout setups with optimized processing
    """
    # Early validation
    if df is None or len(df) < 252:  # At least 1 year of data needed
        if CONFIG.get('verbosity', 1) > 0:
            print(f"❌ {ticker}: Insufficient data - need at least 252 days, got {0 if df is None else len(df)}")
        return []
    
    # Check for problematic data pattern (too many green candles overall)
    green_candles = (df['close'] > df['open']).sum()
    total_candles = len(df)
    if total_candles > 0 and (green_candles / total_candles > 0.85):
        if CONFIG.get('verbosity', 1) > 0:
            print(f"❌ {ticker}: Problematic data pattern - {green_candles/total_candles:.1%} green candles")
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
            # Reduced volume requirement from 1.5x to 1.2x
            volume_increase = df.iloc[i]['volume'] > df.iloc[i-1]['volume'] * 1.2
            daily_range_sufficient = df.iloc[i]['daily_range_pct'] >= CONFIG['min_daily_range_pct']
            
            # Only log detailed reasons if in verbose mode
            if CONFIG.get('verbosity', 0) > 1:
                date_str = focus_date.strftime('%Y-%m-%d')
                if not higher_high:
                    print(f"❌ {ticker} ({date_str}): Initial filter - Not a higher high ({df.iloc[i]['high']:.2f} vs {df.iloc[i-1]['high']:.2f})")
                elif not close_above_prev_high:
                    print(f"❌ {ticker} ({date_str}): Initial filter - Close not above previous high ({df.iloc[i]['close']:.2f} vs {df.iloc[i-1]['high']:.2f})")
                elif not volume_increase:
                    print(f"❌ {ticker} ({date_str}): Initial filter - Insufficient volume increase ({df.iloc[i]['volume']:.0f} vs {df.iloc[i-1]['volume'] * 1.2:.0f} needed)")
                elif not daily_range_sufficient:
                    print(f"❌ {ticker} ({date_str}): Initial filter - Insufficient daily range ({df.iloc[i]['daily_range_pct']:.2f}% vs {CONFIG['min_daily_range_pct']}% needed)")
            
            # Count reasons why candidates fail the initial filter
            if not higher_high:
                initial_filter_counts['not_higher_high'] += 1
            elif not close_above_prev_high:
                initial_filter_counts['close_not_above_prev_high'] += 1
            elif not volume_increase:
                initial_filter_counts['insufficient_volume'] += 1
            elif not daily_range_sufficient:
                initial_filter_counts['insufficient_daily_range'] += 1
            
            if (higher_high and close_above_prev_high and volume_increase and daily_range_sufficient):
                breakout_candidates.append(i)
            else:
                stats['initial_filter'] += 1
    
    if len(breakout_candidates) > 0 and CONFIG.get('verbosity', 0) > 0:
        print(f"\n---- {ticker} Initial Filter Results ----")
        print(f"Total dates examined: {stats['total_dates']}")
        print(f"Candidates passing initial filter: {len(breakout_candidates)}")
        
        # Only show detailed filter counts with higher verbosity
        if CONFIG.get('verbosity', 0) > 1:
            print(f"  Not a higher high: {initial_filter_counts['not_higher_high']}")
            print(f"  Close not above previous high: {initial_filter_counts['close_not_above_prev_high']}")
            print(f"  Insufficient volume increase: {initial_filter_counts['insufficient_volume']}")
            print(f"  Insufficient daily range: {initial_filter_counts['insufficient_daily_range']}")
    
    # Process the filtered candidates
    big_move_found = 0
    for i in breakout_candidates:
        focus_date = df.index[i]
        date_str = focus_date.strftime('%Y-%m-%d')
        
        # Check for problematic candle pattern in the recent data window
        window_start = max(0, i - 20)
        recent_window = df.iloc[window_start:i+1]
        green_candles_recent = (recent_window['close'] > recent_window['open']).sum()
        if green_candles_recent / len(recent_window) > 0.8:  # If more than 80% of recent candles are green
            stats['green_candle_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                print(f"❌ {ticker} ({date_str}): Failed green candle filter - {green_candles_recent/len(recent_window):.1%} green candles in recent window")
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
                print(f"❌ {ticker} ({date_str}): Failed big move filter - Couldn't find uptrend with {CONFIG['min_uptrend_days']}+ days averaging {CONFIG['min_daily_uptrend_pct']}%+ daily gains")
            continue
            
        # Calculate high point efficiently
        if move_start_date is None:
            if CONFIG.get('verbosity', 0) > 1:
                print(f"❌ {ticker} ({date_str}): Failed move start date - No valid start date found for uptrend")
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
                print(f"❌ {ticker} ({date_str}): Failed time filter - Only {days_from_high} days from high, need {CONFIG['min_days_from_high']}+ days")
            continue
            
        # Efficient batch checking of multiple criteria
        # 1. Check price range during consolidation
        if not check_price_within_range(df, df.index[high_point_idx], focus_date):
            stats['price_range_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                # Calculate the drop for logging
                high_price = df.iloc[high_point_idx]['high']
                cons_low = df.iloc[high_point_idx:i+1]['low'].min()
                drop_pct = (high_price - cons_low) / high_price * 100
                print(f"❌ {ticker} ({date_str}): Failed price range filter - Drop during consolidation was {drop_pct:.2f}%, max allowed is {CONFIG['max_consolidation_drop'] * 100}%")
            continue
            
        # 2. Check pattern quality
        if not check_pattern_quality(df, high_point_idx, i):
            stats['pattern_quality_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                pattern_length = i - high_point_idx
                print(f"❌ {ticker} ({date_str}): Failed pattern quality filter - Pattern length of {pattern_length} days insufficient for quality assessment")
            continue
            
        # 3. Check for pullback after high
        pullback_result, low_date, pullback_pct = check_orderly_pullback(df, df.index[high_point_idx])
        if not pullback_result:
            stats['pullback_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                print(f"❌ {ticker} ({date_str}): Failed pullback filter - Pullback of {pullback_pct*100:.2f}% insufficient (need {CONFIG['min_pullback_pct']*100}%+) or outside allowed window ({CONFIG['min_pullback_days']}-{CONFIG['max_pullback_days']} days)")
            continue
        
        # Get the low point efficiently
        low_point_idx = df.index.get_loc(low_date)
        
        # Check for duplicates efficiently
        duplicate = any(abs((valid_breakout['breakout_date'] - focus_date).days) < 5 
                       for valid_breakout in all_valid_breakouts)
        
        if duplicate:
            stats['duplicate_filter'] += 1
            if CONFIG.get('verbosity', 0) > 1:
                print(f"❌ {ticker} ({date_str}): Failed duplicate filter - Too close to another breakout")
            continue
            
        # Find where price crosses below 20SMA after breakout
        cross_idx = find_first_cross_below_sma(df, i)
        
        # Check breakout success and determine category
        success, category = check_successful_breakout(df, i, cross_idx)
        
        # Track category statistics
        category_key = f'category{category}_found'
        if category_key in stats:
            stats[category_key] += 1
            
        # Print debug message for successful candidate only if verbosity > 0
        if CONFIG.get('verbosity', 0) > 0:
            print(f"✅ {ticker} ({date_str}): Found valid breakout (Category {category})")
            
        # Process the breakout efficiently
        try:
            # Use move_start_date (beginning of uptrend) for D.json rather than just the pullback low
            # This ensures D.json captures the full uptrend rather than just a small segment
            breakout_data = process_breakout(
                ticker, df, focus_date, move_start_date, 
                df.index[high_point_idx], all_valid_breakouts
            )
            
            if breakout_data is not None:
                all_valid_breakouts.append(breakout_data)
                # Only log if verbosity > 1
                if CONFIG.get('verbosity', 0) > 1:
                    print(f"✅ {ticker} ({date_str}): Successfully processed breakout data")
            else:
                # Only log if verbosity > 1
                if CONFIG.get('verbosity', 0) > 1:
                    print(f"❌ {ticker} ({date_str}): Failed to process breakout data")
        except Exception as e:
            logger.error(f"Error processing {ticker} at {focus_date}: {e}")
            # Only log if verbosity > 0
            if CONFIG.get('verbosity', 0) > 0:
                print(f"❌ {ticker} ({date_str}): Exception during processing")
    
    # Print summary statistics for advanced filters (if at least one candidate passed initial filter)
    if len(breakout_candidates) > 0 and CONFIG.get('verbosity', 0) > 0:
        print(f"\n---- {ticker} Advanced Filter Results ----")
        print(f"Candidates passing initial filter: {len(breakout_candidates)}")
        print(f"Valid breakouts found: {len(all_valid_breakouts)}")
        
        # Show category breakdown only if we found some valid breakouts and verbosity > 1
        if len(all_valid_breakouts) > 0 and CONFIG.get('verbosity', 0) > 1:
            print(f"  Category breakdown:")
            print(f"    Category 1 (-2.5% or worse): {stats['category1_found']}")
            print(f"    Category 2 (-2.5% to 10%): {stats['category2_found']}")
            print(f"    Category 3 (10% to 35%): {stats['category3_found']}")
            print(f"    Category 4 (35% or more): {stats['category4_found']}")
    
    # Select the best breakouts efficiently
    if all_valid_breakouts:
        # Score and select breakouts in one step
        scored_breakouts = score_breakouts(df, all_valid_breakouts)
        setups = select_with_spacing(scored_breakouts)
        
        # Only print selection summary if verbosity > 0
        if CONFIG.get('verbosity', 0) > 0:
            print(f"\n---- {ticker} Final Selection: {len(setups)} breakouts ----")
            
            # Only print detailed breakout list if verbosity > 1
            if len(setups) > 0 and CONFIG.get('verbosity', 0) > 1:
                print("Selected breakout dates:")
                for setup in setups:
                    print(f"  • {setup['breakout_date'].strftime('%Y-%m-%d')} (Category {setup['category']})")
    
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

def log_breakout_stats(ticker, stats, total_valid):
    """Print statistics about the breakout identification process"""
    # Only print stats if verbosity is enabled
    if CONFIG.get('verbosity', 0) == 0:
        return
        
    print(f"\n===== Breakout Stats for {ticker} =====")
    print(f"Total dates examined: {stats['total_dates']}")
    print(f"Total valid breakouts found: {total_valid}")
    
    # Only print detailed stats if verbosity > 1
    if CONFIG.get('verbosity', 0) > 1:
        print(f"Filtered out by initial criteria: {stats['initial_filter']}")
        print(f"Filtered out by big move requirement: {stats['big_move_filter']}")
        print(f"Filtered out by other requirements: {stats['time_filter'] + stats['price_range_filter'] + stats['pattern_quality_filter'] + stats['duplicate_filter'] + stats['pullback_filter']}")
        
    # Always print category breakdown if breakouts were found
    if total_valid > 0:
        print(f"Category breakdown:")
        print(f"  Category 1 (-2.5% or worse): {stats['category1_found']}")
        print(f"  Category 2 (-2.5% to 10%): {stats['category2_found']}")
        print(f"  Category 3 (10% to 35%): {stats['category3_found']}")
        print(f"  Category 4 (35% or more): {stats['category4_found']}")

def process_ticker(ticker, all_data):
    """Process a single ticker to find breakout patterns"""
    try:
        df = read_stock_data(ticker)
        if df is None or not check_data_quality(df):
            return False
            
        all_data[ticker] = df
        all_valid_breakouts = identify_quality_breakouts(df, ticker)
        
        # Now we get all valid breakouts, but need to select final setups for counting
        # Filter to only the entries with unique breakout_dates
        seen_dates = set()
        setups = []
        for breakout in all_valid_breakouts:
            if breakout['breakout_date'] not in seen_dates:
                setups.append(breakout)
                seen_dates.add(breakout['breakout_date'])
        
        if setups:
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"Error processing ticker {ticker}: {e}")
        return False

def get_tickers_to_process():
    """Get list of tickers with available data files"""
    try:
        files = [f for f in os.listdir('data') if f.endswith('.json')]
        tickers = [os.path.splitext(f)[0] for f in files]
        print(f"Found {len(tickers)} tickers")
        return tickers
    except Exception as e:
        logger.error(f"Error reading data directory: {e}")
        return []

def process_tickers(tickers, dataset):
    """
    Process all tickers to find and create breakout patterns
    with optimized batch processing and resource management
    """
    total = len(tickers)
    if total == 0:
        print("No tickers to process")
        return 0
        
    # Initialize counters
    STATS['ticker_count'] = total
    max_workers = min(CONFIG['max_workers'], os.cpu_count() or 4)
    batch_size = CONFIG['batch_size']
    
    print(f"Processing {total} tickers with {max_workers} workers")
    
    # Phase 1: Load data for all tickers with optimized batching
    print("Phase 1: Loading Data")
    all_data = {}
    valid_count = 0
    
    # Process in batches to control memory usage
    with tqdm(total=total, desc="Loading Data") as pbar:
        for i in range(0, total, batch_size):
            batch = tickers[i:i + batch_size]
            
            # Create a process pool that automatically manages resources
            with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
                # Map is more efficient than manually managing futures for simple operations
                results = list(executor.map(read_stock_data, batch))
                
                # Process results
                for j, df in enumerate(results):
                    ticker = batch[j]
                    if df is not None:
                        all_data[ticker] = df
                        valid_count += 1
                    pbar.update(1)
    
    print(f"Loaded {valid_count} valid tickers out of {total}")
    
    # Free memory for unused tickers
    gc.collect()
    
    # Phase 2: Find breakouts efficiently with thread pooling
    print("\nPhase 2: Finding Breakouts")
    success = 0
    
    # Prepare arguments for processing function
    process_args = [(t, all_data) for t in all_data.keys()]
    
    with tqdm(total=len(all_data), desc="Breakouts") as pbar:
        # Create thread pool for I/O-bound operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs at once for better scheduling
            futures = [executor.submit(process_ticker_wrapper, t, all_data) for t, all_data in process_args]
            
            # Process results as they complete
            for future in concurrent.futures.as_completed(futures):
                try:
                    success_flag = future.result()
                    if success_flag:  # Success flag
                        success += 1
                        STATS['success_count'] += 1
                    else:
                        STATS['failed_count'] += 1
                except Exception as e:
                    logger.error(f"Error in breakout processing: {e}")
                    STATS['failed_count'] += 1
                finally:
                    pbar.update(1)
    
    # Print summary
    print_summary(total, valid_count, success)
    return success

def process_ticker_wrapper(ticker, all_data):
    """Wrapper function for process_ticker to handle exceptions"""
    try:
        return process_ticker(ticker, all_data)
    except Exception as e:
        logger.error(f"Error processing ticker {ticker}: {e}")
        return False

def print_summary(total, valid_count, success):
    """Print summary of processing results"""
    print("\nResults:")
    print("=" * 40)
    print(f"Total tickers processed: {total}")
    print(f"Valid tickers loaded: {valid_count}")
    print(f"Valid breakout setups: {success}")
    print(f"Success rate: {success / valid_count * 100:.2f}% (of valid tickers)")
    print("=" * 40)

def cleanup():
    """Clean up global state and resources"""
    global _data_cache, STATS
    _data_cache.clear()
    STATS = {'ticker_count': 0, 'success_count': 0, 'failed_count': 0}

def main():
    """Main function to run the breakout analysis with optimized workflow"""
    start_time = time.time()
    
    try:
        # Parse and apply configuration in a single block
        args = parse_args()
        configure_runtime(args)
        
        # Prepare output directory
        ds_dir = os.path.join('ds', CONFIG['dataset_name'])
        if os.path.exists(ds_dir):
            shutil.rmtree(ds_dir)
        os.makedirs(ds_dir, exist_ok=True)
        
        # Print info about detailed logging
        verbosity = CONFIG.get('verbosity', 1)
        if verbosity == 0:
            print("📊 Minimal logging enabled - showing only final results")
        elif verbosity == 1:
            print("📊 Normal logging enabled - showing filter summaries and breakout results")
        elif verbosity == 2:
            print("📊 Verbose logging enabled - showing all rejection details")
        
        # Get tickers and process them efficiently
        tickers = get_tickers_to_process()
        if not tickers:
            print("No tickers found to process")
            return 0
            
        process_tickers(tickers, ds_dir)
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
        return 1
    finally:
        # Clean up and report time
        cleanup()
        elapsed = time.time() - start_time
        print(f"Completed in {elapsed:.2f} seconds")
        return 0

def configure_runtime(args):
    """Configure runtime environment based on command line args"""
    # Set up logging based on command line arguments
    if args.verbose:
        CONFIG['log_level'] = logging.WARNING
    elif args.quiet:
        CONFIG['log_level'] = logging.ERROR
    
    # Set verbosity level from command line
    if hasattr(args, 'verbosity'):
        CONFIG['verbosity'] = args.verbosity
    
    # Configure logging just once
    logging.basicConfig(level=CONFIG['log_level'], format='%(asctime)s - %(levelname)s - %(message)s')
    logging.getLogger('pandas').setLevel(logging.WARNING)
    
    # Suppress common warnings
    warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)
    warnings.filterwarnings('ignore', category=FutureWarning)
    
    # Update CONFIG from command line args
    if args.dataset:
        CONFIG['dataset_name'] = args.dataset
    if args.workers:
        CONFIG['max_workers'] = args.workers
    
    print("Starting breakout analysis...")
    return CONFIG

if __name__ == "__main__":
    main()
