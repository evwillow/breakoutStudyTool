#!/usr/bin/env python3
"""
Simple Analytics Runner

Usage:
    python src/analytics/run_analytics.py [--visitors N] [--source SOURCE]
"""

import subprocess
import sys
import os
import argparse
import json
from pathlib import Path

# Try to import GA client (from same directory)
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))
try:
    from ga_client import get_ga_data
    GA_AVAILABLE = True
except ImportError:
    GA_AVAILABLE = False
    get_ga_data = None


def load_env_file(env_path, loaded_vars=None):
    """Load environment variables from .env file."""
    if not env_path.exists():
        return
    
    if loaded_vars is None:
        loaded_vars = set()
    
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            # Parse KEY=VALUE format
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                # Set if: not a system env var, OR it's a var we loaded from .env (allow override)
                if key:
                    if key not in os.environ or key in loaded_vars:
                        os.environ[key] = value
                        loaded_vars.add(key)


def load_environment(web_dir):
    """Load environment variables from .env files (Next.js style)."""
    # Track vars loaded from .env files (so .env.local can override them)
    loaded_vars = set()
    
    # Load in priority order: .env first, then .env.local (which overrides)
    # Project root first, then web directory (web dir overrides root)
    env_files = [
        web_dir.parent.parent / ".env",           # Lowest priority
        web_dir / ".env",
        web_dir.parent.parent / ".env.local",    # Higher priority
        web_dir / ".env.local",                  # Highest priority
    ]
    
    for env_file in env_files:
        if env_file.exists():
            load_env_file(env_file, loaded_vars)


def run_analytics(visitors=None, source=None):
    """Run analytics and display results."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    web_dir = project_root / "src" / "web"
    analytics_index = script_dir / "index.ts"
    
    if not analytics_index.exists():
        print(f"Error: Analytics file not found: {analytics_index}")
        sys.exit(1)
    
    if not web_dir.exists():
        print(f"Error: Web directory not found: {web_dir}")
        sys.exit(1)
    
    # Load environment variables from .env files
    load_environment(web_dir)
    
    # Fetch Google Analytics data if available
    ga_data = None
    if GA_AVAILABLE and get_ga_data:
        # Try to get property ID from env or measurement ID
        ga_property_id = os.environ.get("GA_PROPERTY_ID")
        ga_measurement_id = os.environ.get("NEXT_PUBLIC_GA_MEASUREMENT_ID") or os.environ.get("GA_MEASUREMENT_ID")
        ga_credentials = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        
        if ga_property_id:
            try:
                # Handle relative paths for credentials
                if ga_credentials and not os.path.isabs(ga_credentials):
                    # Try relative to project root first
                    abs_credentials = project_root / ga_credentials
                    if not abs_credentials.exists():
                        # Try relative to analytics directory
                        abs_credentials = script_dir / ga_credentials
                    if abs_credentials.exists():
                        ga_credentials = str(abs_credentials)
                    elif not os.path.exists(ga_credentials):
                        print(f"Warning: Credentials file not found: {ga_credentials}", file=sys.stderr)
                        ga_credentials = None
                
                ga_data = get_ga_data(
                    property_id=ga_property_id,
                    days=30,
                    credentials_path=ga_credentials
                )
                # Use GA data for traffic if not provided
                if not visitors and ga_data:
                    visitors = ga_data.get('total_users')
                if not source and ga_data and ga_data.get('sources'):
                    # Get top source
                    top_source = sorted(ga_data['sources'], key=lambda x: x['sessions'], reverse=True)[0]
                    source = top_source['source']
            except Exception as e:
                # Silently fail - GA is optional
                pass
    
    # Set environment variables
    env = os.environ.copy()
    if visitors:
        env["TRAFFIC_VISITORS"] = str(visitors)
    if source:
        env["TRAFFIC_SOURCE"] = source
    
    # Pass GA data as JSON if available
    if ga_data:
        env["GA_DATA"] = json.dumps(ga_data)
    
    # Check for Node.js
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Node.js not found. Please install Node.js.")
        sys.exit(1)
    
    # Use npx tsx with web's tsconfig for path resolution
    npx_cmd = "npx.cmd" if sys.platform == "win32" else "npx"
    tsconfig_path = web_dir / "tsconfig.json"
    
    # Run from web directory so path aliases resolve correctly
    # Use relative path to analytics file (normalize for cross-platform)
    analytics_rel_path = os.path.relpath(str(analytics_index), str(web_dir))
    # Normalize path separators
    analytics_rel_path = analytics_rel_path.replace("\\", "/")
    
    cmd = [npx_cmd, "tsx", "--tsconfig", str(tsconfig_path), analytics_rel_path]
    
    try:
        subprocess.run(cmd, env=env, cwd=web_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\nError: {e}")
        if e.stderr:
            stderr_text = e.stderr.decode() if isinstance(e.stderr, bytes) else e.stderr
            print(stderr_text)
        if e.stdout:
            stdout_text = e.stdout.decode() if isinstance(e.stdout, bytes) else e.stdout
            print(stdout_text)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: npx not found. Please ensure npm is installed.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Run analytics reports")
    parser.add_argument("-v", "--visitors", type=int, help="Total visitors")
    parser.add_argument("-s", "--source", type=str, help="Traffic source")
    args = parser.parse_args()
    
    visitors = args.visitors or (int(os.environ.get("TRAFFIC_VISITORS", 0)) if os.environ.get("TRAFFIC_VISITORS") else None)
    source = args.source or os.environ.get("TRAFFIC_SOURCE")
    
    run_analytics(visitors=visitors, source=source)


if __name__ == "__main__":
    main()
