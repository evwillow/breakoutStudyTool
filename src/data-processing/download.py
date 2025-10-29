import yfinance as yf
import pandas as pd
import os
import threading
from typing import List, Optional, Set, Dict
from dataclasses import dataclass
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
import warnings
from time import sleep
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pathlib import Path
import numpy as np
import random
import time
import json

# Suppress specific warnings
warnings.filterwarnings('ignore', category=UserWarning, module='rich.live')

@dataclass
class DownloadResult:
    ticker: str
    success: bool
    records: Optional[int] = None
    error: Optional[str] = None
    attempts: int = 0

class StockDataDownloader:
    def __init__(self, output_dir: str = 'data'):
        self.output_dir = output_dir
        self.price_columns = ['Open', 'High', 'Low', 'Close']
        self.required_columns = self.price_columns + ['Volume']
        self.console = Console()
        self.existing_files: Set[str] = set()
        self.failed_tickers: Dict[str, int] = {}  # Track failed attempts per ticker
        
        # Ensure output directory exists and is writable
        try:
            os.makedirs(output_dir, exist_ok=True)
            # Test write permissions
            test_file = os.path.join(output_dir, '.test')
            with open(test_file, 'w') as f:
                f.write('')
            os.remove(test_file)
            
            # Load existing files
            self.existing_files = {f.replace('.json', '') for f in os.listdir(output_dir) if f.endswith('.json')}
            self.console.print(f"[blue]Found {len(self.existing_files)} existing data files[/blue]")
        except Exception as e:
            self.console.print(f"[red]Error: Cannot create or write to output directory '{output_dir}': {str(e)}[/red]")
            raise
        
        # Configure session with optimized retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=10,  # Increased for more retries
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=10)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        
        # Rate limiting variables
        self.last_request_time = 0
        self.base_delay = 0.5
        self.consecutive_failures = 0
        self.max_consecutive_failures = 5
        self.rate_limit_count = 0
        self.max_rate_limit_count = 5
        self.rate_limit_pause = 300  # 5 minutes pause when rate limited
        self.lock = threading.Lock()
        self.rate_limit_times = {}  # Track rate limit times per ticker

    def is_rate_limited(self, ticker: str) -> bool:
        """Check if a ticker is currently rate limited."""
        current_time = time.time()
        if ticker in self.rate_limit_times:
            if current_time < self.rate_limit_times[ticker]:
                return True
        return False

    def mark_rate_limited(self, ticker: str):
        """Mark a ticker as rate limited."""
        self.rate_limit_times[ticker] = time.time() + self.rate_limit_pause

    def wait_for_rate_limit(self):
        """Pause execution when rate limit is hit using exponential backoff."""
        wait_time = self.rate_limit_pause * (2 ** self.rate_limit_count) + random.uniform(0, 30)
        self.console.print(f"[yellow]Rate limit hit, taking a {wait_time/60:.1f} minute break...[/yellow]")
        sleep(wait_time)
        self.rate_limit_count = 0
        with self.lock:
            self.last_request_time = time.time()

    def smart_sleep(self):
        """Pause to enforce a minimal interval between requests."""
        with self.lock:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            delay = self.base_delay * (2 ** min(self.consecutive_failures, 3)) + random.uniform(0.5, 2)
            if time_since_last < delay:
                sleep(delay - time_since_last)
            self.last_request_time = time.time()

    def process_stock_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add SMA columns and sort the dataframe."""
        try:
            # Sort the dataframe first
            df = df.sort_index()
            
            # Ensure we have the required columns
            missing_cols = [col for col in self.required_columns if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
            
            # Calculate SMAs
            close_prices = df['Close'].values
            
            # Calculate SMAs with proper handling of edge cases
            for period in [10, 20, 50]:
                if len(close_prices) >= period:
                    sma = pd.Series(np.convolve(close_prices, np.ones(period)/period, mode='valid'), 
                                  index=df.index[period-1:])
                    df[f'{period}sma'] = sma
            
            return df
        except Exception as e:
            self.console.print(f"[red]Error processing data: {str(e)}[/red]")
            raise

    def process_bulk_batch(self, tickers_batch: List[str]) -> List[DownloadResult]:
        """Download and process a batch of tickers in bulk."""
        results = []
        # Filter out existing files and rate limited tickers
        valid_tickers = [
            ticker.strip().upper() for ticker in tickers_batch 
            if not any(ticker.strip().upper().endswith(suffix) for suffix in ['-WT', '-UN', 'U', 'W', 'R'])
            and ticker.strip().upper() not in self.existing_files
            and not self.is_rate_limited(ticker.strip().upper())
        ]
        
        if not valid_tickers:
            return results
        
        max_retries = 10
        data = None
        
        # Get data from earliest possible date by not specifying start_date
        for attempt in range(max_retries):
            try:
                self.smart_sleep()
                data = yf.download(' '.join(valid_tickers), timeout=30, group_by='ticker', auto_adjust=True)
                if data is None or (isinstance(data, pd.DataFrame) and data.empty):
                    raise Exception("No data received from yfinance")
                break
            except Exception as e:
                error_str = str(e).lower()
                if "too many requests" in error_str:
                    self.rate_limit_count += 1
                    if self.rate_limit_count >= self.max_rate_limit_count:
                        self.wait_for_rate_limit()
                    # Mark all tickers in batch as rate limited
                    for ticker in valid_tickers:
                        self.mark_rate_limited(ticker)
                        self.failed_tickers[ticker] = self.failed_tickers.get(ticker, 0) + 1
                    sleep(60 * (attempt + 1))
                    continue
                else:
                    self.console.print(f"[yellow]Download attempt {attempt + 1} failed: {str(e)}[/yellow]")
                    sleep(30)
        else:
            for ticker in valid_tickers:
                self.failed_tickers[ticker] = self.failed_tickers.get(ticker, 0) + 1
                results.append(DownloadResult(ticker, False, error="Bulk download failed after retries", attempts=self.failed_tickers[ticker]))
            return results

        # Process data for each valid ticker
        for ticker in valid_tickers:
            try:
                if isinstance(data, dict):
                    df = data.get(ticker)
                else:
                    if isinstance(data.columns, pd.MultiIndex):
                        try:
                            df = data.xs(ticker, axis=1, level=1)
                        except:
                            try:
                                df = data[ticker]
                            except:
                                raise Exception(f"No columns found for ticker {ticker}")
                    else:
                        df = data if ticker == valid_tickers[0] else None

                if df is None or df.empty or len(df) < 5:
                    self.failed_tickers[ticker] = self.failed_tickers.get(ticker, 0) + 1
                    results.append(DownloadResult(ticker, False, error="No data", attempts=self.failed_tickers[ticker]))
                    continue

                # Filter out rows with null values in Open
                if 'Open' in df.columns:
                    df = df.dropna(subset=['Open'])
                    if len(df) < 5:  # Check if we still have enough data after filtering
                        self.failed_tickers[ticker] = self.failed_tickers.get(ticker, 0) + 1
                        results.append(DownloadResult(ticker, False, error="Insufficient data after removing null Open values", attempts=self.failed_tickers[ticker]))
                        continue

                missing_cols = [col for col in self.required_columns if col not in df.columns]
                if missing_cols:
                    self.failed_tickers[ticker] = self.failed_tickers.get(ticker, 0) + 1
                    results.append(DownloadResult(ticker, False, error=f"Missing columns: {missing_cols}", attempts=self.failed_tickers[ticker]))
                    continue

                df = df[self.required_columns].copy()
                df = df.astype({col: 'float32' for col in self.price_columns})
                df = df.assign(**{col: lambda x, col=col: x[col].round(5) for col in self.price_columns})
                df = self.process_stock_data(df)
                
                records = df.reset_index().to_dict('records')
                output_path = os.path.join(self.output_dir, f'{ticker}.json')
                
                with open(output_path, 'w') as f:
                    pd.DataFrame(records).to_json(f, orient='records', date_format='iso')
                
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    results.append(DownloadResult(ticker, True, records=len(df), attempts=self.failed_tickers.get(ticker, 0) + 1))
                    self.consecutive_failures = 0
                    self.existing_files.add(ticker)
                    if ticker in self.failed_tickers:
                        del self.failed_tickers[ticker]  # Remove from failed tickers on success
                else:
                    raise Exception("File was not created or is empty")
                
            except Exception as e:
                error_msg = str(e)[:100]
                self.failed_tickers[ticker] = self.failed_tickers.get(ticker, 0) + 1
                results.append(DownloadResult(ticker, False, error=error_msg, attempts=self.failed_tickers[ticker]))
                self.consecutive_failures += 1
        
        return results

    def process_all(self, tickers: List[str], batch_size: int = 100):
        """Process tickers in batches sequentially."""
        total_results = []
        tickers = [str(ticker).strip() for ticker in tickers if str(ticker).strip()]
        total_batches = (len(tickers) + batch_size - 1) // batch_size
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=self.console
        ) as progress:
            task = progress.add_task("Processing tickers...", total=len(tickers))
            while True:  # Keep processing until all tickers are successful
                remaining_tickers = [t for t in tickers if t not in self.existing_files]
                
                if not remaining_tickers:
                    break
                    
                for batch_index, i in enumerate(range(0, len(remaining_tickers), batch_size)):
                    batch = remaining_tickers[i:i+batch_size]
                    self.console.print(f"[blue]Processing batch {batch_index+1} of {total_batches}...[/blue]")
                    batch_results = self.process_bulk_batch(batch)
                    total_results.extend(batch_results)
                    progress.update(task, advance=len(batch))
                    self.console.print(f"[green]Finished batch {batch_index+1} of {total_batches}.[/green]")
                    sleep(30)
        
        success_count = sum(1 for r in total_results if r.success)
        failure_count = len(total_results) - success_count
        self.console.print(f"\n[bold green]Success: {success_count}[/bold green] | [bold red]Failed: {failure_count}[/bold red] | [bold blue]Total: {len(total_results)}[/bold blue]")
        self.console.print(f"[bold blue]Data files saved in: {os.path.abspath(self.output_dir)}[/bold blue]")
        
        if self.failed_tickers:
            self.console.print("\n[yellow]Failed tickers:[/yellow]")
            for ticker, attempts in self.failed_tickers.items():
                self.console.print(f"  {ticker}: {attempts} attempts")
        
        return total_results

def main():
    console = Console()
    try:
        # Check if tickers.csv exists
        if not os.path.exists('tickers.csv'):
            console.print("[red]Error: tickers.csv file not found[/red]")
            return

        # Create data directory if it doesn't exist
        data_dir = 'data'
        try:
            os.makedirs(data_dir, exist_ok=True)
            # Test write permissions
            test_file = os.path.join(data_dir, '.test')
            with open(test_file, 'w') as f:
                f.write('')
            os.remove(test_file)
        except Exception as e:
            console.print(f"[red]Error: Cannot create or write to data directory: {str(e)}[/red]")
            return

        # Read the CSV ensuring tickers are strings and drop missing values
        try:
            tickers = (
                pd.read_csv('tickers.csv', header=None, names=['ticker'], dtype=str)
                  ['ticker']
                  .dropna()
                  .tolist()
            )
            if not tickers:
                console.print("[red]Error: No valid tickers found in tickers.csv[/red]")
                return
                
            console.print(f"[bold blue]Found {len(tickers):,} tickers to process[/bold blue]")
            console.print(f"[bold blue]Data will be saved to: {os.path.abspath(data_dir)}[/bold blue]")
            
            downloader = StockDataDownloader(output_dir=data_dir)
            results = downloader.process_all(tickers)
            
            # Print detailed results
            success_count = sum(1 for r in results if r.success)
            failure_count = len(results) - success_count
            console.print(f"\n[bold green]Success: {success_count}[/bold green] | [bold red]Failed: {failure_count}[/bold red] | [bold blue]Total: {len(results)}[/bold blue]")
            
            if failure_count > 0:
                console.print("\n[yellow]Failed tickers:[/yellow]")
                for r in results:
                    if not r.success:
                        console.print(f"  {r.ticker}: {r.error}")
                        
        except pd.errors.EmptyDataError:
            console.print("[red]Error: tickers.csv is empty[/red]")
        except Exception as e:
            console.print(f"[red]Error reading tickers file: {str(e)}[/red]")
            
    except Exception as e:
        console.print(f"[red]Unexpected error: {str(e)}[/red]")

if __name__ == "__main__":
    main()
